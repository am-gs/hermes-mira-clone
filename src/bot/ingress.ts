import type { Bot } from 'grammy';
import { handleTextMessage } from './handlers/text.js';
import { handleStopCallback } from './handlers/stop.js';
import { logger } from '../obs/logger.js';

export function registerHandlers(bot: Bot) {
  // Text message handler
  bot.on('message:text', async (ctx) => {
    try {
      await handleTextMessage(ctx);
    } catch (e) {
      logger.error({ e, chatId: ctx.chat.id, userId: ctx.from?.id }, 'text handler error');
      await ctx.reply('Sorry, something went wrong. Please try again.');
    }
  });

  // Stop button handler
  bot.on('callback_query:data', async (ctx) => {
    if (ctx.callbackQuery.data === 'stop') {
      try {
        await handleStopCallback(ctx);
      } catch (e) {
        logger.error({ e, userId: ctx.from?.id }, 'stop handler error');
      }
    }
  });

  // Start command
  bot.command('start', async (ctx) => {
    await ctx.reply('👋 Hello! I\'m your AI assistant. Send me a message and I\'ll respond with live streaming.');
  });

  // Help command
  bot.command('help', async (ctx) => {
    await ctx.reply(`
🤖 *Hermes Mira Clone*

Send me any message and I'll respond with:
• Live streaming text
• Real-time thinking blocks
• Stop button to cancel

Commands:
/start - Start the bot
/help - Show this help
    `, { parse_mode: 'Markdown' });
  });

  logger.info('Bot handlers registered');
}
