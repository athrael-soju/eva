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

        console.log('[API] Deleting episode:', { uuid });

        const result = await mcpClient.callTool('delete_episode', { uuid });

        console.log('[API] Episode deleted successfully');
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('[API] Error deleting episode:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to delete episode' },
            { status: 500 }
        );
    }
}
