/**
 * VCP SDK - Internal Module
 * 
 * VCP IntelliCore的内部SDK模块
 * 为将来独立发布做准备，当前作为内部模块使用
 * 
 * @module @vcp/sdk
 * @version 0.1.0-internal
 * @author VCP IntelliCore Team
 * 
 * @example
 * ```typescript
 * import { createVCPProtocolParser } from './sdk';
 * 
 * const parser = createVCPProtocolParser({ debug: true });
 * const toolRequests = parser.parseToolRequests(aiResponse);
 * ```
 */

// ========== Types ==========
export * from './types';

// ========== Protocol Parser ==========
export {
  VCPProtocolParser,
  createVCPProtocolParser,
} from './protocol';

// ========== Variable Engine ==========
export {
  VariableEngine,
  createVariableEngine,
  TimeProvider,
  EnvironmentProvider,
  PlaceholderProvider,
  ToolDescriptionProvider,
} from './variable';

// ========== Plugin Runtime ==========
export {
  PluginRuntime,
  createPluginRuntime,
} from './plugin';
export type { PluginRuntimeOptions } from './plugin';

// ========== Communication ==========
export {
  BaseChannel,
  WebSocketManager,
  FileFetcher,
  VCPLogChannelSDK,
  VCPInfoChannelSDK,
  DistributedServerChannelSDK,
  ChromeObserverChannelSDK,
  AdminPanelChannelSDK,
  createWebSocketManager,
  createFileFetcher
} from './communication';

/**
 * SDK版本信息
 */
export const SDK_VERSION = '0.1.0-internal';

/**
 * SDK构建信息
 */
export const SDK_BUILD_INFO = {
  version: SDK_VERSION,
  buildDate: new Date().toISOString(),
  isInternal: true,
  targetRelease: '1.0.0',
};

