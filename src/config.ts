import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const configSchema = z.object({
  // Telegram Bot API
  telegramBotToken: z.string().min(1),

  // Telegram MTProto
  telegramApiId: z.number().int().positive(),
  telegramApiHash: z.string().min(1),
  telegramSessionString: z.string().min(1),

  // LLM Provider
  openaiApiKey: z.string().optional(),
  anthropicApiKey: z.string().optional(),

  // Redis
  redisUrl: z.string().url(),

  // Optional
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  draftTtlMs: z.number().int().positive().default(30000),
  draftMinIntervalMs: z.number().int().positive().default(100),
  metricsPort: z.number().int().positive().default(9090),
  webPort: z.number().int().positive().default(3000),
});

export type Config = z.infer<typeof configSchema>;

function parseConfig(): Config {
  const raw = {
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    telegramApiId: process.env.TELEGRAM_API_ID ? parseInt(process.env.TELEGRAM_API_ID, 10) : undefined,
    telegramApiHash: process.env.TELEGRAM_API_HASH,
    telegramSessionString: process.env.TELEGRAM_SESSION_STRING,
    openaiApiKey: process.env.OPENAI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    redisUrl: process.env.REDIS_URL,
    logLevel: process.env.LOG_LEVEL,
    draftTtlMs: process.env.DRAFT_TTL_MS ? parseInt(process.env.DRAFT_TTL_MS, 10) : undefined,
    draftMinIntervalMs: process.env.DRAFT_MIN_INTERVAL_MS ? parseInt(process.env.DRAFT_MIN_INTERVAL_MS, 10) : undefined,
    metricsPort: process.env.METRICS_PORT ? parseInt(process.env.METRICS_PORT, 10) : undefined,
    webPort: process.env.WEB_PORT ? parseInt(process.env.WEB_PORT, 10) : undefined,
  };

  const result = configSchema.safeParse(raw);
  if (!result.success) {
    console.error('Invalid configuration:', result.error.format());
    process.exit(1);
  }

  return result.data;
}

export const config = parseConfig();
