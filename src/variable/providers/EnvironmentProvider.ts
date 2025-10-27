/**
 * Environment Variable Provider
 * 
 * 提供环境变量访问
 * 
 * @module @vcp/sdk/variable/providers
 */

import { IVariableProvider } from '../../types';
import { logger } from '../../utils/logger';

/**
 * 环境变量提供者
 * 
 * 支持所有以特定前缀开头的环境变量：
 * - Tar* - 目标变量
 * - Var* - 通用变量
 * - ENV_* - 环境变量
 * 
 * 参考：VCPToolBox messageProcessor.js Line 58-77
 */
export class EnvironmentProvider implements IVariableProvider {
  readonly name = 'EnvironmentProvider';

  private prefixes: string[];

  constructor(prefixes: string[] = ['Tar', 'Var', 'ENV_']) {
    this.prefixes = prefixes;
  }

  async resolve(key: string, context?: any): Promise<string | null> {
    // 检查key是否以支持的前缀开头
    const hasPrefix = this.prefixes.some(prefix => key.startsWith(prefix));
    if (!hasPrefix) {
      return null;
    }

    // 获取环境变量值
    const value = process.env[key];

    if (value === undefined) {
      logger.debug(`[EnvironmentProvider] Environment variable '${key}' not found`);
      return `[未配置 ${key}]`;
    }

    return value;
  }

  getSupportedKeys(): string[] {
    // 返回所有匹配前缀的环境变量
    const keys: string[] = [];
    for (const envKey in process.env) {
      if (this.prefixes.some(prefix => envKey.startsWith(prefix))) {
        keys.push(envKey);
      }
    }
    return keys;
  }

  /**
   * 添加支持的前缀
   * 
   * @param prefix - 前缀
   */
  addPrefix(prefix: string): void {
    if (!this.prefixes.includes(prefix)) {
      this.prefixes.push(prefix);
      logger.info(`[EnvironmentProvider] Added prefix: ${prefix}`);
    }
  }

  /**
   * 移除前缀
   * 
   * @param prefix - 前缀
   */
  removePrefix(prefix: string): void {
    const index = this.prefixes.indexOf(prefix);
    if (index > -1) {
      this.prefixes.splice(index, 1);
      logger.info(`[EnvironmentProvider] Removed prefix: ${prefix}`);
    }
  }

  /**
   * 获取所有前缀
   * 
   * @returns 前缀数组
   */
  getPrefixes(): string[] {
    return [...this.prefixes];
  }
}

