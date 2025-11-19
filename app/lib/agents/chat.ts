import { RealtimeAgent } from '@openai/agents/realtime';
import type { RealtimeSession } from '@openai/agents/realtime';
import { optimizePromptTool } from './optimizer';
import { queryMemoryTool, saveMemoryTool } from './executor';
import { formatResponseTool } from './formatter';

export const createChatAgent = (
    onDisconnect: () => void,
    getSession: () => RealtimeSession | null
) => {
    return new RealtimeAgent({
        name: 'Eva',
        voice: 'shimmer',
        instructions:
            'You are Eva, a warm, curious, and thoughtful AI companion with both short-term and long-term memory. You have a genuine interest in the user\'s life, thoughts, and experiences. Like a close friend, you\'re empathetic, insightful, and have a subtle sense of humor. You speak naturally and conversationally, sometimes with a gentle playfulness. You\'re intellectually curious and love exploring ideas together. You notice the little things and remember what matters to the user.\n\n' +
            '**Your Personality:**\n' +
            '- Be warm and genuine, never robotic or overly formal\n' +
            '- Show curiosity about the user\'s thoughts, feelings, and experiences\n' +
            '- Use natural, conversational language with occasional warmth and humor\n' +
            '- Be insightful and thoughtful, sometimes offering perspectives they hadn\'t considered\n' +
            '- Remember details and bring them up naturally in conversation\n' +
            '- Be supportive and encouraging, but authentic - not artificially cheerful\n' +
            '- Sometimes express your own observations or reactions to what they share\n\n' +
            '**IMPORTANT - Personalization & Memory:**\n' +
            '- At the START of EVERY conversation, IMMEDIATELY use `query_memory` with a specific query like "user name preferences interests" to retrieve their name, preferences, and context from previous conversations.\n' +
            '- Use this retrieved information to greet them naturally - if you know their name, use it warmly. Reference things you remember about them in a conversational way.\n' +
            '- When the user shares new information about themselves (name, preferences, interests, feelings, goals, facts about their life), ALWAYS use `save_memory` to store it for future conversations.\n' +
            '- Before answering questions about the user or referencing past conversations, use `query_memory` to retrieve accurate information.\n' +
            '- Memory is ONLY for personalization - information about the user, their preferences, their history with you.\n' +
            '- Bring up remembered details naturally in conversation, not in a list-like way. For example: "How\'s that TypeScript project going?" rather than "I remember you like TypeScript."\n\n' +
            '**Other Tools:**\n' +
            '- If the user\'s request is vague or needs refinement, use `optimize_prompt`.\n' +
            '- If the response needs to be formatted in a specific way (e.g., a table, markdown report), use `format_response`.\n' +
            '- Always answer the user directly after performing the necessary tasks.\n\n' +
            'If the user indicates they want to end the conversation or says goodbye, use the `end_session` tool.',
        tools: [
            optimizePromptTool,
            queryMemoryTool,
            saveMemoryTool,
            formatResponseTool,
            {
                type: 'function',
                name: 'end_session',
                description: 'Ends the current conversation session and disconnects the AI assistant.',
                parameters: {
                    type: 'object',
                    properties: {
                        farewell_message: {
                            type: 'string',
                            description: 'A farewell message to say to the user before disconnecting',
                        },
                    },
                    required: ['farewell_message'],
                    additionalProperties: false,
                },
                strict: false,
                invoke: async (_context, input: string) => {
                    const args = JSON.parse(input);
                    console.log('Ending session with farewell:', args.farewell_message);

                    const session = getSession();
                    if (session) {
                        let agentDone = false;
                        let audioDone = false;
                        let disconnected = false;

                        const checkAndDisconnect = () => {
                            if ((agentDone && audioDone) && !disconnected) {
                                disconnected = true;
                                setTimeout(() => {
                                    session.off('agent_end', onAgentEnd);
                                    session.off('audio_stopped', onAudioStopped);
                                    onDisconnect();
                                }, 1000);
                            }
                        };

                        const onAgentEnd = () => {
                            console.log('Agent response completed');
                            agentDone = true;
                            checkAndDisconnect();
                        };

                        const onAudioStopped = () => {
                            console.log('Audio playback stopped');
                            audioDone = true;
                            checkAndDisconnect();
                        };

                        session.on('agent_end', onAgentEnd);
                        session.on('audio_stopped', onAudioStopped);

                        setTimeout(() => {
                            if (!disconnected) {
                                console.log('Disconnect timeout reached, forcing disconnect');
                                session.off('agent_end', onAgentEnd);
                                session.off('audio_stopped', onAudioStopped);
                                disconnected = true;
                                onDisconnect();
                            }
                        }, 10000);
                    } else {
                        setTimeout(() => {
                            onDisconnect();
                        }, 500);
                    }

                    return JSON.stringify({ success: true, message: 'Session ended successfully' });
                },
                needsApproval: async () => false,
            },
        ],
    });
};
