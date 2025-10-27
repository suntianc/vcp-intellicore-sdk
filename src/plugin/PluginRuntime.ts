/**
 * VCP Plugin Runtime
 * 
 * 插件运行时环境，负责插件的生命周期管理、执行和通信
 * 
 * @module @vcp/sdk/plugin
 */

import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import {
  IPluginRuntime,
  PluginManifest,
  VCPError,
  VCPErrorCode,
} from '../types';
import { logger } from '../utils/logger';

/**
 * 插件运行时配置
 */
export interface PluginRuntimeOptions {
  /** 插件目录路径 */
  pluginDir?: string;
  /** 是否启用调试模式 */
  debug?: boolean;
  /** 是否自动发现插件 */
  autoDiscover?: boolean;
}

/**
 * 插件运行时实现
 * 
 * 核心功能：
 * - 插件注册与管理
 * - 工具执行路由
 * - 工具描述生成
 * - 6种插件类型支持
 * - WebSocket推送支持
 * 
 * 基于VCPToolBox的Plugin.js实现
 * 参考：D:/VCPToolBox/Plugin.js
 */
export class PluginRuntime extends EventEmitter implements IPluginRuntime {
  // 插件存储
  private plugins: Map<string, PluginManifest>;
  private distributedTools: Map<string, PluginManifest>;
  
  // 工具描述缓存
  private individualPluginDescriptions: Map<string, string>;
  
  // 各类型插件存储
  private messagePreprocessors: Map<string, any>;
  private preprocessorOrder: string[];
  private serviceModules: Map<string, any>;
  private staticPlaceholderValues: Map<string, string>;
  
  // 配置
  private options: PluginRuntimeOptions;
  private debug: boolean;
  
  // 依赖注入
  private distributedExecutor?: (serverId: string, toolName: string, args: any) => Promise<any>;
  
  constructor(options: PluginRuntimeOptions = {}) {
    super();
    
    this.plugins = new Map();
    this.distributedTools = new Map();
    this.individualPluginDescriptions = new Map();
    this.messagePreprocessors = new Map();
    this.preprocessorOrder = [];
    this.serviceModules = new Map();
    this.staticPlaceholderValues = new Map();
    
    this.options = options;
    this.debug = options.debug || false;
    
    logger.info('[PluginRuntime] Initializing VCP Plugin Runtime...');
  }
  
  /**
   * 注入分布式工具执行器
   * 
   * @param executor - 分布式工具执行函数
   */
  setDistributedExecutor(executor: (serverId: string, toolName: string, args: any) => Promise<any>): void {
    this.distributedExecutor = executor;
    logger.info('[PluginRuntime] Distributed executor has been set');
  }
  
  /**
   * 注册插件
   * 
   * 参考：Plugin.js Line 600-700
   * 
   * @param manifest - 插件清单
   */
  async registerPlugin(manifest: PluginManifest): Promise<void> {
    try {
      // 验证清单
      this.validateManifest(manifest);
      
      // 根据插件类型处理
      switch (manifest.type) {
        case 'distributed':
          await this.registerDistributedPlugin(manifest);
          break;
          
        case 'direct':
          await this.registerDirectPlugin(manifest);
          break;
          
        case 'preprocessor':
          await this.registerPreprocessorPlugin(manifest);
          break;
          
        case 'service':
          await this.registerServicePlugin(manifest);
          break;
          
        case 'static':
          await this.registerStaticPlugin(manifest);
          break;
          
        case 'internal':
          await this.registerInternalPlugin(manifest);
          break;
          
        default:
          throw new VCPError(
            VCPErrorCode.INVALID_PLUGIN_MANIFEST,
            `Unknown plugin type: ${manifest.type}`,
            { manifest },
          );
      }
      
      // 存储到插件表
      this.plugins.set(manifest.id, manifest);
      
      // 重建工具描述
      this.rebuildVCPDescriptions();
      
      logger.info(`[PluginRuntime] Plugin registered: ${manifest.name} (${manifest.type})`);
      
      // 发射事件
      this.emit('plugin_registered', { plugin: manifest });
      
    } catch (error) {
      logger.error(`[PluginRuntime] Failed to register plugin ${manifest.id}:`, error);
      throw new VCPError(
        VCPErrorCode.PLUGIN_LOAD_ERROR,
        `Failed to register plugin: ${manifest.id}`,
        { error, manifest },
      );
    }
  }
  
  /**
   * 执行插件
   * 
   * 参考：Plugin.js Line 574-850 (processToolCall)
   * 
   * @param name - 插件/工具名称
   * @param args - 执行参数
   * @returns 执行结果
   */
  async executePlugin(name: string, args: any): Promise<any> {
    const plugin = this.plugins.get(name) || this.distributedTools.get(name);
    
    if (!plugin) {
      throw new VCPError(
        VCPErrorCode.TOOL_NOT_FOUND,
        `Plugin "${name}" not found`,
        { name, availablePlugins: Array.from(this.plugins.keys()) },
      );
    }
    
    try {
      logger.info(`[PluginRuntime] Executing plugin: ${name} (${plugin.type})`);
      logger.debug(`[PluginRuntime] Args: ${JSON.stringify(args)}`);
      
      // 根据插件类型路由执行
      let result: any;
      
      if (plugin.type === 'distributed') {
        result = await this.executeDistributedPlugin(plugin, name, args);
      } else if (plugin.type === 'direct') {
        result = await this.executeDirectPlugin(plugin, args);
      } else if (plugin.type === 'internal') {
        result = await this.executeInternalPlugin(plugin, args);
      } else {
        throw new VCPError(
          VCPErrorCode.TOOL_EXECUTION_FAILED,
          `Plugin type "${plugin.type}" cannot be executed directly`,
          { plugin: name, type: plugin.type },
        );
      }
      
      logger.info(`[PluginRuntime] Plugin executed successfully: ${name}`);
      
      // 发射事件
      this.emit('plugin_executed', { plugin: name, result });
      
      return result;
      
    } catch (error) {
      logger.error(`[PluginRuntime] Plugin execution failed: ${name}`, error);
      
      // 发射错误事件
      this.emit('plugin_error', { plugin: name, error });
      
      throw new VCPError(
        VCPErrorCode.TOOL_EXECUTION_FAILED,
        `Plugin execution failed: ${name}`,
        { error, plugin: name },
      );
    }
  }
  
  /**
   * 获取所有工具描述
   * 
   * @returns 工具名称到描述的映射
   */
  getToolDescriptions(): Map<string, string> {
    return new Map(this.individualPluginDescriptions);
  }
  
  /**
   * 获取单个插件的描述
   * 
   * @param name - 插件名称
   * @returns 插件描述文本
   */
  getIndividualPluginDescription(name: string): string | null {
    const key = `VCP${name}`;
    return this.individualPluginDescriptions.get(key) || null;
  }
  
  /**
   * 批量注册来自分布式节点的工具
   * 
   * 参考：Plugin.js Line 1031-1055 (registerDistributedTools)
   * 
   * @param serverId - 分布式服务器ID
   * @param tools - 工具清单数组
   */
  registerDistributedTools(serverId: string, tools: PluginManifest[]): void {
    logger.info(`[PluginRuntime] Registering ${tools.length} tools from distributed server: ${serverId}`);
    
    for (const toolManifest of tools) {
      if (!toolManifest.name || !toolManifest.id) {
        logger.warn(`[PluginRuntime] Invalid manifest from ${serverId} for tool. Skipping.`);
        continue;
      }
      
      if (this.plugins.has(toolManifest.id)) {
        logger.warn(`[PluginRuntime] Distributed tool '${toolManifest.id}' from ${serverId} conflicts with existing tool. Skipping.`);
        continue;
      }
      
      // 标记为分布式插件并存储服务器ID
      const distributedManifest = {
        ...toolManifest,
        type: 'distributed' as const,
        serverId,
        name: `[云端] ${toolManifest.name}`,
      };
      
      // 存储到分布式工具表和总插件表
      this.distributedTools.set(toolManifest.id, distributedManifest);
      this.plugins.set(toolManifest.id, distributedManifest);
      
      logger.info(`[PluginRuntime] Registered distributed tool: ${distributedManifest.name} (${toolManifest.id}) from ${serverId}`);
    }
    
    // 重建工具描述
    this.rebuildVCPDescriptions();
  }
  
  /**
   * 注销来自指定分布式节点的所有工具
   * 
   * 参考：Plugin.js Line 1057-1075 (unregisterAllDistributedTools)
   * 
   * @param serverId - 分布式服务器ID
   */
  unregisterAllDistributedTools(serverId: string): void {
    logger.info(`[PluginRuntime] Unregistering all tools from distributed server: ${serverId}`);
    
    let unregisteredCount = 0;
    
    for (const [id, manifest] of this.plugins.entries()) {
      if ((manifest as any).serverId === serverId) {
        this.plugins.delete(id);
        this.distributedTools.delete(id);
        unregisteredCount++;
        logger.debug(`[PluginRuntime] Unregistered: ${id}`);
      }
    }
    
    if (unregisteredCount > 0) {
      logger.info(`[PluginRuntime] Unregistered ${unregisteredCount} tools from server ${serverId}`);
      // 重建工具描述
      this.rebuildVCPDescriptions();
    }
  }
  
  /**
   * 卸载插件
   * 
   * @param name - 插件名称
   */
  async unloadPlugin(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    
    if (!plugin) {
      logger.warn(`[PluginRuntime] Plugin ${name} not found for unloading`);
      return;
    }
    
    // 根据类型清理
    if (plugin.type === 'distributed') {
      this.distributedTools.delete(name);
    } else if (plugin.type === 'preprocessor') {
      this.messagePreprocessors.delete(name);
      const index = this.preprocessorOrder.indexOf(name);
      if (index > -1) {
        this.preprocessorOrder.splice(index, 1);
      }
    } else if (plugin.type === 'service') {
      this.serviceModules.delete(name);
    }
    
    // 从主表删除
    this.plugins.delete(name);
    
    // 重建描述
    this.rebuildVCPDescriptions();
    
    logger.info(`[PluginRuntime] Plugin unloaded: ${name}`);
    
    // 发射事件
    this.emit('plugin_unloaded', { plugin: name });
  }
  
  /**
   * 获取所有已注册的插件
   * 
   * @returns 插件清单数组
   */
  getPlugins(): PluginManifest[] {
    return Array.from(this.plugins.values());
  }
  
  // ========== 私有方法 ==========
  
  /**
   * 验证插件清单
   * 
   * @param manifest - 插件清单
   */
  private validateManifest(manifest: PluginManifest): void {
    if (!manifest.id) {
      throw new VCPError(
        VCPErrorCode.INVALID_PLUGIN_MANIFEST,
        'Plugin manifest missing required field: id',
        { manifest },
      );
    }
    
    if (!manifest.name) {
      throw new VCPError(
        VCPErrorCode.INVALID_PLUGIN_MANIFEST,
        'Plugin manifest missing required field: name',
        { manifest },
      );
    }
    
    if (!manifest.type) {
      throw new VCPError(
        VCPErrorCode.INVALID_PLUGIN_MANIFEST,
        'Plugin manifest missing required field: type',
        { manifest },
      );
    }
  }
  
  /**
   * 注册分布式插件
   * 
   * 参考：Plugin.js registerDistributedTools
   * 
   * @param manifest - 插件清单
   */
  private async registerDistributedPlugin(manifest: PluginManifest): Promise<void> {
    if (!manifest.capabilities?.invocationCommands) {
      logger.warn(`[PluginRuntime] Distributed plugin ${manifest.id} has no invocationCommands`);
      return;
    }
    
    // 存储到分布式工具表
    this.distributedTools.set(manifest.id, manifest);
    
    logger.debug(
      `[PluginRuntime] Registered distributed plugin: ${manifest.id} with ${manifest.capabilities.invocationCommands.length} commands`,
    );
  }
  
  /**
   * 注册直接协议插件
   * 
   * 参考：Plugin.js Line 615-624 (ChromeControl等)
   * 
   * @param manifest - 插件清单
   */
  private async registerDirectPlugin(manifest: PluginManifest): Promise<void> {
    // Direct协议插件（如ChromeControl）通过WebSocket直接通信
    // 存储到插件表即可，执行时会通过direct executor处理
    logger.debug(`[PluginRuntime] Registered direct plugin: ${manifest.id}`);
  }
  
  /**
   * 注册预处理器插件
   * 
   * @param manifest - 插件清单
   */
  private async registerPreprocessorPlugin(manifest: PluginManifest): Promise<void> {
    // 预处理器按顺序执行
    this.messagePreprocessors.set(manifest.id, manifest);
    this.preprocessorOrder.push(manifest.id);
    logger.debug(`[PluginRuntime] Registered preprocessor: ${manifest.id}, order: ${this.preprocessorOrder.length}`);
  }
  
  /**
   * 注册服务插件
   * 
   * @param manifest - 插件清单
   */
  private async registerServicePlugin(manifest: PluginManifest): Promise<void> {
    // 服务插件提供可复用的功能模块
    this.serviceModules.set(manifest.id, {
      manifest,
      module: (manifest as any).module, // 实际服务实例
    });
    logger.debug(`[PluginRuntime] Registered service plugin: ${manifest.id}`);
  }
  
  /**
   * 注册静态插件
   * 
   * @param manifest - 插件清单
   */
  private async registerStaticPlugin(manifest: PluginManifest): Promise<void> {
    // 静态插件提供占位符值
    if ((manifest as any).placeholders) {
      for (const [key, value] of Object.entries((manifest as any).placeholders)) {
        this.staticPlaceholderValues.set(key, value as string);
      }
    }
    logger.debug(`[PluginRuntime] Registered static plugin: ${manifest.id}, placeholders: ${(manifest as any).placeholders ? Object.keys((manifest as any).placeholders).length : 0}`);
  }
  
  /**
   * 注册内部工具
   * 
   * @param manifest - 插件清单
   */
  private async registerInternalPlugin(manifest: PluginManifest): Promise<void> {
    // 内部工具是系统内置的工具
    logger.debug(`[PluginRuntime] Registered internal tool: ${manifest.id}`);
  }
  
  /**
   * 执行分布式插件
   * 
   * 参考：Plugin.js Line 607-614
   * 
   * @param plugin - 插件清单
   * @param name - 工具名称
   * @param args - 执行参数
   * @returns 执行结果
   */
  private async executeDistributedPlugin(plugin: PluginManifest, name: string, args: any): Promise<any> {
    if (!this.distributedExecutor) {
      throw new VCPError(
        VCPErrorCode.DISTRIBUTED_CONNECTION_ERROR,
        'Distributed executor not set',
        { plugin: name },
      );
    }
    
    logger.debug(`[PluginRuntime] Executing distributed plugin: ${name}`);
    
    // 调用分布式执行器
    const serverId = (plugin as any).serverId || 'unknown';
    
    // 添加超时控制
    const timeout = (plugin as any).timeout || 30000; // 默认30秒
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new VCPError(
        VCPErrorCode.TOOL_EXECUTION_FAILED,
        `Tool execution timeout after ${timeout}ms`,
        { plugin: name },
      )), timeout);
    });
    
    try {
      const result = await Promise.race([
        this.distributedExecutor(serverId, name, args),
        timeoutPromise,
      ]);
      
      return result;
    } catch (error: any) {
      if (error.code === VCPErrorCode.TOOL_EXECUTION_FAILED && error.message.includes('timeout')) {
        logger.warn(`[PluginRuntime] Tool ${name} timed out after ${timeout}ms`);
      }
      throw error;
    }
  }
  
  /**
   * 执行直接协议插件
   * 
   * @param plugin - 插件清单
   * @param args - 执行参数
   * @returns 执行结果
   */
  /**
   * 执行Direct类型插件（stdio协议）
   * 
   * 参考：Plugin.js Line 745-850 (executePlugin方法)
   * 
   * @param plugin - 插件清单
   * @param args - 执行参数
   * @returns 执行结果
   */
  private async executeDirectPlugin(plugin: PluginManifest, args: any): Promise<any> {
    // 1. 构建插件路径
    const pluginDir = this.options.pluginDir || 'Plugin';
    const pluginPath = path.resolve(pluginDir, plugin.id);
    const manifestPath = path.join(pluginPath, 'plugin-manifest.json');
    
    // 2. 读取完整的manifest（包含entryPoint）
    let fullManifest: any;
    try {
      const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
      fullManifest = JSON.parse(manifestContent);
    } catch (error: any) {
      throw new VCPError(
        VCPErrorCode.PLUGIN_LOAD_ERROR,
        `Failed to read manifest for plugin "${plugin.id}"`,
        { plugin: plugin.id, error: error.message },
      );
    }

    // 3. 验证entryPoint
    if (!fullManifest.entryPoint || !fullManifest.entryPoint.command) {
      throw new VCPError(
        VCPErrorCode.PLUGIN_LOAD_ERROR,
        `Plugin "${plugin.id}" does not have a valid entryPoint`,
        { plugin: plugin.id },
      );
    }

    // 4. 准备执行命令
    const entryCommand = fullManifest.entryPoint.command;
    const [command, ...commandArgs] = entryCommand.split(' ');
    
    // 5. 准备输入数据
    const inputData = Object.keys(args).length > 0 ? JSON.stringify(args) : null;
    
    // 6. 准备环境变量（参考Plugin.js Line 759-810）
    const env = { ...process.env };
    
    // 添加插件配置作为环境变量（从configSchema读取默认值）
    if (fullManifest.configSchema) {
      for (const [key, config] of Object.entries(fullManifest.configSchema)) {
        if (config && typeof config === 'object' && 'default' in config) {
          env[key] = String(config.default);
        }
      }
    }
    
    // 添加VCP标准环境变量
    env.PYTHONIOENCODING = 'utf-8';  // 强制Python使用UTF-8编码
    
    // 如果有pluginDir，设置PROJECT_BASE_PATH
    if (this.options.pluginDir) {
      env.PROJECT_BASE_PATH = path.resolve(this.options.pluginDir, '..');
    }
    
    // 设置超时时间（默认10秒）
    const timeout = fullManifest.communication?.timeout || 10000;
    
    logger.info(`[PluginRuntime] Executing Direct plugin: ${plugin.id}`);
    logger.debug(`[PluginRuntime] Command: ${entryCommand}`);
    logger.debug(`[PluginRuntime] Working directory: ${pluginPath}`);
    if (inputData) {
      logger.debug(`[PluginRuntime] Input data: ${inputData.substring(0, 200)}`);
    }

    // 7. 执行插件
    return new Promise((resolve, reject) => {
      const childProcess = spawn(command, commandArgs, {
        cwd: pluginPath,
        env: env,
        shell: true,
      });

      let stdout = '';
      let stderr = '';
      let timeoutId: NodeJS.Timeout;

      // 设置超时
      timeoutId = setTimeout(() => {
        childProcess.kill();
        reject(new VCPError(
          VCPErrorCode.TOOL_EXECUTION_FAILED,
          `Plugin "${plugin.id}" execution timed out after ${timeout}ms`,
          { plugin: plugin.id, timeout },
        ));
      }, timeout);

      // 收集stdout
      childProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      // 收集stderr
      childProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // 发送输入数据
      if (inputData) {
        childProcess.stdin?.write(inputData);
        childProcess.stdin?.end();
      } else {
        childProcess.stdin?.end();
      }

      // 处理进程退出
      childProcess.on('close', (code) => {
        clearTimeout(timeoutId);

        if (code !== 0) {
          logger.error(`[PluginRuntime] Plugin ${plugin.id} exited with code ${code}`);
          logger.error(`[PluginRuntime] Stderr: ${stderr}`);
          reject(new VCPError(
            VCPErrorCode.TOOL_EXECUTION_FAILED,
            `Plugin "${plugin.id}" execution failed with code ${code}`,
            { plugin: plugin.id, code, stderr: stderr.substring(0, 500) },
          ));
          return;
        }

        // 8. 解析输出
        try {
          // VCPToolBox插件通常返回JSON格式
          const result = stdout.trim() ? JSON.parse(stdout) : { status: 'success' };
          logger.info(`[PluginRuntime] Plugin ${plugin.id} executed successfully`);
          resolve(result);
        } catch (parseError: any) {
          // 如果不是JSON，返回原始字符串
          logger.warn(`[PluginRuntime] Plugin ${plugin.id} output is not JSON, returning as string`);
          resolve({ status: 'success', result: stdout.trim() });
        }
      });

      // 处理错误
      childProcess.on('error', (error) => {
        clearTimeout(timeoutId);
        logger.error(`[PluginRuntime] Plugin ${plugin.id} process error:`, error);
        reject(new VCPError(
          VCPErrorCode.TOOL_EXECUTION_FAILED,
          `Plugin "${plugin.id}" process error: ${error.message}`,
          { plugin: plugin.id, error: error.message },
        ));
      });
    });
  }
  
  /**
   * 执行内部工具（如TVS列表等内置功能）
   * 
   * Internal插件是VCPToolBox内置的工具，不需要外部进程
   * 例如：TVS列表、Agent列表等
   * 
   * @param plugin - 插件清单
   * @param args - 执行参数
   * @returns 执行结果
   */
  private async executeInternalPlugin(plugin: PluginManifest, args: any): Promise<any> {
    logger.info(`[PluginRuntime] Executing internal plugin: ${plugin.id}`);
    
    // Internal插件通常有预定义的处理逻辑
    // 这里可以根据plugin.id分发到不同的处理函数
    
    switch (plugin.id) {
      case 'TVSList':
        // 返回TVS列表（从配置文件读取）
        return this.getTVSList();
        
      case 'AgentList':
        // 返回Agent列表
        return this.getAgentList();
        
      default:
        // 如果有自定义的内部工具处理器，可以通过事件发射
        const result = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new VCPError(
              VCPErrorCode.TOOL_EXECUTION_FAILED,
              `Internal plugin "${plugin.id}" handler timeout`,
              { plugin: plugin.id },
            ));
          }, 5000);
          
          this.emit('internal_plugin_execute', {
            plugin: plugin.id,
            args,
            callback: (error: any, result: any) => {
              clearTimeout(timeout);
              if (error) reject(error);
              else resolve(result);
            },
          });
        });
        
        return result;
    }
  }
  
  /**
   * 获取TVS列表（示例内部工具）
   */
  private getTVSList(): any {
    // 这里应该从配置文件读取，现在返回示例数据
    return {
      status: 'success',
      tvsList: ['TVS1', 'TVS2', 'TVS3'],
      message: 'TVS list retrieved successfully',
    };
  }
  
  /**
   * 获取Agent列表（示例内部工具）
   */
  private getAgentList(): any {
    return {
      status: 'success',
      agents: ['Hornet', 'Nova', 'Metis'],
      message: 'Agent list retrieved successfully',
    };
  }
  
  /**
   * 重建VCP工具描述
   * 
   * 参考：Plugin.js Line 508-543 (buildVCPDescription)
   * 
   * 核心逻辑：
   * 1. 清空现有描述
   * 2. 遍历所有插件
   * 3. 提取invocationCommands
   * 4. 格式化描述文本
   * 5. 存储到individualPluginDescriptions
   */
  private rebuildVCPDescriptions(): void {
    this.individualPluginDescriptions.clear();
    
    let descriptionCount = 0;
    
    for (const plugin of this.plugins.values()) {
      // 检查插件是否有invocationCommands
      if (!plugin.capabilities?.invocationCommands || plugin.capabilities.invocationCommands.length === 0) {
        continue;
      }
      
      const pluginDescriptions: string[] = [];
      
      // 遍历每个命令
      for (const cmd of plugin.capabilities.invocationCommands) {
        if (!cmd.description) {
          continue;
        }
        
        // 格式化命令描述
        let commandDescription = `- ${plugin.name} (${plugin.id}) - 命令: ${cmd.command || 'N/A'}:\n`;
        
        // 添加缩进的描述
        const indentedDescription = cmd.description
          .split('\n')
          .map(line => `    ${line}`)
          .join('\n');
        commandDescription += indentedDescription;
        
        // 添加示例（如果有）
        if (cmd.example) {
          commandDescription += `\n  调用示例:\n`;
          const indentedExample = cmd.example
            .split('\n')
            .map(line => `    ${line}`)
            .join('\n');
          commandDescription += indentedExample;
        }
        
        pluginDescriptions.push(commandDescription);
      }
      
      // 存储插件描述
      if (pluginDescriptions.length > 0) {
        const placeholderKey = `VCP${plugin.id}`;
        const fullDescription = pluginDescriptions.join('\n\n');
        this.individualPluginDescriptions.set(placeholderKey, fullDescription);
        
        descriptionCount++;
        
        if (this.debug) {
          logger.debug(
            `[PluginRuntime] Generated description for {{${placeholderKey}}} (${fullDescription.length} chars)`,
          );
        }
      }
    }
    
    logger.info(
      `[PluginRuntime] VCP descriptions rebuilt: ${descriptionCount} tools, ${this.individualPluginDescriptions.size} descriptions`,
    );
  }
  
  /**
   * 处理消息（通过所有预处理器）
   * 
   * @param messages - 原始消息数组
   * @returns 处理后的消息
   */
  async processMessages(messages: any[]): Promise<any[]> {
    let processedMessages = messages;
    
    for (const preprocessorId of this.preprocessorOrder) {
      const preprocessor = this.messagePreprocessors.get(preprocessorId);
      if (preprocessor && (preprocessor as any).processor) {
        try {
          processedMessages = await (preprocessor as any).processor(processedMessages);
          logger.debug(`[PluginRuntime] Messages processed by: ${preprocessorId}`);
        } catch (error) {
          logger.error(`[PluginRuntime] Preprocessor ${preprocessorId} failed:`, error);
        }
      }
    }
    
    return processedMessages;
  }
  
  /**
   * 获取服务模块
   * 
   * @param name - 服务名称
   * @returns 服务实例
   */
  getServiceModule(name: string): any {
    const service = this.serviceModules.get(name);
    return service?.module;
  }
  
  /**
   * 获取静态占位符值
   * 
   * @returns 占位符映射
   */
  getStaticPlaceholders(): Map<string, string> {
    return new Map(this.staticPlaceholderValues);
  }
  
  /**
   * 获取运行时统计信息
   * 
   * @returns 统计信息
   */
  getStats(): {
    totalPlugins: number;
    distributedPlugins: number;
    localPlugins: number;
    toolDescriptions: number;
    preprocessors: number;
    services: number;
  } {
    return {
      totalPlugins: this.plugins.size,
      distributedPlugins: this.distributedTools.size,
      localPlugins: this.plugins.size - this.distributedTools.size,
      toolDescriptions: this.individualPluginDescriptions.size,
      preprocessors: this.messagePreprocessors.size,
      services: this.serviceModules.size,
    };
  }
}

/**
 * 创建默认的插件运行时实例
 * 
 * @param options - 可选配置
 * @returns 插件运行时实例
 */
export function createPluginRuntime(options?: PluginRuntimeOptions): IPluginRuntime {
  return new PluginRuntime(options);
}

