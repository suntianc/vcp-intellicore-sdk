/**
 * VCP SDK - WebSocket频道基类
 * 
 * 提供所有频道的通用功能和默认实现
 * 
 * @module @vcp/sdk/communication
 */

import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import {
  IWebSocketChannel,
  WebSocketClientType,
  ChannelStats
} from '../types';
import { logger } from '../utils/logger';

/**
 * WebSocket频道抽象基类
 * 
 * 所有频道类型都应继承此类，并实现必要的抽象方法
 */
export abstract class BaseChannel implements IWebSocketChannel {
  /** 频道名称 */
  abstract readonly name: string;
  
  /** 路径匹配模式 */
  abstract readonly pathPattern: RegExp;
  
  /** 客户端类型 */
  abstract readonly clientType: WebSocketClientType;
  
  /** 连接的客户端Map (clientId -> WebSocket) */
  protected clients: Map<string, WebSocket> = new Map();
  
  /** 统计信息 */
  protected stats: {
    totalMessagesReceived: number;
    totalMessagesSent: number;
    lastActivity: Date;
  } = {
    totalMessagesReceived: 0,
    totalMessagesSent: 0,
    lastActivity: new Date()
  };
  
  /**
   * 处理新连接（子类可重写）
   */
  async handleConnection(
    ws: WebSocket,
    connectionKey: string,
    request: IncomingMessage
  ): Promise<void> {
    const clientId = this.generateClientId();
    
    // 存储客户端信息
    (ws as any).clientId = clientId;
    (ws as any).clientType = this.clientType;
    (ws as any).connectionKey = connectionKey;
    
    // 添加到客户端Map
    this.clients.set(clientId, ws);
    
    logger.info(`[${this.name}] New connection: ${clientId}`);
    
    // 发送连接确认
    this.sendConnectionAck(ws);
    
    // 调用子类的初始化逻辑
    await this.onConnectionEstablished(ws, connectionKey, request);
  }
  
  /**
   * 处理消息（子类可重写）
   */
  async handleMessage(ws: WebSocket, message: any): Promise<void> {
    this.stats.totalMessagesReceived++;
    this.stats.lastActivity = new Date();
    
    logger.debug(`[${this.name}] Message received:`, message.type || 'unknown');
    
    // 调用子类的消息处理逻辑
    await this.onMessage(ws, message);
  }
  
  /**
   * 处理连接关闭
   */
  handleClose(ws: WebSocket): void {
    const clientId = (ws as any).clientId;
    
    if (clientId) {
      this.clients.delete(clientId);
      logger.info(`[${this.name}] Connection closed: ${clientId}`);
    }
    
    // 调用子类的清理逻辑
    this.onConnectionClosed(ws);
  }
  
  /**
   * 处理错误
   */
  handleError(ws: WebSocket, error: Error): void {
    const clientId = (ws as any).clientId;
    
    logger.error(`[${this.name}] Error on connection ${clientId}:`, error.message);
    
    // 调用子类的错误处理逻辑
    this.onError(ws, error);
  }
  
  /**
   * 广播消息到所有客户端
   */
  broadcast(message: any): void {
    const messageStr = typeof message === 'string' 
      ? message 
      : JSON.stringify(message);
    
    
    let successCount = 0;
    let failCount = 0;
    
    this.clients.forEach((ws, clientId) => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(messageStr);
          successCount++;
          this.stats.totalMessagesSent++;
          
        } catch (error: any) {
          logger.error(`[${this.name}] Failed to send to ${clientId}:`, error.message);
          failCount++;
        }
      }
    });
    
    if (successCount > 0) {
      logger.debug(`[${this.name}] Broadcast to ${successCount} clients (${failCount} failed)`);
    }
    
    this.stats.lastActivity = new Date();
  }
  
  /**
   * 发送消息给特定客户端
   */
  protected sendToClient(ws: WebSocket, message: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      const messageStr = typeof message === 'string' 
        ? message 
        : JSON.stringify(message);
      
      ws.send(messageStr);
      this.stats.totalMessagesSent++;
      this.stats.lastActivity = new Date();
    }
  }
  
  /**
   * 获取连接的客户端数量
   */
  getConnectedClients(): number {
    return this.clients.size;
  }
  
  /**
   * 获取频道统计信息
   */
  getStats(): ChannelStats {
    return {
      name: this.name,
      connectedClients: this.clients.size,
      totalMessagesReceived: this.stats.totalMessagesReceived,
      totalMessagesSent: this.stats.totalMessagesSent,
      lastActivity: this.stats.lastActivity
    };
  }
  
  /**
   * 生成客户端ID
   */
  protected generateClientId(): string {
    return `${this.clientType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * 发送连接确认消息
   */
  protected sendConnectionAck(ws: WebSocket): void {
    this.sendToClient(ws, {
      type: 'connection_ack',
      message: `Connected to ${this.name} channel`
    });
  }
  
  /**
   * 子类需实现：连接建立后的初始化逻辑
   */
  protected abstract onConnectionEstablished(
    ws: WebSocket,
    connectionKey: string,
    request: IncomingMessage
  ): Promise<void>;
  
  /**
   * 子类需实现：消息处理逻辑
   */
  protected abstract onMessage(ws: WebSocket, message: any): Promise<void>;
  
  /**
   * 子类可重写：连接关闭后的清理逻辑
   */
  protected onConnectionClosed(ws: WebSocket): void {
    // 默认无操作
  }
  
  /**
   * 子类可重写：错误处理逻辑
   */
  protected onError(ws: WebSocket, error: Error): void {
    // 默认无操作
  }
}

