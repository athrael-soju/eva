import { Tool } from '../types';
import { memoryManager } from '../memory/manager';

interface MemorySearchInput {
  query: string;
  limit?: number;
  timeframeDays?: number;
}

interface MemorySearchOutput {
  found: boolean;
  count: number;
  results: Array<{
    date: string;
    summary: string;
    userMessage: string;
    assistantResponse: string;
    relevance: number;
  }>;
}

export const memorySearchTool: Tool = {
  name: 'memory_search',
  description:
    'Search through past conversations and interactions to find relevant context. Use this when the user references previous discussions or needs historical context.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query to find relevant memories',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return (default: 5)',
      },
      timeframeDays: {
        type: 'number',
        description:
          'Only search memories from the last N days (optional, searches all if not specified)',
      },
    },
    required: ['query'],
  },

  invoke: async (input: Record<string, unknown>): Promise<MemorySearchOutput> => {
    const { query, limit, timeframeDays } = input as unknown as MemorySearchInput;

    const results = memoryManager.searchMemory(query, {
      limit: limit || 5,
      timeframeDays,
    });

    return {
      found: results.length > 0,
      count: results.length,
      results: results.map((r) => ({
        date: new Date(r.entry.timestamp).toLocaleDateString(),
        summary: r.entry.summary,
        userMessage: r.entry.userMessage,
        assistantResponse: r.entry.assistantResponse,
        relevance: Math.round(r.relevance * 100) / 100,
      })),
    };
  },

  formatOutput: (raw: unknown): string => {
    const data = raw as MemorySearchOutput;

    if (!data.found) {
      return 'No relevant past conversations found.';
    }

    const formatted = data.results
      .map(
        (r) =>
          `**Previous conversation (${r.date}):**\n` +
          `Summary: ${r.summary}\n` +
          `User asked: "${r.userMessage}"\n` +
          `Response: "${r.assistantResponse}"`
      )
      .join('\n\n');

    return `Found ${data.count} relevant conversation(s):\n\n${formatted}`;
  },
};
