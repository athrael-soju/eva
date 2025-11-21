import { NextRequest, NextResponse } from 'next/server';
import { mcpClient } from '../../../lib/client';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { query, group_id } = body;

        if (!query || !group_id) {
            return NextResponse.json(
                { error: 'Missing required fields: query, group_id' },
                { status: 400 }
            );
        }

        console.log('[API] Searching facts:', { query, group_id });

        // Map to MCP expected parameters
        const mcpArgs = {
            query,
            group_ids: [group_id]
        };

        const result = await mcpClient.callTool('search_memory_facts', mcpArgs);

        console.log('[API] Fact search completed');
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('[API] Error searching facts:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to search facts' },
            { status: 500 }
        );
    }
}
