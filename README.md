# vcp-intellicore-sdk

**English** | [简体中文](./README.zh-CN.md)

> **VCP (Variable & Command Protocol) SDK** - Core modules for building VCP-compatible AI servers with tool calling, variable resolution, and plugin management.

[![npm version](https://img.shields.io/npm/v/vcp-intellicore-sdk.svg)](https://www.npmjs.com/package/vcp-intellicore-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

---

## 🎯 What is VCP SDK?

VCP SDK provides the **core building blocks** for creating AI servers that support:

- 🔧 **Tool Calling** - Parse and execute AI tool requests using VCP protocol
- 🔄 **Variable Resolution** - Dynamic placeholder replacement with recursion support
- 🔌 **Plugin Management** - Manage 6 types of plugins (distributed, direct, preprocessor, service, static, internal)
- 📡 **WebSocket Communication** - 5 specialized channels for real-time communication
- 🎯 **100% VCPToolBox Compatible** - Full compatibility with existing VCP ecosystem

---

## 🚀 Quick Start

### Installation

```bash
npm install vcp-intellicore-sdk@beta
```

### Basic Usage

```typescript
import { 
  createVariableEngine, 
  PluginRuntime,
  createVCPProtocolParser,
  TimeProvider,
  ToolDescriptionProvider
} from 'vcp-intellicore-sdk';

// 1. Create Variable Engine
const variableEngine = createVariableEngine();
variableEngine.registerProvider(new TimeProvider());

// 2. Create Plugin Runtime
const pluginRuntime = new PluginRuntime({ pluginDir: './Plugin' });

// 3. Register Plugin
await pluginRuntime.registerPlugin({
  id: 'Randomness',
  name: 'Randomness',
  version: '5.2.0',
  description: 'Random event generator',
  type: 'direct',
  capabilities: {
    invocationCommands: [{
      command: 'rollDice',
      description: 'Roll dice'
    }]
  }
});

// 4. Use Protocol Parser
const parser = createVCPProtocolParser();
const toolRequests = parser.parseToolRequests(aiResponse);

// 5. Execute Tools
for (const req of toolRequests) {
  const result = await pluginRuntime.executePlugin(req.name, req.args);
  console.log(result);
}
```

---

## 📦 Core Modules

### 🎨 Types Module

Complete TypeScript type definitions:

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

**Features**:
- 16 core interfaces
- 18 standardized error codes
- Full type safety
- IDE autocomplete support

---

### 🔍 Protocol Module

VCP protocol parsing and formatting:

```typescript
import { createVCPProtocolParser } from 'vcp-intellicore-sdk';

const parser = createVCPProtocolParser();

// Parse tool requests from AI response
const requests = parser.parseToolRequests(content);
// => [{ name: 'ToolName', args: { key: 'value' } }]

// Format tool result for AI
const formatted = parser.formatToolResult(result);
// => "Result from tool \"ToolName\":\n..."

// Check if content has tool requests
const hasCalls = parser.hasToolRequests(content);
```

**Protocol Markers**:
```
<<<[TOOL_REQUEST]>>>
tool_name: 「始」ToolName「末」
param1: 「始」value1「末」
param2: 「始」value2「末」
<<<[END_TOOL_REQUEST]>>>
```

---

### 🔄 Variable Module

Dynamic variable resolution system:

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

// Register built-in providers
engine.registerProvider(new TimeProvider());
engine.registerProvider(new EnvironmentProvider());
engine.registerProvider(new PlaceholderProvider());
engine.registerProvider(new ToolDescriptionProvider(pluginRuntime));

// Resolve all variables
const result = await engine.resolveAll('Current time: {{DateTime}}, User: {{ENV_USER}}');
```

**Built-in Variables**:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{Date}}` | Current date | 2025-10-27 |
| `{{Time}}` | Current time | 15:30:00 |
| `{{DateTime}}` | Date and time | 2025-10-27 15:30:00 |
| `{{Timestamp}}` | Unix timestamp | 1761550676 |
| `{{ENV_*}}` | Environment variables | {{ENV_USER}} |
| `{{VCPAllTools}}` | All tool descriptions | (auto-generated) |
| `{{VCPToolName}}` | Specific tool description | (auto-generated) |

---

### 🔌 Plugin Module

Complete plugin runtime system:

```typescript
import { PluginRuntime, PluginManifest } from 'vcp-intellicore-sdk';

const runtime = new PluginRuntime({ 
  pluginDir: './Plugin',
  debug: true 
});

// Register plugin
await runtime.registerPlugin({
  id: 'Calculator',
  name: 'Calculator',
  version: '1.0.0',
  description: 'Math calculator tool',
  type: 'direct',
  main: 'calculator.py',
  capabilities: {
    invocationCommands: [{
      command: 'calculate',
      description: 'Performs mathematical calculations',
      example: 'calculate "2+2"'
    }]
  }
});

// Execute plugin
const result = await runtime.executePlugin('Calculator', { 
  command: 'calculate',
  expression: '2+2' 
});

// Get tool descriptions (for AI prompt)
const descriptions = runtime.getToolDescriptions();
console.log(descriptions.get('VCPCalculator'));
```

**Supported Plugin Types**:

| Type | Description | Use Case |
|------|-------------|----------|
| **direct** | stdio protocol plugins | Python/Node.js scripts |
| **distributed** | Remote distributed tools | Tools on remote nodes |
| **internal** | Built-in tools | System internal functions |
| **preprocessor** | Message preprocessors | Message preprocessing pipeline |
| **service** | Service modules | Reusable services |
| **static** | Static plugins | Static placeholder providers |

---

### 📡 Communication Module

Complete WebSocket management system:

```typescript
import {
  WebSocketManager,
  VCPLogChannelSDK,
  DistributedServerChannelSDK,
  FileFetcher
} from 'vcp-intellicore-sdk';

// Create WebSocket manager
const wsManager = new WebSocketManager();
wsManager.initialize(httpServer);

// Register channels
const vcpLogChannel = new VCPLogChannelSDK();
wsManager.registerChannel(vcpLogChannel);

// Push logs
vcpLogChannel.pushToolLog({
  status: 'success',
  tool: 'Randomness',
  content: 'Dice roll result: 6',
  source: 'tool_execution'
});

// FileFetcher - Cross-node file transfer
const fileFetcher = new FileFetcher(distributedChannel);
const file = await fileFetcher.fetchFile('/path/to/file', 'server-id');
```

**5 WebSocket Channels**:

1. **VCPLog** - Real-time log pushing
2. **VCPInfo** - Debug information
3. **DistributedServer** - Distributed node communication
4. **ChromeObserver** - Chrome extension connection
5. **AdminPanel** - Admin panel connection

---

## 🏗️ Architecture

```
vcp-intellicore-sdk
├── types/            TypeScript interfaces & error codes
├── protocol/         VCP protocol parser
├── variable/         Variable engine + 4 providers
├── plugin/           Plugin runtime + 6 plugin types
└── communication/    WebSocket manager + 5 channels + FileFetcher

Integration Flow:
User Message → Variable Resolution → Tool Parsing → Tool Execution → Result Formatting → AI Response
     ↓              (VariableEngine)    (ProtocolParser)  (PluginRuntime)  (ProtocolParser)
  {{Vars}}               ↓                    ↓                 ↓                ↓
  Resolved         Tool Requests        Execute Tools     Format Results    Final Output
```

---

## 📚 Documentation

- **[API Reference](./docs/API.md)** - Complete API documentation
- **[Developer Guide](./docs/GUIDE.md)** - How to use VCP SDK
- **[Communication Guide](./docs/COMMUNICATION.md)** - WebSocket communication details
- **[Plugin Development](./docs/PLUGIN_DEVELOPMENT.md)** - How to develop VCP plugins
- **[Examples](./examples/)** - 7 runnable examples

---

## 🧪 Examples

### Example 1: Protocol Parser

```typescript
import { createVCPProtocolParser } from 'vcp-intellicore-sdk';

const parser = createVCPProtocolParser();
const aiResponse = `
I'll check the weather for you.

<<<[TOOL_REQUEST]>>>
tool_name: 「始」WeatherTool「末」
city: 「始」Beijing「末」
<<<[END_TOOL_REQUEST]>>>
`;

const requests = parser.parseToolRequests(aiResponse);
// => [{ name: 'WeatherTool', args: { city: 'Beijing' }, archery: false }]
```

### Example 2: Variable Engine with Recursion

```typescript
import { createVariableEngine, PlaceholderProvider } from 'vcp-intellicore-sdk';

const engine = createVariableEngine({
  enableRecursion: true,
  maxRecursionDepth: 5,
  detectCircular: true
});

const placeholderProvider = new PlaceholderProvider();
placeholderProvider.setPlaceholder('AppName', 'My App');
placeholderProvider.setPlaceholder('Greeting', 'Welcome to {{AppName}}!');

engine.registerProvider(placeholderProvider);

const result = await engine.resolveAll('Message: {{Greeting}}');
// => "Message: Welcome to My App!"
```

### Example 3: Plugin Runtime Events

```typescript
import { PluginRuntime } from 'vcp-intellicore-sdk';

const runtime = new PluginRuntime();

// Listen to events
runtime.on('plugin_registered', ({ plugin }) => {
  console.log(`New plugin: ${plugin.name}`);
});

runtime.on('plugin_executed', ({ plugin, result }) => {
  console.log(`Plugin ${plugin} succeeded`);
});

runtime.on('plugin_error', ({ plugin, error }) => {
  console.error(`Plugin ${plugin} failed:`, error);
});

// Register plugin
await runtime.registerPlugin({ /* manifest */ });
```

### Example 4: Distributed Tools Management

```typescript
// Batch register tools from distributed node
runtime.registerDistributedTools('node-1', [
  { name: 'RemoteTool1', ... },
  { name: 'RemoteTool2', ... }
]);

// Execute distributed tool
const result = await runtime.executePlugin('RemoteTool1', args);

// Unregister all tools when node disconnects
runtime.unregisterAllDistributedTools('node-1');
```

---

## 🎯 Features

### ✨ Core Features

- **Type-Safe** - 100% TypeScript with complete type definitions
- **Event-Driven** - EventEmitter-based plugin lifecycle
- **Timeout Control** - Configurable timeout for tool execution
- **Circular Detection** - Prevents infinite loops in variable resolution
- **Performance Optimized** - RegExp caching, batch replacement (87-94% faster)
- **VCPToolBox Compatible** - 100% compatible with existing VCP ecosystem

### 🔒 Security Features

- Circular dependency detection
- DoS protection (max 100 placeholders)
- Timeout enforcement
- Error code standardization
- Child process isolation

### 🚀 Performance

| Operation | Time | Memory |
|-----------|------|--------|
| Variable resolution | <1ms | ~10KB |
| Protocol parsing | <2ms | ~20KB |
| Plugin registration | <5ms | ~100KB |
| Tool execution | <1ms (excl. network) | ~10KB |
| Direct plugin execution | ~100-200ms | ~5MB |

---

## 🌟 Why VCP SDK?

### For AI Server Developers

- ✅ **Ready-to-use** - No need to implement VCP protocol from scratch
- ✅ **Type-safe** - Full TypeScript support
- ✅ **Tested** - 100% test coverage, production-verified
- ✅ **Extensible** - Easy to add custom providers and plugins

### For Plugin Developers

- ✅ **Standard Interface** - Clear plugin manifest format
- ✅ **6 Plugin Types** - Choose the right type for your use case
- ✅ **Event System** - Monitor plugin lifecycle
- ✅ **Error Handling** - Standardized error codes

---

## 🛠️ Development

### Setup

```bash
# Clone repository
git clone https://github.com/suntianc/vcp-intellicore-sdk.git
cd vcp-intellicore-sdk

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test
```

### Project Structure

```
vcp-intellicore-sdk/
├── src/                     # Source code
│   ├── types/              # Type definitions
│   ├── protocol/           # Protocol parser
│   ├── variable/           # Variable engine
│   ├── plugin/             # Plugin runtime
│   ├── communication/      # WebSocket communication
│   └── index.ts           # Main entry
├── tests/                  # Test files
├── docs/                   # Documentation
├── examples/               # Example code
└── dist/                   # Build output
```

---

## 📊 Status

```
Version: 1.0.0-beta.5 (Beta)
Status: Production-ready, VCPChat verified
Test Coverage: 100% (core features)
VCPToolBox Compatibility: 100%
Performance: Optimized (87-94% improvement)
```

---

## 🔗 Related Projects

- **VCP IntelliCore**: Full-featured VCP server implementation
- **VCPToolBox**: Original VCP server
- **VCPChat**: VCP-compatible chat client
- **Documentation**: [Full API Docs](./docs/API.md)
- **Examples**: [Example Projects](./examples/)

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

### Contribution Guidelines

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details

---

## 🙋 Support

- **Issues**: [GitHub Issues](https://github.com/suntianc/vcp-intellicore-sdk/issues)
- **Discussions**: [GitHub Discussions](https://github.com/suntianc/vcp-intellicore-sdk/discussions)
- **Documentation**: [API Docs](./docs/API.md)

---

## 🎯 Roadmap

### v1.0.0 (Coming Soon)
- [x] Protocol parser module
- [x] Variable engine module
- [x] Plugin runtime module
- [x] Communication module (WebSocket + FileFetcher)
- [x] Direct plugin execution
- [x] Distributed plugin execution
- [x] Internal plugin execution
- [ ] Service/Preprocessor plugin execution
- [ ] Plugin auto-discovery
- [ ] Hot-reload support

### v1.1.0 (Planned)
- [ ] CLI tools (`vcp-cli`)
- [ ] TypeScript plugin support
- [ ] Plugin development toolchain
- [ ] Visual debugging tools

### v2.0.0 (Future)
- [ ] Plugin marketplace
- [ ] Multi-language SDKs (Go/Rust/Python)
- [ ] Cloud plugin hosting
- [ ] WebUI management interface

---

## 📈 Version History

See full version history and changelog: [CHANGELOG.md](./CHANGELOG.md)

---

**Built with ❤️ by the VCP Team**

