/**
 * VCP SDK - AdminPanel频道实现
 * 
 * 负责管理后台管理面板的WebSocket连接
 * 
 * @module @vcp/sdk/communication
 */

import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { BaseChannel } from '../BaseChannel';
import { WebSocketClientType } from '../../types';
import { logger } from '../../utils/logger';

/**
 * AdminPanel频道
 * 
 * 用于后台管理面板的实时通信
 * 
 * **路径**: `/vcp-admin-panel/VCP_Key=xxx`
 * 
 * **功能**:
 * - 接收管理面板连接
 * - 推送系统状态更新
 * - 处理管理操作指令
 */
export class AdminPanelChannelSDK extends BaseChannel {
  readonly name = 'AdminPanel';
  readonly pathPattern = /^\/vcp-admin-panel\/VCP_Key=(.+)$/;
  readonly clientType: WebSocketClientType = 'AdminPanel';
  
  /**
   * 连接建立后的初始化
   */
  protected async onConnectionEstablished(
    ws: WebSocket,
    connectionKey: string,
    request: IncomingMessage
  ): Promise<void> {
    logger.info(`[AdminPanel] Admin panel connected`);
    
    // 发送欢迎消息和初始状态
    this.sendToClient(ws, {
      type: 'connection_ack',
      message: 'Admin panel connected',
      systemInfo: {
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform
      }
    });
  }
  
  /**
   * 处理管理面板消息
   */
  protected async onMessage(ws: WebSocket, message: any): Promise<void> {
    const { type } = message;
    
    switch (type) {
      case 'get_stats':
        await this.handleGetStats(ws);
        break;
        
      case 'get_plugins':
        await this.handleGetPlugins(ws);
        break;
        
      case 'admin_action':
        await this.handleAdminAction(ws, message);
        break;
        
      default:
        logger.debug(`[AdminPanel] Unknown message type: ${type}`);
    }
  }
  
  /**
   * 处理获取统计信息请求
   */
  private async handleGetStats(ws: WebSocket): Promise<void> {
    this.sendToClient(ws, {
      type: 'stats_response',
      stats: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      }
    });
  }
  
  /**
   * 处理获取插件列表请求
   */
  private async handleGetPlugins(ws: WebSocket): Promise<void> {
    // 这里需要从外部注入插件信息
    this.sendToClient(ws, {
      type: 'plugins_response',
      plugins: []  // 实际使用时应该从PluginRuntime获取
    });
  }
  
  /**
   * 处理管理操作
   */
  private async handleAdminAction(ws: WebSocket, message: any): Promise<void> {
    const { action, params } = message;
    
    logger.info(`[AdminPanel] Admin action: ${action}`);
    
    // 发送确认
    this.sendToClient(ws, {
      type: 'action_ack',
      action,
      success: true
    });
  }
  
  /**
   * 推送系统状态更新
   */
  pushSystemUpdate(update: {
    category: string;
    data: any;
  }): void {
    this.broadcast({
      type: 'system_update',
      ...update,
      timestamp: Date.now()
    });
  }
  
  /**
   * 推送告警消息
   */
  pushAlert(alert: {
    level: 'info' | 'warning' | 'error';
    message: string;
    details?: any;
  }): void {
    this.broadcast({
      type: 'alert',
      ...alert,
      timestamp: Date.now()
    });
  }
}

