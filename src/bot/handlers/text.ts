import type { Context } from 'grammy';
import { Api } from 'telegram';
import { ThinkingDrafter } from '../../stream/telegram/thinkingDrafter.js';
import { AnswerDrafter } from '../../stream/telegram/answerDrafter.js';
import { startTelegramTurn } from '../../stream/lifecycle.telegram.js';
import { routeStream, getDefaultProvider } from '../../stream/router.js';
import { activeTurns } from './stop.js';
import { logger } from '../../obs/logger.js';
import { metrics } from '../../obs/metrics.js';
import { isRateLimited } from '../rateLimit.js';

export async function handleTextMessage(ctx: Context) {
  const userId = ctx.from?.id;
  const chatId = ctx.chat.id;
  const threadId = ctx.msg?.message_thread_id;

  if (!userId) return;

  // Check rate limit
  if (await isRateLimited(userId)) {
    await ctx.reply('Slow down a bit 🙂');
    return;
  }

  // Check if user already has an active turn
  if (activeTurns.has(userId)) {
    await ctx.reply('Already working on a request. Hit Stop first.');
    return;
  }

  // Send typing indicator
  await ctx.replyWithChatAction('typing');

  // Get MTProto client from context
  const mtproto = (ctx.api as any).mtproto;
  if (!mtproto) {
    throw new Error('MTProto client not available');
  }

  // Resolve peer
  const peer = await mtproto.getInputPeer(chatId.toString());

  // Create drafters
  const thinkDrafter = new ThinkingDrafter({
    client: mtproto,
    peer,
    threadId,
    onError: (e) => logger.warn({ e, userId }, 'thinking draft failed'),
  });
  const answerDrafter = new AnswerDrafter(mtproto, peer, threadId);

  // Build messages for LLM
  const messages = [
    { role: 'user', content: ctx.msg.text },
  ];

  // Start the turn
  const handle = startTelegramTurn({
    thinkDrafter,
    answerDrafter,
    runLLM: (signal) => routeStream({
      provider: getDefaultProvider(),
      messages,
      signal,
    }),
    onError: (e) => logger.error({ e, userId }, 'LLM stream error'),
    onCancel: () => {
      metrics.turnCancelled.inc();
    },
  });

  // Register active turn
  activeTurns.set(userId, handle);

  // Send stop button
  const stopMsg = await ctx.reply('⏹ _Stop_', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        { text: '⏹ Stop', callback_data: 'stop' },
      ]],
    },
  });

  // Wait for completion
  await handle.done;

  // Commit both drafters
  await Promise.all([
    thinkDrafter.commit(),
    answerDrafter.commit(),
  ]);

  // Remove stop button
  try {
    await ctx.api.editMessageReplyMarkup(chatId, stopMsg.message_id, {
      reply_markup: { inline_keyboard: [] },
    });
  } catch {
    // Message may be too old
  }

  // Clean up
  activeTurns.delete(userId);

  metrics.turnCompleted.inc();
}
