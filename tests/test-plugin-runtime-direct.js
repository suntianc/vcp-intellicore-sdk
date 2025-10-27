/**
 * 测试SDK PluginRuntime的Direct插件执行功能
 * 
 * 测试目标：
 * 1. 注册Randomness插件
 * 2. 执行rollDice命令
 * 3. 验证结果
 */

const path = require('path');
const { PluginRuntime } = require('../dist/plugin/PluginRuntime');

async function testDirectPlugin() {
  console.log('🧪 开始测试SDK PluginRuntime...\n');

  // 1. 创建Plugin Runtime实例
  const runtime = new PluginRuntime({
    pluginDir: path.resolve(__dirname, '../../Plugin'),
    debug: true,
  });

  console.log('✅ PluginRuntime实例创建成功\n');

  // 2. 注册Randomness插件
  console.log('📦 注册Random ness插件...');
  
  try {
    await runtime.registerPlugin({
      id: 'Randomness',
      name: 'Randomness',
      version: '5.2.0',
      description: '随机事件生成器',
      type: 'direct',
      capabilities: {
        invocationCommands: [
          {
            command: 'rollDice',
            description: '掷骰子',
          },
        ],
      },
    });
    console.log('✅ Randomness插件注册成功\n');
  } catch (error) {
    console.error('❌ 插件注册失败:', error.message);
    return;
  }

  // 3. 测试rollDice命令
  console.log('🎲 测试rollDice命令 (2d6)...');
  
  try {
    const result = await runtime.executePlugin('Randomness', {
      command: 'rollDice',
      diceString: '2d6',
    });
    
    console.log('✅ 执行成功！');
    console.log('📊 结果:', JSON.stringify(result, null, 2));
    console.log('');
  } catch (error) {
    console.error('❌ 执行失败:', error.message);
    if (error.details) {
      console.error('详细信息:', error.details);
    }
    return;
  }

  // 4. 测试getCards命令
  console.log('🃏 测试getCards命令 (poker)...');
  
  try {
    const result = await runtime.executePlugin('Randomness', {
      command: 'getCards',
      deckName: 'poker',
      count: 3,
    });
    
    console.log('✅ 执行成功！');
    console.log('📊 结果:', JSON.stringify(result, null, 2));
    console.log('');
  } catch (error) {
    console.error('❌ 执行失败:', error.message);
    return;
  }

  // 5. 测试selectFromList命令
  console.log('📋 测试selectFromList命令...');
  
  try {
    const result = await runtime.executePlugin('Randomness', {
      command: 'selectFromList',
      items: ['苹果', '香蕉', '橙子', '葡萄'],
      count: 2,
    });
    
    console.log('✅ 执行成功！');
    console.log('📊 结果:', JSON.stringify(result, null, 2));
    console.log('');
  } catch (error) {
    console.error('❌ 执行失败:', error.message);
    return;
  }

  console.log('🎉 所有测试完成！SDK PluginRuntime可以正确执行Direct插件！');
}

// 运行测试
testDirectPlugin().catch((error) => {
  console.error('💥 测试失败:', error);
  process.exit(1);
});

