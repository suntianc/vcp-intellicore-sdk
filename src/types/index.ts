/**
 * VCP SDK Core Types
 * 
 * 定义VCP协议的核心类型和接口
 * 
 * @module @vcp/sdk/types
 */

/**
 * VCP工具请求
 */
export interface VCPToolRequest {
  /** 工具名称 */
  name: string;
  /** 工具参数 */
  args: Record<string, any>;
  /** 是否为Archery异步工具 */
  archery: boolean;
  /** 原始请求文本（用于调试） */
  rawText?: string;
}

/**
 * VCP工具执行结果
 */
export interface VCPToolResult {
  /** 工具名称 */
  tool: string;
  /** 执行结果 */
  result: any;
  /** 是否成功 */
  success: boolean;
  /** 错误信息（如果失败） */
  error?: string;
  /** 富内容（图片、文件等） */
  richContent?: RichContent[];
}

/**
 * 富内容类型
 */
export interface RichContent {
  type: 'image' | 'file' | 'video' | 'audio';
  url?: string;
  data?: string;
  filename?: string;
  mimeType?: string;
}

/**
 * VCP协议解析器接口
 */
export interface IVCPProtocolParser {
  /**
   * 从AI响应中解析工具请求
   * @param content - AI响应内容
   * @returns 解析出的工具请求数组
   */
  parseToolRequests(content: string): VCPToolRequest[];

  /**
   * 格式化工具结果为AI可读的文本
   * @param result - 工具执行结果
   * @returns 格式化后的文本
   */
  formatToolResult(result: VCPToolResult): string;

  /**
   * 检查内容中是否包含工具请求标记
   * @param content - 待检查的内容
   * @returns 是否包含工具请求
   */
  hasToolRequests(content: string): boolean;
}

/**
 * VCP协议解析配置
 */
export interface VCPProtocolConfig {
  /** 工具请求起始标记，默认：<<<[TOOL_REQUEST]>>> */
  toolRequestStartMarker?: string;
  /** 工具请求结束标记，默认：<<<[END_TOOL_REQUEST]>>> */
  toolRequestEndMarker?: string;
  /** 参数起始标记，默认：「始」 */
  paramStartMarker?: string;
  /** 参数结束标记，默认：「末」 */
  paramEndMarker?: string;
  /** 是否启用调试模式 */
  debug?: boolean;
}

/**
 * 变量提供者接口
 */
export interface IVariableProvider {
  /** 提供者名称 */
  name: string;
  
  /**
   * 解析变量
   * @param key - 变量键名
   * @param context - 上下文信息
   * @returns 解析后的值，如果无法解析返回null
   */
  resolve(key: string, context?: any): Promise<string | null>;

  /**
   * 获取该提供者支持的变量键列表
   * @returns 支持的变量键数组
   */
  getSupportedKeys(): string[];
}

/**
 * 变量引擎接口
 */
export interface IVariableEngine {
  /**
   * 解析内容中的所有变量
   * @param content - 包含变量占位符的内容
   * @param context - 上下文信息
   * @returns 解析后的内容
   */
  resolveAll(content: string, context?: any): Promise<string>;

  /**
   * 注册变量提供者
   * @param provider - 变量提供者
   */
  registerProvider(provider: IVariableProvider): void;

  /**
   * 移除变量提供者
   * @param providerName - 提供者名称
   */
  removeProvider(providerName: string): void;

  /**
   * 获取所有已注册的提供者
   */
  getProviders(): IVariableProvider[];
}

/**
 * 变量引擎配置
 */
export interface VariableEngineOptions {
  /** 是否启用递归解析（变量值中可能包含其他变量） */
  enableRecursion?: boolean;
  /** 最大递归深度（防止循环依赖） */
  maxRecursionDepth?: number;
  /** 是否检测循环依赖 */
  detectCircular?: boolean;
  /** 变量占位符格式，默认：{{KEY}} */
  placeholderPattern?: RegExp;
}

/**
 * 插件清单
 */
export interface PluginManifest {
  /** 插件ID */
  id: string;
  /** 插件名称 */
  name: string;
  /** 插件版本 */
  version: string;
  /** 插件描述 */
  description: string;
  /** 插件作者 */
  author?: string;
  /** 插件类型 */
  type: 'direct' | 'distributed' | 'preprocessor' | 'service' | 'static' | 'internal';
  /** 能力配置 */
  capabilities?: {
    /** 调用命令（工具定义） */
    invocationCommands?: Array<{
      /** 命令名称/工具名称 */
      command?: string;
      /** 工具描述 */
      description?: string;
      /** 使用示例 */
      example?: string;
      /** 参数说明 */
      parameters?: any;
    }>;
    /** 是否支持流式响应 */
    streaming?: boolean;
    /** 是否为Archery异步工具 */
    archery?: boolean;
  };
  /** WebSocket推送配置 */
  webSocketPush?: {
    /** 是否启用WebSocket推送 */
    enabled: boolean;
    /** 消息类型 */
    messageType?: string;
    /** 目标客户端类型 */
    targetClientType?: 'VCPLog' | 'Distributed' | 'all';
  };
  /** 主入口文件 */
  main?: string;
  /** 依赖项 */
  dependencies?: Record<string, string>;
}

/**
 * 插件运行时接口
 */
export interface IPluginRuntime {
  /**
   * 注册插件
   * @param manifest - 插件清单
   */
  registerPlugin(manifest: PluginManifest): Promise<void>;

  /**
   * 执行插件
   * @param name - 插件名称
   * @param args - 执行参数
   * @returns 执行结果
   */
  executePlugin(name: string, args: any): Promise<any>;

  /**
   * 获取所有工具描述
   * @returns 工具名称到描述的映射
   */
  getToolDescriptions(): Map<string, string>;
  
  /**
   * 处理消息（通过所有预处理器）
   * @param messages - 原始消息数组
   * @returns 处理后的消息
   */
  processMessages(messages: any[]): Promise<any[]>;
  
  /**
   * 设置分布式工具执行器
   * @param executor - 执行器函数
   */
  setDistributedExecutor(executor: (serverId: string, toolName: string, args: any) => Promise<any>): void;
  
  /**
   * 获取服务模块
   * @param name - 服务名称
   * @returns 服务实例
   */
  getServiceModule(name: string): any;
  
  /**
   * 获取静态占位符值
   * @returns 占位符映射
   */
  getStaticPlaceholders(): Map<string, string>;

  /**
   * 获取单个插件的描述
   * @param name - 插件名称
   * @returns 插件描述文本
   */
  getIndividualPluginDescription(name: string): string | null;

  /**
   * 卸载插件
   * @param name - 插件名称
   */
  unloadPlugin(name: string): Promise<void>;

  /**
   * 获取所有已注册的插件
   */
  getPlugins(): PluginManifest[];
}

/**
 * VCP错误码枚举
 */
export enum VCPErrorCode {
  // 协议错误 (1000-1999)
  PROTOCOL_PARSE_ERROR = 'PROTOCOL_PARSE_ERROR',
  INVALID_TOOL_REQUEST = 'INVALID_TOOL_REQUEST',
  INVALID_PARAMETER_FORMAT = 'INVALID_PARAMETER_FORMAT',
  
  // 工具执行错误 (2000-2999)
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  TOOL_EXECUTION_FAILED = 'TOOL_EXECUTION_FAILED',
  TOOL_TIMEOUT = 'TOOL_TIMEOUT',
  INVALID_TOOL_ARGS = 'INVALID_TOOL_ARGS',
  
  // 变量引擎错误 (3000-3999)
  VARIABLE_RESOLVE_ERROR = 'VARIABLE_RESOLVE_ERROR',
  CIRCULAR_DEPENDENCY = 'CIRCULAR_DEPENDENCY',
  MAX_RECURSION_DEPTH = 'MAX_RECURSION_DEPTH',
  PROVIDER_NOT_FOUND = 'PROVIDER_NOT_FOUND',
  
  // 分布式通信错误 (4000-4999)
  DISTRIBUTED_CONNECTION_ERROR = 'DISTRIBUTED_CONNECTION_ERROR',
  DISTRIBUTED_TIMEOUT = 'DISTRIBUTED_TIMEOUT',
  DISTRIBUTED_AUTH_FAILED = 'DISTRIBUTED_AUTH_FAILED',
  
  // 插件错误 (5000-5999)
  PLUGIN_LOAD_ERROR = 'PLUGIN_LOAD_ERROR',
  PLUGIN_INIT_ERROR = 'PLUGIN_INIT_ERROR',
  PLUGIN_NOT_FOUND = 'PLUGIN_NOT_FOUND',
  INVALID_PLUGIN_MANIFEST = 'INVALID_PLUGIN_MANIFEST',
  
  // WebSocket错误 (6000-6999)
  WEBSOCKET_CONNECTION_ERROR = 'WEBSOCKET_CONNECTION_ERROR',
  WEBSOCKET_AUTH_FAILED = 'WEBSOCKET_AUTH_FAILED',
  WEBSOCKET_MESSAGE_ERROR = 'WEBSOCKET_MESSAGE_ERROR',
  
  // 配置错误 (7000-7999)
  INVALID_CONFIG = 'INVALID_CONFIG',
  MISSING_REQUIRED_CONFIG = 'MISSING_REQUIRED_CONFIG',
}

/**
 * VCP错误基类
 */
export class VCPError extends Error {
  constructor(
    public code: VCPErrorCode,
    message: string,
    public details?: any,
  ) {
    super(message);
    this.name = 'VCPError';
  }
}

/**
 * 协议解析错误
 */
export class ProtocolParseError extends VCPError {
  constructor(message: string, details?: any) {
    super(VCPErrorCode.PROTOCOL_PARSE_ERROR, message, details);
    this.name = 'ProtocolParseError';
  }
}

/**
 * 工具执行错误
 */
export class ToolExecutionError extends VCPError {
  constructor(message: string, details?: any) {
    super(VCPErrorCode.TOOL_EXECUTION_FAILED, message, details);
    this.name = 'ToolExecutionError';
  }
}

/**
 * 循环依赖错误
 */
export class CircularDependencyError extends VCPError {
  constructor(message: string, details?: any) {
    super(VCPErrorCode.CIRCULAR_DEPENDENCY, message, details);
    this.name = 'CircularDependencyError';
  }
}

/**
 * 分布式通信错误
 */
export class DistributedCommunicationError extends VCPError {
  constructor(code: VCPErrorCode, message: string, details?: any) {
    super(code, message, details);
    this.name = 'DistributedCommunicationError';
  }
}

/**
 * 导出通信模块类型
 */
export * from './communication';
