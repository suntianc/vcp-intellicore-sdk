# Changelog

All notable changes to the VCP SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0-beta.1] - 2025-10-27

### 🎉 Initial Beta Release

First public beta release of VCP SDK, production-verified with VCPChat.

### ✨ Added

#### Core Modules

- **Types Module** (`@vcp/sdk/types`)
  - 16 core interfaces (IVCPProtocolParser, IVariableEngine, IPluginRuntime, etc.)
  - 18 standardized error codes (VCPErrorCode enum)
  - Complete TypeScript type definitions
  - PluginManifest interface with 6 plugin types

- **Protocol Module** (`@vcp/sdk/protocol`)
  - VCPProtocolParser class
  - `parseToolRequests()` - Parse VCP tool call markers
  - `formatToolResult()` - Format tool results for AI
  - `hasToolRequests()` - Check for tool requests
  - 100% VCPToolBox compatible

- **Variable Module** (`@vcp/sdk/variable`)
  - VariableEngine class with recursion support
  - TimeProvider - Date/time variables ({{Date}}, {{Time}}, etc.)
  - EnvironmentProvider - Environment variables ({{ENV_*}})
  - PlaceholderProvider - Custom placeholders
  - ToolDescriptionProvider - Tool descriptions ({{VCPAllTools}})
  - Circular dependency detection
  - Performance optimized (87-94% faster)

- **Plugin Module** (`@vcp/sdk/plugin`)
  - PluginRuntime class
  - Support for 6 plugin types:
    - Distributed (remote tools via WebSocket)
    - Direct (direct protocol like ChromeControl)
    - Preprocessor (message preprocessing pipeline)
    - Service (reusable service modules)
    - Static (static placeholder providers)
    - Internal (system built-in tools)
  - Event-driven architecture (plugin_registered, plugin_executed, etc.)
  - Timeout control for distributed tools
  - Tool description auto-generation

#### Features

- **Type Safety** - 100% TypeScript coverage
- **Event System** - EventEmitter-based lifecycle hooks
- **Timeout Control** - Configurable timeout for tool execution (default 30s)
- **Error Handling** - Comprehensive VCPError with standardized codes
- **Performance** - RegExp caching, batch replacement optimization
- **Security** - DoS protection, circular detection, timeout enforcement

### 🧪 Tested

- **Unit Tests**: 17 scenarios, 100% pass
- **Integration Tests**: 7 scenarios, 100% pass
- **End-to-End Tests**: 7 scenarios, 100% pass
- **Production Verification**: VCPChat integration, 9 scenarios, 100% pass
- **Total**: 40 test scenarios, 100% pass rate

### 📊 Performance

- Variable resolution: <1ms
- Protocol parsing: <2ms
- Plugin registration: <5ms
- Tool execution: <1ms (excluding network)
- Memory efficient: ~5MB for typical workload

### 🔗 Compatibility

- **VCPToolBox**: 100% compatible
- **VCPChat**: 100% compatible
- **Node.js**: >=16.0.0 required
- **TypeScript**: ^5.0.0 recommended

### 📝 Documentation

- README.md - Quick start and overview
- API.md - Complete API reference
- GUIDE.md - Developer guide
- TYPES.md - TypeScript type reference
- 5 runnable examples

---

## [Unreleased]

### Planned for 1.0.0

- [ ] Communication module (WebSocket manager, FileFetcher)
- [ ] CLI tools for plugin development
- [ ] Plugin hot-reload support
- [ ] More built-in variable providers
- [ ] Performance benchmarking tools

---

## Development Notes

### Week 2 (M1-M3)
- Implemented Types, Protocol, Variable modules
- Achieved 87-94% performance improvement
- Code simplification: 62 → 1 core line in ChatService

### Week 3 (M4)
- Implemented Plugin Runtime
- Added 6 plugin types support
- Production verification with VCPChat

### Bug Fixes
- Fixed VCPLog displaying raw JSON instead of friendly messages
- Added content extraction priority: message > messageForAI > formatted

---

**For detailed changes, see [Git Commits](https://github.com/vcp-project/vcp-sdk/commits)**

