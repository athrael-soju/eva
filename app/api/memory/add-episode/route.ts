import { NextRequest, NextResponse } from 'next/server';
import { mcpClient } from '../../../lib/client';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, description, source, source_description, group_id, session_id } = body;

        if (!name || !description || !source || !group_id) {
            return NextResponse.json(
                { error: 'Missing required fields: name, description, source, group_id' },
                { status: 400 }
            );
        }

        console.log('[API] Adding episode:', { name, group_id });

        // Append session context if provided
        const contextSuffix = session_id
            ? `\n\n[Context: This interaction occurred during the session event '${session_id}']`
            : '';
        const enhancedDescription = description + contextSuffix;

        // Map to MCP expected parameters
        const mcpArgs = {
            name,
            episode_body: enhancedDescription,
            source,
            source_description,
            group_id
        };

        const result = await mcpClient.callTool('add_memory', mcpArgs);

        console.log('[API] Episode added successfully');
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('[API] Error adding episode:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to add episode' },
            { status: 500 }
        );
    }
}
