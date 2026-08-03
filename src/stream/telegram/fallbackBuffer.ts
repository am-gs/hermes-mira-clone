import { Api } from 'telegram';
import type { TelegramClient } from 'telegram';
import { logger } from '../../obs/logger.js';

export class FallbackBuffer {
  private buf = '';
  private timer?: ReturnType<typeof setTimeout>;
  private lastSent = '';

  constructor(
    private client: TelegramClient,
    private peer: Api.InputPeer,
    private threadId?: number,
    private flushIntervalMs = 1000,
    private onSent?: (msg: Api.Message) => void,
  ) {}

  push(delta: string) {
    this.buf += delta;
    if (this.timer) return;
    this.timer = setTimeout(() => this.flush(), this.flushIntervalMs);
  }

  private async flush() {
    this.timer = undefined;
    if (!this.buf || this.buf === this.lastSent) return;
    this.lastSent = this.buf;

    try {
      const msg = await this.client.sendMessage(this.peer, {
        message: this.buf,
      });
      this.onSent?.(msg);
    } catch (e) {
      logger.error({ e }, 'fallback sendMessage failed');
    }
  }

  async commit() {
    if (this.timer) clearTimeout(this.timer);
    if (this.buf && this.buf !== this.lastSent) {
      await this.flush();
    }
  }
}
