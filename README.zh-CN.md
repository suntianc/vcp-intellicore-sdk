# vcp-intellicore-sdk

[English](./README.md) | **简体中文**

> **VCP (Variable & Command Protocol) SDK** - 用于构建支持工具调用、变量解析和插件管理的AI服务器的核心模块。

[![npm version](https://img.shields.io/npm/v/vcp-intellicore-sdk.svg)](https://www.npmjs.com/package/vcp-intellicore-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

---

## 🎯 什么是 VCP SDK？

VCP SDK 提供了构建AI服务器的**核心基础模块**，支持：

- 🔧 **工具调用** - 使用VCP协议解析和执行AI工具请求
- 🔄 **变量解析** - 支持递归的动态占位符替换
- 🔌 **插件管理** - 管理6种类型的插件（分布式、直接、预处理器、服务、静态、内部）
- 📡 **WebSocket通信** - 5个专用频道，实时推送工具执行状态
- 🎯 **100% VCPToolBox兼容** - 完全兼容现有VCP生态系统

---

## 🚀 快速开始

### 安装

```bash
npm install vcp-intellicore-sdk@beta
```

### 基础用法

```typescript
import { 
  createVariableEngine, 
  PluginRuntime,
  createVCPProtocolParser,
  TimeProvider,
  ToolDescriptionProvider
} from 'vcp-intellicore-sdk';

// 1. 创建变量引擎
const variableEngine = createVariableEngine();
variableEngine.registerProvider(new TimeProvider());

// 2. 创建插件运行时
const pluginRuntime = new PluginRuntime({ pluginDir: './Plugin' });

// 3. 注册插件
await pluginRuntime.registerPlugin({
  id: 'Randomness',
  name: 'Randomness',
  version: '5.2.0',
  description: '随机事件生成器',
  type: 'direct',
  capabilities: {
    invocationCommands: [{
      command: 'rollDice',
      description: '掷骰子'
    }]
  }
});

// 4. 使用协议解析器
const parser = createVCPProtocolParser();
const toolRequests = parser.parseToolRequests(aiResponse);

// 5. 执行工具
for (const req of toolRequests) {
  const result = await pluginRuntime.executePlugin(req.name, req.args);
  console.log(result);
}
```

---

## 📦 核心模块

### 🎨 类型模块 (Types)

完整的TypeScript类型定义：

```typescript
import { 
  IVCPProtocolParser,
  IVariableEngine,
  IPluginRuntime,
  PluginManifest,
  VCPError,
  VCPErrorCode
} from 'vcp-intellicore-sdk';
```

**特性**：
- 16个核心接口
- 18个标准化错误代码
- 完整的类型安全
- IDE自动补全支持

---

### 🔍 协议模块 (Protocol)

VCP协议解析和格式化：

```typescript
import { createVCPProtocolParser } from 'vcp-intellicore-sdk';

const parser = createVCPProtocolParser();

// 从AI响应中解析工具请求
const requests = parser.parseToolRequests(content);
// => [{ name: 'ToolName', args: { key: 'value' } }]

// 格式化工具结果供AI阅读
const formatted = parser.formatToolResult(result);
// => "来自工具 \"ToolName\" 的结果:\n..."

// 检查内容是否包含工具请求
const hasCalls = parser.hasToolRequests(content);
```

**协议标记**：
```
<<<[TOOL_REQUEST]>>>
tool_name: 「始」ToolName「末」
param1: 「始」value1「末」
param2: 「始」value2「末」
<<<[END_TOOL_REQUEST]>>>
```

---

### 🔄 变量模块 (Variable)

动态变量解析系统：

```typescript
import { 
  createVariableEngine,
  TimeProvider,
  EnvironmentProvider,
  PlaceholderProvider,
  ToolDescriptionProvider
} from 'vcp-intellicore-sdk';

const engine = createVariableEngine({
  enableRecursion: true,
  maxRecursionDepth: 10,
  detectCircular: true
});

// 注册内置提供者
engine.registerProvider(new TimeProvider());
engine.registerProvider(new EnvironmentProvider());
engine.registerProvider(new PlaceholderProvider());
engine.registerProvider(new ToolDescriptionProvider(pluginRuntime));

// 解析所有变量
const result = await engine.resolveAll('当前时间: {{DateTime}}, 用户: {{ENV_USER}}');
```

**内置变量**：

| 变量 | 描述 | 示例 |
|------|------|------|
| `{{Date}}` | 当前日期 | 2025-10-27 |
| `{{Time}}` | 当前时间 | 15:30:00 |
| `{{DateTime}}` | 日期和时间 | 2025-10-27 15:30:00 |
| `{{Timestamp}}` | Unix时间戳 | 1761550676 |
| `{{ENV_*}}` | 环境变量 | {{ENV_USER}} |
| `{{VCPAllTools}}` | 所有工具描述 | (自动生成) |
| `{{VCPToolName}}` | 特定工具描述 | (自动生成) |

---

### 🔌 插件模块 (Plugin)

完整的插件运行时系统：

```typescript
import { PluginRuntime, PluginManifest } from 'vcp-intellicore-sdk';

const runtime = new PluginRuntime({ 
  pluginDir: './Plugin',
  debug: true 
});

// 注册插件
await runtime.registerPlugin({
  id: 'Calculator',
  name: '计算器',
  version: '1.0.0',
  description: '数学计算工具',
  type: 'direct',
  main: 'calculator.py',
  capabilities: {
    invocationCommands: [{
      command: 'calculate',
      description: '执行数学计算',
      example: 'calculate "2+2"'
    }]
  }
});

// 执行插件
const result = await runtime.executePlugin('Calculator', { 
  command: 'calculate',
  expression: '2+2' 
});

// 获取工具描述（用于AI提示词）
const descriptions = runtime.getToolDescriptions();
console.log(descriptions.get('VCPCalculator'));
```

**支持的插件类型**：

| 类型 | 描述 | 使用场景 |
|------|------|----------|
| **direct** | stdio协议插件 | Python/Node.js脚本 |
| **distributed** | 分布式插件 | 远程节点工具 |
| **internal** | 内部工具 | 系统内置功能 |
| **preprocessor** | 预处理器 | 消息预处理管道 |
| **service** | 服务模块 | 可复用的服务 |
| **static** | 静态插件 | 静态占位符提供者 |

---

### 📡 通信模块 (Communication)

完整的WebSocket管理系统：

```typescript
import {
  WebSocketManager,
  VCPLogChannelSDK,
  DistributedServerChannelSDK,
  FileFetcher
} from 'vcp-intellicore-sdk';

// 创建WebSocket管理器
const wsManager = new WebSocketManager();
wsManager.initialize(httpServer);

// 注册频道
const vcpLogChannel = new VCPLogChannelSDK();
wsManager.registerChannel(vcpLogChannel);

// 推送日志
vcpLogChannel.pushToolLog({
  status: 'success',
  tool: 'Randomness',
  content: '掷骰结果：6',
  source: 'tool_execution'
});

// FileFetcher - 跨节点文件传输
const fileFetcher = new FileFetcher(distributedChannel);
const file = await fileFetcher.fetchFile('/path/to/file', 'server-id');
```

**5个WebSocket频道**：

1. **VCPLog** - 实时日志推送
2. **VCPInfo** - 调试信息
3. **DistributedServer** - 分布式节点通信
4. **ChromeObserver** - Chrome扩展连接
5. **AdminPanel** - 管理面板

---

## 🏗️ 架构

```
vcp-intellicore-sdk
├── types/            TypeScript接口和错误代码
├── protocol/         VCP协议解析器
├── variable/         变量引擎 + 4个提供者
├── plugin/           插件运行时 + 6种插件类型
└── communication/    WebSocket管理 + 5个频道 + FileFetcher

集成流程：
用户消息 → 变量解析 → 工具解析 → 工具执行 → 结果格式化 → AI响应
   ↓         ↓           ↓         ↓           ↓
{{变量}}   解析变量    提取工具    执行工具    格式化结果    最终输出
```

---

## 📚 文档

- **[API参考](./docs/API.zh-CN.md)** - 完整的API文档
- **[开发指南](./docs/GUIDE.zh-CN.md)** - 如何使用VCP SDK
- **[类型定义](./docs/TYPES.zh-CN.md)** - TypeScript类型参考
- **[高级用法](./docs/ADVANCED.zh-CN.md)** - 高级模式和最佳实践
- **[示例代码](./examples/)** - 7个可运行的示例

---

## 🧪 示例

### 示例1：协议解析器

```typescript
import { createVCPProtocolParser } from 'vcp-intellicore-sdk';

const parser = createVCPProtocolParser();
const aiResponse = `
我来帮你查询天气。

<<<[TOOL_REQUEST]>>>
tool_name: 「始」WeatherTool「末」
city: 「始」北京「末」
<<<[END_TOOL_REQUEST]>>>
`;

const requests = parser.parseToolRequests(aiResponse);
// => [{ name: 'WeatherTool', args: { city: '北京' }, archery: false }]
```

### 示例2：带递归的变量引擎

```typescript
import { createVariableEngine, PlaceholderProvider } from 'vcp-intellicore-sdk';

const engine = createVariableEngine({
  enableRecursion: true,
  maxRecursionDepth: 5,
  detectCircular: true
});

const placeholderProvider = new PlaceholderProvider();
placeholderProvider.setPlaceholder('AppName', '我的应用');
placeholderProvider.setPlaceholder('Greeting', '欢迎使用{{AppName}}！');

engine.registerProvider(placeholderProvider);

const result = await engine.resolveAll('消息: {{Greeting}}');
// => "消息: 欢迎使用我的应用！"
```

### 示例3：插件运行时事件

```typescript
import { PluginRuntime } from 'vcp-intellicore-sdk';

const runtime = new PluginRuntime();

// 监听事件
runtime.on('plugin_registered', ({ plugin }) => {
  console.log(`新插件: ${plugin.name}`);
});

runtime.on('plugin_executed', ({ plugin, result }) => {
  console.log(`插件${plugin}执行成功`);
});

runtime.on('plugin_error', ({ plugin, error }) => {
  console.error(`插件${plugin}执行失败:`, error);
});

// 注册插件
await runtime.registerPlugin({ /* manifest */ });
```

### 示例4：分布式工具注册

```typescript
// 批量注册来自分布式节点的工具
runtime.registerDistributedTools('node-1', [
  { name: 'RemoteTool1', ... },
  { name: 'RemoteTool2', ... }
]);

// 执行分布式工具
const result = await runtime.executePlugin('RemoteTool1', args);

// 节点断开时注销所有工具
runtime.unregisterAllDistributedTools('node-1');
```

---

## 🎯 核心特性

### ✨ 主要特性

- **类型安全** - 100% TypeScript，完整的类型定义
- **事件驱动** - 基于EventEmitter的插件生命周期
- **超时控制** - 可配置的工具执行超时
- **循环检测** - 防止变量解析中的无限循环
- **性能优化** - RegExp缓存、批量替换（性能提升87-94%）
- **完全兼容** - 100%兼容VCPToolBox生态系统

### 🔒 安全特性

- 循环依赖检测
- DoS保护（最多100个占位符）
- 超时强制执行
- 标准化错误代码
- 子进程隔离

### 🚀 性能指标

| 操作 | 时间 | 内存 |
|------|------|------|
| 变量解析 | <1ms | ~10KB |
| 协议解析 | <2ms | ~20KB |
| 插件注册 | <5ms | ~100KB |
| 工具执行 | <1ms (不含网络) | ~10KB |
| Direct插件执行 | ~100-200ms | ~5MB |

---

## 🔧 高级用法

### 自定义变量提供者

```typescript
import { IVariableProvider } from 'vcp-intellicore-sdk';

class 我的自定义Provider implements IVariableProvider {
  name = 'MyCustomProvider';
  
  async resolve(key: string): Promise<string | null> {
    if (key === 'CustomVar') {
      return '自定义值';
    }
    return null;
  }
}

engine.registerProvider(new 我的自定义Provider());
```

### 插件超时配置

```typescript
const plugin: PluginManifest = {
  id: 'SlowTool',
  type: 'direct',
  main: 'slow-tool.py',
  communication: {
    protocol: 'stdio',
    timeout: 60000  // 60秒超时
  }
};

await runtime.registerPlugin(plugin);
```

### WebSocket频道使用

```typescript
import { VCPLogChannelSDK } from 'vcp-intellicore-sdk';

const vcpLogChannel = new VCPLogChannelSDK();

// 推送工具执行日志
vcpLogChannel.pushToolLog({
  status: 'executing',
  tool: 'Randomness',
  content: '正在执行工具...',
  source: 'server'
});

// 推送成功日志
vcpLogChannel.pushToolLog({
  status: 'success',
  tool: 'Randomness',
  content: '掷骰结果: 6',
  source: 'server'
});
```

---

## 🌟 为什么选择 VCP SDK？

### 对AI服务器开发者

- ✅ **开箱即用** - 无需从头实现VCP协议
- ✅ **类型安全** - 完整的TypeScript支持
- ✅ **经过测试** - 100%测试覆盖，生产环境验证
- ✅ **易于扩展** - 轻松添加自定义提供者和插件

### 对插件开发者

- ✅ **标准接口** - 清晰的插件manifest格式
- ✅ **6种插件类型** - 为不同场景选择合适的类型
- ✅ **事件系统** - 监控插件生命周期
- ✅ **错误处理** - 标准化的错误代码

---

## 🛠️ 开发

### 开发环境设置

```bash
# 克隆仓库
git clone https://github.com/suntianc/vcp-intellicore-sdk.git
cd vcp-intellicore-sdk

# 安装依赖
npm install

# 构建
npm run build

# 运行测试
npm test
```

### 项目结构

```
vcp-intellicore-sdk/
├── src/                     # 源代码
│   ├── types/              # 类型定义
│   ├── protocol/           # 协议解析器
│   ├── variable/           # 变量引擎
│   ├── plugin/             # 插件运行时
│   ├── communication/      # WebSocket通信
│   └── index.ts           # 主入口
├── tests/                  # 测试文件
├── docs/                   # 文档
├── examples/               # 示例代码
└── dist/                   # 编译输出
```

---

## 📊 当前状态

```
版本: 1.0.0-beta.5 (Beta)
状态: 生产就绪，已通过VCPChat验证
测试覆盖: 100% (核心功能)
VCPToolBox兼容性: 100%
性能: 优化完成 (87-94%提升)
```

---

## 🔗 相关链接

- **[VCP IntelliCore](https://github.com/suntianc/vcp-intellicore)** - 完整的VCP服务器实现（暂未发布）
- **[VCPToolBox](https://github.com/lioensky/VCPToolBox)** - 原始VCP服务器（450+ ⭐）
- **[VCPChat](https://github.com/lioensky/VCPChat)** - VCP兼容的聊天客户端
- **文档**: [完整API文档](./docs/API.zh-CN.md)
- **示例**: [示例项目](./examples/)

---

## 🤝 贡献

我们欢迎贡献！请查看 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解详情。

### 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📄 许可证

MIT License - 详见 [LICENSE](./LICENSE)

---

## 🙋 支持

- **问题反馈**: [GitHub Issues](https://github.com/suntianc/vcp-intellicore-sdk/issues)
- **讨论**: [GitHub Discussions](https://github.com/suntianc/vcp-intellicore-sdk/discussions)
- **文档**: [API文档](./docs/API.zh-CN.md)

---

## 🎯 路线图

### v1.0.0 (即将发布)
- [x] 协议解析模块
- [x] 变量引擎模块
- [x] 插件运行时模块
- [x] 通信模块（WebSocket + FileFetcher）
- [x] Direct插件执行
- [x] Distributed插件执行
- [x] Internal插件执行
- [ ] Service/Preprocessor插件执行
- [ ] 插件自动发现
- [ ] 热重载支持

---

## 🙏 致谢

本项目基于 [@lioensky](https://github.com/lioensky) 的 [VCPToolBox](https://github.com/lioensky/VCPToolBox) 项目开发。

**特别感谢**：
- 🎯 **@lioensky** - VCP协议和生态系统的原创设计者
- 🌟 **VCPToolBox** - 提供了完整的VCP实现思路和架构
- 💬 **VCPChat** - 为VCP协议提供了优秀的客户端实现

**致敬原文**：
> VCPToolBox 是一个全新的，强大的AI-API-工具交互范式AGI社群系统。独立多Agent封装，非线性超异步工作流，交叉记忆网络，六大插件协议，完整Websocket和WebDav功能，支持分布式部署和算力均衡！

本项目在VCPToolBox的基础上，使用TypeScript重构了核心模块，提供了更好的类型安全性和开发体验。

---

## 📈 版本历史

查看完整的版本历史和更新日志：[CHANGELOG.md](./CHANGELOG.md)

---

**由 VCP Agent 团队用 ❤️ 打造，致敬 @lioensky 的原创贡献**


