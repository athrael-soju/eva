import { ContextFrame, AgentResponse } from '../types';
import { contextBuilder } from '../context/builder';

interface ResponseConfig {
  useLLM?: boolean;
  maxResponseLength?: number;
}

class ResponseAgent {
  private config: ResponseConfig;

  constructor(config: ResponseConfig = {}) {
    this.config = {
      useLLM: false, // Can be switched to use LLM for generation
      maxResponseLength: 2000,
      ...config,
    };
  }

  async generate(frame: ContextFrame): Promise<AgentResponse> {
    if (this.config.useLLM) {
      return this.generateWithLLM(frame);
    }
    return this.generateWithTemplates(frame);
  }

  private generateWithTemplates(frame: ContextFrame): AgentResponse {
    const toolsUsed = frame.toolResults.map((r) => r.tool);
    let content = '';
    let confidence = 0.85;

    // Check if we have tool results to incorporate
    if (frame.toolResults.length === 0) {
      // Pure conversational response
      content = this.generateConversationalResponse(frame.userMessage);
      confidence = 0.8;
    } else {
      // Build response from tool results
      content = this.synthesizeFromTools(frame);
      confidence = this.calculateConfidence(frame.toolResults);
    }

    return {
      content,
      toolsUsed,
      confidence,
      metadata: {
        generationMethod: 'template',
        toolResultsCount: frame.toolResults.length,
      },
    };
  }

  private synthesizeFromTools(frame: ContextFrame): string {
    const parts: string[] = [];
    const successfulResults = frame.toolResults.filter((r) => r.success);
    const failedResults = frame.toolResults.filter((r) => !r.success);

    // Handle different tool combinations
    const hasMemory = successfulResults.some((r) => r.tool === 'memory_search');
    const hasKnowledge = successfulResults.some(
      (r) => r.tool === 'knowledge_base'
    );
    const hasClarification = successfulResults.some(
      (r) => r.tool === 'clarification_check'
    );

    if (hasClarification) {
      const clarificationResult = successfulResults.find(
        (r) => r.tool === 'clarification_check'
      );
      if (clarificationResult) {
        return this.handleClarificationResponse(
          frame.userMessage,
          clarificationResult.rawData as {
            needsClarification: boolean;
            suggestedQuestions: string[];
          }
        );
      }
    }

    // Introduction based on query type
    if (hasMemory && hasKnowledge) {
      parts.push(
        "I've searched both our previous conversations and the knowledge base to help you."
      );
    } else if (hasMemory) {
      parts.push("Based on our previous conversations, here's what I found:");
    } else if (hasKnowledge) {
      parts.push("Here's what I found in the documentation:");
    }

    // Add memory context if available
    if (hasMemory) {
      const memoryResult = successfulResults.find(
        (r) => r.tool === 'memory_search'
      );
      if (memoryResult) {
        const memData = memoryResult.rawData as {
          found: boolean;
          results: Array<{
            date: string;
            summary: string;
            assistantResponse: string;
          }>;
        };
        if (memData.found && memData.results.length > 0) {
          parts.push('\n**From our past conversations:**');
          const topResult = memData.results[0];
          parts.push(
            `On ${topResult.date}, we discussed: ${topResult.summary}`
          );
          parts.push(`\nKey points: ${topResult.assistantResponse}`);
        } else {
          parts.push(
            "\nI couldn't find relevant information from our previous conversations."
          );
        }
      }
    }

    // Add knowledge base context if available
    if (hasKnowledge) {
      const kbResult = successfulResults.find(
        (r) => r.tool === 'knowledge_base'
      );
      if (kbResult) {
        const kbData = kbResult.rawData as {
          found: boolean;
          documents: Array<{ title: string; content: string }>;
        };
        if (kbData.found && kbData.documents.length > 0) {
          parts.push('\n**From the documentation:**');
          const topDoc = kbData.documents[0];
          parts.push(`**${topDoc.title}**`);
          // Extract key information (first 500 chars or until double newline)
          const excerpt = topDoc.content.slice(0, 500);
          parts.push(excerpt);
        } else {
          parts.push(
            "\nI couldn't find relevant documentation in the knowledge base."
          );
        }
      }
    }

    // Handle any failures
    if (failedResults.length > 0) {
      parts.push(
        `\n*Note: Some tools encountered issues: ${failedResults.map((r) => r.tool).join(', ')}*`
      );
    }

    // Add a summary or next steps if appropriate
    if (successfulResults.length > 0) {
      parts.push(
        '\nIs there anything specific from this information you would like me to elaborate on?'
      );
    }

    return parts.join('\n');
  }

  private handleClarificationResponse(
    userMessage: string,
    data: { needsClarification: boolean; suggestedQuestions: string[] }
  ): string {
    if (!data.needsClarification) {
      return `I understand your request: "${userMessage}". Let me help you with that.`;
    }

    const question =
      data.suggestedQuestions[0] || 'Could you provide more details?';

    return `I want to make sure I help you effectively. ${question}`;
  }

  private generateConversationalResponse(userMessage: string): string {
    // Simple template-based conversational response
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return "Hello! How can I assist you today? I have access to our conversation history and knowledge base if you need to reference previous discussions or documentation.";
    }

    if (lowerMessage.includes('thank')) {
      return "You're welcome! Let me know if you need anything else.";
    }

    if (lowerMessage.includes('bye') || lowerMessage.includes('goodbye')) {
      return 'Goodbye! Feel free to return whenever you need assistance.';
    }

    return "I'm here to help. You can ask me about documentation, reference our past conversations, or discuss any topic you'd like. What would you like to explore?";
  }

  private calculateConfidence(
    results: Array<{ success: boolean; rawData: unknown }>
  ): number {
    if (results.length === 0) return 0.7;

    const successRate =
      results.filter((r) => r.success).length / results.length;
    const hasData = results.some((r) => {
      if (!r.success) return false;
      const data = r.rawData as { found?: boolean; count?: number };
      return data.found || (data.count && data.count > 0);
    });

    let confidence = successRate * 0.8;
    if (hasData) confidence += 0.15;

    return Math.min(confidence, 0.95);
  }

  private async generateWithLLM(frame: ContextFrame): Promise<AgentResponse> {
    // Placeholder for LLM-based generation
    // Would use the contextBuilder.build() to create the prompt
    // and send it to OpenAI/Anthropic API
    const prompt = contextBuilder.build(frame);
    console.log('LLM generation prompt:', prompt.slice(0, 200) + '...');

    // Fall back to template for now
    return this.generateWithTemplates(frame);
  }
}

export const responseAgent = new ResponseAgent();
