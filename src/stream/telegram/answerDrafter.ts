import { Api } from 'telegram';
import type { TelegramClient } from 'telegram';
import { randomLong } from '../../util/randomId.js';
import { logger } from '../../obs/logger.js';

export class AnswerDrafter {
  private randomId = randomLong();
  private text = '';
  private lastSentAt = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private committed = false;

  constructor(
    private client: TelegramClient,
    private peer: Api.InputPeer,
    private threadId?: number,
    private minIntervalMs = 50,
  ) {}

  push(delta: string) {
    if (this.committed) return;
    this.text += delta;
    if (this.timer) return;
    const wait = Math.max(0, this.minIntervalMs - (Date.now() - this.lastSentAt));
    this.timer = setTimeout(() => this.send(), wait);
  }

  private async send() {
    this.timer = undefined;
    if (this.committed) return;
    try {
      await this.client.invoke(
        new Api.messages.SetTyping({
          peer: this.peer,
          topMsgId: this.threadId,
          action: new Api.SendMessageTextDraftAction({
            message: this.text,
            randomId: this.randomId,
          }),
        })
      );
      this.lastSentAt = Date.now();
    } catch (e) {
      logger.warn({ e }, 'answer draft send failed');
    }
  }

  async commit(): Promise<Api.Message | null> {
    this.committed = true;
    if (this.timer) clearTimeout(this.timer);
    if (!this.text) return null;

    try {
      return await this.client.sendMessage(this.peer, {
        message: this.text,
      });
    } catch (e) {
      logger.error({ e }, 'answer commit failed');
      return null;
    }
  }

  dispose() {
    if (this.timer) clearTimeout(this.timer);
  }
}
