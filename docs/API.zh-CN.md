# VCP IntelliCore SDK - API 参考文档

**简体中文** | [English](./API.md)

> 完整的API参考文档，包含所有模块、接口和方法的详细说明。

---

## 📑 目录

- [核心类型](#核心类型)
- [协议模块](#协议模块)
- [变量模块](#变量模块)
- [插件模块](#插件模块)
- [通信模块](#通信模块)
- [工具函数](#工具函数)

---

## 核心类型

### `VCPToolRequest`

工具请求对象。

```typescript
interface VCPToolRequest {
  /** 工具名称 */
  name: string;
  /** 工具参数 */
  args: Record<string, any>;
  /** 是否为Archery异步工具 */
  archery: boolean;
  /** 原始请求文本（用于调试） */
  rawText?: string;
}
```

### `PluginManifest`

插件清单对象。

```typescript
interface PluginManifest {
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
  /** 主入口文件 */
  main?: string;
  /** 能力配置 */
  capabilities?: {
    /** 调用命令（工具定义） */
    invocationCommands?: Array<{
      command?: string;
      description?: string;
      example?: string;
    }>;
  };
  /** WebSocket推送配置 */
  webSocketPush?: {
    enabled: boolean;
    messageType?: string;
    targetClientType?: 'VCPLog' | 'Distributed' | 'all';
  };
}
```

### `VCPErrorCode`

标准化错误代码枚举。

```typescript
enum VCPErrorCode {
  // 协议相关
  INVALID_PROTOCOL = 'INVALID_PROTOCOL',
  PARSE_ERROR = 'PARSE_ERROR',
  
  // 变量相关
  VARIABLE_NOT_FOUND = 'VARIABLE_NOT_FOUND',
  CIRCULAR_DEPENDENCY = 'CIRCULAR_DEPENDENCY',
  MAX_RECURSION_EXCEEDED = 'MAX_RECURSION_EXCEEDED',
  
  // 插件相关
  PLUGIN_NOT_FOUND = 'PLUGIN_NOT_FOUND',
  PLUGIN_LOAD_ERROR = 'PLUGIN_LOAD_ERROR',
  INVALID_PLUGIN_MANIFEST = 'INVALID_PLUGIN_MANIFEST',
  
  // 工具执行相关
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  TOOL_EXECUTION_FAILED = 'TOOL_EXECUTION_FAILED',
  TOOL_TIMEOUT = 'TOOL_TIMEOUT',
  
  // 分布式相关
  DISTRIBUTED_CONNECTION_ERROR = 'DISTRIBUTED_CONNECTION_ERROR',
  DISTRIBUTED_TIMEOUT = 'DISTRIBUTED_TIMEOUT',
  
  // 通用
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}
```

---

## 协议模块

### `createVCPProtocolParser(config?)`

创建VCP协议解析器实例。

**参数**：
- `config` (可选) - 协议配置对象
  - `toolRequestStartMarker` - 工具请求起始标记（默认：`<<<[TOOL_REQUEST]>>>`）
  - `toolRequestEndMarker` - 工具请求结束标记（默认：`<<<[END_TOOL_REQUEST]>>>`）
  - `paramStartMarker` - 参数起始标记（默认：`「始」`）
  - `paramEndMarker` - 参数结束标记（默认：`「末」`）
  - `debug` - 是否启用调试模式

**返回**：`IVCPProtocolParser` 实例

**示例**：
```typescript
const parser = createVCPProtocolParser({
  toolRequestStartMarker: '<<<[TOOL]>>>',
  toolRequestEndMarker: '<<<[/TOOL]>>>',
  debug: true
});
```

---

### `IVCPProtocolParser`

协议解析器接口。

#### `parseToolRequests(content: string): VCPToolRequest[]`

从AI响应中解析工具请求。

**参数**：
- `content` - AI响应内容

**返回**：工具请求数组

**示例**：
```typescript
const requests = parser.parseToolRequests(aiResponse);
// [{ name: 'WeatherTool', args: { city: 'Beijing' } }]
```

#### `formatToolResult(result: VCPToolResult): string`

格式化工具结果为AI可读文本。

**参数**：
- `result` - 工具执行结果

**返回**：格式化后的文本

**示例**：
```typescript
const formatted = parser.formatToolResult({
  tool: 'Weather',
  result: { temp: 25 },
  success: true
});
// "来自工具 \"Weather\" 的结果:\n{\"temp\":25}"
```

#### `hasToolRequests(content: string): boolean`

检查内容是否包含工具请求标记。

**参数**：
- `content` - 待检查的内容

**返回**：是否包含工具请求

---

## 变量模块

### `createVariableEngine(options?)`

创建变量引擎实例。

**参数**：
- `options` (可选) - 引擎配置
  - `enableRecursion` - 启用递归解析（默认：`true`）
  - `maxRecursionDepth` - 最大递归深度（默认：`10`）
  - `detectCircular` - 检测循环依赖（默认：`true`）
  - `maxPlaceholders` - 最大占位符数量（默认：`100`）

**返回**：`IVariableEngine` 实例

**示例**：
```typescript
const engine = createVariableEngine({
  enableRecursion: true,
  maxRecursionDepth: 5,
  detectCircular: true
});
```

---

### `IVariableEngine`

变量引擎接口。

#### `registerProvider(provider: IVariableProvider, priority?: number): void`

注册变量提供者。

**参数**：
- `provider` - 变量提供者实例
- `priority` - 优先级（数字越大优先级越高，默认：`0`）

**示例**：
```typescript
engine.registerProvider(new TimeProvider(), 100);
engine.registerProvider(new EnvironmentProvider(), 90);
```

#### `resolveAll(content: string): Promise<string>`

解析内容中的所有变量。

**参数**：
- `content` - 包含变量占位符的内容

**返回**：解析后的内容

**示例**：
```typescript
const result = await engine.resolveAll('时间: {{DateTime}}');
// "时间: 2025-10-27 15:30:00"
```

---

### 内置变量提供者

#### `TimeProvider`

时间变量提供者。

**支持的变量**：
- `{{Date}}` - 当前日期（YYYY-MM-DD）
- `{{Time}}` - 当前时间（HH:MM:SS）
- `{{DateTime}}` - 日期时间（YYYY-MM-DD HH:MM:SS）
- `{{Timestamp}}` - Unix时间戳
- `{{Today}}` - 今日日期（中文）
- `{{Now}}` - 当前时间（中文）

**示例**：
```typescript
engine.registerProvider(new TimeProvider(), 100);
const result = await engine.resolveAll('现在是{{DateTime}}');
// "现在是2025-10-27 15:30:00"
```

#### `EnvironmentProvider`

环境变量提供者。

**支持的变量**：
- `{{ENV_*}}` - 任何环境变量（如`{{ENV_USER}}`）

**示例**：
```typescript
engine.registerProvider(new EnvironmentProvider(), 90);
const result = await engine.resolveAll('用户: {{ENV_USER}}');
// "用户: Administrator"
```

#### `PlaceholderProvider`

自定义占位符提供者。

**方法**：
- `setPlaceholder(key, value)` - 设置占位符
- `deletePlaceholder(key)` - 删除占位符
- `clearPlaceholders()` - 清空所有占位符

**示例**：
```typescript
const provider = new PlaceholderProvider();
provider.setPlaceholder('AppName', '我的应用');
provider.setPlaceholder('Version', '1.0.0');

engine.registerProvider(provider, 80);
const result = await engine.resolveAll('{{AppName}} v{{Version}}');
// "我的应用 v1.0.0"
```

#### `ToolDescriptionProvider`

工具描述提供者（需要PluginRuntime）。

**支持的变量**：
- `{{VCPAllTools}}` - 所有工具的描述
- `{{VCPToolName}}` - 特定工具的描述（如`{{VCPRandomness}}`）

**示例**：
```typescript
const provider = new ToolDescriptionProvider(pluginRuntime);
engine.registerProvider(provider, 70);

const result = await engine.resolveAll('可用工具:\n{{VCPAllTools}}');
// "可用工具:\nVCPRandomness: 随机事件生成器..."
```

---

## 插件模块

### `PluginRuntime`

插件运行时类。

#### 构造函数

```typescript
new PluginRuntime(options?: PluginRuntimeOptions)
```

**参数**：
- `options` (可选)
  - `pluginDir` - 插件目录路径（默认：`'Plugin'`）
  - `debug` - 启用调试模式（默认：`false`）
  - `autoDiscover` - 自动发现插件（默认：`false`）

**示例**：
```typescript
const runtime = new PluginRuntime({
  pluginDir: './Plugin',
  debug: true
});
```

---

#### `registerPlugin(manifest: PluginManifest): Promise<void>`

注册插件。

**参数**：
- `manifest` - 插件清单对象

**抛出**：
- `VCPError` - 插件清单无效或注册失败

**示例**：
```typescript
await runtime.registerPlugin({
  id: 'Randomness',
  name: 'Randomness',
  version: '5.2.0',
  type: 'direct',
  description: '随机事件生成器',
  capabilities: {
    invocationCommands: [{
      command: 'rollDice',
      description: '掷骰子'
    }]
  }
});
```

---

#### `executePlugin(name: string, args: any): Promise<any>`

执行插件。

**参数**：
- `name` - 插件/工具名称
- `args` - 执行参数

**返回**：执行结果

**抛出**：
- `VCPError(TOOL_NOT_FOUND)` - 工具不存在
- `VCPError(TOOL_EXECUTION_FAILED)` - 执行失败
- `VCPError(TOOL_TIMEOUT)` - 执行超时

**示例**：
```typescript
const result = await runtime.executePlugin('Randomness', {
  command: 'rollDice',
  diceString: '2d6'
});
// { status: 'success', result: { total: 11, rolls: [6, 5] } }
```

---

#### `getToolDescriptions(): Map<string, string>`

获取所有工具的描述。

**返回**：工具名称到描述的Map

**示例**：
```typescript
const descriptions = runtime.getToolDescriptions();
for (const [name, desc] of descriptions) {
  console.log(`${name}: ${desc}`);
}
```

---

#### `registerDistributedTools(serverId: string, tools: PluginManifest[]): void`

批量注册来自分布式节点的工具。

**参数**：
- `serverId` - 分布式服务器ID
- `tools` - 工具清单数组

**示例**：
```typescript
runtime.registerDistributedTools('node-1', [
  { name: 'RemoteTool1', type: 'distributed', ... },
  { name: 'RemoteTool2', type: 'distributed', ... }
]);
```

---

#### `unregisterAllDistributedTools(serverId: string): void`

注销来自指定分布式节点的所有工具。

**参数**：
- `serverId` - 分布式服务器ID

**示例**：
```typescript
runtime.unregisterAllDistributedTools('node-1');
```

---

#### `setDistributedExecutor(executor): void`

设置分布式工具执行器。

**参数**：
- `executor` - 执行器函数
  - 签名：`(serverId: string, toolName: string, args: any) => Promise<any>`

**示例**：
```typescript
runtime.setDistributedExecutor(async (serverId, toolName, args) => {
  // 通过WebSocket调用远程节点
  return await webSocketChannel.executeDistributedTool(serverId, toolName, args);
});
```

---

#### `getPlugins(): PluginManifest[]`

获取所有已注册的插件。

**返回**：插件清单数组

**示例**：
```typescript
const plugins = runtime.getPlugins();
console.log(`已注册 ${plugins.length} 个插件`);
```

---

#### `unloadPlugin(name: string): Promise<void>`

卸载指定插件。

**参数**：
- `name` - 插件名称

**抛出**：
- `VCPError(PLUGIN_NOT_FOUND)` - 插件不存在

**示例**：
```typescript
await runtime.unloadPlugin('OldPlugin');
```

---

### 插件运行时事件

PluginRuntime继承自`EventEmitter`，支持以下事件：

#### `plugin_registered`

插件注册成功时触发。

**事件数据**：
```typescript
{
  plugin: PluginManifest
}
```

**示例**：
```typescript
runtime.on('plugin_registered', ({ plugin }) => {
  console.log(`新插件: ${plugin.name}`);
});
```

#### `plugin_executed`

插件执行成功时触发。

**事件数据**：
```typescript
{
  plugin: string,  // 插件名称
  result: any      // 执行结果
}
```

**示例**：
```typescript
runtime.on('plugin_executed', ({ plugin, result }) => {
  console.log(`${plugin} 执行成功`);
});
```

#### `plugin_error`

插件执行失败时触发。

**事件数据**：
```typescript
{
  plugin: string,  // 插件名称
  error: Error     // 错误对象
}
```

**示例**：
```typescript
runtime.on('plugin_error', ({ plugin, error }) => {
  console.error(`${plugin} 失败: ${error.message}`);
});
```

---

## 通信模块

### `WebSocketManager`

WebSocket管理器类。

#### 构造函数

```typescript
new WebSocketManager(options?: WebSocketManagerOptions)
```

**参数**：
- `options` (可选)
  - `enableHeartbeat` - 启用心跳（默认：`false`）
  - `enableCompression` - 启用压缩（默认：`false`）

#### `initialize(httpServer: Server): void`

初始化WebSocket服务器。

**参数**：
- `httpServer` - HTTP服务器实例

**示例**：
```typescript
import { Server } from 'http';
import { WebSocketManager } from 'vcp-intellicore-sdk';

const httpServer = new Server(app);
const wsManager = new WebSocketManager();
wsManager.initialize(httpServer);
```

#### `registerChannel(channel: BaseChannel): void`

注册WebSocket频道。

**参数**：
- `channel` - 频道实例

**示例**：
```typescript
const vcpLogChannel = new VCPLogChannelSDK();
wsManager.registerChannel(vcpLogChannel);
```

---

### `VCPLogChannelSDK`

VCPLog频道类（用于实时日志推送）。

#### `pushLog(logData): void`

推送日志消息。

**参数**：
- `logData` - 日志数据对象
  - `logType` - 日志类型（`'tool_log' | 'ai_stream' | 'vcp_log' | 'notification'`）
  - `content` - 日志内容
  - `source` - 日志来源
  - `timestamp` - 时间戳（可选）

**示例**：
```typescript
vcpLogChannel.pushLog({
  logType: 'tool_log',
  content: '工具执行成功',
  source: 'server',
  tool: 'Randomness',
  status: 'success'
});
```

#### `pushToolLog(data): void`

推送工具执行日志（快捷方法）。

**参数**：
- `data` - 工具日志数据
  - `status` - 状态（`'executing' | 'success' | 'error'`）
  - `tool` - 工具名称
  - `content` - 日志内容
  - `source` - 日志来源（可选）

**示例**：
```typescript
vcpLogChannel.pushToolLog({
  status: 'success',
  tool: 'Randomness',
  content: '掷骰结果: 6'
});
```

---

### `DistributedServerChannelSDK`

分布式服务器频道类。

#### `executeDistributedTool(serverId, toolName, args, timeout?): Promise<any>`

执行分布式工具。

**参数**：
- `serverId` - 服务器ID或名称
- `toolName` - 工具名称
- `args` - 工具参数
- `timeout` - 超时时间（可选，默认60秒）

**返回**：工具执行结果

**抛出**：
- `VCPError(DISTRIBUTED_CONNECTION_ERROR)` - 服务器未连接
- `VCPError(DISTRIBUTED_TIMEOUT)` - 执行超时

**示例**：
```typescript
const result = await distributedChannel.executeDistributedTool(
  'node-1',
  'FileOperator',
  { action: 'read', path: '/test.txt' },
  30000  // 30秒超时
);
```

#### `getDistributedServers(): Map<string, ServerInfo>`

获取所有已连接的分布式服务器信息。

**返回**：服务器ID到信息的Map

**示例**：
```typescript
const servers = distributedChannel.getDistributedServers();
for (const [id, info] of servers) {
  console.log(`${id}: ${info.serverName}, ${info.tools.length} tools`);
}
```

---

### `FileFetcher`

文件获取器类（跨节点文件传输）。

#### 构造函数

```typescript
new FileFetcher(distributedChannel: DistributedServerChannelSDK, options?)
```

**参数**：
- `distributedChannel` - 分布式服务器频道实例
- `options` (可选)
  - `cacheDir` - 缓存目录（默认：`'.cache/files'`）
  - `maxCacheSize` - 最大缓存大小（默认：`500MB`）
  - `maxFileSize` - 最大文件大小（默认：`50MB`）
  - `cacheTTL` - 缓存有效期（默认：`24小时`）

#### `fetchFile(filePath, serverIdOrIp): Promise<FileResult>`

获取文件。

**参数**：
- `filePath` - 文件路径
- `serverIdOrIp` - 服务器ID或IP地址

**返回**：文件结果对象
```typescript
{
  buffer: Buffer,
  mimeType: string,
  cached: boolean,
  cacheLevel: 'memory' | 'disk' | 'network'
}
```

**示例**：
```typescript
const file = await fileFetcher.fetchFile('/images/photo.jpg', '192.168.1.100');
console.log(`文件大小: ${file.buffer.length}, MIME: ${file.mimeType}`);
console.log(`缓存层级: ${file.cacheLevel}`);
```

#### `getCacheStats(): Promise<CacheStats>`

获取缓存统计信息。

**返回**：缓存统计对象

**示例**：
```typescript
const stats = await fileFetcher.getCacheStats();
console.log(`内存缓存: ${stats.memoryHits}次命中`);
console.log(`磁盘缓存: ${stats.diskHits}次命中`);
console.log(`网络请求: ${stats.networkHits}次`);
```

---

## 工具函数

### `createVCPProtocolParser(config?)`

创建协议解析器（工厂函数）。

详见[协议模块](#协议模块)。

---

### `createVariableEngine(options?)`

创建变量引擎（工厂函数）。

详见[变量模块](#变量模块)。

---

## 错误处理

### `VCPError`

标准化的错误类。

**属性**：
- `code` - 错误代码（VCPErrorCode）
- `message` - 错误消息
- `details` - 错误详情（可选）

**示例**：
```typescript
try {
  await runtime.executePlugin('NonExistent', {});
} catch (error) {
  if (error instanceof VCPError) {
    console.error(`错误代码: ${error.code}`);
    console.error(`错误消息: ${error.message}`);
    console.error(`详情:`, error.details);
  }
}
```

---

## 最佳实践

### 1. 优先级顺序注册Provider

```typescript
// 按使用频率从高到低注册，提升性能
engine.registerProvider(new ToolDescriptionProvider(runtime), 100);
engine.registerProvider(new TimeProvider(), 90);
engine.registerProvider(new EnvironmentProvider(), 80);
engine.registerProvider(new PlaceholderProvider(), 70);
```

### 2. 错误处理

```typescript
try {
  const result = await runtime.executePlugin(toolName, args);
} catch (error) {
  if (error instanceof VCPError) {
    switch (error.code) {
      case VCPErrorCode.TOOL_NOT_FOUND:
        console.log('工具不存在');
        break;
      case VCPErrorCode.TOOL_TIMEOUT:
        console.log('执行超时');
        break;
      default:
        console.error('未知错误:', error);
    }
  }
}
```

### 3. 事件监听

```typescript
// 监听所有关键事件
runtime.on('plugin_registered', ({ plugin }) => {
  logger.info(`插件注册: ${plugin.name}`);
});

runtime.on('plugin_executed', ({ plugin, result }) => {
  logger.info(`插件执行成功: ${plugin}`);
});

runtime.on('plugin_error', ({ plugin, error }) => {
  logger.error(`插件错误: ${plugin}`, error);
});
```

### 4. 超时配置

```typescript
// 根据工具特性设置合理的超时时间
const fastTool = {
  type: 'direct',
  communication: { timeout: 5000 }  // 5秒
};

const slowTool = {
  type: 'direct',
  communication: { timeout: 120000 }  // 2分钟
};
```

---

## 常见问题

### Q1: 如何调试插件执行问题？

```typescript
const runtime = new PluginRuntime({ debug: true });  // 启用调试模式

// 查看详细日志
runtime.on('plugin_executed', ({ plugin, result }) => {
  console.log('执行结果:', JSON.stringify(result, null, 2));
});
```

### Q2: 如何处理插件超时？

```typescript
// 方案1：设置更长的超时时间
const manifest = {
  communication: { timeout: 60000 }  // 60秒
};

// 方案2：捕获超时错误
try {
  const result = await runtime.executePlugin(name, args);
} catch (error) {
  if (error.code === VCPErrorCode.TOOL_TIMEOUT) {
    console.log('工具执行超时，可能需要增加timeout配置');
  }
}
```

### Q3: 如何在多个环境中使用不同的变量值？

```typescript
const provider = new EnvironmentProvider();

// 开发环境
if (process.env.NODE_ENV === 'development') {
  provider.setVariable('API_URL', 'http://localhost:3000');
}

// 生产环境
if (process.env.NODE_ENV === 'production') {
  provider.setVariable('API_URL', 'https://api.example.com');
}
```

---

## 性能优化建议

### 1. Provider优先级

高频使用的Provider应设置更高的优先级：

```typescript
// ToolDescription最常用 → 最高优先级
engine.registerProvider(toolDescProvider, 100);

// Time次之
engine.registerProvider(timeProvider, 90);

// Environment偶尔用
engine.registerProvider(envProvider, 80);

// Placeholder很少用 → 最低优先级
engine.registerProvider(placeholderProvider, 70);
```

### 2. 缓存工具描述

```typescript
// 一次性获取所有描述，避免重复调用
const allDescriptions = runtime.getToolDescriptions();
const cachedDesc = allDescriptions.get('VCPRandomness');
```

### 3. 批量注册插件

```typescript
// 使用registerDistributedTools批量注册，而不是循环调用registerPlugin
runtime.registerDistributedTools('node-1', multipleTools);
```

---

## 版本兼容性

| SDK版本 | Node.js | TypeScript | VCPToolBox |
|---------|---------|------------|------------|
| 1.0.0-beta.5 | >=16.0.0 | ^5.0.0 | 100% |
| 1.0.0-beta.4 | >=16.0.0 | ^5.0.0 | 100% |
| 1.0.0-beta.3 | >=16.0.0 | ^5.0.0 | 100% |

---

## 更多资源

- **[通信模块详解](./COMMUNICATION.zh-CN.md)** - WebSocket和FileFetcher详细说明
- **[插件开发指南](./PLUGIN_DEVELOPMENT.zh-CN.md)** - 如何开发VCP插件
- **[高级用法](./ADVANCED.zh-CN.md)** - 高级模式和技巧
- **[示例代码](../examples/)** - 可运行的示例项目

---

**最后更新: 2025-10-27**  
**SDK版本: 1.0.0-beta.5**


