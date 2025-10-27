/**
 * VCP SDK - 通信服务模块
 * 
 * WebSocket管理、频道系统、文件传输服务
 * 
 * @module @vcp/sdk/communication
 */

// 基础类
export { BaseChannel } from './BaseChannel';
export { WebSocketManager } from './WebSocketManager';
export { FileFetcher } from './FileFetcher';

// 频道实现
export { VCPLogChannelSDK } from './channels/VCPLogChannelSDK';
export { DistributedServerChannelSDK } from './channels/DistributedServerChannelSDK';
export { VCPInfoChannelSDK } from './channels/VCPInfoChannelSDK';
export { ChromeObserverChannelSDK } from './channels/ChromeObserverChannelSDK';
export { AdminPanelChannelSDK } from './channels/AdminPanelChannelSDK';

// 工厂函数
import { WebSocketManager as WSManager } from './WebSocketManager';
import { FileFetcher as FFetcher } from './FileFetcher';

export function createWebSocketManager(config?: any) {
  return new WSManager(config);
}

export function createFileFetcher(cacheDir?: string) {
  return new FFetcher(cacheDir);
}

