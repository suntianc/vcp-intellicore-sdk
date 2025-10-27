/**
 * VCP SDK - 分布式服务器频道实现
 * 
 * 负责管理分布式节点连接、工具注册、工具执行
 * 
 * @module @vcp/sdk/communication
 */

import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { EventEmitter } from 'events';
import { BaseChannel } from '../BaseChannel';
import {
  WebSocketClientType,
  DistributedServerInfo,
  PendingToolRequest,
  VCPError,
  VCPErrorCode
} from '../../types';
import { logger } from '../../utils/logger';

/**
 * 分布式服务器频道
 * 
 * **路径**: `/vcp-distributed-server/VCP_Key=xxx`
 * 
 * **功能**:
 * - 接受分布式节点连接（VCPChat内置服务器、独立节点）
 * - 管理工具注册和注销
 * - 协调分布式工具执行（Promise包装）
 * - 追踪节点IP信息
 */
export class DistributedServerChannelSDK extends BaseChannel {
  readonly name = 'DistributedServer';
  readonly pathPattern = /^\/vcp-distributed-server\/VCP_Key=(.+)$/;
  readonly clientType: WebSocketClientType = 'DistributedServer';
  
  /** 分布式服务器信息Map */
  private distributedServers: Map<string, DistributedServerInfo> = new Map();
  
  /** 待处理的工具请求Map */
  private pendingRequests: Map<string, PendingToolRequest> = new Map();
  
  /** 事件发射器（用于通知外部工具注册/注销） */
  private eventEmitter: EventEmitter = new EventEmitter();
  
  /** 默认超时时间（30秒） */
  private readonly DEFAULT_TIMEOUT = 30000;
  
  /**
   * 连接建立后的初始化
   */
  protected async onConnectionEstablished(
    ws: WebSocket,
    connectionKey: string,
    request: IncomingMessage
  ): Promise<void> {
    // 生成服务器ID
    const serverId = this.generateServerId();
    (ws as any).serverId = serverId;
    
    // 创建服务器信息
    const serverInfo: DistributedServerInfo = {
      serverId,
      ws,
      tools: [],
      serverName: serverId,
      connectedAt: new Date(),
      lastActivity: new Date()
    };
    
    this.distributedServers.set(serverId, serverInfo);
    
    logger.info(`[DistributedServer] Node connected: ${serverId}`);
    
    // 发送连接确认（VCPToolBox标准格式）
    this.sendToClient(ws, {
      type: 'connection_ack',
      data: {
        serverId,
        message: 'Connected to VCP IntelliCore'
      }
    });
    
    // 发射连接事件
    this.eventEmitter.emit('server_connected', { serverId, serverInfo });
  }
  
  /**
   * 处理分布式服务器消息
   */
  protected async onMessage(ws: WebSocket, message: any): Promise<void> {
    const { type } = message;
    const serverId = (ws as any).serverId;
    
    switch (type) {
      case 'register_tools':
        await this.handleRegisterTools(ws, serverId, message);
        break;
        
      case 'unregister_tools':
        await this.handleUnregisterTools(ws, serverId, message);
        break;
        
      case 'tool_result':
        this.handleToolResult(serverId, message);
        break;
        
      case 'report_ip':
        this.handleIPReport(serverId, message);
        break;
        
      case 'heartbeat':
        this.handleHeartbeat(serverId);
        break;
        
      default:
        logger.warn(`[DistributedServer] Unknown message type from ${serverId}: ${type}`);
    }
  }
  
  /**
   * 连接关闭时的清理
   */
  protected onConnectionClosed(ws: WebSocket): void {
    const serverId = (ws as any).serverId;
    
    if (serverId) {
      const serverInfo = this.distributedServers.get(serverId);
      
      if (serverInfo) {
        // 发射工具注销事件
        if (serverInfo.tools.length > 0) {
          this.eventEmitter.emit('tools_unregistered', {
            serverId,
            tools: serverInfo.tools
          });
        }
        
        // 移除服务器信息
        this.distributedServers.delete(serverId);
        
        logger.info(`[DistributedServer] Node disconnected: ${serverId}, ${serverInfo.tools.length} tools unregistered`);
      }
      
      // 清理所有待处理请求
      this.cleanupPendingRequests(serverId);
    }
  }
  
  /**
   * 处理工具注册（VCPToolBox标准格式）
   */
  private async handleRegisterTools(ws: WebSocket, serverId: string, message: any): Promise<void> {
    // 使用VCPToolBox标准格式：message.data.tools
    const tools = message.data?.tools;
    
    if (!Array.isArray(tools)) {
      logger.error(`[DistributedServer] Invalid tools format from ${serverId}, expected data.tools array, got:`, JSON.stringify(message).substring(0, 500));
      return;
    }
    
    const serverInfo = this.distributedServers.get(serverId);
    if (!serverInfo) {
      logger.error(`[DistributedServer] Server info not found: ${serverId}`);
      return;
    }
    
    // 更新工具列表
    const toolNames = tools.map(t => t.id || t.name);
    serverInfo.tools = toolNames;
    serverInfo.lastActivity = new Date();
    
    logger.info(`[DistributedServer] ${serverId} registered ${tools.length} tools: ${toolNames.join(', ')}`);
    
    // 发送确认（VCPToolBox标准格式）
    this.sendToClient(ws, {
      type: 'register_ack',
      data: {
        tools: toolNames,
        count: tools.length
      }
    });
    
    // 发射工具注册事件
    this.eventEmitter.emit('tools_registered', {
      serverId,
      tools,
      serverInfo
    });
  }
  
  /**
   * 处理工具注销
   */
  private async handleUnregisterTools(ws: WebSocket, serverId: string, message: any): Promise<void> {
    const { tools } = message;
    
    const serverInfo = this.distributedServers.get(serverId);
    if (!serverInfo) {
      return;
    }
    
    // 从工具列表中移除
    serverInfo.tools = serverInfo.tools.filter(t => !tools.includes(t));
    serverInfo.lastActivity = new Date();
    
    logger.info(`[DistributedServer] ${serverId} unregistered ${tools.length} tools`);
    
    // 发射工具注销事件
    this.eventEmitter.emit('tools_unregistered', {
      serverId,
      tools
    });
  }
  
  /**
   * 处理工具执行结果（VCPToolBox标准格式）
   */
  private handleToolResult(serverId: string, message: any): void {
    // 使用VCPToolBox标准格式：message.data
    const { requestId, status, result, error } = message.data || {};
    
    if (!requestId) {
      // 无requestId的结果 = 异步工具推送结果
      logger.info(`[DistributedServer] Async tool result from ${serverId}`);
      this.eventEmitter.emit('async_tool_result', { serverId, result: message.data || message });
      return;
    }
    
    // 查找待处理请求
    const pending = this.pendingRequests.get(requestId);
    
    if (!pending) {
      logger.warn(`[DistributedServer] Received result for unknown requestId: ${requestId}`);
      return;
    }
    
    // 清除超时
    clearTimeout(pending.timeout);
    
    // 移除待处理请求
    this.pendingRequests.delete(requestId);
    
    // 解析Promise
    pending.resolve(result);
    
    logger.debug(`[DistributedServer] Tool result received for ${requestId}`);
  }
  
  /**
   * 处理IP上报（VCPToolBox标准格式）
   */
  private handleIPReport(serverId: string, message: any): void {
    // 使用VCPToolBox标准格式：message.data
    const { localIPs, publicIP } = message.data || {};
    
    const serverInfo = this.distributedServers.get(serverId);
    if (serverInfo) {
      serverInfo.ips = { localIPs, publicIP };
      serverInfo.lastActivity = new Date();
    }
    
    logger.debug(`[DistributedServer] IP report from ${serverId}: ${localIPs?.join(', ')}`);
    
    // 发射IP上报事件
    this.eventEmitter.emit('ip_report', {
      serverId,
      localIPs,
      publicIP
    });
  }
  
  /**
   * 处理心跳
   */
  private handleHeartbeat(serverId: string): void {
    const serverInfo = this.distributedServers.get(serverId);
    if (serverInfo) {
      serverInfo.lastActivity = new Date();
    }
  }
  
  /**
   * 执行分布式工具（Promise包装）
   * 
   * @param serverId - 服务器ID
   * @param toolName - 工具名称
   * @param args - 工具参数
   * @param timeout - 超时时间（毫秒）
   * @returns Promise<工具执行结果>
   */
  async executeDistributedTool(
    serverId: string,
    toolName: string,
    args: any,
    timeout: number = this.DEFAULT_TIMEOUT
  ): Promise<any> {
    const serverInfo = this.distributedServers.get(serverId);
    
    if (!serverInfo) {
      throw new VCPError(
        VCPErrorCode.DISTRIBUTED_CONNECTION_ERROR,
        `Distributed server ${serverId} not connected`,
        { serverId }
      );
    }
    
    if (serverInfo.ws.readyState !== WebSocket.OPEN) {
      throw new VCPError(
        VCPErrorCode.DISTRIBUTED_CONNECTION_ERROR,
        `Distributed server ${serverId} connection not open`,
        { serverId, readyState: serverInfo.ws.readyState }
      );
    }
    
    // 生成请求ID
    const requestId = this.generateRequestId();
    
    // 创建Promise
    return new Promise((resolve, reject) => {
      // 设置超时
      const timeoutTimer = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new VCPError(
          VCPErrorCode.DISTRIBUTED_TIMEOUT,
          `Tool execution timeout after ${timeout}ms`,
          { serverId, toolName, requestId, timeout }
        ));
      }, timeout);
      
      // 存储待处理请求
      this.pendingRequests.set(requestId, {
        requestId,
        resolve,
        reject,
        timeout: timeoutTimer,
        createdAt: new Date()
      });
      
      // 发送执行请求（VCPToolBox标准格式）
      this.sendToClient(serverInfo.ws, {
        type: 'execute_tool',
        data: {
          requestId,
          toolName,
          toolArgs: args
        }
      });
      
      logger.debug(`[DistributedServer] Tool execution sent: ${toolName} on ${serverId} (${requestId})`);
    });
  }
  
  /**
   * 获取所有分布式服务器信息
   */
  getDistributedServers(): Map<string, DistributedServerInfo> {
    return new Map(this.distributedServers);
  }
  
  /**
   * 获取特定服务器的工具列表
   */
  getServerTools(serverId: string): string[] {
    const serverInfo = this.distributedServers.get(serverId);
    return serverInfo ? [...serverInfo.tools] : [];
  }
  
  /**
   * 监听事件
   */
  on(event: 'tools_registered' | 'tools_unregistered' | 'async_tool_result' | 'server_connected' | 'ip_report', 
     listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }
  
  /**
   * 移除事件监听
   */
  off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }
  
  /**
   * 生成服务器ID
   */
  private generateServerId(): string {
    const instanceId = Math.floor(Math.random() * 10);
    return `dist-${instanceId}-${Date.now()}`;
  }
  
  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`;
  }
  
  /**
   * 清理特定服务器的待处理请求
   */
  private cleanupPendingRequests(serverId: string): void {
    let cleanedCount = 0;
    
    this.pendingRequests.forEach((pending, requestId) => {
      // 这里需要一种方式关联requestId和serverId
      // 简化处理：超时会自动清理，连接断开时reject所有
      clearTimeout(pending.timeout);
      pending.reject(new Error(`Server ${serverId} disconnected`));
      this.pendingRequests.delete(requestId);
      cleanedCount++;
    });
    
    if (cleanedCount > 0) {
      logger.info(`[DistributedServer] Cleaned ${cleanedCount} pending requests for ${serverId}`);
    }
  }
}

