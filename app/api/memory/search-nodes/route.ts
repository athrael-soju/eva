import { NextRequest, NextResponse } from 'next/server';
import { mcpClient } from '../../../lib/client';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { query, group_id, entity_types } = body;

        if (!query || !group_id) {
            return NextResponse.json(
                { error: 'Missing required fields: query, group_id' },
                { status: 400 }
            );
        }

        console.log('[API] Searching nodes:', { query, group_id, entity_types });

        // Map to MCP expected parameters
        const mcpArgs = {
            query,
            group_ids: [group_id],
            entity_types
        };

        const result = await mcpClient.callTool('search_nodes', mcpArgs);

        console.log('[API] Node search completed');
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('[API] Error searching nodes:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to search nodes' },
            { status: 500 }
        );
    }
}
