/**
 * Time Variable Provider
 * 
 * 提供时间相关的变量
 * 
 * @module @vcp/sdk/variable/providers
 */

import { IVariableProvider } from '../../types';

/**
 * 时间变量提供者
 * 
 * 支持的变量：
 * - {{Date}} - 当前日期（YYYY/M/D格式）
 * - {{Time}} - 当前时间（HH:MM:SS格式）
 * - {{Today}} - 星期几
 * - {{DateTime}} - 日期时间组合
 * - {{Timestamp}} - Unix时间戳
 * - {{ISO8601}} - ISO 8601格式
 * 
 * 参考：VCPToolBox messageProcessor.js Line 117-131
 */
export class TimeProvider implements IVariableProvider {
  readonly name = 'TimeProvider';

  private supportedKeys: Set<string>;

  constructor() {
    this.supportedKeys = new Set([
      'Date',
      'Time',
      'Today',
      'DateTime',
      'Timestamp',
      'ISO8601',
    ]);
  }

  async resolve(key: string, context?: any): Promise<string | null> {
    if (!this.supportedKeys.has(key)) {
      return null;
    }

    const now = new Date();

    switch (key) {
      case 'Date':
        // 格式: 2025/10/27
        return now.toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });

      case 'Time':
        // 格式: 14:30:45
        return now.toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai' });

      case 'Today':
        // 格式: 星期一
        return now.toLocaleDateString('zh-CN', { weekday: 'long', timeZone: 'Asia/Shanghai' });

      case 'DateTime':
        // 格式: 2025/10/27 14:30:45
        const date = now.toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
        const time = now.toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai' });
        return `${date} ${time}`;

      case 'Timestamp':
        // Unix时间戳（秒）
        return Math.floor(now.getTime() / 1000).toString();

      case 'ISO8601':
        // ISO 8601格式
        return now.toISOString();

      default:
        return null;
    }
  }

  getSupportedKeys(): string[] {
    return Array.from(this.supportedKeys);
  }
}

