import { z } from 'zod';

const envSchema = z.object({
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_REALTIME_MODEL: z.string().optional(),
  NEXT_PUBLIC_MCP_SERVER_URL: z.string().optional(),
  MCP_GROUP_ID: z.string().optional(),
});

const parsed = envSchema.parse(process.env);

export const config = {
  openaiApiKey: parsed.OPENAI_API_KEY,
  openaiRealtimeModel: parsed.OPENAI_REALTIME_MODEL,
  mcpServerUrl: parsed.NEXT_PUBLIC_MCP_SERVER_URL || 'http://localhost:8000/mcp',
  mcpGroupId: parsed.MCP_GROUP_ID || 'eva-conversations',
};

export function requireServerSecrets(keys: Array<keyof Pick<typeof config, 'openaiApiKey' | 'openaiRealtimeModel'>> = ['openaiApiKey', 'openaiRealtimeModel']) {
  const missing = keys.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required server env: ${missing.join(', ')}`);
  }
}
