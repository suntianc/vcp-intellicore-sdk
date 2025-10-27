/**
 * Tool Description Variable Provider
 * 
 * 提供工具描述变量解析
 * 
 * @module @vcp/sdk/variable/providers
 */

import { IVariableProvider, IPluginRuntime } from '../../types';
import { logger } from '../../utils/logger';

/**
 * 工具描述提供者
 * 
 * 支持的变量：
 * - {{VCPAllTools}} - 所有工具描述列表
 * - {{ToolName}} - 单个工具描述（如 {{MockDice}}）
 * 
 * 参考：VCPToolBox messageProcessor.js Line 141-157
 */
export class ToolDescriptionProvider implements IVariableProvider {
  readonly name = 'ToolDescriptionProvider';

  private pluginRuntime: IPluginRuntime | null;

  constructor(pluginRuntime?: IPluginRuntime) {
    this.pluginRuntime = pluginRuntime || null;
  }

  /**
   * 设置插件运行时
   * 
   * @param pluginRuntime - 插件运行时实例
   */
  setPluginRuntime(pluginRuntime: IPluginRuntime): void {
    this.pluginRuntime = pluginRuntime;
    logger.info('[ToolDescriptionProvider] Plugin runtime set');
  }

  async resolve(key: string, context?: any): Promise<string | null> {
    if (!this.pluginRuntime) {
      logger.warn('[ToolDescriptionProvider] Plugin runtime not set, cannot resolve tool descriptions');
      return null;
    }

    // 处理 {{VCPAllTools}}
    if (key === 'VCPAllTools') {
      return this.resolveAllTools();
    }

    // 处理单个工具描述（如 {{MockDice}}）
    return this.resolveSingleTool(key);
  }

  /**
   * 解析所有工具描述
   * 
   * 参考：messageProcessor.js Line 148-157
   * 
   * @returns 所有工具描述，用分隔符连接
   */
  private async resolveAllTools(): Promise<string> {
    if (!this.pluginRuntime) {
      return '没有可用的VCP工具描述信息';
    }

    try {
      const toolDescriptions = this.pluginRuntime.getToolDescriptions();
      
      if (!toolDescriptions || toolDescriptions.size === 0) {
        logger.debug('[ToolDescriptionProvider] No tool descriptions available');
        return '没有可用的VCP工具描述信息';
      }

      // 将所有工具描述用分隔符连接
      const descriptionsList: string[] = [];
      for (const description of toolDescriptions.values()) {
        if (description) {
          descriptionsList.push(description);
        }
      }

      if (descriptionsList.length === 0) {
        return '没有可用的VCP工具描述信息';
      }

      // 使用与VCPToolBox相同的分隔符
      const allToolsString = descriptionsList.join('\n\n---\n\n');
      
      logger.info(`[ToolDescriptionProvider] Resolved {{VCPAllTools}}: ${descriptionsList.length} tools`);
      
      return allToolsString;
    } catch (error) {
      logger.error('[ToolDescriptionProvider] Error resolving all tools:', error);
      return '获取工具描述时出错';
    }
  }

  /**
   * 解析单个工具描述
   * 
   * 参考：messageProcessor.js Line 141-146
   * 
   * @param toolName - 工具名称
   * @returns 工具描述，如果不存在返回null
   */
  private async resolveSingleTool(toolName: string): Promise<string | null> {
    if (!this.pluginRuntime) {
      return null;
    }

    try {
      const toolDescriptions = this.pluginRuntime.getToolDescriptions();
      
      if (!toolDescriptions || toolDescriptions.size === 0) {
        return null;
      }

      // 检查是否存在该工具的描述
      if (toolDescriptions.has(toolName)) {
        const description = toolDescriptions.get(toolName);
        if (description) {
          logger.debug(`[ToolDescriptionProvider] Resolved {{${toolName}}}`);
          return description;
        }
      }

      // 如果没有找到，返回null（由VariableEngine决定是否保留占位符）
      return null;
    } catch (error) {
      logger.error(`[ToolDescriptionProvider] Error resolving tool '${toolName}':`, error);
      return null;
    }
  }

  getSupportedKeys(): string[] {
    if (!this.pluginRuntime) {
      return ['VCPAllTools'];
    }

    try {
      const toolDescriptions = this.pluginRuntime.getToolDescriptions();
      const keys = ['VCPAllTools'];
      
      if (toolDescriptions && toolDescriptions.size > 0) {
        // 添加所有工具名称作为支持的键
        for (const toolName of toolDescriptions.keys()) {
          keys.push(toolName);
        }
      }
      
      return keys;
    } catch (error) {
      logger.error('[ToolDescriptionProvider] Error getting supported keys:', error);
      return ['VCPAllTools'];
    }
  }

  /**
   * 获取当前已注册的工具数量
   * 
   * @returns 工具数量
   */
  getToolCount(): number {
    if (!this.pluginRuntime) {
      return 0;
    }

    try {
      const toolDescriptions = this.pluginRuntime.getToolDescriptions();
      return toolDescriptions ? toolDescriptions.size : 0;
    } catch (error) {
      return 0;
    }
  }
}

