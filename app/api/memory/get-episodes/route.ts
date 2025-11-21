import { NextRequest, NextResponse } from 'next/server';
import { mcpClient } from '../../../lib/client';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { group_id, max_episodes } = body;

        if (!group_id) {
            return NextResponse.json(
                { error: 'Missing required field: group_id' },
                { status: 400 }
            );
        }

        console.log('[API] Getting episodes:', { group_id, max_episodes });

        // Map to MCP expected parameters
        const mcpArgs = {
            group_ids: [group_id],
            max_episodes
        };

        const result = await mcpClient.callTool('get_episodes', mcpArgs);

        console.log('[API] Episodes retrieved successfully');
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('[API] Error getting episodes:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to get episodes' },
            { status: 500 }
        );
    }
}
