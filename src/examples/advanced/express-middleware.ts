/**
 * Advanced Example: Express.js Middleware
 * 
 * Demonstrates how to integrate VCP SDK with Express.js
 * to create an OpenAI-compatible API endpoint
 */

import express, { Request, Response, NextFunction } from 'express';
import {
  createPluginRuntime,
  createVariableEngine,
  VCPProtocolParser,
  TimeProvider,
  ToolDescriptionProvider
} from '../../index';

/**
 * VCP Middleware for Express
 */
class VCPMiddleware {
  private pluginRuntime;
  private variableEngine;
  private protocolParser;
  
  constructor() {
    this.pluginRuntime = createPluginRuntime({ debug: true });
    this.variableEngine = createVariableEngine({
      enableRecursion: true
    });
    this.protocolParser = new VCPProtocolParser();
    
    // Setup providers
    this.variableEngine.registerProvider(
      new ToolDescriptionProvider(this.pluginRuntime)
    );
    this.variableEngine.registerProvider(new TimeProvider());
  }
  
  /**
   * Express middleware for variable resolution
   */
  resolveVariables() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { messages } = req.body;
        
        if (Array.isArray(messages)) {
          // Resolve variables in all messages
          req.body.messages = await Promise.all(
            messages.map(async (msg: any) => ({
              ...msg,
              content: await this.variableEngine.resolveAll(msg.content)
            }))
          );
        }
        
        next();
      } catch (error) {
        next(error);
      }
    };
  }
  
  /**
   * Express middleware for tool execution
   */
  executeTools() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { aiResponse } = res.locals;
        
        if (!aiResponse) {
          return next();
        }
        
        // Parse tool requests
        const toolRequests = this.protocolParser.parseToolRequests(aiResponse);
        
        if (toolRequests.length === 0) {
          return next();
        }
        
        // Execute tools
        const results = await Promise.all(
          toolRequests.map(req => 
            this.pluginRuntime.executePlugin(req.name, req.args)
          )
        );
        
        // Store in locals for next middleware
        res.locals.toolResults = results.map((result, idx) => ({
          tool: toolRequests[idx].name,
          result,
          success: true
        }));
        
        next();
      } catch (error) {
        next(error);
      }
    };
  }
  
  /**
   * Get plugin runtime instance
   */
  getPluginRuntime() {
    return this.pluginRuntime;
  }
}

// Example Express app
async function createApp() {
  const app = express();
  const vcpMiddleware = new VCPMiddleware();
  
  // Body parser
  app.use(express.json());
  
  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: Date.now() });
  });
  
  // Chat completions endpoint (OpenAI-compatible)
  app.post('/v1/chat/completions', 
    vcpMiddleware.resolveVariables(),  // Step 1: Resolve variables
    async (req, res, next) => {
      try {
        // Step 2: Call LLM (your implementation)
        const llmResponse = await callYourLLM(req.body.messages);
        res.locals.aiResponse = llmResponse;
        next();
      } catch (error) {
        next(error);
      }
    },
    vcpMiddleware.executeTools(),      // Step 3: Execute tools
    async (req, res, next) => {
      try {
        const { aiResponse, toolResults } = res.locals;
        
        // Step 4: If tools were executed, call LLM again
        if (toolResults && toolResults.length > 0) {
          const messages = req.body.messages;
          messages.push({ role: 'assistant', content: aiResponse });
          
          // Format tool results
          const formatted = toolResults.map((tr: any) => 
            vcpMiddleware['protocolParser'].formatToolResult(tr)
          ).join('\n\n');
          
          messages.push({ role: 'user', content: formatted });
          
          // Second LLM call
          const finalResponse = await callYourLLM(messages);
          res.json({ content: finalResponse });
        } else {
          res.json({ content: aiResponse });
        }
      } catch (error) {
        next(error);
      }
    }
  );
  
  // Debug endpoint
  app.get('/debug/tools', (req, res) => {
    const runtime = vcpMiddleware.getPluginRuntime();
    const plugins = runtime.getPlugins();
    const descriptions = runtime.getToolDescriptions();
    
    res.json({
      totalPlugins: plugins.length,
      plugins: plugins.map(p => ({ id: p.id, name: p.name, type: p.type })),
      descriptions: Array.from(descriptions.entries()).map(([key, value]) => ({
        key,
        preview: value.substring(0, 100) + '...'
      }))
    });
  });
  
  // Error handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  });
  
  return app;
}

// Mock LLM call
async function callYourLLM(messages: any[]): Promise<string> {
  // Replace this with your actual LLM API call
  return 'This is a simulated LLM response.';
}

// Example usage
async function main() {
  console.log('🚀 VCP Express Server Example\n');
  
  const app = await createApp();
  const port = 3000;
  
  app.listen(port, () => {
    console.log(`✅ Server running on http://localhost:${port}`);
    console.log('\nEndpoints:');
    console.log(`  POST /v1/chat/completions - Chat with tool support`);
    console.log(`  GET /debug/tools - View registered tools`);
    console.log(`  GET /health - Health check`);
    console.log('\nPress Ctrl+C to stop');
  });
}

// Uncomment to run
// main().catch(console.error);

export { VCPMiddleware, createApp };

