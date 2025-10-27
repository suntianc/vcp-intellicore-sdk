/**
 * VCP SDK - 通信服务类型定义
 * 
 * 包含WebSocket管理器、频道系统、FileFetcher的接口定义
 * 
 * @module @vcp/sdk/types/communication
 */

import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { Duplex } from 'stream';

/**
 * WebSocket客户端类型
 */
export type WebSocketClientType = 
  | 'VCPLog'           // 日志频道
  | 'VCPInfo'          // 调试信息频道
  | 'DistributedServer' // 分布式服务器
  | 'ChromeObserver'   // Chrome观察者
  | 'ChromeControl'    // Chrome控制
  | 'AdminPanel';      // 管理面板

/**
 * WebSocket频道接口
 */
export interface IWebSocketChannel {
  /** 频道名称 */
  name: string;
  
  /** 路径匹配模式 */
  pathPattern: RegExp;
  
  /** 客户端类型 */
  clientType: WebSocketClientType;
  
  /**
   * 处理新连接
   * @param ws - WebSocket连接
   * @param connectionKey - 连接密钥（从URL提取）
   * @param request - HTTP请求对象
   */
  handleConnection(ws: WebSocket, connectionKey: string, request: IncomingMessage): Promise<void>;
  
  /**
   * 处理消息
   * @param ws - WebSocket连接
   * @param message - 消息内容
   */
  handleMessage(ws: WebSocket, message: any): Promise<void>;
  
  /**
   * 处理连接关闭
   * @param ws - WebSocket连接
   */
  handleClose(ws: WebSocket): void;
  
  /**
   * 处理错误
   * @param ws - WebSocket连接
   * @param error - 错误对象
   */
  handleError(ws: WebSocket, error: Error): void;
  
  /**
   * 广播消息到所有连接的客户端
   * @param message - 消息内容
   */
  broadcast(message: any): void;
  
  /**
   * 获取连接的客户端数量
   */
  getConnectedClients(): number;
  
  /**
   * 获取频道统计信息
   */
  getStats(): ChannelStats;
}

/**
 * 频道统计信息
 */
export interface ChannelStats {
  /** 频道名称 */
  name: string;
  
  /** 连接客户端数 */
  connectedClients: number;
  
  /** 总接收消息数 */
  totalMessagesReceived: number;
  
  /** 总发送消息数 */
  totalMessagesSent: number;
  
  /** 最后活动时间 */
  lastActivity: Date;
}

/**
 * WebSocket管理器接口
 */
export interface IWebSocketManager {
  /**
   * 初始化WebSocket服务器
   * @param server - HTTP服务器
   */
  initialize(server: any): void;
  
  /**
   * 注册频道
   * @param channel - 频道实例
   */
  registerChannel(channel: IWebSocketChannel): void;
  
  /**
   * 获取频道
   * @param name - 频道名称
   */
  getChannel(name: string): IWebSocketChannel | null;
  
  /**
   * 处理WebSocket升级请求
   * @param request - HTTP请求
   * @param socket - TCP Socket (Duplex stream)
   * @param head - 升级数据头
   */
  handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer): void;
  
  /**
   * 广播消息到指定频道
   * @param message - 消息内容
   * @param targetChannel - 目标频道名称（不指定则广播到所有频道）
   */
  broadcast(message: any, targetChannel?: string): void;
  
  /**
   * 获取所有频道统计
   */
  getStats(): WebSocketManagerStats;
  
  /**
   * 关闭所有连接
   */
  shutdown(): Promise<void>;
}

/**
 * WebSocket管理器统计信息
 */
export interface WebSocketManagerStats {
  /** 总连接数 */
  totalConnections: number;
  
  /** 频道统计 */
  channels: ChannelStats[];
  
  /** 活跃连接数 */
  activeConnections: number;
  
  /** 启动时间 */
  startTime: Date;
  
  /** 运行时长（秒） */
  uptime: number;
}

/**
 * 分布式服务器信息
 */
export interface DistributedServerInfo {
  /** 服务器ID */
  serverId: string;
  
  /** WebSocket连接 */
  ws: WebSocket;
  
  /** 注册的工具列表 */
  tools: string[];
  
  /** 服务器名称 */
  serverName: string;
  
  /** IP信息 */
  ips?: {
    localIPs: string[];
    publicIP: string;
  };
  
  /** 连接时间 */
  connectedAt: Date;
  
  /** 最后活动时间 */
  lastActivity: Date;
}

/**
 * 待处理的工具请求
 */
export interface PendingToolRequest {
  /** 请求ID */
  requestId: string;
  
  /** Promise的resolve函数 */
  resolve: (result: any) => void;
  
  /** Promise的reject函数 */
  reject: (error: Error) => void;
  
  /** 超时定时器 */
  timeout: NodeJS.Timeout;
  
  /** 创建时间 */
  createdAt: Date;
}

/**
 * FileFetcher接口
 */
export interface IFileFetcher {
  /**
   * 获取文件
   * @param filePath - 文件路径（支持file://协议）
   * @returns 文件内容和元数据
   */
  fetchFile(filePath: string): Promise<FileResult>;
  
  /**
   * 清除缓存
   */
  clearCache(): Promise<void>;
  
  /**
   * 获取缓存统计
   */
  getCacheStats(): Promise<CacheStats>;
  
  /**
   * 设置分布式服务器引用（用于跨节点获取文件）
   * @param servers - 分布式服务器Map
   */
  setDistributedServers(servers: Map<string, DistributedServerInfo>): void;
}

/**
 * 文件获取结果
 */
export interface FileResult {
  /** 文件内容（Buffer） */
  buffer: Buffer;
  
  /** MIME类型 */
  mimeType: string;
  
  /** 文件大小（字节） */
  size: number;
  
  /** 是否来自缓存 */
  fromCache: boolean;
  
  /** 来源（local/distributed/fetched） */
  source: 'local' | 'distributed' | 'fetched';
}

/**
 * 缓存统计信息
 */
export interface CacheStats {
  /** 缓存命中次数 */
  hits: number;
  
  /** 缓存未命中次数 */
  misses: number;
  
  /** 命中率 */
  hitRate: number;
  
  /** 缓存文件数 */
  cachedFiles: number;
  
  /** 缓存总大小（字节） */
  totalSize: number;
}

/**
 * WebSocket消息类型
 */
export interface WebSocketMessage {
  /** 消息类型 */
  type: string;
  
  /** 消息内容 */
  [key: string]: any;
}

/**
 * 分布式工具执行选项
 */
export interface DistributedExecutionOptions {
  /** 超时时间（毫秒，默认30000） */
  timeout?: number;
  
  /** 是否记录日志 */
  enableLogging?: boolean;
}

/**
 * 频道配置
 */
export interface ChannelConfig {
  /** 频道名称 */
  name: string;
  
  /** 路径前缀 */
  pathPrefix: string;
  
  /** 是否需要认证 */
  requireAuth?: boolean;
  
  /** 最大连接数 */
  maxConnections?: number;
  
  /** 消息大小限制（字节） */
  maxMessageSize?: number;
}

/**
 * WebSocket管理器配置
 */
export interface WebSocketManagerConfig {
  /** 是否启用心跳检测 */
  enableHeartbeat?: boolean;
  
  /** 心跳间隔（毫秒，默认30000） */
  heartbeatInterval?: number;
  
  /** 是否启用压缩 */
  enableCompression?: boolean;
  
  /** 最大消息大小（字节，默认10MB） */
  maxMessageSize?: number;
}

