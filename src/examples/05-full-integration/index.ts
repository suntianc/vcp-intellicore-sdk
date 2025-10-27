/**
 * Example 5: Full Integration
 * 
 * Complete VCP server implementation example:
 * - All modules working together
 * - Message processing flow
 * - Tool execution loop
 * - Production-ready patterns
 */

import {
  createVariableEngine,
  createPluginRuntime,
  VCPProtocolParser,
  TimeProvider,
  EnvironmentProvider,
  PlaceholderProvider,
  ToolDescriptionProvider,
  IVariableEngine,
  IPluginRuntime,
  PluginManifest
} from '../../index';

/**
 * Complete VCP Server Implementation
 */
class SimpleVCPServer {
  private variableEngine!: IVariableEngine;
  private pluginRuntime!: IPluginRuntime;
  private protocolParser!: VCPProtocolParser;
  
  async initialize() {
    console.log('🧠 Initializing VCP Server...\n');
    
    // 1. Plugin Runtime
    console.log('  📦 Creating Plugin Runtime...');
    this.pluginRuntime = createPluginRuntime({ debug: false });
    
    // 2. Variable Engine
    console.log('  🔄 Creating Variable Engine...');
    this.variableEngine = createVariableEngine({
      enableRecursion: true,
      maxRecursionDepth: 10,
      detectCircular: true
    });
    
    // 3. Protocol Parser
    console.log('  🔍 Creating Protocol Parser...');
    this.protocolParser = new VCPProtocolParser();
    
    // 4. Register variable providers
    console.log('  📝 Registering Variable Providers...');
    this.variableEngine.registerProvider(
      new ToolDescriptionProvider(this.pluginRuntime)
    );
    this.variableEngine.registerProvider(new TimeProvider());
    this.variableEngine.registerProvider(new EnvironmentProvider());
    this.variableEngine.registerProvider(new PlaceholderProvider());
    
    console.log('✅ VCP Server initialized\n');
  }
  
  async registerTools() {
    console.log('🔧 Registering Tools...\n');
    
    // Register Calculator tool
    const calculator: PluginManifest = {
      id: 'Calculator',
      name: 'Math Calculator',
      version: '1.0.0',
      description: 'Performs mathematical calculations',
      type: 'distributed',
      capabilities: {
        invocationCommands: [
          {
            command: 'calculate',
            description: '执行数学计算，支持 +, -, *, / 运算符',
            example: 'calculate "2+2*10"',
            parameters: {
              expression: '数学表达式'
            }
          }
        ]
      }
    };
    
    await this.pluginRuntime.registerPlugin(calculator);
    console.log('  ✅ Calculator registered');
    
    // Register Weather tool
    const weather: PluginManifest = {
      id: 'Weather',
      name: 'Weather Tool',
      version: '1.0.0',
      description: 'Get weather information',
      type: 'distributed',
      capabilities: {
        invocationCommands: [
          {
            command: 'get_weather',
            description: '获取指定城市的天气信息',
            example: 'get weather for Beijing',
            parameters: {
              city: '城市名称'
            }
          }
        ]
      }
    };
    
    await this.pluginRuntime.registerPlugin(weather);
    console.log('  ✅ Weather registered');
    
    // Set up mock distributed executor
    this.pluginRuntime.setDistributedExecutor(async (serverId, toolName, args) => {
      // Simulate tool execution
      if (toolName === 'Calculator') {
        const expr = args.expression || '0';
        try {
          // Unsafe eval - for demo only!
          const result = eval(expr);
          return {
            status: 'success',
            message: `计算结果: ${expr} = ${result}`,
            expression: expr,
            result
          };
        } catch (error: any) {
          return {
            status: 'error',
            message: `计算错误: ${error.message}`
          };
        }
      }
      
      if (toolName === 'Weather') {
        const city = args.city || 'Unknown';
        return {
          status: 'success',
          message: `${city}的天气：晴天，温度 22°C`,
          city,
          condition: 'sunny',
          temperature: 22
        };
      }
      
      return { status: 'success', message: 'Tool executed' };
    });
    
    console.log('  ✅ Distributed executor configured\n');
  }
  
  async processMessage(userMessage: string): Promise<string> {
    console.log('💬 Processing Message...\n');
    console.log(`  User: ${userMessage}\n`);
    
    // 1. Build system prompt
    const systemPrompt = `
You are a helpful AI assistant with tool calling capabilities.

Available tools:
{{VCPAllTools}}

When you need to use a tool, use the VCP protocol format:
<<<[TOOL_REQUEST]>>>
ToolName
param: 「始」value「末」
<<<[END_TOOL_REQUEST]>>>

Current time: {{DateTime}}
    `.trim();
    
    // 2. Resolve variables
    console.log('  🔄 Resolving variables in system prompt...');
    const resolvedSystem = await this.variableEngine.resolveAll(systemPrompt);
    console.log(`    Resolved ${resolvedSystem.length} chars`);
    
    // 3. Simulate LLM call (in real app, call actual LLM here)
    console.log('  🤖 Calling LLM (simulated)...');
    const aiResponse = this.simulateLLMResponse(userMessage, resolvedSystem);
    console.log(`    AI Response: ${aiResponse.substring(0, 100)}...`);
    console.log('');
    
    // 4. Parse tool requests
    console.log('  🔍 Parsing tool requests...');
    const toolRequests = this.protocolParser.parseToolRequests(aiResponse);
    console.log(`    Found ${toolRequests.length} tool requests`);
    
    if (toolRequests.length === 0) {
      console.log('  ℹ️  No tools to execute\n');
      return aiResponse;
    }
    
    // 5. Execute tools
    console.log('  ⚙️  Executing tools...\n');
    const toolResults = await Promise.all(
      toolRequests.map(async (req) => {
        console.log(`    🔧 Executing: ${req.name}`);
        console.log(`       Args: ${JSON.stringify(req.args)}`);
        
        const result = await this.pluginRuntime.executePlugin(req.name, req.args);
        
        console.log(`       Result: ${JSON.stringify(result).substring(0, 80)}...`);
        
        return { tool: req.name, result };
      })
    );
    console.log('');
    
    // 6. Format tool results for AI
    console.log('  📝 Formatting tool results...');
    const formattedResults = toolResults.map(({ tool, result }) => 
      this.protocolParser.formatToolResult({ tool, result, success: true })
    ).join('\n\n');
    
    // 7. Second LLM call with tool results (simulated)
    console.log('  🤖 Calling LLM with tool results (simulated)...');
    const finalResponse = this.simulateFinalResponse(toolResults);
    console.log(`    Final Response: ${finalResponse}\n`);
    
    return finalResponse;
  }
  
  // Simulate LLM response (in real app, call actual LLM)
  private simulateLLMResponse(userMessage: string, systemPrompt: string): string {
    // Simple pattern matching for demo
    if (userMessage.includes('计算') || userMessage.includes('算')) {
      const match = userMessage.match(/(\d+\s*[+\-*/]\s*\d+)/);
      if (match) {
        return `
好的，让我来帮你计算 ${match[0]}。

<<<[TOOL_REQUEST]>>>
Calculator
expression: 「始」${match[0]}「末」
<<<[END_TOOL_REQUEST]>>>
        `.trim();
      }
    }
    
    if (userMessage.includes('天气')) {
      const cities = ['北京', '上海', 'Beijing', 'Shanghai'];
      const city = cities.find(c => userMessage.includes(c)) || '北京';
      return `
让我查询${city}的天气。

<<<[TOOL_REQUEST]>>>
Weather
city: 「始」${city}「末」
<<<[END_TOOL_REQUEST]>>>
      `.trim();
    }
    
    return '我是一个AI助手，可以帮你计算或查询天气。';
  }
  
  private simulateFinalResponse(toolResults: any[]): string {
    const firstResult = toolResults[0];
    if (firstResult.tool === 'Calculator') {
      return `计算完成！结果是 ${firstResult.result.result}`;
    }
    if (firstResult.tool === 'Weather') {
      return `${firstResult.result.city}的天气是${firstResult.result.condition}，温度${firstResult.result.temperature}°C`;
    }
    return '工具执行完成！';
  }
}

// Run example
async function main() {
  console.log('🚀 Example 5: Full Integration\n');
  console.log('═'.repeat(60));
  console.log('');
  
  const server = new SimpleVCPServer();
  
  // Initialize
  await server.initialize();
  
  // Register tools
  await server.registerTools();
  
  // Process some messages
  console.log('💬 Test Conversations\n');
  console.log('═'.repeat(60));
  console.log('');
  
  // Test 1: Calculator
  console.log('📝 Test 1: Calculator Tool\n');
  const response1 = await server.processMessage('请帮我计算 2+2*10');
  console.log('  📤 Final Response:', response1);
  console.log('');
  console.log('─'.repeat(60));
  console.log('');
  
  // Test 2: Weather
  console.log('📝 Test 2: Weather Tool\n');
  const response2 = await server.processMessage('北京今天天气怎么样？');
  console.log('  📤 Final Response:', response2);
  console.log('');
  console.log('─'.repeat(60));
  console.log('');
  
  // Test 3: No tool call
  console.log('📝 Test 3: Normal Conversation\n');
  const response3 = await server.processMessage('你好');
  console.log('  📤 Final Response:', response3);
  console.log('');
  
  console.log('═'.repeat(60));
  console.log('');
  console.log('🎉 Example 5 Complete!\n');
  console.log('✅ All VCP SDK modules demonstrated');
  console.log('✅ Full message processing flow shown');
  console.log('✅ Ready to build your own VCP server!');
}

main().catch(console.error);

