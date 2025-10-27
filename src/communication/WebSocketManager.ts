/**
 * VCP SDK - WebSocket管理器
 * 
 * 统一管理所有WebSocket频道，提供路由和广播功能
 * 
 * @module @vcp/sdk/communication
 */

import { Server as WebSocketServer, WebSocket } from 'ws';
import { Server as HTTPServer } from 'http';
import { IncomingMessage } from 'http';
import { Duplex } from 'stream';
import url from 'url';
import {
  IWebSocketManager,
  IWebSocketChannel,
  WebSocketManagerStats,
  WebSocketManagerConfig,
  VCPError,
  VCPErrorCode
} from '../types';
import { logger } from '../utils/logger';

/**
 * WebSocket管理器实现
 * 
 * **职责**:
 * - 管理所有WebSocket频道
 * - 路由连接到正确的频道
 * - 提供统一的广播接口
 * - 收集统计信息
 * 
 * **使用示例**:
 * ```typescript
 * const manager = new WebSocketManager(config);
 * manager.initialize(httpServer);
 * 
 * manager.registerChannel(new VCPLogChannelSDK());
 * manager.registerChannel(new DistributedServerChannelSDK());
 * 
 * manager.broadcast({ type: 'notification', message: 'Hello' }, 'VCPLog');
 * ```
 */
export class WebSocketManager implements IWebSocketManager {
  /** WebSocket服务器实例 */
  private wss: WebSocketServer | null = null;
  
  /** 注册的频道Map */
  private channels: Map<string, IWebSocketChannel> = new Map();
  
  /** 配置 */
  private config: Required<WebSocketManagerConfig>;
  
  /** 启动时间 */
  private startTime: Date = new Date();
  
  /** 总连接计数 */
  private totalConnections: number = 0;
  
  /**
   * 构造函数
   */
  constructor(config: WebSocketManagerConfig = {}) {
    this.config = {
      enableHeartbeat: config.enableHeartbeat ?? false,
      heartbeatInterval: config.heartbeatInterval ?? 30000,
      enableCompression: config.enableCompression ?? false,
      maxMessageSize: config.maxMessageSize ?? 10 * 1024 * 1024  // 10MB
    };
  }
  
  /**
   * 初始化WebSocket服务器
   */
  initialize(server: HTTPServer): void {
    // 创建WebSocket服务器（noServer模式，手动处理upgrade）
    this.wss = new WebSocketServer({ noServer: true });
    
    // 监听HTTP服务器的upgrade事件
    server.on('upgrade', (request, socket, head) => {
      this.handleUpgrade(request, socket, head);
    });
    
    logger.info('[WebSocketManager] WebSocket server initialized');
  }
  
  /**
   * 注册频道
   */
  registerChannel(channel: IWebSocketChannel): void {
    if (this.channels.has(channel.name)) {
      logger.warn(`[WebSocketManager] Channel ${channel.name} already registered, overwriting`);
    }
    
    this.channels.set(channel.name, channel);
    logger.info(`[WebSocketManager] Channel registered: ${channel.name} (${channel.clientType})`);
  }
  
  /**
   * 获取频道
   */
  getChannel(name: string): IWebSocketChannel | null {
    return this.channels.get(name) || null;
  }
  
  /**
   * 处理WebSocket升级请求
   */
  handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer): void {
    if (!this.wss) {
      logger.error('[WebSocketManager] WebSocket server not initialized');
      socket.destroy();
      return;
    }
    
    const pathname = url.parse(request.url || '').pathname || '';
    
    // 查找匹配的频道
    let matchedChannel: IWebSocketChannel | null = null;
    let connectionKey: string | null = null;
    
    for (const channel of this.channels.values()) {
      const match = pathname.match(channel.pathPattern);
      if (match && match[1]) {
        matchedChannel = channel;
        connectionKey = match[1];
        break;
      }
    }
    
    if (!matchedChannel || !connectionKey) {
      logger.warn(`[WebSocketManager] No channel matched for path: ${pathname}`);
      socket.destroy();
      return;
    }
    
    // 执行WebSocket握手
    this.wss.handleUpgrade(request, socket, head, async (ws) => {
      this.totalConnections++;
      
      logger.debug(`[WebSocketManager] Upgrade to ${matchedChannel!.name} channel`);
      
      // 设置消息处理
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await matchedChannel!.handleMessage(ws, message);
        } catch (error: any) {
          logger.error(`[WebSocketManager] Message handling error:`, error.message);
          matchedChannel!.handleError(ws, error);
        }
      });
      
      // 设置关闭处理
      ws.on('close', () => {
        matchedChannel!.handleClose(ws);
      });
      
      // 设置错误处理
      ws.on('error', (error) => {
        matchedChannel!.handleError(ws, error);
      });
      
      // 调用频道的连接处理
      try {
        await matchedChannel!.handleConnection(ws, connectionKey!, request);
      } catch (error: any) {
        logger.error(`[WebSocketManager] Connection handling error:`, error.message);
        ws.close();
      }
    });
  }
  
  /**
   * 广播消息
   */
  broadcast(message: any, targetChannel?: string): void {
    if (targetChannel) {
      // 广播到特定频道
      const channel = this.channels.get(targetChannel);
      if (channel) {
        channel.broadcast(message);
      } else {
        logger.warn(`[WebSocketManager] Channel not found for broadcast: ${targetChannel}`);
      }
    } else {
      // 广播到所有频道
      this.channels.forEach(channel => {
        channel.broadcast(message);
      });
    }
  }
  
  /**
   * 获取统计信息
   */
  getStats(): WebSocketManagerStats {
    const channelStats = Array.from(this.channels.values()).map(ch => ch.getStats());
    
    const activeConnections = channelStats.reduce(
      (sum, ch) => sum + ch.connectedClients,
      0
    );
    
    const uptime = Math.floor((Date.now() - this.startTime.getTime()) / 1000);
    
    return {
      totalConnections: this.totalConnections,
      channels: channelStats,
      activeConnections,
      startTime: this.startTime,
      uptime
    };
  }
  
  /**
   * 关闭所有连接
   */
  async shutdown(): Promise<void> {
    logger.info('[WebSocketManager] Shutting down...');
    
    // 关闭所有频道的连接
    for (const channel of this.channels.values()) {
      const clients = (channel as any).clients;
      if (clients instanceof Map) {
        clients.forEach((ws: WebSocket) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close(1000, 'Server shutting down');
          }
        });
      }
    }
    
    // 关闭WebSocket服务器
    if (this.wss) {
      await new Promise<void>((resolve) => {
        this.wss!.close(() => {
          logger.info('[WebSocketManager] Shutdown complete');
          resolve();
        });
      });
    }
  }
}

