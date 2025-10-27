/**
 * Example 3: Variable Engine Advanced
 * 
 * Demonstrates advanced variable engine features:
 * - Recursive resolution
 * - Circular dependency detection
 * - Custom variable providers
 * - Performance optimization
 */

import {
  createVariableEngine,
  TimeProvider,
  PlaceholderProvider,
  IVariableProvider
} from '../../index';

// Custom variable provider example
class CustomProvider implements IVariableProvider {
  name = 'CustomProvider';
  
  getSupportedKeys(): string[] {
    return ['RandomNumber', 'UUID'];
  }
  
  async resolve(key: string): Promise<string | null> {
    if (key === 'RandomNumber') {
      return String(Math.floor(Math.random() * 100));
    }
    if (key === 'UUID') {
      return `uuid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    return null;
  }
}

async function main() {
  console.log('🚀 Example 3: Variable Engine Advanced\n');
  
  // Example 1: Recursive resolution
  console.log('📝 Example 1: Recursive Resolution\n');
  
  const engine1 = createVariableEngine({
    enableRecursion: true,
    maxRecursionDepth: 10
  });
  
  const placeholder1 = new PlaceholderProvider();
  placeholder1.setPlaceholder('Name', 'Alice');
  placeholder1.setPlaceholder('Greeting', 'Hello, {{Name}}!');
  placeholder1.setPlaceholder('Message', '{{Greeting}} Welcome!');
  
  engine1.registerProvider(placeholder1);
  
  const result1 = await engine1.resolveAll('Say: {{Message}}');
  console.log('  Template: Say: {{Message}}');
  console.log('  Step 1: Say: {{Greeting}} Welcome!');
  console.log('  Step 2: Say: Hello, {{Name}}! Welcome!');
  console.log('  Final:', result1);
  console.log('');
  
  // Example 2: Circular dependency detection
  console.log('📝 Example 2: Circular Dependency Detection\n');
  
  const engine2 = createVariableEngine({
    enableRecursion: true,
    detectCircular: true  // ← Enable circular detection
  });
  
  const placeholder2 = new PlaceholderProvider();
  placeholder2.setPlaceholder('A', '{{B}}');
  placeholder2.setPlaceholder('B', '{{A}}');  // Circular!
  
  engine2.registerProvider(placeholder2);
  
  try {
    await engine2.resolveAll('Value: {{A}}');
    console.log('  ❌ Should have thrown circular dependency error');
  } catch (error: any) {
    console.log(`  ✅ Caught circular dependency: ${error.message}`);
    console.log(`  Error code: ${error.code}`);
  }
  console.log('');
  
  // Example 3: Custom variable provider
  console.log('📝 Example 3: Custom Variable Provider\n');
  
  const engine3 = createVariableEngine();
  engine3.registerProvider(new TimeProvider());
  engine3.registerProvider(new CustomProvider());
  
  const template3 = `
Random Number: {{RandomNumber}}
UUID: {{UUID}}
Timestamp: {{Timestamp}}
  `.trim();
  
  const result3 = await engine3.resolveAll(template3);
  console.log('  Result:');
  console.log(result3.split('\n').map(line => `    ${line}`).join('\n'));
  console.log('');
  
  // Example 4: Multiple providers priority
  console.log('📝 Example 4: Provider Priority\n');
  
  const engine4 = createVariableEngine();
  
  // Both providers can handle 'Date', first registered wins
  const placeholder4 = new PlaceholderProvider();
  placeholder4.setPlaceholder('Date', 'Custom Date Value');
  
  // Register in different order
  engine4.registerProvider(placeholder4);  // First - will be used
  engine4.registerProvider(new TimeProvider());  // Second - won't be used for 'Date'
  
  const result4 = await engine4.resolveAll('Date: {{Date}}');
  console.log('  Result:', result4);
  console.log('  Note: PlaceholderProvider was used (registered first)');
  console.log('');
  
  // Example 5: Performance benchmark
  console.log('📝 Example 5: Performance Benchmark\n');
  
  const engine5 = createVariableEngine({
    enableRecursion: true
  });
  
  const placeholder5 = new PlaceholderProvider();
  for (let i = 0; i < 20; i++) {
    placeholder5.setPlaceholder(`Var${i}`, `Value ${i}`);
  }
  engine5.registerProvider(placeholder5);
  engine5.registerProvider(new TimeProvider());
  
  const complexTemplate = Array.from({ length: 20 }, (_, i) => `{{Var${i}}}`).join(', ') + ', Time: {{DateTime}}';
  
  const iterations = 100;
  const start = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    await engine5.resolveAll(complexTemplate);
  }
  
  const end = performance.now();
  const avgTime = (end - start) / iterations;
  
  console.log(`  Resolved 21 variables ${iterations} times`);
  console.log(`  Total time: ${(end - start).toFixed(2)}ms`);
  console.log(`  Average: ${avgTime.toFixed(3)}ms per resolution`);
  console.log(`  Performance: ${avgTime < 1 ? '⭐⭐⭐⭐⭐ Excellent' : avgTime < 5 ? '⭐⭐⭐⭐ Good' : '⭐⭐⭐ OK'}`);
  console.log('');
  
  console.log('🎉 Example 3 Complete!\n');
  console.log('📚 Next: Try example 04-plugin-runtime');
}

main().catch(console.error);

