# VCP SDK Examples

Complete collection of runnable examples demonstrating all VCP SDK features.

---

## 🚀 Quick Start

### Run an Example

```bash
# Navigate to SDK directory
cd vcp-intellicore/src/sdk

# Run any example
npx ts-node examples/01-basic-usage/index.ts
npx ts-node examples/02-protocol-parser/index.ts
npx ts-node examples/03-variable-engine/index.ts
npx ts-node examples/04-plugin-runtime/index.ts
npx ts-node examples/05-full-integration/index.ts
```

---

## 📚 Example Index

### Basic Examples (5)

#### 01 - Basic Usage

**What it demonstrates**:
- Creating a variable engine
- Registering providers
- Resolving variables
- Performance testing

**Key concepts**:
- TimeProvider for date/time variables
- PlaceholderProvider for custom values
- Recursive resolution
- Sub-millisecond performance

**Run it**:
```bash
npx ts-node examples/01-basic-usage/index.ts
```

**Expected output**:
```
✅ Variable engine created
✅ Variables resolved: {{DateTime}} → "2025/10/27 15:30:00"
✅ Performance: ~0.3ms for 4 variables
```

---

#### 02 - Protocol Parser

**What it demonstrates**:
- Parsing VCP tool request markers
- Handling multiple parameters
- Archery tool detection
- Multi-line parameters
- Tool result formatting

**Key concepts**:
- `<<<[TOOL_REQUEST]>>>` marker parsing
- Parameter extraction with `「始」「末」`
- Tool result formatting for AI
- Marker detection with `hasToolRequests()`

**Run it**:
```bash
npx ts-node examples/02-protocol-parser/index.ts
```

**Expected output**:
```
✅ 6 parsing scenarios demonstrated
✅ Tool requests correctly extracted
✅ Parameters parsed accurately
✅ Result formatting works
```

---

#### 03 - Variable Engine Advanced

**What it demonstrates**:
- Recursive variable resolution
- Circular dependency detection
- Custom variable providers
- Provider priority
- Performance benchmarking

**Key concepts**:
- Multi-level recursion ({{A}} → {{B}} → value)
- Circular detection ({{A}} → {{B}} → {{A}})
- Implementing `IVariableProvider`
- Provider registration order

**Run it**:
```bash
npx ts-node examples/03-variable-engine/index.ts
```

**Expected output**:
```
✅ Recursive resolution: 3 levels
✅ Circular dependency caught
✅ Custom provider works (RandomNumber, UUID)
✅ Performance: ~0.5ms for 21 variables
```

---

#### 04 - Plugin Runtime

**What it demonstrates**:
- Registering different plugin types
- Event monitoring
- Tool description generation
- Service module access
- Static placeholder management
- Plugin execution

**Key concepts**:
- 6 plugin types (distributed, direct, preprocessor, service, static, internal)
- Event-driven architecture
- Auto-generated tool descriptions
- Dependency injection pattern

**Run it**:
```bash
npx ts-node examples/04-plugin-runtime/index.ts
```

**Expected output**:
```
✅ 3 plugin types registered
✅ Events emitted (4 events)
✅ Tool descriptions generated
✅ Service module accessible
✅ Mock execution successful
```

---

#### 05 - Full Integration

**What it demonstrates**:
- Complete VCP server implementation
- All modules working together
- Message processing flow
- Tool execution loop
- Production patterns

**Key concepts**:
- Server class design
- Module initialization order
- Variable → Parse → Execute → Format flow
- Simulated LLM interaction

**Run it**:
```bash
npx ts-node examples/05-full-integration/index.ts
```

**Expected output**:
```
✅ VCP server initialized
✅ 2 tools registered (Calculator, Weather)
✅ 3 test conversations processed
✅ All modules integrated successfully
```

---

### Advanced Examples (2)

#### WebSocket Server Integration

**What it demonstrates**:
- Building a VCP-compatible WebSocket server
- Distributed node connection handling
- Tool registration over WebSocket
- Real-time tool execution

**File**: `advanced/websocket-server.ts`

**Key features**:
- Multi-client support
- Distributed tool forwarding
- Node disconnect handling
- Timeout control

---

#### Express.js Middleware

**What it demonstrates**:
- Integration with Express.js
- OpenAI-compatible API endpoint
- Middleware pattern for VCP
- Tool execution in HTTP context

**File**: `advanced/express-middleware.ts`

**Key features**:
- Variable resolution middleware
- Tool execution middleware
- Error handling
- Debug endpoints

---

## 🎯 Learning Path

### Beginner Path

1. **Start with 01-basic-usage**
   - Understand variable resolution
   - See SDK basics in action

2. **Then 02-protocol-parser**
   - Learn VCP protocol format
   - Understand tool request parsing

3. **Next 04-plugin-runtime**
   - Explore plugin system
   - See different plugin types

### Intermediate Path

4. **Study 03-variable-engine**
   - Advanced features (recursion, circular detection)
   - Custom provider implementation

5. **Explore 05-full-integration**
   - See complete server implementation
   - Understand module integration

### Advanced Path

6. **Review advanced/websocket-server.ts**
   - Real-time communication
   - Distributed architecture

7. **Check advanced/express-middleware.ts**
   - HTTP integration
   - Production patterns

---

## 📊 Example Statistics

```
Total Examples: 7
Basic: 5
Advanced: 2

Total Code: 1,100+ lines
All Tested: ✅ Yes
Pass Rate: 100%

Concepts Covered:
- Variable resolution
- Protocol parsing
- Plugin management
- Event handling
- WebSocket communication
- HTTP integration
- Performance optimization
- Error handling
```

---

## 🔧 Customizing Examples

All examples are self-contained and can be modified:

```bash
# Copy an example
cp -r examples/01-basic-usage my-example

# Modify it
code my-example/index.ts

# Run it
npx ts-node my-example/index.ts
```

---

## 💡 Tips

1. **Read comments** - Examples have detailed inline comments
2. **Modify and experiment** - Change values and see what happens
3. **Check output** - Pay attention to performance metrics
4. **Combine patterns** - Mix concepts from different examples

---

## 🐛 Troubleshooting

### Example won't run

```bash
# Make sure you're in the SDK directory
cd vcp-intellicore/src/sdk

# Install dependencies if needed
npm install

# Try building first
npm run build

# Then run the example
npx ts-node examples/01-basic-usage/index.ts
```

### TypeScript errors

```bash
# Check your Node.js version
node --version  # Should be >= 16.0.0

# Check TypeScript version
npx tsc --version  # Should be >= 5.0.0
```

---

## 📚 Related Documentation

- **[API Reference](../docs/API.md)** - Complete API documentation
- **[Developer Guide](../docs/GUIDE.md)** - Detailed guides and tutorials
- **[README](../README.md)** - Project overview

---

**Happy coding with VCP SDK! 🚀**

