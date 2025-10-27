/**
 * VCP Variable Engine
 * 
 * 变量占位符解析引擎，支持递归解析和循环依赖检测
 * 
 * @module @vcp/sdk/variable
 */

import {
  IVariableEngine,
  IVariableProvider,
  VariableEngineOptions,
  CircularDependencyError,
  VCPErrorCode,
  VCPError,
} from '../types';
import { logger } from '../utils/logger';

/**
 * 变量引擎默认配置
 */
const DEFAULT_OPTIONS: Required<VariableEngineOptions> = {
  enableRecursion: true,
  maxRecursionDepth: 10,
  detectCircular: true,
  placeholderPattern: /\{\{([a-zA-Z0-9_:]+)\}\}/g,
};

/**
 * 变量引擎实现
 * 
 * 核心功能：
 * - 解析 {{KEY}} 格式的占位符
 * - 支持递归解析（变量值中可能包含其他变量）
 * - 循环依赖检测
 * - 多提供者支持
 * 
 * 基于VCPToolBox的messageProcessor.js实现
 * 参考：D:/VCPToolBox/modules/messageProcessor.js
 */
export class VariableEngine implements IVariableEngine {
  private providers: Map<string, IVariableProvider>;
  private options: Required<VariableEngineOptions>;
  private cachedPlaceholderRegex: RegExp;
  private regexCache: Map<string, RegExp>;
  private static readonly MAX_PLACEHOLDERS = 100; // 防止DoS攻击

  constructor(options?: VariableEngineOptions) {
    this.providers = new Map();
    this.options = { ...DEFAULT_OPTIONS, ...options };
    // 缓存占位符正则表达式
    this.cachedPlaceholderRegex = new RegExp(this.options.placeholderPattern.source, 'g');
    // RegExp缓存池
    this.regexCache = new Map();
  }

  /**
   * 解析内容中的所有变量
   * 
   * 实现逻辑参考VCPToolBox的resolveAllVariables():
   * 1. 提取所有占位符
   * 2. 遍历所有提供者
   * 3. 递归解析（如果启用）
   * 4. 循环依赖检测（如果启用）
   * 
   * @param content - 包含变量占位符的内容
   * @param context - 上下文信息
   * @returns 解析后的内容
   */
  async resolveAll(content: string, context?: any): Promise<string> {
    if (content == null || content === '') {
      return '';
    }

    let processedContent = String(content);
    const processingStack = new Set<string>();

    // 如果启用递归，使用递归解析
    if (this.options.enableRecursion) {
      processedContent = await this.resolveRecursive(
        processedContent,
        context,
        processingStack,
        0,
      );
    } else {
      // 单次解析
      processedContent = await this.resolveSingle(processedContent, context);
    }

    return processedContent;
  }

  /**
   * 递归解析变量
   * 
   * 优化：批量替换，减少RegExp创建次数
   * 
   * @param content - 内容
   * @param context - 上下文
   * @param processingStack - 处理栈（用于检测循环依赖）
   * @param depth - 当前递归深度
   * @returns 解析后的内容
   */
  private async resolveRecursive(
    content: string,
    context: any,
    processingStack: Set<string>,
    depth: number,
  ): Promise<string> {
    // 检查递归深度
    if (depth >= this.options.maxRecursionDepth) {
      logger.warn(
        `[VariableEngine] Max recursion depth (${this.options.maxRecursionDepth}) reached`,
      );
      throw new VCPError(
        VCPErrorCode.MAX_RECURSION_DEPTH,
        `Maximum recursion depth of ${this.options.maxRecursionDepth} exceeded`,
        { depth, content: content.substring(0, 100) },
      );
    }

    let processedContent = content;

    // 提取所有占位符
    const placeholders = this.extractPlaceholders(processedContent);
    
    // 安全检查：限制占位符数量，防止DoS攻击
    if (placeholders.length > VariableEngine.MAX_PLACEHOLDERS) {
      logger.warn(
        `[VariableEngine] Too many placeholders (${placeholders.length}), limit is ${VariableEngine.MAX_PLACEHOLDERS}`,
      );
      throw new VCPError(
        VCPErrorCode.VARIABLE_RESOLVE_ERROR,
        `Too many placeholders: ${placeholders.length} (max: ${VariableEngine.MAX_PLACEHOLDERS})`,
        { count: placeholders.length },
      );
    }

    // 优化：收集所有需要替换的占位符（批量处理）
    const replacements = new Map<string, string>();

    // 遍历所有占位符，收集替换值
    for (const placeholder of placeholders) {
      const key = placeholder.key;
      const fullPlaceholder = placeholder.full;

      // 循环依赖检测
      if (this.options.detectCircular && processingStack.has(key)) {
        const stack = Array.from(processingStack).join(' -> ');
        logger.error(
          `[VariableEngine] Circular dependency detected! Stack: [${stack} -> ${key}]`,
        );
        throw new CircularDependencyError(
          `Circular variable reference detected for '${key}'`,
          { stack, key },
        );
      }

      // 尝试从所有提供者解析
      let resolved: string | null = null;
      for (const provider of this.providers.values()) {
        try {
          resolved = await provider.resolve(key, context);
          if (resolved !== null) {
            // 如果解析成功，递归解析结果中可能包含的变量
            processingStack.add(key);
            resolved = await this.resolveRecursive(
              resolved,
              context,
              processingStack,
              depth + 1,
            );
            processingStack.delete(key);
            break; // 找到第一个能解析的提供者就停止
          }
        } catch (error) {
          logger.error(
            `[VariableEngine] Error resolving variable '${key}' with provider '${provider.name}':`,
            error,
          );
          // 如果是循环依赖错误，直接抛出
          if (error instanceof CircularDependencyError) {
            throw error;
          }
          // 其他错误继续尝试下一个提供者
        }
      }

      // 收集需要替换的占位符
      if (resolved !== null) {
        replacements.set(fullPlaceholder, resolved);
      } else {
        logger.debug(`[VariableEngine] Variable '${key}' not resolved, keeping original`);
      }
    }

    // 批量替换所有占位符（优化：减少字符串操作次数）
    for (const [placeholder, value] of replacements) {
      const regex = this.getOrCreateRegex(placeholder);
      processedContent = processedContent.replace(regex, value);
    }

    return processedContent;
  }

  /**
   * 单次解析（不递归）
   * 
   * 优化：批量替换，减少RegExp创建次数
   * 
   * @param content - 内容
   * @param context - 上下文
   * @returns 解析后的内容
   */
  private async resolveSingle(content: string, context: any): Promise<string> {
    let processedContent = content;
    const placeholders = this.extractPlaceholders(processedContent);
    
    // 优化：收集所有需要替换的占位符
    const replacements = new Map<string, string>();

    for (const placeholder of placeholders) {
      const key = placeholder.key;
      const fullPlaceholder = placeholder.full;

      let resolved: string | null = null;
      for (const provider of this.providers.values()) {
        try {
          resolved = await provider.resolve(key, context);
          if (resolved !== null) {
            break;
          }
        } catch (error) {
          logger.error(
            `[VariableEngine] Error resolving variable '${key}' with provider '${provider.name}':`,
            error,
          );
        }
      }

      if (resolved !== null) {
        replacements.set(fullPlaceholder, resolved);
      }
    }
    
    // 批量替换
    for (const [placeholder, value] of replacements) {
      const regex = this.getOrCreateRegex(placeholder);
      processedContent = processedContent.replace(regex, value);
    }

    return processedContent;
  }

  /**
   * 转义正则表达式特殊字符
   * 
   * @param str - 待转义的字符串
   * @returns 转义后的字符串
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 获取或创建缓存的正则表达式
   * 
   * 优化：避免重复创建相同的RegExp对象
   * 
   * @param placeholder - 占位符字符串
   * @returns 编译后的正则表达式
   */
  private getOrCreateRegex(placeholder: string): RegExp {
    const cacheKey = placeholder;
    
    if (this.regexCache.has(cacheKey)) {
      return this.regexCache.get(cacheKey)!;
    }
    
    const regex = new RegExp(this.escapeRegex(placeholder), 'g');
    
    // 限制缓存大小，防止内存泄漏
    if (this.regexCache.size > 200) {
      // 清空缓存（简单策略，可以改为LRU）
      this.regexCache.clear();
      logger.debug('[VariableEngine] RegExp cache cleared (size limit reached)');
    }
    
    this.regexCache.set(cacheKey, regex);
    return regex;
  }

  /**
   * 提取占位符
   * 
   * 优化：使用缓存的占位符正则表达式
   * 
   * @param content - 内容
   * @returns 占位符数组
   */
  private extractPlaceholders(content: string): Array<{ key: string; full: string }> {
    const placeholders: Array<{ key: string; full: string }> = [];
    // 优化：使用缓存的正则表达式
    const regex = new RegExp(this.cachedPlaceholderRegex.source, 'g');
    
    let match;
    while ((match = regex.exec(content)) !== null) {
      placeholders.push({
        key: match[1],
        full: match[0],
      });
    }

    // 去重
    const seen = new Set<string>();
    return placeholders.filter(p => {
      if (seen.has(p.key)) {
        return false;
      }
      seen.add(p.key);
      return true;
    });
  }

  /**
   * 注册变量提供者
   * 
   * @param provider - 变量提供者
   */
  registerProvider(provider: IVariableProvider): void {
    if (this.providers.has(provider.name)) {
      logger.warn(`[VariableEngine] Provider '${provider.name}' already registered, replacing`);
    }
    this.providers.set(provider.name, provider);
    logger.info(`[VariableEngine] Provider '${provider.name}' registered`);
  }

  /**
   * 移除变量提供者
   * 
   * @param providerName - 提供者名称
   */
  removeProvider(providerName: string): void {
    if (this.providers.delete(providerName)) {
      logger.info(`[VariableEngine] Provider '${providerName}' removed`);
    } else {
      logger.warn(`[VariableEngine] Provider '${providerName}' not found`);
    }
  }

  /**
   * 获取所有已注册的提供者
   * 
   * @returns 提供者数组
   */
  getProviders(): IVariableProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * 更新配置
   * 
   * @param options - 新配置
   */
  updateOptions(options: Partial<VariableEngineOptions>): void {
    this.options = { ...this.options, ...options };
    logger.info('[VariableEngine] Options updated', this.options);
  }

  /**
   * 获取当前配置
   * 
   * @returns 当前配置的副本
   */
  getOptions(): VariableEngineOptions {
    return { ...this.options };
  }

  /**
   * 清空RegExp缓存
   * 
   * 用于内存管理或配置更新后
   */
  clearRegexCache(): void {
    this.regexCache.clear();
    logger.debug('[VariableEngine] RegExp cache cleared manually');
  }

  /**
   * 获取缓存统计信息
   * 
   * @returns 缓存统计
   */
  getCacheStats(): { regexCacheSize: number; providerCount: number } {
    return {
      regexCacheSize: this.regexCache.size,
      providerCount: this.providers.size,
    };
  }
}

/**
 * 创建默认的变量引擎实例
 * 
 * @param options - 可选配置
 * @returns 变量引擎实例
 */
export function createVariableEngine(options?: VariableEngineOptions): IVariableEngine {
  return new VariableEngine(options);
}

