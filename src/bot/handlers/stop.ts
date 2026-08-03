import type { Context } from 'grammy';
import type { TurnHandle } from '../../stream/lifecycle.telegram.js';
import { logger } from '../../obs/logger.js';

export const activeTurns = new Map<number, TurnHandle>();

export async function handleStopCallback(ctx: Context) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const handle = activeTurns.get(userId);
  if (handle) {
    handle.cancel();
    await ctx.answerCbQuery('Stopped', { show_alert: false });
    logger.info({ userId }, 'Turn cancelled by user');
  } else {
    await ctx.answerCbQuery('Nothing running', { show_alert: false });
  }

  // Remove the stop keyboard
  try {
    await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } });
  } catch {
    // Message may be too old
  }
}
