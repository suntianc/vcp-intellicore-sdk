# 通信模块详细文档

[English](./COMMUNICATION.md) | **简体中文**

> VCP SDK 通信模块完整指南，包含WebSocket管理、5个频道和FileFetcher的详细说明。

---

## 📑 目录

- [WebSocket架构](#websocket架构)
- [5个WebSocket频道](#5个websocket频道)
- [FileFetcher文件传输](#filefetcher文件传输)
- [消息格式规范](#消息格式规范)
- [最佳实践](#最佳实践)

---

## WebSocket架构

### 核心设计理念

VCP SDK采用**频道化WebSocket架构**，每个频道专注于特定的通信场景：

```
WebSocketManager
├── VCPLog频道          → 实时日志推送
├── VCPInfo频道         → 调试信息推送
├── DistributedServer频道 → 分布式节点通信
├── ChromeObserver频道   → Chrome扩展连接
└── AdminPanel频道       → 管理面板连接
```

**优势**：
- ✅ **职责分离** - 每个频道专注单一功能
- ✅ **类型安全** - 强类型的消息格式
- ✅ **易于扩展** - 添加新频道无需修改现有代码
- ✅ **独立管理** - 每个频道独立的连接池和统计

---

## 5个WebSocket频道

### 1️⃣ VCPLog频道

**用途**：实时推送工具执行日志和AI流式响应给VCPChat。

**连接端点**：
```
/VCPlog/VCP_Key=<您的密钥>
```

**使用示例**：
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

// 执行成功
vcpLogChannel.pushToolLog({
  status: 'success',
  tool: 'Randomness',
  content: '掷骰结果: 6',
  source: 'server'
});

// 执行失败
vcpLogChannel.pushToolLog({
  status: 'error',
  tool: 'Randomness',
  content: '执行错误: 参数无效',
  source: 'server'
});
```

**消息格式**（发送到VCPChat）：
```json
{
  "type": "vcp_log",
  "data": {
    "log_type": "tool_log",
    "content": "掷骰结果: 6",
    "source": "server",
    "timestamp": "2025-10-27T15:30:00.000+08:00",
    "tool_name": "Randomness",
    "status": "success"
  }
}
```

**适用场景**：
- ✅ 工具执行状态推送
- ✅ AI流式响应
- ✅ 系统通知
- ✅ 错误提示

---

### 2️⃣ VCPInfo频道

**用途**：推送调试信息给开发者。

**连接端点**：
```
/vcpinfo/VCP_Key=<您的密钥>
```

**使用示例**：
```typescript
import { VCPInfoChannelSDK } from 'vcp-intellicore-sdk';

const vcpInfoChannel = new VCPInfoChannelSDK();

// 推送调试信息
vcpInfoChannel.broadcast({
  type: 'debug_info',
  data: {
    toolName: 'Randomness',
    executionTime: 125,
    args: { diceString: '2d6' }
  }
});
```

---

### 3️⃣ DistributedServer频道 ⭐

**用途**：与分布式节点通信，执行远程工具。

**连接端点**：
```
/vcp-distributed-server/VCP_Key=<您的密钥>
```

**使用示例**：
```typescript
import { DistributedServerChannelSDK } from 'vcp-intellicore-sdk';

const distributedChannel = new DistributedServerChannelSDK();

// 监听工具注册事件
distributedChannel.on('tools_registered', ({ serverId, tools }) => {
  console.log(`节点 ${serverId} 注册了 ${tools.length} 个工具`);
});

// 监听节点断开事件
distributedChannel.on('tools_unregistered', ({ serverId }) => {
  console.log(`节点 ${serverId} 已断开`);
});

// 执行分布式工具
const result = await distributedChannel.executeDistributedTool(
  'node-1',
  'FileOperator',
  { action: 'list', path: '/' }
);
```

**消息协议**：

1. **连接握手**（服务器→客户端）：
```json
{
  "type": "connection_ack",
  "data": {
    "serverId": "dist-node-1",
    "message": "Connected to VCP IntelliCore"
  }
}
```

2. **工具注册**（客户端→服务器）：
```json
{
  "type": "register_tools",
  "data": {
    "serverName": "my-node",
    "tools": [
      {
        "name": "FileOperator",
        "displayName": "文件操作器",
        "pluginType": "synchronous",
        "description": "文件操作工具",
        "capabilities": {
          "invocationCommands": [...]
        }
      }
    ]
  }
}
```

3. **工具执行**（服务器→客户端）：
```json
{
  "type": "execute_tool",
  "data": {
    "requestId": "req-12345",
    "toolName": "FileOperator",
    "toolArgs": { "action": "read", "path": "/test.txt" }
  }
}
```

4. **执行结果**（客户端→服务器）：
```json
{
  "type": "tool_result",
  "data": {
    "requestId": "req-12345",
    "status": "success",
    "result": { "content": "文件内容..." }
  }
}
```

---

### 4️⃣ ChromeObserver频道

**用途**：与Chrome扩展通信。

**连接端点**：
```
/vcp-chrome-observer/VCP_Key=<您的密钥>
```

**使用场景**：
- Chrome浏览器控制
- 网页数据获取
- 标签页管理

---

### 5️⃣ AdminPanel频道

**用途**：管理面板WebSocket连接。

**连接端点**：
```
/vcp-admin-panel/VCP_Key=<您的密钥>
```

**使用场景**：
- 插件管理
- 系统配置
- 实时监控

---

## FileFetcher文件传输

### 三层缓存架构

FileFetcher采用**三层缓存策略**，优化跨节点文件传输性能：

```
请求文件
  ↓
检查内存缓存 ────✅──→ 返回（最快，<1ms）
  ↓ ❌
检查磁盘缓存 ────✅──→ 返回（快，~10ms）
  ↓ ❌
网络请求 ─────✅──→ 存储并返回（慢，~100-500ms）
```

**性能对比**：
| 缓存层级 | 响应时间 | 命中率（典型） |
|---------|---------|---------------|
| 内存缓存 | <1ms | ~60% |
| 磁盘缓存 | ~10ms | ~30% |
| 网络请求 | ~200ms | ~10% |

---

### 完整使用示例

```typescript
import { FileFetcher, DistributedServerChannelSDK } from 'vcp-intellicore-sdk';

// 创建FileFetcher
const fileFetcher = new FileFetcher(distributedChannel, {
  cacheDir: '.cache/files',
  maxCacheSize: 500 * 1024 * 1024,  // 500MB
  maxFileSize: 50 * 1024 * 1024,    // 50MB
  cacheTTL: 24 * 60 * 60 * 1000     // 24小时
});

// 获取文件
const file = await fileFetcher.fetchFile('/images/photo.jpg', '192.168.1.100');

// 转换为base64（用于图片展示）
const base64 = file.buffer.toString('base64');
const dataUri = `data:${file.mimeType};base64,${base64}`;

// 保存到本地
const fs = require('fs');
fs.writeFileSync('./downloaded.jpg', file.buffer);

// 查看缓存统计
const stats = await fileFetcher.getCacheStats();
console.log(`缓存命中率: ${(stats.memoryHits + stats.diskHits) / stats.totalRequests * 100}%`);
```

---

## 消息格式规范

### VCPToolBox标准格式

**所有WebSocket消息必须遵循以下格式**：

```typescript
{
  "type": "message_type",  // 消息类型
  "data": {                // 所有数据必须在data字段中
    // ... 实际数据
  }
}
```

**✅ 正确示例**：
```json
{
  "type": "vcp_log",
  "data": {
    "log_type": "tool_log",
    "content": "执行成功",
    "tool_name": "Randomness",
    "status": "success"
  }
}
```

**❌ 错误示例**：
```json
{
  "type": "vcp_log",
  "log_type": "tool_log",  // ❌ 数据直接在顶层，应该在data中
  "content": "执行成功"
}
```

---

### 频道特定消息格式

#### VCPLog频道

**工具日志**：
```json
{
  "type": "vcp_log",
  "data": {
    "log_type": "tool_log",
    "tool_name": "工具名称",
    "status": "executing|success|error",
    "content": "日志内容",
    "source": "来源",
    "timestamp": "ISO 8601时间戳"
  }
}
```

**AI流式响应**：
```json
{
  "type": "vcp_log",
  "data": {
    "log_type": "ai_stream",
    "content": "AI响应内容",
    "source": "llm_client",
    "timestamp": "..."
  }
}
```

---

#### DistributedServer频道

**连接确认**：
```json
{
  "type": "connection_ack",
  "data": {
    "serverId": "dist-node-1",
    "message": "Connected to VCP IntelliCore"
  }
}
```

**工具注册**：
```json
{
  "type": "register_tools",
  "data": {
    "serverName": "my-distributed-node",
    "tools": [{ /* PluginManifest */ }]
  }
}
```

**工具执行请求**：
```json
{
  "type": "execute_tool",
  "data": {
    "requestId": "唯一请求ID",
    "toolName": "工具名称",
    "toolArgs": { /* 工具参数 */ }
  }
}
```

**执行结果**：
```json
{
  "type": "tool_result",
  "data": {
    "requestId": "对应的请求ID",
    "status": "success|error",
    "result": { /* 结果数据 */ }  // 或 "error": "错误消息"
  }
}
```

---

## 最佳实践

### 1. 频道注册顺序

```typescript
// 按重要性顺序注册频道
wsManager.registerChannel(vcpLogChannel);          // 最重要：日志
wsManager.registerChannel(distributedChannel);      // 次之：分布式
wsManager.registerChannel(vcpInfoChannel);          // 调试信息
wsManager.registerChannel(chromeObserverChannel);   // 扩展功能
wsManager.registerChannel(adminPanelChannel);       // 管理界面
```

### 2. 错误处理

```typescript
distributedChannel.on('error', (error) => {
  logger.error('分布式频道错误:', error);
  // 实施降级策略
});

distributedChannel.on('tools_unregistered', ({ serverId }) => {
  logger.warn(`节点 ${serverId} 断开，工具已注销`);
  // 通知用户
});
```

### 3. 心跳保活

```typescript
const wsManager = new WebSocketManager({
  enableHeartbeat: true,      // 启用心跳
  heartbeatInterval: 30000    // 30秒间隔
});
```

### 4. FileFetcher缓存管理

```typescript
// 定期清理过期缓存
setInterval(async () => {
  const stats = await fileFetcher.getCacheStats();
  if (stats.diskCacheSize > 400 * 1024 * 1024) {  // > 400MB
    await fileFetcher.clearDiskCache();
    logger.info('磁盘缓存已清理');
  }
}, 60 * 60 * 1000);  // 每小时检查一次
```

---

## 完整集成示例

### 服务器端完整设置

```typescript
import express from 'express';
import { Server } from 'http';
import {
  WebSocketManager,
  VCPLogChannelSDK,
  VCPInfoChannelSDK,
  DistributedServerChannelSDK,
  ChromeObserverChannelSDK,
  AdminPanelChannelSDK,
  FileFetcher
} from 'vcp-intellicore-sdk';

// 1. 创建Express应用和HTTP服务器
const app = express();
const httpServer = new Server(app);

// 2. 创建WebSocket管理器
const wsManager = new WebSocketManager({
  enableHeartbeat: false,
  enableCompression: false
});

// 3. 初始化WebSocket服务器
wsManager.initialize(httpServer);

// 4. 创建并注册5个频道
const vcpLogChannel = new VCPLogChannelSDK();
const vcpInfoChannel = new VCPInfoChannelSDK();
const distributedChannel = new DistributedServerChannelSDK();
const chromeObserverChannel = new ChromeObserverChannelSDK();
const adminPanelChannel = new AdminPanelChannelSDK();

wsManager.registerChannel(vcpLogChannel);
wsManager.registerChannel(vcpInfoChannel);
wsManager.registerChannel(distributedChannel);
wsManager.registerChannel(chromeObserverChannel);
wsManager.registerChannel(adminPanelChannel);

// 5. 创建FileFetcher
const fileFetcher = new FileFetcher(distributedChannel);

// 6. 监听分布式频道事件
distributedChannel.on('tools_registered', ({ serverId, tools, serverInfo }) => {
  console.log(`节点 ${serverId} 注册了 ${tools.length} 个工具`);
  
  // 将工具注册到PluginRuntime
  pluginRuntime.registerDistributedTools(serverId, tools);
});

distributedChannel.on('tools_unregistered', ({ serverId }) => {
  console.log(`节点 ${serverId} 断开连接`);
  
  // 从PluginRuntime注销工具
  pluginRuntime.unregisterAllDistributedTools(serverId);
});

distributedChannel.on('async_tool_result', (data) => {
  console.log(`异步工具结果: ${data.plugin}`);
  
  // 推送到VCPLog
  vcpLogChannel.pushToolLog({
    status: 'success',
    tool: data.plugin,
    content: JSON.stringify(data.result)
  });
});

// 7. 启动服务器
httpServer.listen(3000, () => {
  console.log('🚀 服务器启动成功');
  console.log('📡 WebSocket端点 (5个频道):');
  console.log('   - /VCPlog/VCP_Key=...');
  console.log('   - /vcpinfo/VCP_Key=...');
  console.log('   - /vcp-distributed-server/VCP_Key=...');
  console.log('   - /vcp-chrome-observer/VCP_Key=...');
  console.log('   - /vcp-admin-panel/VCP_Key=...');
});
```

---

## 安全考虑

### 1. 认证密钥

所有WebSocket连接都需要VCP_Key验证：

```typescript
// 客户端连接
const ws = new WebSocket('ws://server:3000/VCPlog/VCP_Key=your-secret-key');

// 服务器验证
const channel = new VCPLogChannelSDK();
channel.validateKey = (key) => key === process.env.VCP_KEY;
```

### 2. 超时保护

```typescript
// 设置合理的超时时间
await distributedChannel.executeDistributedTool(
  'node-1',
  'SlowTool',
  args,
  120000  // 2分钟超时，防止无限等待
);
```

### 3. 消息大小限制

```typescript
// FileFetcher自动限制文件大小
const fileFetcher = new FileFetcher(distributedChannel, {
  maxFileSize: 50 * 1024 * 1024  // 50MB上限
});
```

---

## 故障排查

### 常见问题

#### Q1: WebSocket连接失败

**症状**：客户端无法连接到WebSocket端点

**解决方案**：
1. 检查VCP_Key是否正确
2. 确认HTTP服务器已启动
3. 检查端口是否被占用
4. 验证URL路径格式

```typescript
// 正确的连接URL格式
const url = `ws://localhost:3000/VCPlog/VCP_Key=${vcpKey}`;
```

---

#### Q2: 分布式工具执行超时

**症状**：工具执行后一直等待，最终超时

**解决方案**：
1. 检查分布式节点是否在线
2. 查看节点日志确认收到请求
3. 增加超时时间
4. 检查网络连接

```typescript
// 调试模式查看详细信息
distributedChannel.on('tool_execution_start', ({ requestId, toolName }) => {
  console.log(`开始执行: ${toolName}, 请求ID: ${requestId}`);
});
```

---

#### Q3: VCPLog消息显示为JSON

**症状**：VCPChat显示原始JSON而不是友好消息

**解决方案**：确保消息格式正确

```typescript
// ✅ 正确格式
vcpLogChannel.pushToolLog({
  status: 'success',
  tool: 'Randomness',
  content: '掷骰结果: 6'  // 友好的自然语言
});

// ❌ 错误格式
vcpLogChannel.pushLog({
  type: 'tool_log',  // ❌ type不应该在这里
  content: JSON.stringify(result)  // ❌ 不应该发送JSON字符串
});
```

---

## 性能优化

### 1. 连接池管理

```typescript
// WebSocketManager自动管理连接池
const stats = vcpLogChannel.getStats();
console.log(`活跃连接: ${stats.activeConnections}`);
console.log(`总消息数: ${stats.totalMessagesSent}`);
```

### 2. 批量广播

```typescript
// 一次广播给所有客户端，而不是循环发送
vcpLogChannel.broadcast({
  type: 'batch_update',
  data: multipleUpdates
});
```

### 3. 消息压缩（可选）

```typescript
const wsManager = new WebSocketManager({
  enableCompression: true  // 启用per-message deflate
});
```

---

## 监控和日志

### 频道统计

```typescript
// 每个频道都有统计信息
const stats = vcpLogChannel.getStats();

console.log('VCPLog频道统计:');
console.log(`  活跃连接: ${stats.activeConnections}`);
console.log(`  总连接数: ${stats.totalConnections}`);
console.log(`  发送消息: ${stats.totalMessagesSent}`);
console.log(`  接收消息: ${stats.totalMessagesReceived}`);
console.log(`  最后活动: ${stats.lastActivity}`);
```

### 全局WebSocket统计

```typescript
const globalStats = wsManager.getAllStats();
for (const [channelName, stats] of globalStats) {
  console.log(`${channelName}: ${stats.activeConnections} 连接`);
}
```

---

## 高级技巧

### 1. 自定义频道

```typescript
import { BaseChannel } from 'vcp-intellicore-sdk';

class MyCustomChannel extends BaseChannel {
  constructor() {
    super('MyCustomChannel', '/my-custom-endpoint');
  }
  
  protected handleMessage(ws: WebSocket, message: any): void {
    // 自定义消息处理逻辑
    console.log('收到消息:', message);
  }
}

// 注册自定义频道
wsManager.registerChannel(new MyCustomChannel());
```

### 2. 消息拦截器

```typescript
// 在频道中添加消息拦截器
class InterceptedChannel extends VCPLogChannelSDK {
  broadcast(message: any): void {
    // 拦截并修改消息
    const modified = {
      ...message,
      timestamp: Date.now()
    };
    super.broadcast(modified);
  }
}
```

### 3. FileFetcher高级配置

```typescript
const fileFetcher = new FileFetcher(distributedChannel, {
  // 缓存配置
  cacheDir: '.cache/files',
  maxCacheSize: 1024 * 1024 * 1024,  // 1GB
  maxFileSize: 100 * 1024 * 1024,    // 100MB
  cacheTTL: 7 * 24 * 60 * 60 * 1000, // 7天
  
  // 性能配置
  memoryCache: {
    maxSize: 50 * 1024 * 1024,       // 50MB内存缓存
    maxFiles: 100                     // 最多100个文件
  },
  
  // 网络配置
  network: {
    timeout: 30000,                   // 30秒超时
    retries: 3                        // 重试3次
  }
});
```

---

## 完整类型定义

查看 `src/types/communication.ts` 获取完整的TypeScript类型定义。

---

**最后更新: 2025-10-27**  
**SDK版本: 1.0.0-beta.5**


