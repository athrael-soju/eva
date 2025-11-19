type SessionTokenResponse = {
  client_secret: {
    value: string;
  };
};

export async function createRealtimeSessionToken(): Promise<SessionTokenResponse> {
  const response = await fetch('/api/session', { method: 'POST' });

  const data = await response.json();

  if (!response.ok) {
    const message = data?.error || 'Failed to create session';
    throw new Error(message);
  }

  return data as SessionTokenResponse;
}
