/**
 * Example 4: Plugin Runtime
 * 
 * Demonstrates plugin management:
 * - Registering different plugin types
 * - Executing plugins
 * - Event monitoring
 * - Tool description generation
 */

import {
  createPluginRuntime,
  PluginManifest
} from '../../index';

async function main() {
  console.log('🚀 Example 4: Plugin Runtime\n');
  
  // Step 1: Create runtime
  console.log('📦 Step 1: Create Plugin Runtime');
  const runtime = createPluginRuntime({ debug: false });
  console.log('✅ Runtime created\n');
  
  // Step 2: Set up event listeners
  console.log('📝 Step 2: Set up Event Listeners');
  
  // Note: IPluginRuntime interface doesn't expose 'on', but PluginRuntime implementation has it
  (runtime as any).on('plugin_registered', ({ plugin }: any) => {
    console.log(`  🔔 Event: Plugin registered - ${plugin.name}`);
  });
  
  (runtime as any).on('plugin_executed', ({ plugin }: any) => {
    console.log(`  🔔 Event: Plugin executed - ${plugin}`);
  });
  
  (runtime as any).on('plugin_error', ({ plugin, error }: any) => {
    console.log(`  🔔 Event: Plugin error - ${plugin}: ${error.message}`);
  });
  
  console.log('✅ Event listeners ready\n');
  
  // Step 3: Register distributed plugin
  console.log('📝 Step 3: Register Distributed Plugin');
  
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
          description: '执行数学计算，支持基本运算符',
          example: 'calculate "2+2*10"',
          parameters: {
            expression: '数学表达式字符串'
          }
        }
      ]
    }
  };
  
  await runtime.registerPlugin(calculator);
  console.log('');
  
  // Step 4: Register service plugin
  console.log('📝 Step 4: Register Service Plugin');
  
  const cacheService: PluginManifest = {
    id: 'CacheService',
    name: 'Cache Service',
    version: '1.0.0',
    description: 'Provides caching functionality',
    type: 'service',
    module: {
      get: (key: string) => `cached_value_for_${key}`,
      set: (key: string, value: any) => console.log(`Cached: ${key} = ${value}`)
    }
  } as any;
  
  await runtime.registerPlugin(cacheService);
  console.log('');
  
  // Step 5: Register static plugin
  console.log('📝 Step 5: Register Static Plugin');
  
  const appInfo: PluginManifest = {
    id: 'AppInfo',
    name: 'Application Info',
    version: '1.0.0',
    description: 'Provides app information',
    type: 'static',
    placeholders: {
      'AppName': 'My VCP Server',
      'AppVersion': '1.0.0',
      'AppAuthor': 'VCP Team'
    }
  } as any;
  
  await runtime.registerPlugin(appInfo);
  console.log('');
  
  // Step 6: Get tool descriptions
  console.log('📝 Step 6: Get Tool Descriptions\n');
  
  const descriptions = runtime.getToolDescriptions();
  console.log(`  Total descriptions: ${descriptions.size}`);
  
  descriptions.forEach((desc, key) => {
    console.log(`\n  ===== {{${key}}} =====`);
    console.log(desc.split('\n').map(line => `  ${line}`).join('\n'));
  });
  console.log('');
  
  // Step 7: Get service module
  console.log('📝 Step 7: Access Service Module\n');
  
  const cacheModule = runtime.getServiceModule('CacheService');
  console.log('  Cache service methods:', Object.keys(cacheModule));
  const cachedValue = cacheModule.get('test_key');
  console.log(`  Get test_key: ${cachedValue}`);
  console.log('');
  
  // Step 8: Get static placeholders
  console.log('📝 Step 8: Get Static Placeholders\n');
  
  const placeholders = runtime.getStaticPlaceholders();
  console.log(`  Total placeholders: ${placeholders.size}`);
  placeholders.forEach((value, key) => {
    console.log(`    {{${key}}}: ${value}`);
  });
  console.log('');
  
  // Step 9: Execute plugin (with mock executor)
  console.log('📝 Step 9: Execute Plugin (Mock)\n');
  
  // Set up mock distributed executor
  runtime.setDistributedExecutor(async (serverId, toolName, args) => {
    console.log(`  [Mock Executor] Executing ${toolName} on ${serverId}`);
    console.log(`  [Mock Executor] Args:`, args);
    
    // Simulate tool execution
    if (toolName === 'Calculator') {
      return {
        status: 'success',
        message: '计算结果: 42',
        result: 42
      };
    }
    
    return { status: 'success' };
  });
  
  try {
    const result = await runtime.executePlugin('Calculator', { expression: '2+2*10' });
    console.log('  Result:', result);
  } catch (error: any) {
    console.log(`  Error: ${error.message}`);
  }
  console.log('');
  
  // Step 10: Runtime stats
  console.log('📝 Step 10: Runtime Statistics\n');
  
  const stats = (runtime as any).getStats();
  console.log('  Runtime Stats:');
  console.log(`    Total plugins: ${stats.totalPlugins}`);
  console.log(`    Distributed: ${stats.distributedPlugins}`);
  console.log(`    Local: ${stats.localPlugins}`);
  console.log(`    Tool descriptions: ${stats.toolDescriptions}`);
  console.log(`    Preprocessors: ${stats.preprocessors}`);
  console.log(`    Services: ${stats.services}`);
  console.log('');
  
  console.log('🎉 Example 4 Complete!\n');
  console.log('📚 Next: Try example 05-full-integration');
}

main().catch(console.error);

