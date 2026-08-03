import { Bot } from 'grammy';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { config } from '../config.js';
import { logger } from '../obs/logger.js';

export interface BotContext {
  bot: Bot;
  mtproto: TelegramClient;
}

export async function createBot(): Promise<BotContext> {
  // Create grammY bot
  const bot = new Bot(config.telegramBotToken);

  // Create MTProto client for live drafts
  const session = new StringSession(config.telegramSessionString);
  const mtproto = new TelegramClient(session, config.telegramApiId, config.telegramApiHash, {
    connectionRetries: 5,
    useWSS: false,
  });

  await mtproto.connect();
  logger.info('MTProto client connected');

  // Attach MTProto client to bot context
  bot.api.config.use((prev, method, payload) => {
    return prev(method, {
      ...payload,
      mtproto,
    });
  });

  return { bot, mtproto };
}
