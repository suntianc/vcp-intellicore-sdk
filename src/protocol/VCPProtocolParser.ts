/**
 * VCP Protocol Parser
 * 
 * 解析VCP协议格式的工具请求和格式化工具结果
 * 
 * @module @vcp/sdk/protocol
 */

import {
  IVCPProtocolParser,
  VCPToolRequest,
  VCPToolResult,
  VCPProtocolConfig,
  ProtocolParseError,
} from '../types';
import { logger } from '../utils/logger';

/**
 * VCP协议解析器默认配置
 */
const DEFAULT_CONFIG: Required<VCPProtocolConfig> = {
  toolRequestStartMarker: '<<<[TOOL_REQUEST]>>>',
  toolRequestEndMarker: '<<<[END_TOOL_REQUEST]>>>',
  paramStartMarker: '「始」',
  paramEndMarker: '「末」',
  debug: false,
};

/**
 * VCP协议解析器实现
 * 
 * 基于VCPToolBox的chatCompletionHandler.js实现
 * 参考：D:/VCPToolBox/modules/chatCompletionHandler.js (Line 449-501)
 */
export class VCPProtocolParser implements IVCPProtocolParser {
  private config: Required<VCPProtocolConfig>;

  constructor(config?: VCPProtocolConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 解析工具请求
   * 
   * 实现逻辑参考VCPToolBox:
   * - 查找 <<<[TOOL_REQUEST]>>> 到 <<<[END_TOOL_REQUEST]>>> 之间的内容
   * - 使用正则提取参数: /([\w_]+)\s*:\s*「始」([\s\S]*?)「末」\s*(?:,)?/g
   * - 识别 tool_name 和 archery 标记
   * 
   * @param content - AI响应内容
   * @returns 解析出的工具请求数组
   */
  parseToolRequests(content: string): VCPToolRequest[] {
    const toolRequests: VCPToolRequest[] = [];
    let searchOffset = 0;

    while (searchOffset < content.length) {
      // 查找工具请求起始标记
      const startIndex = content.indexOf(this.config.toolRequestStartMarker, searchOffset);
      if (startIndex === -1) break;

      // 查找工具请求结束标记
      const endIndex = content.indexOf(
        this.config.toolRequestEndMarker,
        startIndex + this.config.toolRequestStartMarker.length,
      );

      if (endIndex === -1) {
        if (this.config.debug) {
          logger.warn(
            `[VCPProtocolParser] Found TOOL_REQUEST_START but no END marker after offset ${searchOffset}`,
          );
        }
        searchOffset = startIndex + this.config.toolRequestStartMarker.length;
        continue;
      }

      // 提取请求块内容
      const requestBlockContent = content
        .substring(startIndex + this.config.toolRequestStartMarker.length, endIndex)
        .trim();

      try {
        const toolRequest = this.parseRequestBlock(requestBlockContent);
        if (toolRequest) {
          toolRequests.push(toolRequest);
          if (this.config.debug) {
            logger.info(
              `[VCPProtocolParser] Parsed tool request: ${toolRequest.name}, Archery: ${toolRequest.archery}`,
              toolRequest.args,
            );
          }
        }
      } catch (error) {
        logger.error('[VCPProtocolParser] Failed to parse request block:', error);
        if (this.config.debug) {
          logger.debug('[VCPProtocolParser] Request block content:', requestBlockContent.substring(0, 200));
        }
      }

      searchOffset = endIndex + this.config.toolRequestEndMarker.length;
    }

    return toolRequests;
  }

  /**
   * 解析单个请求块
   * 
   * @param blockContent - 请求块内容（不含标记）
   * @returns 解析后的工具请求，如果解析失败返回null
   */
  private parseRequestBlock(blockContent: string): VCPToolRequest | null {
    const parsedArgs: Record<string, any> = {};
    let toolName: string | null = null;
    let isArchery = false;

    // 构建参数提取正则
    // 格式: key:「始」value「末」
    const paramRegex = new RegExp(
      `([\\w_]+)\\s*:\\s*${this.escapeRegex(this.config.paramStartMarker)}([\\s\\S]*?)${this.escapeRegex(
        this.config.paramEndMarker,
      )}\\s*(?:,)?`,
      'g',
    );

    let match;
    while ((match = paramRegex.exec(blockContent)) !== null) {
      const key = match[1];
      const value = match[2].trim();

      if (key === 'tool_name') {
        toolName = value;
      } else if (key === 'archery') {
        isArchery = value === 'true' || value === 'no_reply';
      } else {
        parsedArgs[key] = value;
      }
    }

    if (!toolName) {
      if (this.config.debug) {
        logger.warn(
          '[VCPProtocolParser] Parsed a tool request block but no tool_name found:',
          blockContent.substring(0, 100),
        );
      }
      return null;
    }

    return {
      name: toolName,
      args: parsedArgs,
      archery: isArchery,
      rawText: blockContent,
    };
  }

  /**
   * 格式化工具结果
   * 
   * 参考VCPToolBox的结果格式化逻辑
   * 
   * @param result - 工具执行结果
   * @returns 格式化后的文本
   */
  formatToolResult(result: VCPToolResult): string {
    const lines: string[] = [];

    lines.push(`### 🛠️ 工具执行结果: ${result.tool}`);
    lines.push('');

    if (!result.success) {
      lines.push('**执行状态**: ❌ 失败');
      if (result.error) {
        lines.push(`**错误信息**: ${result.error}`);
      }
    } else {
      lines.push('**执行状态**: ✅ 成功');
    }

    lines.push('');
    lines.push('**返回结果**:');

    // 格式化结果内容
    let resultText: string;
    if (typeof result.result === 'string') {
      resultText = result.result;
    } else if (typeof result.result === 'object' && result.result !== null) {
      try {
        resultText = JSON.stringify(result.result, null, 2);
      } catch (error) {
        resultText = String(result.result);
      }
    } else {
      resultText = String(result.result);
    }

    lines.push('```');
    lines.push(resultText);
    lines.push('```');

    // 添加富内容信息
    if (result.richContent && result.richContent.length > 0) {
      lines.push('');
      lines.push('**附加内容**:');
      result.richContent.forEach((content, index) => {
        lines.push(`${index + 1}. [${content.type}] ${content.filename || content.url || 'Data'}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * 检查内容是否包含工具请求
   * 
   * @param content - 待检查的内容
   * @returns 是否包含工具请求
   */
  hasToolRequests(content: string): boolean {
    return content.includes(this.config.toolRequestStartMarker);
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
   * 更新配置
   * 
   * @param config - 新配置
   */
  updateConfig(config: Partial<VCPProtocolConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取当前配置
   * 
   * @returns 当前配置的副本
   */
  getConfig(): VCPProtocolConfig {
    return { ...this.config };
  }
}

/**
 * 创建默认的VCP协议解析器实例
 * 
 * @param config - 可选配置
 * @returns VCP协议解析器实例
 */
export function createVCPProtocolParser(config?: VCPProtocolConfig): IVCPProtocolParser {
  return new VCPProtocolParser(config);
}

