import { NextResponse } from 'next/server';
import { StorageRequestSchema, StorageErrorResponse } from '../../lib/schemas/memory';
import { executeStorageAction } from '../../lib/services/storageService';
import { ZodError } from 'zod';

export async function POST(request: Request) {
    try {
        // Parse and validate request body
        const body = await request.json();
        const validatedRequest = StorageRequestSchema.parse(body);

        console.log(`API/Storage: Received action ${validatedRequest.action} with payload:`, validatedRequest.payload);

        const result = await executeStorageAction(validatedRequest);
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
