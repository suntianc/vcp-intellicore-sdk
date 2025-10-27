/**
 * VCP SDK - VCPInfo频道实现
 * 
 * 负责推送工具调用的详细调试信息
 * 
 * @module @vcp/sdk/communication
 */

import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { BaseChannel } from '../BaseChannel';
import { WebSocketClientType } from '../../types';
import { logger } from '../../utils/logger';

/**
 * VCPInfo频道
 * 
 * 用于推送工具调用的详细信息，主要用于调试和监控
 * 
 * **路径**: `/vcpinfo/VCP_Key=xxx`
 * 
 * **消息类型**:
 * - `tool_call_info` - 工具调用详细信息
 * - `tool_result_info` - 工具结果详细信息
 * - `system_info` - 系统状态信息
 */
export class VCPInfoChannelSDK extends BaseChannel {
  readonly name = 'VCPInfo';
  readonly pathPattern = /^\/vcpinfo\/VCP_Key=(.+)$/;
  readonly clientType: WebSocketClientType = 'VCPInfo';
  
  /**
   * 连接建立后的初始化
   */
  protected async onConnectionEstablished(
    ws: WebSocket,
    connectionKey: string,
    request: IncomingMessage
  ): Promise<void> {
    logger.info(`[VCPInfo] Debug client connected`);
    
    // 发送欢迎消息
    this.sendToClient(ws, {
      type: 'welcome',
      message: 'VCPInfo debug channel connected',
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * 处理VCPInfo消息
   */
  protected async onMessage(ws: WebSocket, message: any): Promise<void> {
    const { type } = message;
    
    switch (type) {
      case 'ping':
        this.sendToClient(ws, { type: 'pong', timestamp: Date.now() });
        break;
        
      case 'get_system_info':
        await this.handleSystemInfoRequest(ws);
        break;
        
      default:
        logger.debug(`[VCPInfo] Unknown message type: ${type}`);
    }
  }
  
  /**
   * 处理系统信息请求
   */
  private async handleSystemInfoRequest(ws: WebSocket): Promise<void> {
    this.sendToClient(ws, {
      type: 'system_info',
      info: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version
      }
    });
  }
  
  /**
   * 推送工具调用信息
   */
  pushToolCallInfo(data: {
    tool: string;
    args: any;
    serverId?: string;
    requestId: string;
  }): void {
    this.broadcast({
      type: 'tool_call_info',
      ...data,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * 推送工具结果信息
   */
  pushToolResultInfo(data: {
    tool: string;
    result: any;
    duration: number;
    success: boolean;
  }): void {
    this.broadcast({
      type: 'tool_result_info',
      ...data,
      timestamp: new Date().toISOString()
    });
  }
}

