import { memoryClient } from '../services/memoryClient';

export class ExecutorHelper {
    static async queryMemory(query: string) {
        console.log('ExecutorHelper: Querying memory for:', query);
        const result = await memoryClient.queryMemory(query);
        console.log('ExecutorHelper: Query result:', JSON.stringify(result, null, 2));
        return result;
    }

    static async saveMemory(content: string): Promise<string> {
        console.log('ExecutorHelper: Saving to memory:', content);
        await memoryClient.saveMemory(content);
        return 'Memory saved successfully';
    }

    /**
     * Automatically save a conversation turn (user + agent exchange) to memory
     * This runs in the background and doesn't block the conversation
     */
    static async saveConversationTurn(userMessage: string, agentResponse: string): Promise<void> {
        try {
            const conversationContent = `User: ${userMessage}\nEva: ${agentResponse}`;
            console.log('ExecutorHelper: Auto-saving conversation turn');
            await memoryClient.saveMemory(conversationContent);
        } catch (error) {
            console.error('Failed to auto-save conversation turn:', error);
            // Don't throw - we don't want to interrupt the conversation if auto-save fails
        }
    }

    static async searchFacts(query: string, centerNodeUuid?: string) {
        console.log('ExecutorHelper: Searching facts for:', query, centerNodeUuid ? `(centered on ${centerNodeUuid})` : '');
        const result = await memoryClient.searchFacts(
            query,
            centerNodeUuid ? { centerNodeUuid } : undefined
        );
        console.log('ExecutorHelper: Facts result:', JSON.stringify(result, null, 2));
        return result;
    }

}

export const queryMemoryTool = {
    type: 'function' as const,
    name: 'query_memory',
    description: 'Search for information about the USER to personalize the conversation. Use this to find the user\'s name, preferences, interests, past conversations, or any personal facts they\'ve shared. This is ONLY for user personalization, not for general knowledge or factual information.',
    parameters: {
        type: 'object' as const,
        properties: {
            query: {
                type: 'string',
                description: 'The query to search for in memory.',
            },
        },
        required: ['query'],
        additionalProperties: false,
    },
    strict: true,
    invoke: async (context: any, input: string) => {
        const args = JSON.parse(input);
        const result = await ExecutorHelper.queryMemory(args.query);
        return { success: true, result: result };
    },
    needsApproval: async () => false,
};

export const saveMemoryTool = {
    type: 'function' as const,
    name: 'save_memory',
    description: 'Save information about the USER to long-term memory for future personalization. Use this whenever the user shares personal information like their name, preferences, interests, hobbies, goals, or any facts about themselves or their life. This is ONLY for user information, not for general facts or knowledge.',
    parameters: {
        type: 'object' as const,
        properties: {
            content: {
                type: 'string',
                description: 'The content to save to memory.',
            },
        },
        required: ['content'],
        additionalProperties: false,
    },
    strict: true,
    invoke: async (context: any, input: string) => {
        const args = JSON.parse(input);
        const result = await ExecutorHelper.saveMemory(args.content);
        return { success: true, result: result };
    },
    needsApproval: async () => false,
};

export const searchFactsTool = {
    type: 'function' as const,
    name: 'search_facts',
    description: 'Search for RELATIONSHIPS and CONNECTIONS between entities in memory. Use this to understand how things relate to each other (e.g., "What are the user\'s relationships?", "Find connections between their interests", "What facts are related to their work?"). This searches the graph for facts/edges, not just entities.',
    parameters: {
        type: 'object' as const,
        properties: {
            query: {
                type: 'string',
                description: 'The relationship or connection to search for (e.g., "user work relationships", "interests connected to hobbies").',
            },
            centerNodeUuid: {
                type: 'string',
                description: 'Optional: UUID of an entity to center the search around. Results will be prioritized by proximity to this entity.',
            },
        },
        required: ['query'],
        additionalProperties: false,
    },
    strict: false,
    invoke: async (context: any, input: string) => {
        const args = JSON.parse(input);
        const result = await ExecutorHelper.searchFacts(args.query, args.centerNodeUuid);
        return { success: true, result: result };
    },
    needsApproval: async () => false,
};

