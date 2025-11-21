import { NextRequest, NextResponse } from 'next/server';
import { mcpClient } from '../../../lib/client';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { uuid } = body;

        if (!uuid) {
            return NextResponse.json(
                { error: 'Missing required field: uuid' },
                { status: 400 }
            );
        }

        console.log('[API] Deleting entity edge:', { uuid });

        const result = await mcpClient.callTool('delete_entity_edge', { uuid });

        console.log('[API] Entity edge deleted successfully');
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('[API] Error deleting entity edge:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to delete entity edge' },
            { status: 500 }
        );
    }
}
