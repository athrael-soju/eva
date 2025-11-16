import { NextResponse } from 'next/server';
import { orchestrator } from '@/app/lib/agents';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    const result = await orchestrator.processMessage(message);

    return NextResponse.json({
      success: true,
      response: result.response.content,
      metadata: {
        intent: result.routing.intent,
        toolsUsed: result.toolResults.map((r) => r.tool),
        confidence: result.response.confidence,
        processingTime: result.processingTime,
        reasoning: result.routing.reasoning,
      },
    });
  } catch (error) {
    console.error('Error processing chat message:', error);
    return NextResponse.json(
      {
        error: 'Failed to process message',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const tools = orchestrator.getAvailableTools();
    const history = orchestrator.getSessionHistory();

    return NextResponse.json({
      tools,
      sessionHistoryLength: history.length,
      recentMessages: history.slice(-5),
    });
  } catch (error) {
    console.error('Error getting chat info:', error);
    return NextResponse.json(
      { error: 'Failed to get chat information' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    orchestrator.clearSession();
    return NextResponse.json({ success: true, message: 'Session cleared' });
  } catch (error) {
    console.error('Error clearing session:', error);
    return NextResponse.json(
      { error: 'Failed to clear session' },
      { status: 500 }
    );
  }
}
