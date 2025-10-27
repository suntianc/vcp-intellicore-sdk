/**
 * VCP SDK - VCPLog频道实现
 * 
 * 负责实时日志和通知推送到VCPChat等客户端
 * 
 * @module @vcp/sdk/communication
 */

import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { BaseChannel } from '../BaseChannel';
import { WebSocketClientType } from '../../types';
import { logger } from '../../utils/logger';

/**
 * VCPLog频道
 * 
 * 用于推送实时日志、工具执行状态、AI思维过程等信息
 * 
 * **路径**: `/VCPlog/VCP_Key=xxx`
 * 
 * **消息类型**:
 * - `vcp_log` - 通用日志消息
 * - `tool_log` - 工具执行日志
 * - `ai_stream` - AI思维流
 * - `notification` - 系统通知
 */
export class VCPLogChannelSDK extends BaseChannel {
  readonly name = 'VCPLog';
  readonly pathPattern = /^\/VCPlog\/VCP_Key=(.+)$/;
  readonly clientType: WebSocketClientType = 'VCPLog';
  
  /**
   * 连接建立后的初始化
   */
  protected async onConnectionEstablished(
    ws: WebSocket,
    connectionKey: string,
    request: IncomingMessage
  ): Promise<void> {
    logger.info(`[VCPLog] Client connected with key: ${connectionKey.substring(0, 10)}...`);
    
    // 发送欢迎消息
    this.sendToClient(ws, {
      type: 'welcome',
      message: 'VCPLog channel connected',
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * 处理VCPLog消息
   */
  protected async onMessage(ws: WebSocket, message: any): Promise<void> {
    const { type } = message;
    
    switch (type) {
      case 'ping':
        // 心跳检测
        this.sendToClient(ws, { type: 'pong', timestamp: Date.now() });
        break;
        
      case 'subscribe':
        // 订阅特定日志类型（可选功能）
        await this.handleSubscribe(ws, message);
        break;
        
      default:
        logger.warn(`[VCPLog] Unknown message type: ${type}`);
    }
  }
  
  /**
   * 处理订阅请求
   */
  private async handleSubscribe(ws: WebSocket, message: any): Promise<void> {
    const { logTypes } = message;
    
    // 存储客户端订阅偏好
    (ws as any).subscriptions = logTypes || ['all'];
    
    this.sendToClient(ws, {
      type: 'subscribe_ack',
      subscriptions: (ws as any).subscriptions
    });
    
    logger.info(`[VCPLog] Client subscribed to: ${(ws as any).subscriptions.join(', ')}`);
  }
  
  /**
   * 推送日志消息（VCPToolBox标准格式）
   * 
   * @param logData - 日志数据
   */
  pushLog(logData: {
    logType: 'tool_log' | 'ai_stream' | 'vcp_log' | 'notification';
    content: string;
    source?: string;
    timestamp?: string;
    [key: string]: any;
  }): void {
    const { logType, content, source, timestamp, ...rest } = logData;
    
    // VCPChat期望格式：type='vcp_log'，数据在data字段中，字段名是tool_name
    // 需要将rest中的tool重命名为tool_name
    const dataFields: Record<string, any> = {};
    for (const [key, value] of Object.entries(rest)) {
      if (key === 'tool') {
        dataFields['tool_name'] = value;  // ← tool重命名为tool_name
      } else {
        dataFields[key] = value;
      }
    }
    
    const message = {
      type: 'vcp_log',  // ← VCPChat固定期望vcp_log
      data: {
        log_type: logType,  // ← 保留log_type（tool_log, ai_stream等）
        content,
        source: source || 'VCP-IntelliCore',
        timestamp: timestamp || new Date().toISOString(),
        ...dataFields  // ← 包含tool_name, status等
      }
    };
    
    this.broadcast(message);
  }
  
  /**
   * 推送工具执行日志
   */
  pushToolLog(data: {
    status: 'executing' | 'success' | 'error';
    tool: string;
    content: string;
    source?: string;
  }): void {
    this.pushLog({
      logType: 'tool_log',
      ...data
    });
  }
  
  /**
   * 推送AI思维流
   */
  pushAIStream(data: {
    content: string;
    stage?: string;
  }): void {
    this.pushLog({
      logType: 'ai_stream',
      ...data
    });
  }
}

