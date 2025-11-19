import { RealtimeAgent } from '@openai/agents/realtime';
import type { RealtimeSession } from '@openai/agents/realtime';
import { queryMemoryTool, saveMemoryTool, searchFactsTool } from './executor';
import { personaInstructions } from './persona';
import { createEndSessionTool } from './tools/endSession';

export const createChatAgent = (
    onDisconnect: () => void,
    getSession: () => RealtimeSession | null,
    waitForAudioPlayback: () => Promise<void>
) => {
    return new RealtimeAgent({
        name: 'Eva',
        voice: 'marin',
        instructions: personaInstructions,
        tools: [
            queryMemoryTool,
            saveMemoryTool,
            searchFactsTool,
            createEndSessionTool({ onDisconnect, getSession, waitForAudioPlayback }),
        ],
    });
};
