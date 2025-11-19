import { NextResponse } from 'next/server';
import { MCPClient } from '../../lib/mcp/client';
import { StorageRequestSchema, StorageErrorResponse } from '../../lib/schemas/memory';
import { ZodError } from 'zod';

const mcpClient = new MCPClient();
const GROUP_ID = process.env.MCP_GROUP_ID || 'dot-conversations';

export async function POST(request: Request) {
    try {
        // Parse and validate request body
        const body = await request.json();
        const validatedRequest = StorageRequestSchema.parse(body);

        console.log(`API/Storage: Received action ${validatedRequest.action} with payload:`, validatedRequest.payload);

        let result;
        if (validatedRequest.action === 'query_memory') {
            // Search for user information (entities like name, preferences, etc.)
            result = await mcpClient.searchNodes(validatedRequest.payload, GROUP_ID);
        } else if (validatedRequest.action === 'save_memory') {
            // Save user information to memory (creates episode with entities/relationships)
            result = await mcpClient.addMemory(validatedRequest.payload, GROUP_ID);
        }

        return NextResponse.json({ result });
    } catch (error: any) {
        // Handle Zod validation errors
        if (error instanceof ZodError) {
            console.error('API/Storage: Validation error:', error.errors);
            return NextResponse.json(
                {
                    error: 'Invalid request format',
                    details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
                } satisfies StorageErrorResponse,
                { status: 400 }
            );
        }

        // Handle other errors
        console.error('API/Storage: Error processing request:', error);
        return NextResponse.json(
            {
                error: error.message || 'Internal Server Error',
                details: error.toString()
            } satisfies StorageErrorResponse,
            { status: 500 }
        );
    }
}
