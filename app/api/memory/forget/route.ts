import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
    try {
        const { group_id } = await request.json();

        if (!group_id) {
            return NextResponse.json(
                { error: 'group_id is required' },
                { status: 400 }
            );
        }

        console.log('[API] Deleting graph for group:', group_id);

        // Execute GRAPH.DELETE command on FalkorDB
        const command = `docker exec eva-graphiti-1 redis-cli -p 6379 GRAPH.DELETE ${group_id}`;
        console.log('[API] Executing command:', command);

        const { stdout, stderr } = await execAsync(command);

        if (stderr && !stderr.includes('OK')) {
            console.error('[API] Error deleting graph:', stderr);
            return NextResponse.json(
                { error: `Failed to delete graph: ${stderr}` },
                { status: 500 }
            );
        }

        console.log('[API] Successfully deleted graph:', stdout);

        return NextResponse.json({
            success: true,
            message: 'All memories have been permanently deleted.',
            group_id
        });
    } catch (error: any) {
        console.error('[API] Error in forget endpoint:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to delete memories' },
            { status: 500 }
        );
    }
}
