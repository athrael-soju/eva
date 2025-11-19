import { NextResponse } from 'next/server';
import { config } from '../../lib/config';

export async function POST() {
  try {
    const apiKey = config.openaiApiKey;
    const model = config.openaiRealtimeModel;
    if (!apiKey || !model) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY or OPENAI_REALTIME_MODEL not configured' },
        { status: 500 }
      );
    }

    // Create an ephemeral token for the Realtime API
    const response = await fetch(
      'https://api.openai.com/v1/realtime/sessions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Session creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
