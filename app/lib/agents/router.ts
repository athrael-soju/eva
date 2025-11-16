import { RoutingDecision, Intent } from '../types';
import { toolRegistry } from '../tools/registry';

interface RouterConfig {
  useLLM?: boolean;
  defaultConfidence?: number;
}

class RouterAgent {
  private config: RouterConfig;

  constructor(config: RouterConfig = {}) {
    this.config = {
      useLLM: false, // Start with rule-based, can switch to LLM later
      defaultConfidence: 0.85,
      ...config,
    };
  }

  async classify(userMessage: string): Promise<RoutingDecision> {
    if (this.config.useLLM) {
      return this.classifyWithLLM(userMessage);
    }
    return this.classifyWithRules(userMessage);
  }

  private classifyWithRules(userMessage: string): RoutingDecision {
    const lowerMessage = userMessage.toLowerCase();
    const tools: string[] = [];
    let intent: Intent = 'conversation';
    let confidence = this.config.defaultConfidence || 0.85;
    let reasoning = '';
    let requiresClarification = false;

    // Check for memory-related queries
    const memoryPatterns = [
      /\b(remember|recall|last time|previously|before|earlier|past|history)\b/,
      /\b(we (discussed|talked|mentioned))\b/,
      /\b(you (said|told|mentioned))\b/,
      /\b(what did (we|i|you))\b/,
      /\b(ago|last week|yesterday|last month)\b/,
    ];

    const needsMemory = memoryPatterns.some((p) => p.test(lowerMessage));

    // Check for knowledge-related queries
    const knowledgePatterns = [
      /\b(documentation|docs|guide|how to|tutorial)\b/,
      /\b(what is|explain|describe|define)\b/,
      /\b(how does|how do|how can)\b/,
      /\b(best practice|recommended|standard)\b/,
      /\b(api|endpoint|schema|database|deployment)\b/,
      /\b(process|procedure|workflow|steps|flow)\b/,
      /\b(authentication|authorization|security)\b/,
      /\b(testing|migration|configuration)\b/,
    ];

    const needsKnowledge = knowledgePatterns.some((p) => p.test(lowerMessage));

    // Check for clarification needs
    const vaguePatterns = [
      /^(help|fix|change|update)\s*$/i,
      /^\s*\?\s*$/,
      /^what\s*$/i,
      /^how\s*$/i,
    ];

    const isTooVague = vaguePatterns.some((p) => p.test(lowerMessage));
    const isVeryShort = userMessage.trim().split(/\s+/).length < 3;

    // Determine routing
    if (isTooVague || (isVeryShort && !userMessage.includes('?'))) {
      intent = 'clarification_needed';
      tools.push('clarification_check');
      requiresClarification = true;
      reasoning = 'Message is too vague or short to determine intent';
      confidence = 0.9;
    } else if (needsMemory && needsKnowledge) {
      intent = 'multi_tool';
      if (toolRegistry.has('memory_search')) {
        tools.push('memory_search');
      }
      if (toolRegistry.has('knowledge_base')) {
        tools.push('knowledge_base');
      }
      reasoning = 'Message requires both memory context and knowledge base lookup';
      confidence = 0.8;
    } else if (needsMemory) {
      intent = 'memory_access';
      if (toolRegistry.has('memory_search')) {
        tools.push('memory_search');
      }
      reasoning = 'Message references past conversations or needs historical context';
      confidence = 0.85;
    } else if (needsKnowledge) {
      intent = 'knowledge_retrieval';
      if (toolRegistry.has('knowledge_base')) {
        tools.push('knowledge_base');
      }
      reasoning = 'Message requires documentation or knowledge base information';
      confidence = 0.85;
    } else {
      intent = 'conversation';
      reasoning = 'Standard conversational message, no special tools needed';
      confidence = 0.9;
    }

    return {
      intent,
      tools,
      requiresClarification,
      confidence,
      reasoning,
    };
  }

  private async classifyWithLLM(userMessage: string): Promise<RoutingDecision> {
    // Placeholder for LLM-based classification
    // In production, this would call OpenAI/Anthropic API
    // For now, fall back to rules
    console.log('LLM classification not yet implemented, using rules');
    return this.classifyWithRules(userMessage);
  }

  extractToolInputs(
    userMessage: string,
    tools: string[]
  ): Array<{ name: string; input: Record<string, unknown> }> {
    const inputs: Array<{ name: string; input: Record<string, unknown> }> = [];

    for (const toolName of tools) {
      switch (toolName) {
        case 'memory_search': {
          // Extract timeframe if mentioned
          let timeframeDays: number | undefined;
          const timeMatch = userMessage.match(
            /(\d+)\s*(day|week|month)s?\s*ago/i
          );
          if (timeMatch) {
            const num = parseInt(timeMatch[1]);
            const unit = timeMatch[2].toLowerCase();
            if (unit === 'week') {
              timeframeDays = num * 7;
            } else if (unit === 'month') {
              timeframeDays = num * 30;
            } else {
              timeframeDays = num;
            }
          } else if (/last week/i.test(userMessage)) {
            timeframeDays = 7;
          } else if (/yesterday/i.test(userMessage)) {
            timeframeDays = 1;
          }

          inputs.push({
            name: toolName,
            input: {
              query: userMessage,
              limit: 5,
              timeframeDays,
            },
          });
          break;
        }

        case 'knowledge_base': {
          // Extract category if mentioned
          let category: string | undefined;
          const categories = [
            'infrastructure',
            'security',
            'api',
            'database',
            'testing',
          ];
          for (const cat of categories) {
            if (userMessage.toLowerCase().includes(cat)) {
              category = cat;
              break;
            }
          }

          inputs.push({
            name: toolName,
            input: {
              query: userMessage,
              category,
              limit: 3,
            },
          });
          break;
        }

        case 'clarification_check':
          inputs.push({
            name: toolName,
            input: {
              userMessage,
              conversationHistory: [],
            },
          });
          break;

        default:
          // Generic input for unknown tools
          inputs.push({
            name: toolName,
            input: { query: userMessage },
          });
      }
    }

    return inputs;
  }
}

export const routerAgent = new RouterAgent();
