import { Message, PipelineResult, ContextFrame, ToolResult } from '../types';
import { routerAgent } from './router';
import { responseAgent } from './response';
import { toolRegistry } from '../tools/registry';
import { memoryManager } from '../memory/manager';
import { memorySearchTool } from '../tools/memory';
import { knowledgeBaseTool } from '../tools/knowledge';
import { clarificationTool } from '../tools/clarification';

interface OrchestratorConfig {
  storeInteractions?: boolean;
  maxHistoryLength?: number;
}

class Orchestrator {
  private config: OrchestratorConfig;
  private initialized: boolean = false;

  constructor(config: OrchestratorConfig = {}) {
    this.config = {
      storeInteractions: true,
      maxHistoryLength: 10,
      ...config,
    };
  }

  initialize(): void {
    if (this.initialized) return;

    // Register all tools
    toolRegistry.register(memorySearchTool);
    toolRegistry.register(knowledgeBaseTool);
    toolRegistry.register(clarificationTool);

    this.initialized = true;
    console.log('Orchestrator initialized with tools:', toolRegistry.list());
  }

  async processMessage(userMessage: string): Promise<PipelineResult> {
    if (!this.initialized) {
      this.initialize();
    }

    const startTime = Date.now();

    // Step 1: Add user message to session history
    const userMsg: Message = {
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    };
    memoryManager.addToSession(userMsg);

    // Step 2: Route the message
    console.log('Routing message...');
    const routing = await routerAgent.classify(userMessage);
    console.log('Routing decision:', routing);

    // Step 3: Execute tools if needed
    let toolResults: ToolResult[] = [];
    if (routing.tools.length > 0) {
      console.log('Executing tools:', routing.tools);
      const toolInputs = routerAgent.extractToolInputs(
        userMessage,
        routing.tools
      );
      toolResults = await toolRegistry.executeMultiple(toolInputs);
      console.log('Tool results:', toolResults.map((r) => ({
        tool: r.tool,
        success: r.success,
        time: r.executionTime,
      })));
    }

    // Step 4: Build context frame
    const contextFrame: ContextFrame = {
      userMessage,
      conversationHistory: memoryManager.getSessionHistory(
        this.config.maxHistoryLength
      ),
      toolResults,
    };

    // Step 5: Generate response
    console.log('Generating response...');
    const response = await responseAgent.generate(contextFrame);

    // Step 6: Store interaction in memory
    if (this.config.storeInteractions) {
      memoryManager.storeInteraction(
        userMessage,
        response.content,
        this.extractTopics(userMessage, routing.tools)
      );

      // Add assistant response to session history
      const assistantMsg: Message = {
        role: 'assistant',
        content: response.content,
        timestamp: Date.now(),
      };
      memoryManager.addToSession(assistantMsg);
    }

    const processingTime = Date.now() - startTime;

    return {
      response,
      routing,
      toolResults,
      processingTime,
    };
  }

  private extractTopics(message: string, tools: string[]): string[] {
    const topics: string[] = [];

    // Add topics based on tools used
    if (tools.includes('memory_search')) {
      topics.push('memory', 'history');
    }
    if (tools.includes('knowledge_base')) {
      topics.push('documentation', 'knowledge');
    }

    // Extract topics from message keywords
    const keywords: Record<string, string> = {
      deploy: 'deployment',
      database: 'database',
      api: 'api',
      auth: 'authentication',
      test: 'testing',
      security: 'security',
      monitor: 'monitoring',
    };

    const lowerMessage = message.toLowerCase();
    for (const [keyword, topic] of Object.entries(keywords)) {
      if (lowerMessage.includes(keyword)) {
        topics.push(topic);
      }
    }

    return [...new Set(topics)]; // Remove duplicates
  }

  getSessionHistory(): Message[] {
    return memoryManager.getSessionHistory();
  }

  clearSession(): void {
    memoryManager.clearSession();
  }

  getAvailableTools(): Array<{ name: string; description: string }> {
    if (!this.initialized) {
      this.initialize();
    }
    return toolRegistry.getDescriptions();
  }
}

export const orchestrator = new Orchestrator();
