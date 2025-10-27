# VCP IntelliCore SDK - API Reference

**English** | [简体中文](./API.zh-CN.md)

> Complete API reference documentation for all modules, interfaces, and methods.

---

## 📑 Table of Contents

- [Core Types](#core-types)
- [Protocol Module](#protocol-module)
- [Variable Module](#variable-module)
- [Plugin Module](#plugin-module)
- [Communication Module](#communication-module)
- [Utility Functions](#utility-functions)

---

## Core Types

### `VCPToolRequest`

Tool request object.

```typescript
interface VCPToolRequest {
  /** Tool name */
  name: string;
  /** Tool arguments */
  args: Record<string, any>;
  /** Whether this is an Archery async tool */
  archery: boolean;
  /** Raw request text (for debugging) */
  rawText?: string;
}
```

### `PluginManifest`

Plugin manifest object.

```typescript
interface PluginManifest {
  /** Plugin ID */
  id: string;
  /** Plugin name */
  name: string;
  /** Plugin version */
  version: string;
  /** Plugin description */
  description: string;
  /** Plugin author */
  author?: string;
  /** Plugin type */
  type: 'direct' | 'distributed' | 'preprocessor' | 'service' | 'static' | 'internal';
  /** Main entry file */
  main?: string;
  /** Capabilities configuration */
  capabilities?: {
    /** Invocation commands (tool definitions) */
    invocationCommands?: Array<{
      command?: string;
      description?: string;
      example?: string;
    }>;
  };
  /** WebSocket push configuration */
  webSocketPush?: {
    enabled: boolean;
    messageType?: string;
    targetClientType?: 'VCPLog' | 'Distributed' | 'all';
  };
}
```

### `VCPErrorCode`

Standardized error code enum.

```typescript
enum VCPErrorCode {
  // Protocol related
  INVALID_PROTOCOL = 'INVALID_PROTOCOL',
  PARSE_ERROR = 'PARSE_ERROR',
  
  // Variable related
  VARIABLE_NOT_FOUND = 'VARIABLE_NOT_FOUND',
  CIRCULAR_DEPENDENCY = 'CIRCULAR_DEPENDENCY',
  MAX_RECURSION_EXCEEDED = 'MAX_RECURSION_EXCEEDED',
  
  // Plugin related
  PLUGIN_NOT_FOUND = 'PLUGIN_NOT_FOUND',
  PLUGIN_LOAD_ERROR = 'PLUGIN_LOAD_ERROR',
  INVALID_PLUGIN_MANIFEST = 'INVALID_PLUGIN_MANIFEST',
  
  // Tool execution related
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  TOOL_EXECUTION_FAILED = 'TOOL_EXECUTION_FAILED',
  TOOL_TIMEOUT = 'TOOL_TIMEOUT',
  
  // Distributed related
  DISTRIBUTED_CONNECTION_ERROR = 'DISTRIBUTED_CONNECTION_ERROR',
  DISTRIBUTED_TIMEOUT = 'DISTRIBUTED_TIMEOUT',
  
  // General
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}
```

---

## Protocol Module

### `createVCPProtocolParser(config?)`

Create VCP protocol parser instance.

**Parameters**:
- `config` (optional) - Protocol configuration
  - `toolRequestStartMarker` - Tool request start marker (default: `<<<[TOOL_REQUEST]>>>`)
  - `toolRequestEndMarker` - Tool request end marker (default: `<<<[END_TOOL_REQUEST]>>>`)
  - `paramStartMarker` - Parameter start marker (default: `「始」`)
  - `paramEndMarker` - Parameter end marker (default: `「末」`)
  - `debug` - Enable debug mode

**Returns**: `IVCPProtocolParser` instance

**Example**:
```typescript
const parser = createVCPProtocolParser({
  toolRequestStartMarker: '<<<[TOOL]>>>',
  toolRequestEndMarker: '<<<[/TOOL]>>>',
  debug: true
});
```

---

### `IVCPProtocolParser`

Protocol parser interface.

#### `parseToolRequests(content: string): VCPToolRequest[]`

Parse tool requests from AI response.

**Parameters**:
- `content` - AI response content

**Returns**: Array of tool requests

**Example**:
```typescript
const requests = parser.parseToolRequests(aiResponse);
// [{ name: 'WeatherTool', args: { city: 'Beijing' } }]
```

#### `formatToolResult(result: VCPToolResult): string`

Format tool result as AI-readable text.

**Parameters**:
- `result` - Tool execution result

**Returns**: Formatted text

**Example**:
```typescript
const formatted = parser.formatToolResult({
  tool: 'Weather',
  result: { temp: 25 },
  success: true
});
// "Result from tool \"Weather\":\n{\"temp\":25}"
```

#### `hasToolRequests(content: string): boolean`

Check if content contains tool request markers.

**Parameters**:
- `content` - Content to check

**Returns**: Whether tool requests are present

---

## Variable Module

### `createVariableEngine(options?)`

Create variable engine instance.

**Parameters**:
- `options` (optional) - Engine configuration
  - `enableRecursion` - Enable recursive resolution (default: `true`)
  - `maxRecursionDepth` - Max recursion depth (default: `10`)
  - `detectCircular` - Detect circular dependencies (default: `true`)
  - `maxPlaceholders` - Max placeholders (default: `100`)

**Returns**: `IVariableEngine` instance

**Example**:
```typescript
const engine = createVariableEngine({
  enableRecursion: true,
  maxRecursionDepth: 5,
  detectCircular: true
});
```

---

### `IVariableEngine`

Variable engine interface.

#### `registerProvider(provider: IVariableProvider, priority?: number): void`

Register variable provider.

**Parameters**:
- `provider` - Variable provider instance
- `priority` - Priority (higher number = higher priority, default: `0`)

**Example**:
```typescript
engine.registerProvider(new TimeProvider(), 100);
engine.registerProvider(new EnvironmentProvider(), 90);
```

#### `resolveAll(content: string): Promise<string>`

Resolve all variables in content.

**Parameters**:
- `content` - Content with variable placeholders

**Returns**: Resolved content

**Example**:
```typescript
const result = await engine.resolveAll('Time: {{DateTime}}');
// "Time: 2025-10-27 15:30:00"
```

---

### Built-in Variable Providers

#### `TimeProvider`

Time variable provider.

**Supported Variables**:
- `{{Date}}` - Current date (YYYY-MM-DD)
- `{{Time}}` - Current time (HH:MM:SS)
- `{{DateTime}}` - Date and time (YYYY-MM-DD HH:MM:SS)
- `{{Timestamp}}` - Unix timestamp
- `{{Today}}` - Today's date
- `{{Now}}` - Current time

**Example**:
```typescript
engine.registerProvider(new TimeProvider(), 100);
const result = await engine.resolveAll('Now: {{DateTime}}');
// "Now: 2025-10-27 15:30:00"
```

#### `EnvironmentProvider`

Environment variable provider.

**Supported Variables**:
- `{{ENV_*}}` - Any environment variable (e.g., `{{ENV_USER}}`)

**Example**:
```typescript
engine.registerProvider(new EnvironmentProvider(), 90);
const result = await engine.resolveAll('User: {{ENV_USER}}');
// "User: Administrator"
```

#### `PlaceholderProvider`

Custom placeholder provider.

**Methods**:
- `setPlaceholder(key, value)` - Set placeholder
- `deletePlaceholder(key)` - Delete placeholder
- `clearPlaceholders()` - Clear all placeholders

**Example**:
```typescript
const provider = new PlaceholderProvider();
provider.setPlaceholder('AppName', 'My App');
provider.setPlaceholder('Version', '1.0.0');

engine.registerProvider(provider, 80);
const result = await engine.resolveAll('{{AppName}} v{{Version}}');
// "My App v1.0.0"
```

#### `ToolDescriptionProvider`

Tool description provider (requires PluginRuntime).

**Supported Variables**:
- `{{VCPAllTools}}` - All tool descriptions
- `{{VCPToolName}}` - Specific tool description (e.g., `{{VCPRandomness}}`)

**Example**:
```typescript
const provider = new ToolDescriptionProvider(pluginRuntime);
engine.registerProvider(provider, 70);

const result = await engine.resolveAll('Available tools:\n{{VCPAllTools}}');
// "Available tools:\nVCPRandomness: Random event generator..."
```

---

## Plugin Module

### `PluginRuntime`

Plugin runtime class.

#### Constructor

```typescript
new PluginRuntime(options?: PluginRuntimeOptions)
```

**Parameters**:
- `options` (optional)
  - `pluginDir` - Plugin directory path (default: `'Plugin'`)
  - `debug` - Enable debug mode (default: `false`)
  - `autoDiscover` - Auto-discover plugins (default: `false`)

**Example**:
```typescript
const runtime = new PluginRuntime({
  pluginDir: './Plugin',
  debug: true
});
```

---

#### `registerPlugin(manifest: PluginManifest): Promise<void>`

Register a plugin.

**Parameters**:
- `manifest` - Plugin manifest object

**Throws**:
- `VCPError` - Invalid manifest or registration failure

**Example**:
```typescript
await runtime.registerPlugin({
  id: 'Randomness',
  name: 'Randomness',
  version: '5.2.0',
  type: 'direct',
  description: 'Random event generator',
  capabilities: {
    invocationCommands: [{
      command: 'rollDice',
      description: 'Roll dice'
    }]
  }
});
```

---

#### `executePlugin(name: string, args: any): Promise<any>`

Execute a plugin.

**Parameters**:
- `name` - Plugin/tool name
- `args` - Execution arguments

**Returns**: Execution result

**Throws**:
- `VCPError(TOOL_NOT_FOUND)` - Tool doesn't exist
- `VCPError(TOOL_EXECUTION_FAILED)` - Execution failed
- `VCPError(TOOL_TIMEOUT)` - Execution timeout

**Example**:
```typescript
const result = await runtime.executePlugin('Randomness', {
  command: 'rollDice',
  diceString: '2d6'
});
// { status: 'success', result: { total: 11, rolls: [6, 5] } }
```

---

#### `getToolDescriptions(): Map<string, string>`

Get descriptions of all tools.

**Returns**: Map of tool names to descriptions

**Example**:
```typescript
const descriptions = runtime.getToolDescriptions();
for (const [name, desc] of descriptions) {
  console.log(`${name}: ${desc}`);
}
```

---

#### `registerDistributedTools(serverId: string, tools: PluginManifest[]): void`

Batch register tools from distributed node.

**Parameters**:
- `serverId` - Distributed server ID
- `tools` - Array of tool manifests

**Example**:
```typescript
runtime.registerDistributedTools('node-1', [
  { name: 'RemoteTool1', type: 'distributed', ... },
  { name: 'RemoteTool2', type: 'distributed', ... }
]);
```

---

#### `unregisterAllDistributedTools(serverId: string): void`

Unregister all tools from specified distributed node.

**Parameters**:
- `serverId` - Distributed server ID

**Example**:
```typescript
runtime.unregisterAllDistributedTools('node-1');
```

---

#### `setDistributedExecutor(executor): void`

Set distributed tool executor function.

**Parameters**:
- `executor` - Executor function
  - Signature: `(serverId: string, toolName: string, args: any) => Promise<any>`

**Example**:
```typescript
runtime.setDistributedExecutor(async (serverId, toolName, args) => {
  // Call remote node via WebSocket
  return await webSocketChannel.executeDistributedTool(serverId, toolName, args);
});
```

---

#### `getPlugins(): PluginManifest[]`

Get all registered plugins.

**Returns**: Array of plugin manifests

**Example**:
```typescript
const plugins = runtime.getPlugins();
console.log(`${plugins.length} plugins registered`);
```

---

### Plugin Runtime Events

PluginRuntime extends `EventEmitter` and supports the following events:

#### `plugin_registered`

Triggered when a plugin is successfully registered.

**Event Data**:
```typescript
{
  plugin: PluginManifest
}
```

**Example**:
```typescript
runtime.on('plugin_registered', ({ plugin }) => {
  console.log(`New plugin: ${plugin.name}`);
});
```

#### `plugin_executed`

Triggered when a plugin executes successfully.

**Event Data**:
```typescript
{
  plugin: string,  // Plugin name
  result: any      // Execution result
}
```

**Example**:
```typescript
runtime.on('plugin_executed', ({ plugin, result }) => {
  console.log(`${plugin} succeeded`);
});
```

#### `plugin_error`

Triggered when a plugin execution fails.

**Event Data**:
```typescript
{
  plugin: string,  // Plugin name
  error: Error     // Error object
}
```

**Example**:
```typescript
runtime.on('plugin_error', ({ plugin, error }) => {
  console.error(`${plugin} failed: ${error.message}`);
});
```

---

## Communication Module

### `WebSocketManager`

WebSocket manager class.

#### Constructor

```typescript
new WebSocketManager(options?: WebSocketManagerOptions)
```

**Parameters**:
- `options` (optional)
  - `enableHeartbeat` - Enable heartbeat (default: `false`)
  - `enableCompression` - Enable compression (default: `false`)

#### `initialize(httpServer: Server): void`

Initialize WebSocket server.

**Parameters**:
- `httpServer` - HTTP server instance

**Example**:
```typescript
import { Server } from 'http';
import { WebSocketManager } from 'vcp-intellicore-sdk';

const httpServer = new Server(app);
const wsManager = new WebSocketManager();
wsManager.initialize(httpServer);
```

#### `registerChannel(channel: BaseChannel): void`

Register WebSocket channel.

**Parameters**:
- `channel` - Channel instance

**Example**:
```typescript
const vcpLogChannel = new VCPLogChannelSDK();
wsManager.registerChannel(vcpLogChannel);
```

---

### `VCPLogChannelSDK`

VCPLog channel class (for real-time log pushing).

#### `pushLog(logData): void`

Push log message.

**Parameters**:
- `logData` - Log data object
  - `logType` - Log type (`'tool_log' | 'ai_stream' | 'vcp_log' | 'notification'`)
  - `content` - Log content
  - `source` - Log source
  - `timestamp` - Timestamp (optional)

**Example**:
```typescript
vcpLogChannel.pushLog({
  logType: 'tool_log',
  content: 'Tool executed successfully',
  source: 'server',
  tool: 'Randomness',
  status: 'success'
});
```

#### `pushToolLog(data): void`

Push tool execution log (shortcut method).

**Parameters**:
- `data` - Tool log data
  - `status` - Status (`'executing' | 'success' | 'error'`)
  - `tool` - Tool name
  - `content` - Log content
  - `source` - Log source (optional)

**Example**:
```typescript
vcpLogChannel.pushToolLog({
  status: 'success',
  tool: 'Randomness',
  content: 'Dice roll result: 6'
});
```

---

### `DistributedServerChannelSDK`

Distributed server channel class.

#### `executeDistributedTool(serverId, toolName, args, timeout?): Promise<any>`

Execute distributed tool.

**Parameters**:
- `serverId` - Server ID or name
- `toolName` - Tool name
- `args` - Tool arguments
- `timeout` - Timeout in ms (optional, default: 60000)

**Returns**: Tool execution result

**Throws**:
- `VCPError(DISTRIBUTED_CONNECTION_ERROR)` - Server not connected
- `VCPError(DISTRIBUTED_TIMEOUT)` - Execution timeout

**Example**:
```typescript
const result = await distributedChannel.executeDistributedTool(
  'node-1',
  'FileOperator',
  { action: 'read', path: '/test.txt' },
  30000  // 30 seconds timeout
);
```

#### `getDistributedServers(): Map<string, ServerInfo>`

Get all connected distributed servers.

**Returns**: Map of server IDs to server info

**Example**:
```typescript
const servers = distributedChannel.getDistributedServers();
for (const [id, info] of servers) {
  console.log(`${id}: ${info.serverName}, ${info.tools.length} tools`);
}
```

---

### `FileFetcher`

File fetcher class (cross-node file transfer).

#### Constructor

```typescript
new FileFetcher(distributedChannel: DistributedServerChannelSDK, options?)
```

**Parameters**:
- `distributedChannel` - Distributed server channel instance
- `options` (optional)
  - `cacheDir` - Cache directory (default: `'.cache/files'`)
  - `maxCacheSize` - Max cache size (default: `500MB`)
  - `maxFileSize` - Max file size (default: `50MB`)
  - `cacheTTL` - Cache TTL (default: `24 hours`)

#### `fetchFile(filePath, serverIdOrIp): Promise<FileResult>`

Fetch file from remote node.

**Parameters**:
- `filePath` - File path
- `serverIdOrIp` - Server ID or IP address

**Returns**: File result object
```typescript
{
  buffer: Buffer,
  mimeType: string,
  cached: boolean,
  cacheLevel: 'memory' | 'disk' | 'network'
}
```

**Example**:
```typescript
const file = await fileFetcher.fetchFile('/images/photo.jpg', '192.168.1.100');
console.log(`File size: ${file.buffer.length}, MIME: ${file.mimeType}`);
console.log(`Cache level: ${file.cacheLevel}`);
```

#### `getCacheStats(): Promise<CacheStats>`

Get cache statistics.

**Returns**: Cache statistics object

**Example**:
```typescript
const stats = await fileFetcher.getCacheStats();
console.log(`Memory hits: ${stats.memoryHits}`);
console.log(`Disk hits: ${stats.diskHits}`);
console.log(`Network hits: ${stats.networkHits}`);
```

---

## Utility Functions

### `createVCPProtocolParser(config?)`

Create protocol parser (factory function).

See [Protocol Module](#protocol-module).

---

### `createVariableEngine(options?)`

Create variable engine (factory function).

See [Variable Module](#variable-module).

---

## Error Handling

### `VCPError`

Standardized error class.

**Properties**:
- `code` - Error code (VCPErrorCode)
- `message` - Error message
- `details` - Error details (optional)

**Example**:
```typescript
try {
  await runtime.executePlugin('NonExistent', {});
} catch (error) {
  if (error instanceof VCPError) {
    console.error(`Error code: ${error.code}`);
    console.error(`Error message: ${error.message}`);
    console.error(`Details:`, error.details);
  }
}
```

---

## Best Practices

### 1. Provider Priority Order

```typescript
// Register by usage frequency (high to low) for better performance
engine.registerProvider(new ToolDescriptionProvider(runtime), 100);
engine.registerProvider(new TimeProvider(), 90);
engine.registerProvider(new EnvironmentProvider(), 80);
engine.registerProvider(new PlaceholderProvider(), 70);
```

### 2. Error Handling

```typescript
try {
  const result = await runtime.executePlugin(toolName, args);
} catch (error) {
  if (error instanceof VCPError) {
    switch (error.code) {
      case VCPErrorCode.TOOL_NOT_FOUND:
        console.log('Tool not found');
        break;
      case VCPErrorCode.TOOL_TIMEOUT:
        console.log('Execution timeout');
        break;
      default:
        console.error('Unknown error:', error);
    }
  }
}
```

### 3. Event Listening

```typescript
// Listen to all key events
runtime.on('plugin_registered', ({ plugin }) => {
  logger.info(`Plugin registered: ${plugin.name}`);
});

runtime.on('plugin_executed', ({ plugin, result }) => {
  logger.info(`Plugin executed: ${plugin}`);
});

runtime.on('plugin_error', ({ plugin, error }) => {
  logger.error(`Plugin error: ${plugin}`, error);
});
```

### 4. Timeout Configuration

```typescript
// Set reasonable timeout based on tool characteristics
const fastTool = {
  type: 'direct',
  communication: { timeout: 5000 }  // 5 seconds
};

const slowTool = {
  type: 'direct',
  communication: { timeout: 120000 }  // 2 minutes
};
```

---

## FAQ

### Q1: How to debug plugin execution issues?

```typescript
const runtime = new PluginRuntime({ debug: true });  // Enable debug mode

// View detailed logs
runtime.on('plugin_executed', ({ plugin, result }) => {
  console.log('Result:', JSON.stringify(result, null, 2));
});
```

### Q2: How to handle plugin timeouts?

```typescript
// Solution 1: Increase timeout
const manifest = {
  communication: { timeout: 60000 }  // 60 seconds
};

// Solution 2: Catch timeout error
try {
  const result = await runtime.executePlugin(name, args);
} catch (error) {
  if (error.code === VCPErrorCode.TOOL_TIMEOUT) {
    console.log('Tool timeout, consider increasing timeout config');
  }
}
```

### Q3: How to use different variable values across environments?

```typescript
const provider = new EnvironmentProvider();

// Development
if (process.env.NODE_ENV === 'development') {
  provider.setVariable('API_URL', 'http://localhost:3000');
}

// Production
if (process.env.NODE_ENV === 'production') {
  provider.setVariable('API_URL', 'https://api.example.com');
}
```

---

## Performance Optimization

### 1. Provider Priority

High-frequency providers should have higher priority:

```typescript
// ToolDescription most frequent → highest priority
engine.registerProvider(toolDescProvider, 100);

// Time less frequent
engine.registerProvider(timeProvider, 90);

// Environment occasional
engine.registerProvider(envProvider, 80);

// Placeholder rare → lowest priority
engine.registerProvider(placeholderProvider, 70);
```

### 2. Cache Tool Descriptions

```typescript
// Get all descriptions once, avoid repeated calls
const allDescriptions = runtime.getToolDescriptions();
const cachedDesc = allDescriptions.get('VCPRandomness');
```

### 3. Batch Plugin Registration

```typescript
// Use registerDistributedTools for batch, not loop registerPlugin
runtime.registerDistributedTools('node-1', multipleTools);
```

---

## Version Compatibility

| SDK Version | Node.js | TypeScript | VCPToolBox |
|-------------|---------|------------|------------|
| 1.0.0-beta.5 | >=16.0.0 | ^5.0.0 | 100% |
| 1.0.0-beta.4 | >=16.0.0 | ^5.0.0 | 100% |
| 1.0.0-beta.3 | >=16.0.0 | ^5.0.0 | 100% |

---

## More Resources

- **[Communication Module](./COMMUNICATION.md)** - WebSocket and FileFetcher details
- **[Plugin Development](./PLUGIN_DEVELOPMENT.md)** - How to develop VCP plugins
- **[Advanced Usage](./ADVANCED.md)** - Advanced patterns and techniques
- **[Examples](../examples/)** - Runnable example projects

---

**Last Updated: 2025-10-27**  
**SDK Version: 1.0.0-beta.5**


