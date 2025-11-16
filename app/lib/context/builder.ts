import { ContextFrame, Message, ToolResult } from '../types';

interface BuilderOptions {
  maxHistoryLength?: number;
  includeTimestamps?: boolean;
  includeToolMetadata?: boolean;
}

class ContextBuilder {
  private defaultOptions: BuilderOptions = {
    maxHistoryLength: 10,
    includeTimestamps: true,
    includeToolMetadata: false,
  };

  build(frame: ContextFrame, options: BuilderOptions = {}): string {
    const opts = { ...this.defaultOptions, ...options };
    const sections: string[] = [];

    // System preamble
    sections.push(this.buildPreamble());

    // Add tool results if available
    if (frame.toolResults.length > 0) {
      sections.push(this.buildToolResultsSection(frame.toolResults, opts));
    }

    // Add memory context if available
    if (frame.memoryContext) {
      sections.push(this.buildMemorySection(frame.memoryContext));
    }

    // Add conversation history
    if (frame.conversationHistory.length > 0) {
      sections.push(
        this.buildHistorySection(frame.conversationHistory, opts)
      );
    }

    // Add current user message
    sections.push(this.buildUserMessageSection(frame.userMessage));

    // Add response instructions
    sections.push(this.buildInstructions());

    return sections.join('\n\n');
  }

  private buildPreamble(): string {
    return `You are an intelligent assistant with access to various tools and information sources. Your goal is to provide helpful, accurate, and contextually relevant responses based on the information provided below.`;
  }

  private buildToolResultsSection(
    results: ToolResult[],
    opts: BuilderOptions
  ): string {
    const header = '## TOOL RESULTS';
    const content = results
      .map((result) => {
        let section = `### ${result.tool}\n`;
        if (opts.includeToolMetadata) {
          section += `Status: ${result.success ? 'Success' : 'Failed'}\n`;
          section += `Execution time: ${result.executionTime}ms\n\n`;
        }
        section += result.formatted;
        return section;
      })
      .join('\n\n');

    return `${header}\n\n${content}`;
  }

  private buildMemorySection(memoryContext: string): string {
    return `## MEMORY CONTEXT\n\n${memoryContext}`;
  }

  private buildHistorySection(
    history: Message[],
    opts: BuilderOptions
  ): string {
    const trimmed = history.slice(-(opts.maxHistoryLength || 10));
    const header = '## CONVERSATION HISTORY';

    const content = trimmed
      .map((msg) => {
        let line = `**${msg.role.toUpperCase()}**: ${msg.content}`;
        if (opts.includeTimestamps) {
          const time = new Date(msg.timestamp).toLocaleTimeString();
          line = `[${time}] ${line}`;
        }
        return line;
      })
      .join('\n\n');

    return `${header}\n\n${content}`;
  }

  private buildUserMessageSection(message: string): string {
    return `## CURRENT USER MESSAGE\n\n${message}`;
  }

  private buildInstructions(): string {
    return `## INSTRUCTIONS

Using the context provided above (tool results, memory, and conversation history), generate a helpful and accurate response to the user's current message.

Guidelines:
- Reference specific information from tool results when relevant
- Maintain consistency with previous conversations
- Be concise but thorough
- If information is incomplete or uncertain, acknowledge it
- Do not make up information not provided in the context`;
  }

  buildClarificationPrompt(
    userMessage: string,
    suggestedQuestions: string[]
  ): string {
    return `The user's message requires clarification before I can provide a complete response.

User message: "${userMessage}"

I need to ask one of these clarifying questions:
${suggestedQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Generate a polite response that:
1. Acknowledges what I understood from their message
2. Asks the most relevant clarifying question
3. Explains why this information would help me assist them better`;
  }

  buildRoutingPrompt(
    userMessage: string,
    availableTools: Array<{ name: string; description: string }>
  ): string {
    const toolList = availableTools
      .map((t) => `- **${t.name}**: ${t.description}`)
      .join('\n');

    return `Analyze the following user message and determine which tools should be used to best respond.

User message: "${userMessage}"

Available tools:
${toolList}

Respond with a JSON object containing:
{
  "intent": "knowledge_retrieval" | "memory_access" | "clarification_needed" | "conversation" | "multi_tool",
  "tools": ["tool_name1", "tool_name2"],
  "requiresClarification": boolean,
  "confidence": number between 0 and 1,
  "reasoning": "brief explanation of your decision"
}

If no tools are needed for a simple conversational response, return an empty tools array with intent "conversation".`;
  }
}

export const contextBuilder = new ContextBuilder();
