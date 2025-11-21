import { z } from 'zod';

const envSchema = z.object({
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_REALTIME_MODEL: z.string().optional(),
});

const parsed = envSchema.parse(process.env);

export const config = {
  openaiApiKey: parsed.OPENAI_API_KEY,
  openaiRealtimeModel: parsed.OPENAI_REALTIME_MODEL,
};

export function requireServerSecrets(keys: Array<keyof Pick<typeof config, 'openaiApiKey' | 'openaiRealtimeModel'>> = ['openaiApiKey', 'openaiRealtimeModel']) {
  const missing = keys.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required server env: ${missing.join(', ')}`);
  }
}
