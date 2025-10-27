/**
 * VCP SDK - ChromeObserver频道实现
 * 
 * 负责管理Chrome扩展连接，用于网页操作和数据抓取
 * 
 * @module @vcp/sdk/communication
 */

import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { BaseChannel } from '../BaseChannel';
import { WebSocketClientType } from '../../types';
import { logger } from '../../utils/logger';

/**
 * ChromeObserver频道
 * 
 * 用于连接Chrome扩展插件，支持网页操作和数据抓取
 * 
 * **路径**: `/vcp-chrome-observer/VCP_Key=xxx`
 * 
 * **功能**:
 * - 接收Chrome扩展连接
 * - 转发网页操作指令
 * - 接收抓取的网页数据
 */
export class ChromeObserverChannelSDK extends BaseChannel {
  readonly name = 'ChromeObserver';
  readonly pathPattern = /^\/vcp-chrome-observer\/VCP_Key=(.+)$/;
  readonly clientType: WebSocketClientType = 'ChromeObserver';
  
  /**
   * 连接建立后的初始化
   */
  protected async onConnectionEstablished(
    ws: WebSocket,
    connectionKey: string,
    request: IncomingMessage
  ): Promise<void> {
    logger.info(`[ChromeObserver] Chrome extension connected`);
    
    // 发送欢迎消息
    this.sendToClient(ws, {
      type: 'connection_ack',
      message: 'ChromeObserver channel connected'
    });
  }
  
  /**
   * 处理ChromeObserver消息
   */
  protected async onMessage(ws: WebSocket, message: any): Promise<void> {
    const { type } = message;
    
    switch (type) {
      case 'page_data':
        await this.handlePageData(ws, message);
        break;
        
      case 'screenshot':
        await this.handleScreenshot(ws, message);
        break;
        
      case 'dom_data':
        await this.handleDOMData(ws, message);
        break;
        
      case 'ready':
        await this.handleChromeReady(ws, message);
        break;
        
      default:
        logger.debug(`[ChromeObserver] Unknown message type: ${type}`);
    }
  }
  
  /**
   * 处理网页数据
   */
  private async handlePageData(ws: WebSocket, message: any): Promise<void> {
    const { url, title, content } = message;
    logger.debug(`[ChromeObserver] Page data received: ${title}`);
    
    // 可以在这里触发事件，通知外部处理
    // 例如：存储到数据库、触发工具回调等
  }
  
  /**
   * 处理截图数据
   */
  private async handleScreenshot(ws: WebSocket, message: any): Promise<void> {
    const { screenshot } = message;
    logger.debug(`[ChromeObserver] Screenshot received (${screenshot?.length || 0} bytes)`);
  }
  
  /**
   * 处理DOM数据
   */
  private async handleDOMData(ws: WebSocket, message: any): Promise<void> {
    const { selector, data } = message;
    logger.debug(`[ChromeObserver] DOM data received for selector: ${selector}`);
  }
  
  /**
   * 处理Chrome就绪通知
   */
  private async handleChromeReady(ws: WebSocket, message: any): Promise<void> {
    logger.info(`[ChromeObserver] Chrome extension ready`);
    (ws as any).isReady = true;
  }
  
  /**
   * 发送指令到Chrome扩展
   */
  sendCommand(command: {
    action: string;
    target?: string;
    params?: any;
  }): void {
    this.broadcast({
      type: 'command',
      ...command,
      timestamp: Date.now()
    });
  }
}

