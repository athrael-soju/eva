import { orchestrator } from './agents';
import { memoryManager } from './memory/manager';

// Initialize orchestrator on module load
orchestrator.initialize();

// Adapter to convert multi-agent tools for OpenAI Realtime Agent format
export function getRealtimeTools() {
  return [
    {
      type: 'function' as const,
      name: 'search_memory',
      description:
        'Search through past conversations to find relevant context. Use when the user references previous discussions, asks about what was discussed before, or needs historical context.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'What to search for in past conversations',
          },
          timeframe_days: {
            type: 'number',
            description:
              'Optional: Only search conversations from the last N days',
          },
        },
        required: ['query'],
        additionalProperties: false,
      },
      strict: false,
      invoke: async (_context: unknown, input: string) => {
        const args = JSON.parse(input);
        const results = memoryManager.searchMemory(args.query, {
          limit: 3,
          timeframeDays: args.timeframe_days,
        });

        if (results.length === 0) {
          return JSON.stringify({
            found: false,
            message: 'No relevant past conversations found.',
          });
        }

        const formatted = results.map((r) => ({
          date: new Date(r.entry.timestamp).toLocaleDateString(),
          summary: r.entry.summary,
          context: r.entry.assistantResponse.slice(0, 200),
        }));

        return JSON.stringify({
          found: true,
          count: results.length,
          conversations: formatted,
        });
      },
      needsApproval: async () => false,
    },
    {
      type: 'function' as const,
      name: 'search_knowledge_base',
      description:
        'Search internal documentation and guides. Use when the user asks about processes, APIs, best practices, deployment procedures, database schemas, or any documented technical information.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'What to search for in the knowledge base',
          },
          category: {
            type: 'string',
            description:
              'Optional category filter: infrastructure, security, api, database, testing',
          },
        },
        required: ['query'],
        additionalProperties: false,
      },
      strict: false,
      invoke: async (_context: unknown, input: string) => {
        const args = JSON.parse(input);
        const { toolRegistry } = await import('./tools');

        const result = await toolRegistry.execute('knowledge_base', {
          query: args.query,
          category: args.category,
          limit: 2,
        });

        if (!result.success) {
          return JSON.stringify({
            found: false,
            message: 'Error searching knowledge base',
          });
        }

        const data = result.rawData as {
          found: boolean;
          documents: Array<{ title: string; content: string }>;
        };

        if (!data.found) {
          return JSON.stringify({
            found: false,
            message: 'No relevant documentation found.',
          });
        }

        // Return condensed version for voice
        const docs = data.documents.map((d) => ({
          title: d.title,
          // Extract first 300 chars for voice-friendly response
          summary: d.content.slice(0, 300).replace(/\n+/g, ' ').trim(),
        }));

        return JSON.stringify({
          found: true,
          count: docs.length,
          documents: docs,
        });
      },
      needsApproval: async () => false,
    },
    {
      type: 'function' as const,
      name: 'process_complex_query',
      description:
        'Process a complex query that may require multiple tools (memory search + knowledge base). Use when the user asks a question that needs both historical context AND documentation lookup.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The complex query to process',
          },
        },
        required: ['query'],
        additionalProperties: false,
      },
      strict: false,
      invoke: async (_context: unknown, input: string) => {
        const args = JSON.parse(input);
        const result = await orchestrator.processMessage(args.query);

        return JSON.stringify({
          intent: result.routing.intent,
          tools_used: result.toolResults.map((r) => r.tool),
          response: result.response.content,
          confidence: result.response.confidence,
        });
      },
      needsApproval: async () => false,
    },
  ];
}

// Store session messages for memory
export function addMessageToMemory(
  role: 'user' | 'assistant',
  content: string
) {
  memoryManager.addToSession({
    role,
    content,
    timestamp: Date.now(),
  });
}

// Get current session history
export function getSessionHistory() {
  return memoryManager.getSessionHistory();
}

// Clear current session
export function clearSessionMemory() {
  memoryManager.clearSession();
}
