/**
 * Example 2: Protocol Parser
 * 
 * Demonstrates VCP protocol parsing:
 * - Parsing tool requests from AI response
 * - Formatting tool results for AI
 * - Checking for tool markers
 */

import { VCPProtocolParser } from '../../protocol';

async function main() {
  console.log('🚀 Example 2: Protocol Parser\n');
  
  const parser = new VCPProtocolParser();
  
  // Example 1: Simple tool request
  console.log('📝 Example 1: Simple Tool Request\n');
  
  const simpleRequest = `
I'll help you calculate that.

<<<[TOOL_REQUEST]>>>
Calculator
expression: 「始」2+2「末」
<<<[END_TOOL_REQUEST]>>>

Let me get the result for you.
  `.trim();
  
  console.log('AI Response:');
  console.log(simpleRequest);
  console.log('');
  
  const requests1 = parser.parseToolRequests(simpleRequest);
  console.log('Parsed Requests:');
  console.log(JSON.stringify(requests1, null, 2));
  console.log('');
  
  // Example 2: Multiple parameters
  console.log('📝 Example 2: Multiple Parameters\n');
  
  const multiParamRequest = `
<<<[TOOL_REQUEST]>>>
WeatherTool
city: 「始」Beijing「末」
unit: 「始」celsius「末」
language: 「始」zh-CN「末」
<<<[END_TOOL_REQUEST]>>>
  `.trim();
  
  const requests2 = parser.parseToolRequests(multiParamRequest);
  console.log('Parsed Requests:');
  console.log(JSON.stringify(requests2, null, 2));
  console.log('');
  
  // Example 3: Archery (async) tool
  console.log('📝 Example 3: Archery Tool\n');
  
  const archeryRequest = `
<<<[TOOL_REQUEST]>>>
DataProcessor
archery: true
dataset: 「始」large_dataset.csv「末」
operation: 「始」analyze「末」
<<<[END_TOOL_REQUEST]>>>
  `.trim();
  
  const requests3 = parser.parseToolRequests(archeryRequest);
  console.log('Parsed Requests:');
  console.log(JSON.stringify(requests3, null, 2));
  console.log('Note: archery=true indicates async execution');
  console.log('');
  
  // Example 4: Multi-line parameter
  console.log('📝 Example 4: Multi-line Parameter\n');
  
  const multilineRequest = `
<<<[TOOL_REQUEST]>>>
CodeExecutor
code: 「始」
function hello() {
  console.log("Hello World");
  return 42;
}
hello();
「末」
language: 「始」javascript「末」
<<<[END_TOOL_REQUEST]>>>
  `.trim();
  
  const requests4 = parser.parseToolRequests(multilineRequest);
  console.log('Parsed Requests:');
  console.log(JSON.stringify(requests4, null, 2));
  console.log('');
  
  // Example 5: Format tool result
  console.log('📝 Example 5: Format Tool Result\n');
  
  const toolResult = {
    tool: 'Calculator',
    success: true,
    result: {
      status: 'success',
      result: 42,
      calculation: '2 + 2 * 10'
    }
  };
  
  const formatted = parser.formatToolResult(toolResult);
  console.log('Tool Result:');
  console.log(JSON.stringify(toolResult, null, 2));
  console.log('');
  console.log('Formatted for AI:');
  console.log(formatted);
  console.log('');
  
  // Example 6: Check for tool requests
  console.log('📝 Example 6: Check for Tool Requests\n');
  
  const contentWithTool = '<<<[TOOL_REQUEST]>>>\nMyTool\n<<<[END_TOOL_REQUEST]>>>';
  const contentWithoutTool = 'Just a normal message';
  
  console.log(`  Content with tool: ${parser.hasToolRequests(contentWithTool)}`);
  console.log(`  Content without tool: ${parser.hasToolRequests(contentWithoutTool)}`);
  console.log('');
  
  console.log('🎉 Example 2 Complete!\n');
  console.log('📚 Next: Try example 03-variable-engine');
}

main().catch(console.error);

