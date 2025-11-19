import type { RealtimeSession } from '@openai/agents/realtime';

type EndSessionDependencies = {
    getSession: () => RealtimeSession | null;
    waitForAudioPlayback: () => Promise<void>;
    onDisconnect: () => void;
};

export function createEndSessionTool(deps: EndSessionDependencies) {
    const { getSession, waitForAudioPlayback, onDisconnect } = deps;

    return {
        type: 'function' as const,
        name: 'end_session',
        description: 'Ends the current conversation session and disconnects the AI assistant.',
        parameters: {
            type: 'object' as const,
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
        invoke: async (_context: any, input: string) => {
            const args = JSON.parse(input);
            console.log('Ending session with farewell:', args.farewell_message);

            const session = getSession();
            if (session) {
                let fallbackTimeout: NodeJS.Timeout;

                const onAgentEnd = async () => {
                    if (fallbackTimeout) clearTimeout(fallbackTimeout);
                    console.log('Agent response completed, waiting for audio playback...');
                    session.off('agent_end', onAgentEnd);
                    await waitForAudioPlayback();
                    console.log('Audio playback finished, disconnecting...');
                    onDisconnect();
                };

                session.on('agent_end', onAgentEnd);

                fallbackTimeout = setTimeout(() => {
                    console.log('Disconnect timeout reached, forcing disconnect');
                    session.off('agent_end', onAgentEnd);
                    onDisconnect();
                }, 15000);
            } else {
                setTimeout(() => {
                    onDisconnect();
                }, 500);
            }

            return JSON.stringify({ success: true, message: 'Session ended successfully' });
        },
        needsApproval: async () => false,
    };
}
