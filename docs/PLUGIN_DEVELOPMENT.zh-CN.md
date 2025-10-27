# VCP插件开发指南

[English](./PLUGIN_DEVELOPMENT.md) | **简体中文**

> 完整的VCP插件开发指南，教你如何开发各种类型的VCP插件。

---

## 📑 目录

- [快速开始](#快速开始)
- [插件类型](#插件类型)
- [Manifest配置](#manifest配置)
- [Direct插件开发](#direct插件开发python示例)
- [Distributed插件开发](#distributed插件开发)
- [调试和测试](#调试和测试)
- [最佳实践](#最佳实践)

---

## 快速开始

### 创建你的第一个插件

#### 步骤1：创建插件目录

```bash
mkdir -p Plugin/MyFirstPlugin
cd Plugin/MyFirstPlugin
```

#### 步骤2：创建manifest文件

创建 `plugin-manifest.json`：

```json
{
  "manifestVersion": "1.0.0",
  "name": "MyFirstPlugin",
  "displayName": "我的第一个插件",
  "version": "1.0.0",
  "description": "这是我的第一个VCP插件示例",
  "author": "Your Name",
  "pluginType": "synchronous",
  "entryPoint": {
    "type": "python",
    "command": "python main.py"
  },
  "communication": {
    "protocol": "stdio",
    "timeout": 10000
  },
  "capabilities": {
    "invocationCommands": [
      {
        "commandIdentifier": "greet",
        "description": "功能: 打招呼\n参数:\n- name (字符串, 必需): 名字",
        "example": "<<<[TOOL_REQUEST]>>>\ntool_name:「始」MyFirstPlugin「末」,\ncommand:「始」greet「末」,\nname:「始」Alice「末」\n<<<[END_TOOL_REQUEST]>>>"
      }
    ]
  }
}
```

#### 步骤3：创建插件代码

创建 `main.py`：

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
import sys

def main():
    # 从stdin读取参数
    input_data = sys.stdin.read()
    
    try:
        # 解析JSON参数
        args = json.loads(input_data) if input_data else {}
        
        # 获取参数
        command = args.get('command', '')
        name = args.get('name', 'World')
        
        # 执行命令
        if command == 'greet':
            result = {
                "status": "success",
                "message": f"你好，{name}！欢迎使用VCP插件系统！",
                "messageForAI": f"已向{name}打招呼"
            }
        else:
            result = {
                "status": "error",
                "error": f"未知命令: {command}"
            }
        
        # 输出JSON结果
        print(json.dumps(result, ensure_ascii=False))
        
    except Exception as e:
        # 错误处理
        error_result = {
            "status": "error",
            "error": str(e)
        }
        print(json.dumps(error_result, ensure_ascii=False))
        sys.exit(1)

if __name__ == "__main__":
    main()
```

#### 步骤4：注册并测试

```typescript
import { PluginRuntime } from 'vcp-intellicore-sdk';

const runtime = new PluginRuntime({ pluginDir: './Plugin' });

// 注册插件
await runtime.registerPlugin({
  id: 'MyFirstPlugin',
  name: 'MyFirstPlugin',
  version: '1.0.0',
  type: 'direct',
  description: '我的第一个插件',
  capabilities: {
    invocationCommands: [{
      command: 'greet',
      description: '打招呼'
    }]
  }
});

// 执行插件
const result = await runtime.executePlugin('MyFirstPlugin', {
  command: 'greet',
  name: 'Alice'
});

console.log(result);
// { status: 'success', message: '你好，Alice！欢迎使用VCP插件系统！' }
```

**🎉 恭喜！你的第一个VCP插件已经完成！**

---

## 插件类型

VCP SDK支持**6种插件类型**，每种适用于不同的场景。

### 1️⃣ Direct插件（推荐新手）

**特点**：
- 通过stdio协议通信
- 支持Python、Node.js、Shell等任何可执行程序
- 同步执行，等待结果

**适用场景**：
- 文件操作
- 数据处理
- API调用
- 本地计算

**示例**：Randomness（骰子）、FileOperator、ImageProcessor

---

### 2️⃣ Distributed插件

**特点**：
- 运行在远程节点
- 通过WebSocket通信
- 支持跨服务器调用

**适用场景**：
- 跨服务器工具
- 资源密集型任务
- 需要特殊环境的工具

**示例**：RemoteFileServer、CloudCompute

---

### 3️⃣ Internal插件

**特点**：
- 系统内置工具
- 无需外部进程
- 直接返回数据

**适用场景**：
- 系统信息查询
- 配置读取
- 简单计算

**示例**：TVSList、AgentList

---

### 4️⃣ Preprocessor插件

**特点**：
- 拦截和修改消息
- 在发送给LLM前处理

**适用场景**：
- 消息过滤
- 内容审查
- 格式转换

---

### 5️⃣ Service插件

**特点**：
- 提供可复用的服务
- 可注册API路由
- 后台持续运行

**适用场景**：
- 数据库服务
- 缓存服务
- API网关

---

### 6️⃣ Static插件

**特点**：
- 提供静态占位符值
- 无需执行

**适用场景**：
- 配置常量
- 静态数据
- 预定义模板

---

## Direct插件开发（Python示例）

### 完整示例：天气查询插件

#### 文件结构
```
Plugin/WeatherTool/
├── plugin-manifest.json
├── main.py
└── requirements.txt (可选)
```

#### plugin-manifest.json

```json
{
  "manifestVersion": "1.0.0",
  "name": "WeatherTool",
  "displayName": "天气查询工具",
  "version": "1.0.0",
  "description": "查询指定城市的天气信息",
  "author": "Your Name",
  "pluginType": "synchronous",
  "entryPoint": {
    "type": "python",
    "command": "python main.py"
  },
  "communication": {
    "protocol": "stdio",
    "timeout": 15000
  },
  "configSchema": {
    "WEATHER_API_KEY": {
      "type": "string",
      "description": "天气API密钥",
      "default": "your-api-key-here"
    }
  },
  "capabilities": {
    "invocationCommands": [
      {
        "commandIdentifier": "getWeather",
        "description": "功能: 查询城市天气\n参数:\n- city (字符串, 必需): 城市名称\n- unit (字符串, 可选): 温度单位 (celsius|fahrenheit)，默认celsius",
        "example": "<<<[TOOL_REQUEST]>>>\ntool_name:「始」WeatherTool「末」,\ncommand:「始」getWeather「末」,\ncity:「始」北京「末」\n<<<[END_TOOL_REQUEST]>>>"
      }
    ]
  },
  "webSocketPush": {
    "enabled": true,
    "usePluginResultAsMessage": false,
    "messageType": "WeatherResult"
  }
}
```

#### main.py

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
import sys
import os
import requests

def get_weather(city, unit='celsius'):
    """查询城市天气"""
    api_key = os.environ.get('WEATHER_API_KEY', '')
    
    if not api_key:
        return {
            "status": "error",
            "error": "未配置WEATHER_API_KEY"
        }
    
    try:
        # 调用天气API（示例）
        url = f"https://api.weatherapi.com/v1/current.json?key={api_key}&q={city}"
        response = requests.get(url, timeout=10)
        data = response.json()
        
        # 提取天气信息
        temp_c = data['current']['temp_c']
        condition = data['current']['condition']['text']
        
        # 返回结果
        return {
            "status": "success",
            "result": {
                "city": city,
                "temperature": temp_c,
                "condition": condition,
                "unit": "celsius"
            },
            "message": f"{city}的天气：{condition}，温度{temp_c}°C",
            "messageForAI": f"已查询{city}天气，当前{condition}，温度{temp_c}°C"
        }
        
    except Exception as e:
        return {
            "status": "error",
            "error": f"查询失败: {str(e)}"
        }

def main():
    # 读取stdin输入
    input_data = sys.stdin.read()
    
    try:
        # 解析参数
        args = json.loads(input_data) if input_data else {}
        
        command = args.get('command', '')
        
        # 路由命令
        if command == 'getWeather':
            city = args.get('city', '')
            unit = args.get('unit', 'celsius')
            
            if not city:
                result = {
                    "status": "error",
                    "error": "缺少必需参数: city"
                }
            else:
                result = get_weather(city, unit)
        else:
            result = {
                "status": "error",
                "error": f"未知命令: {command}"
            }
        
        # 输出JSON结果到stdout
        print(json.dumps(result, ensure_ascii=False))
        
    except json.JSONDecodeError as e:
        error_result = {
            "status": "error",
            "error": f"JSON解析失败: {str(e)}"
        }
        print(json.dumps(error_result, ensure_ascii=False))
        sys.exit(1)
        
    except Exception as e:
        error_result = {
            "status": "error",
            "error": f"执行错误: {str(e)}"
        }
        print(json.dumps(error_result, ensure_ascii=False))
        sys.exit(1)

if __name__ == "__main__":
    main()
```

#### requirements.txt

```
requests>=2.25.0
```

---

## Distributed插件开发

Distributed插件运行在独立的节点上，通过WebSocket与主服务器通信。

### 示例：文件操作分布式插件

```javascript
// distributed-file-server.js
const WebSocket = require('ws');

class DistributedFileServer {
  constructor(serverUrl, vcpKey) {
    this.serverUrl = serverUrl;
    this.vcpKey = vcpKey;
    this.ws = null;
  }
  
  connect() {
    const url = `${this.serverUrl}/vcp-distributed-server/VCP_Key=${this.vcpKey}`;
    this.ws = new WebSocket(url);
    
    this.ws.on('open', () => {
      console.log('✅ 已连接到VCP IntelliCore');
      this.registerTools();
    });
    
    this.ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      this.handleMessage(message);
    });
  }
  
  registerTools() {
    const message = {
      type: 'register_tools',
      data: {
        serverName: 'File-Server-Node',
        tools: [{
          name: 'DistributedFileOp',
          displayName: '[云端] 文件操作器',
          pluginType: 'synchronous',
          description: '分布式文件操作工具',
          capabilities: {
            invocationCommands: [{
              command: 'readFile',
              description: '读取文件内容'
            }]
          }
        }]
      }
    };
    
    this.ws.send(JSON.stringify(message));
    console.log('✅ 工具已注册');
  }
  
  async handleMessage(message) {
    if (message.type === 'execute_tool') {
      const { requestId, toolName, toolArgs } = message.data;
      
      console.log(`📥 收到工具执行请求: ${toolName}`);
      
      try {
        // 执行工具
        const result = await this.executeLocalTool(toolName, toolArgs);
        
        // 返回结果
        this.ws.send(JSON.stringify({
          type: 'tool_result',
          data: {
            requestId,
            status: 'success',
            result
          }
        }));
        
      } catch (error) {
        // 返回错误
        this.ws.send(JSON.stringify({
          type: 'tool_result',
          data: {
            requestId,
            status: 'error',
            error: error.message
          }
        }));
      }
    }
  }
  
  async executeLocalTool(toolName, args) {
    if (toolName === 'DistributedFileOp') {
      const { command, path } = args;
      
      if (command === 'readFile') {
        const fs = require('fs');
        const content = fs.readFileSync(path, 'utf-8');
        return {
          status: 'success',
          content,
          message: `文件读取成功：${path}`
        };
      }
    }
    
    throw new Error(`未知工具: ${toolName}`);
  }
}

// 启动
const server = new DistributedFileServer(
  'ws://localhost:3000',
  'your-vcp-key'
);

server.connect();
```

---

## Manifest配置详解

### 完整的manifest.json模板

```json
{
  "manifestVersion": "1.0.0",
  
  // 基本信息
  "name": "PluginName",
  "displayName": "插件显示名称",
  "version": "1.0.0",
  "description": "插件功能描述",
  "author": "作者名称",
  
  // 插件类型
  "pluginType": "synchronous|asynchronous",
  
  // 入口点配置
  "entryPoint": {
    "type": "python|node|shell",
    "command": "python main.py"
  },
  
  // 通信配置
  "communication": {
    "protocol": "stdio",
    "timeout": 10000
  },
  
  // 配置项（会作为环境变量注入）
  "configSchema": {
    "CONFIG_KEY": {
      "type": "string",
      "description": "配置项说明",
      "default": "默认值"
    }
  },
  
  // 能力定义
  "capabilities": {
    "invocationCommands": [
      {
        "commandIdentifier": "命令名称",
        "description": "命令描述",
        "example": "调用示例"
      }
    ],
    "streaming": false,
    "archery": false
  },
  
  // WebSocket推送配置
  "webSocketPush": {
    "enabled": true,
    "usePluginResultAsMessage": false,
    "messageType": "CustomMessageType"
  },
  
  // 其他
  "requiresAdmin": false,
  "tags": ["tag1", "tag2"]
}
```

### 字段说明

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 插件唯一标识符 |
| `displayName` | string | ✅ | 显示名称 |
| `version` | string | ✅ | 版本号（语义化版本） |
| `description` | string | ✅ | 功能描述 |
| `pluginType` | string | ✅ | `synchronous`或`asynchronous` |
| `entryPoint.command` | string | ✅ | 启动命令 |
| `communication.protocol` | string | ✅ | 通信协议（`stdio`） |
| `communication.timeout` | number | ❌ | 超时时间（毫秒，默认10000） |
| `capabilities.invocationCommands` | array | ✅ | 工具命令定义 |

---

## Direct插件开发（Python示例）

### 多命令插件

```python
#!/usr/bin/env python3
import json
import sys

def handle_command(command, args):
    """命令路由器"""
    if command == 'add':
        return add(args.get('a', 0), args.get('b', 0))
    
    elif command == 'subtract':
        return subtract(args.get('a', 0), args.get('b', 0))
    
    elif command == 'multiply':
        return multiply(args.get('a', 0), args.get('b', 0))
    
    else:
        return {
            "status": "error",
            "error": f"未知命令: {command}"
        }

def add(a, b):
    result = a + b
    return {
        "status": "success",
        "result": result,
        "message": f"{a} + {b} = {result}",
        "messageForAI": f"计算结果是{result}"
    }

def subtract(a, b):
    result = a - b
    return {
        "status": "success",
        "result": result,
        "message": f"{a} - {b} = {result}",
        "messageForAI": f"计算结果是{result}"
    }

def multiply(a, b):
    result = a * b
    return {
        "status": "success",
        "result": result,
        "message": f"{a} × {b} = {result}",
        "messageForAI": f"计算结果是{result}"
    }

def main():
    input_data = sys.stdin.read()
    
    try:
        args = json.loads(input_data) if input_data else {}
        command = args.get('command', '')
        
        result = handle_command(command, args)
        print(json.dumps(result, ensure_ascii=False))
        
    except Exception as e:
        error_result = {
            "status": "error",
            "error": str(e)
        }
        print(json.dumps(error_result, ensure_ascii=False))
        sys.exit(1)

if __name__ == "__main__":
    main()
```

---

### 返回值格式规范

#### 成功返回

```json
{
  "status": "success",
  "result": {
    // 实际结果数据（可选）
  },
  "message": "给用户看的友好消息",
  "messageForAI": "给AI看的简洁消息"
}
```

#### 失败返回

```json
{
  "status": "error",
  "error": "错误消息",
  "code": "错误代码（可选）"
}
```

**字段优先级**（VCPLog显示）：
1. `message` - 最优先（友好的自然语言）
2. `messageForAI` - 次之（简洁版本）
3. `result` - 再次（结构化数据）
4. 完整JSON - 最后（调试用）

---

## 调试和测试

### 本地测试插件

#### 方法1：直接运行

```bash
# 准备测试输入
echo '{"command":"greet","name":"Alice"}' | python main.py

# 预期输出（JSON）
# {"status":"success","message":"你好，Alice！"}
```

#### 方法2：使用SDK测试

```typescript
import { PluginRuntime } from 'vcp-intellicore-sdk';

const runtime = new PluginRuntime({ 
  pluginDir: './Plugin',
  debug: true  // 启用调试日志
});

// 监听事件查看详细信息
runtime.on('plugin_executed', ({ plugin, result }) => {
  console.log(`✅ ${plugin} 执行成功`);
  console.log('结果:', JSON.stringify(result, null, 2));
});

runtime.on('plugin_error', ({ plugin, error }) => {
  console.error(`❌ ${plugin} 执行失败`);
  console.error('错误:', error);
});

// 执行测试
const result = await runtime.executePlugin('MyPlugin', {
  command: 'test',
  param: 'value'
});
```

---

### 常见错误和解决方案

#### 错误1：`Plugin exited with code 1`

**原因**：Python脚本执行失败

**调试**：
```bash
# 查看详细错误
python main.py << EOF
{"command":"test"}
EOF
```

---

#### 错误2：`Timeout after XXXms`

**原因**：插件执行时间超过timeout设置

**解决**：
1. 增加timeout值
2. 优化插件代码
3. 使用异步插件（archery模式）

---

#### 错误3：`Invalid JSON output`

**原因**：插件输出不是有效的JSON

**解决**：
```python
# ❌ 错误：输出了调试信息
print("Debug info")  # 这会污染JSON输出
print(json.dumps(result))

# ✅ 正确：只输出JSON
import sys
sys.stderr.write("Debug info\n")  # 调试信息输出到stderr
print(json.dumps(result))          # 结果输出到stdout
```

---

## 最佳实践

### 1. 错误处理

```python
def main():
    try:
        input_data = sys.stdin.read()
        args = json.loads(input_data) if input_data else {}
        
        # 执行逻辑
        result = process(args)
        
    except json.JSONDecodeError as e:
        result = {
            "status": "error",
            "error": f"JSON解析失败: {str(e)}"
        }
    except KeyError as e:
        result = {
            "status": "error",
            "error": f"缺少必需参数: {str(e)}"
        }
    except Exception as e:
        result = {
            "status": "error",
            "error": f"执行错误: {str(e)}"
        }
    
    print(json.dumps(result, ensure_ascii=False))
```

### 2. 参数验证

```python
def validate_args(args, required_params):
    """验证必需参数"""
    missing = []
    for param in required_params:
        if param not in args or not args[param]:
            missing.append(param)
    
    if missing:
        return {
            "status": "error",
            "error": f"缺少必需参数: {', '.join(missing)}"
        }
    
    return None  # 验证通过

def main():
    args = json.loads(sys.stdin.read())
    
    # 验证参数
    error = validate_args(args, ['command', 'param1'])
    if error:
        print(json.dumps(error, ensure_ascii=False))
        sys.exit(1)
    
    # 继续执行...
```

### 3. 环境变量使用

```python
import os

def main():
    # 从环境变量读取配置（由SDK自动注入）
    api_key = os.environ.get('WEATHER_API_KEY', '')
    project_path = os.environ.get('PROJECT_BASE_PATH', '')
    
    # 使用配置
    if not api_key:
        result = {
            "status": "error",
            "error": "未配置API密钥"
        }
        print(json.dumps(result))
        return
    
    # 继续执行...
```

### 4. 返回友好消息

```python
# ✅ 推荐：提供message和messageForAI
result = {
    "status": "success",
    "result": {"temp": 25, "condition": "晴"},
    "message": "北京的天气：晴，温度25°C",           # 给用户看
    "messageForAI": "已查询北京天气，当前晴天，25度"  # 给AI看
}

# ❌ 不推荐：只返回原始数据
result = {
    "status": "success",
    "result": {"temp": 25, "condition": "晴"}  # VCPLog会显示JSON
}
```

---

## 进阶技巧

### 1. 支持流式输出（未来功能）

```python
# 流式输出进度（预留接口）
import sys

for i in range(100):
    progress = {
        "type": "progress",
        "percent": i
    }
    sys.stderr.write(json.dumps(progress) + "\n")
    sys.stderr.flush()

# 最终结果
result = {"status": "success", "message": "完成"}
print(json.dumps(result))
```

### 2. 多语言支持

```python
def get_message(key, lang='zh'):
    """多语言消息"""
    messages = {
        'zh': {
            'success': '执行成功',
            'error': '执行失败'
        },
        'en': {
            'success': 'Execution succeeded',
            'error': 'Execution failed'
        }
    }
    return messages.get(lang, {}).get(key, key)

# 使用
result = {
    "status": "success",
    "message": get_message('success', lang=args.get('lang', 'zh'))
}
```

### 3. 文件上传/下载

```python
def upload_file(file_content, filename):
    """上传文件示例"""
    import base64
    
    # 编码为base64
    encoded = base64.b64encode(file_content).decode('utf-8')
    
    return {
        "status": "success",
        "result": {
            "filename": filename,
            "data": f"data:application/octet-stream;base64,{encoded}"
        },
        "message": f"文件已上传：{filename}"
    }
```

---

## 插件安全

### 1. 输入验证

```python
def sanitize_input(value):
    """清理用户输入"""
    if not isinstance(value, str):
        return str(value)
    
    # 移除危险字符
    dangerous_chars = ['<', '>', '&', '"', "'"]
    for char in dangerous_chars:
        value = value.replace(char, '')
    
    return value[:1000]  # 限制长度

# 使用
safe_city = sanitize_input(args.get('city', ''))
```

### 2. 权限控制

```python
def require_admin():
    """检查管理员权限"""
    auth_code = os.environ.get('DECRYPTED_AUTH_CODE', '')
    if not auth_code:
        return {
            "status": "error",
            "error": "需要管理员权限"
        }
    return None

# 在manifest中声明
{
  "requiresAdmin": true
}
```

### 3. 资源限制

```python
import signal

def timeout_handler(signum, frame):
    raise TimeoutError("操作超时")

# 设置内部超时
signal.signal(signal.SIGALRM, timeout_handler)
signal.alarm(5)  # 5秒内必须完成

try:
    result = long_running_task()
finally:
    signal.alarm(0)  # 取消alarm
```

---

## 插件发布清单

在发布插件前，请确认：

- [ ] `plugin-manifest.json` 格式正确
- [ ] 所有必需字段都已填写
- [ ] `capabilities.invocationCommands` 包含完整的命令描述
- [ ] 本地测试通过（直接运行脚本）
- [ ] SDK测试通过（通过PluginRuntime执行）
- [ ] 错误处理完善
- [ ] 超时时间设置合理
- [ ] 文档完整（README.md）
- [ ] 依赖项已列出（requirements.txt或package.json）

---

## 插件示例集

查看 `examples/` 目录获取更多示例：

1. **basic-usage** - 基础插件示例
2. **protocol-parser** - 协议解析示例
3. **variable-engine** - 变量引擎示例
4. **plugin-runtime** - 插件运行时示例
5. **full-integration** - 完整集成示例

---

**最后更新: 2025-10-27**  
**SDK版本: 1.0.0-beta.5**


