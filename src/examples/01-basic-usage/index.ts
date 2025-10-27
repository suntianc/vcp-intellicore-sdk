/**
 * Example 1: Basic Usage
 * 
 * Demonstrates basic VCP SDK usage:
 * - Creating a variable engine
 * - Registering providers
 * - Resolving variables
 */

import {
  createVariableEngine,
  TimeProvider,
  PlaceholderProvider
} from '../../index';

async function main() {
  console.log('🚀 Example 1: Basic Usage\n');
  
  // Step 1: Create variable engine
  console.log('📦 Step 1: Create Variable Engine');
  const engine = createVariableEngine({
    enableRecursion: true,
    maxRecursionDepth: 5
  });
  console.log('✅ Engine created\n');
  
  // Step 2: Register providers
  console.log('📝 Step 2: Register Providers');
  
  // Time provider
  engine.registerProvider(new TimeProvider());
  console.log('  ✅ TimeProvider registered');
  
  // Placeholder provider
  const placeholderProvider = new PlaceholderProvider();
  placeholderProvider.setPlaceholder('AppName', 'VCP Demo App');
  placeholderProvider.setPlaceholder('Version', '1.0.0');
  engine.registerProvider(placeholderProvider);
  console.log('  ✅ PlaceholderProvider registered\n');
  
  // Step 3: Resolve variables
  console.log('🔄 Step 3: Resolve Variables\n');
  
  // Example 1: Time variables
  const timeExample = 'Current time: {{DateTime}}, Date: {{Date}}';
  const resolved1 = await engine.resolveAll(timeExample);
  console.log('  Input:', timeExample);
  console.log('  Output:', resolved1);
  console.log('');
  
  // Example 2: Custom placeholders
  const placeholderExample = 'Welcome to {{AppName}} v{{Version}}!';
  const resolved2 = await engine.resolveAll(placeholderExample);
  console.log('  Input:', placeholderExample);
  console.log('  Output:', resolved2);
  console.log('');
  
  // Example 3: Recursive resolution
  placeholderProvider.setPlaceholder('Greeting', 'Hello from {{AppName}}!');
  const recursiveExample = '{{Greeting}} Version: {{Version}}';
  const resolved3 = await engine.resolveAll(recursiveExample);
  console.log('  Input:', recursiveExample);
  console.log('  Output:', resolved3);
  console.log('');
  
  // Step 4: Performance test
  console.log('⚡ Step 4: Performance Test');
  const start = performance.now();
  const complexTemplate = `
Application: {{AppName}}
Version: {{Version}}
Time: {{DateTime}}
Greeting: {{Greeting}}
  `.trim();
  
  const resolved4 = await engine.resolveAll(complexTemplate);
  const end = performance.now();
  
  console.log(`  Resolved 4 variables in ${(end - start).toFixed(3)}ms`);
  console.log('  Result:');
  console.log(resolved4.split('\n').map(line => `    ${line}`).join('\n'));
  console.log('');
  
  console.log('🎉 Example 1 Complete!\n');
  console.log('📚 Next: Try example 02-protocol-parser');
}

main().catch(console.error);

