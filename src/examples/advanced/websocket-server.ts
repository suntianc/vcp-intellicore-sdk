/**
 * Advanced Example: WebSocket Server Integration
 * 
 * Demonstrates how to build a VCP-compatible WebSocket server
 * with distributed node support
 */

import WebSocket from 'ws';
import {
  createPluginRuntime,
  createVariableEngine,
  VCPProtocolParser,
  TimeProvider,
  ToolDescriptionProvider,
  PluginManifest
} from '../../index';

interface DistributedNode {
  id: string;
  ws: WebSocket;
  tools: string[];
}

class VCPWebSocketServer {
  private wss: WebSocket.Server;
  private pluginRuntime;
  private variableEngine;
  private protocolParser;
  private distributedNodes: Map<string, DistributedNode>;
  
  constructor(port: number) {
    this.wss = new WebSocket.Server({ port });
    this.pluginRuntime = createPluginRuntime({ debug: true });
    this.variableEngine = createVariableEngine({
      enableRecursion: true,
      detectCircular: true
    });
    this.protocolParser = new VCPProtocolParser();
    this.distributedNodes = new Map();
    
    this.setupVariableProviders();
    this.setupDistributedExecutor();
    this.setupWebSocketHandlers();
    
    console.log(`✅ VCP WebSocket Server listening on port ${port}`);
  }
  
  private setupVariableProviders() {
    this.variableEngine.registerProvider(
      new ToolDescriptionProvider(this.pluginRuntime)
    );
    this.variableEngine.registerProvider(new TimeProvider());
  }
  
  private setupDistributedExecutor() {
    // Set up executor that forwards to distributed nodes
    this.pluginRuntime.setDistributedExecutor(
      async (serverId: string, toolName: string, args: any) => {
        const node = this.distributedNodes.get(serverId);
        if (!node) {
          throw new Error(`Distributed node ${serverId} not found`);
        }
        
        return new Promise((resolve, reject) => {
          const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          // Send execute_tool message
          node.ws.send(JSON.stringify({
            type: 'execute_tool',
            requestId,
            tool: toolName,
            args
          }));
          
          // Wait for response
          const timeout = setTimeout(() => {
            reject(new Error('Tool execution timeout'));
          }, 30000);
          
          const handler = (data: Buffer) => {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'tool_result' && msg.requestId === requestId) {
              clearTimeout(timeout);
              node.ws.off('message', handler);
              resolve(msg.result);
            }
          };
          
          node.ws.on('message', handler);
        });
      }
    );
  }
  
  private setupWebSocketHandlers() {
    this.wss.on('connection', (ws: WebSocket, req) => {
      console.log('🔌 New connection');
      
      ws.on('message', async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleMessage(ws, message);
        } catch (error: any) {
          console.error('Message handling error:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: error.message
          }));
        }
      });
      
      ws.on('close', () => {
        // Find and remove this node
        for (const [id, node] of this.distributedNodes.entries()) {
          if (node.ws === ws) {
            console.log(`🔌 Distributed node ${id} disconnected`);
            this.distributedNodes.delete(id);
            
            // Unregister tools
            for (const tool of node.tools) {
              this.pluginRuntime.unloadPlugin(tool).catch(console.error);
            }
            break;
          }
        }
      });
    });
  }
  
  private async handleMessage(ws: WebSocket, message: any) {
    const { type } = message;
    
    switch (type) {
      case 'register_node':
        await this.handleRegisterNode(ws, message);
        break;
        
      case 'register_tools':
        await this.handleRegisterTools(ws, message);
        break;
        
      case 'chat_message':
        await this.handleChatMessage(ws, message);
        break;
        
      case 'tool_result':
        // Echo back for distributed executor
        ws.send(JSON.stringify(message));
        break;
        
      default:
        console.warn(`Unknown message type: ${type}`);
    }
  }
  
  private async handleRegisterNode(ws: WebSocket, message: any) {
    const nodeId = message.nodeId || `node-${Date.now()}`;
    
    this.distributedNodes.set(nodeId, {
      id: nodeId,
      ws,
      tools: []
    });
    
    ws.send(JSON.stringify({
      type: 'register_ack',
      nodeId,
      message: 'Node registered successfully'
    }));
    
    console.log(`✅ Distributed node registered: ${nodeId}`);
  }
  
  private async handleRegisterTools(ws: WebSocket, message: any) {
    const { tools, serverId } = message;
    
    for (const toolManifest of tools) {
      const manifest: PluginManifest = {
        ...toolManifest,
        type: 'distributed',
        serverId
      };
      
      await this.pluginRuntime.registerPlugin(manifest);
      
      // Track tool ownership
      const node = this.distributedNodes.get(serverId);
      if (node) {
        node.tools.push(toolManifest.id);
      }
    }
    
    ws.send(JSON.stringify({
      type: 'tools_registered',
      count: tools.length
    }));
    
    console.log(`✅ Registered ${tools.length} tools from node ${serverId}`);
  }
  
  private async handleChatMessage(ws: WebSocket, message: any) {
    const { content, userId } = message;
    
    console.log(`💬 Chat message from ${userId}: ${content.substring(0, 50)}...`);
    
    // Resolve variables
    const resolved = await this.variableEngine.resolveAll(content);
    
    // Parse tool requests
    const toolRequests = this.protocolParser.parseToolRequests(resolved);
    
    if (toolRequests.length > 0) {
      console.log(`🔧 Executing ${toolRequests.length} tools...`);
      
      const results = await Promise.all(
        toolRequests.map(req => 
          this.pluginRuntime.executePlugin(req.name, req.args)
        )
      );
      
      ws.send(JSON.stringify({
        type: 'tool_results',
        results
      }));
    } else {
      ws.send(JSON.stringify({
        type: 'no_tools',
        message: 'No tools to execute'
      }));
    }
  }
}

// Example usage
async function main() {
  console.log('🚀 VCP WebSocket Server Example\n');
  
  const server = new VCPWebSocketServer(8088);
  
  console.log('\n📋 Server ready!');
  console.log('  Port: 8088');
  console.log('  Features:');
  console.log('    - Distributed node registration');
  console.log('    - Tool registration');
  console.log('    - Chat message processing');
  console.log('    - Variable resolution');
  console.log('    - Tool execution');
  console.log('\n⏳ Waiting for connections...');
  console.log('   Press Ctrl+C to stop');
}

// Uncomment to run
// main().catch(console.error);

export { VCPWebSocketServer };

