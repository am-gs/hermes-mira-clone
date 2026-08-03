import { Api } from 'telegram';
import type { TelegramClient } from 'telegram';
import { randomLong } from '../../util/randomId.js';
import type { Step, StreamEvent } from '../llm/types.js';
import { RetryingSender } from './retryingSender.js';
import { logger } from '../../obs/logger.js';

export interface ThinkingDrafterOpts {
  client: TelegramClient;
  peer: Api.InputPeer;
  threadId?: number;
  minIntervalMs?: number;
  draftTtlMs?: number;
  onError?: (e: unknown) => void;
  onGiveUp?: () => void;
}

export class ThinkingDrafter {
  private randomId: bigint = randomLong();
  private thinkingId: string | null = null;
  private t0: number | null = null;
  private tEnd: number | null = null;
  private steps: Step[] = [];
  private isStreaming = false;
  private draftText = '';
  private lastSentAt = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private ttlTimer?: ReturnType<typeof setInterval>;
  private gaveUp = false;
  private committed = false;
  private retryer: RetryingSender;
  private replyToMsgId?: number;

  constructor(private opts: ThinkingDrafterOpts) {
    this.retryer = new RetryingSender(
      () => this.sendRaw(),
      (e) => logger.warn({ e }, 'thinking draft send failed'),
    );
    this.retryer.setGiveUpHook(() => {
      this.gaveUp = true;
      this.opts.onGiveUp?.();
    });
  }

  apply(ev: StreamEvent) {
    switch (ev.type) {
      case 'thinking_start':
        this.thinkingId = ev.thinkingId;
        this.t0 = ev.t0;
        this.isStreaming = true;
        this.steps = [];
        this.schedule(true);
        this.startTtlGuard();
        break;
      case 'thinking_step': {
        const next = this.steps.map((s) =>
          s.status === 'active' ? { ...s, status: 'done' as const } : s
        );
        const i = next.findIndex((s) => s.index === ev.index);
        if (i >= 0) next[i] = { ...next[i], label: ev.label, status: ev.status };
        else next.push({ index: ev.index, label: ev.label, status: ev.status, text: '' });
        this.steps = next;
        this.schedule();
        break;
      }
      case 'thinking_delta':
        this.steps = this.steps.map((s) =>
          s.status === 'active' ? { ...s, text: s.text + ev.delta } : s
        );
        this.schedule();
        break;
      case 'thinking_end':
        this.isStreaming = false;
        this.tEnd = ev.tEnd;
        this.steps = this.steps.map((s) => ({ ...s, status: 'done' as const }));
        this.schedule(true);
        this.stopTtlGuard();
        break;
    }
  }

  private render(): string {
    const elapsedMs = (this.isStreaming ? Date.now() : (this.tEnd ?? Date.now())) - (this.t0 ?? Date.now());
    const elapsedLabel = `${(elapsedMs / 1000).toFixed(1)}s`;

    const activeStep = this.steps.find((s) => s.status === 'active');
    const allDone = this.steps.length > 0 && !activeStep && !this.isStreaming;

    const header = this.isStreaming
      ? `💭 _Thinking${activeStep ? ` · ${activeStep.label}` : ''}_ · ${elapsedLabel}`
      : allDone
        ? `💭 _Thought for ${elapsedLabel} · ${this.steps.length} ${this.steps.length === 1 ? 'step' : 'steps'}_`
        : `💭 _Thinking_`;

    if (this.steps.length === 0) return header;

    const stepLines = this.steps.map((s) => {
      const mark = s.status === 'done' ? '✓' : '◐';
      const label = s.status === 'done'
        ? `~~${s.label}~~`
        : `*${s.label}*`;
      const body = s.text ? `\n   _${truncate(s.text, 140)}_` : '';
      return `${mark} ${label}${body}`;
    }).join('\n');

    return `${header}\n\n${stepLines}`;
  }

  private schedule(immediate = false) {
    if (this.committed || this.gaveUp) return;
    if (this.timer) return;
    const min = this.opts.minIntervalMs ?? 100;
    const wait = immediate ? 0 : Math.max(0, min - (Date.now() - this.lastSentAt));
    this.timer = setTimeout(() => this.send().catch((e) => this.opts.onError?.(e)), wait);
  }

  private async send() {
    this.timer = undefined;
    if (this.committed || this.gaveUp) return;
    const text = this.render();
    if (text === this.draftText) return;
    this.draftText = text;

    const result = await this.retryer.runOnce();
    if (result === 'ok') {
      this.lastSentAt = Date.now();
    }
  }

  private async sendRaw() {
    await this.opts.client.invoke(
      new Api.messages.SetTyping({
        peer: this.opts.peer,
        topMsgId: this.opts.threadId,
        action: new Api.SendMessageTextDraftAction({
          message: this.draftText,
          randomId: this.randomId,
        }),
      })
    );
  }

  private startTtlGuard() {
    const ttl = this.opts.draftTtlMs ?? 25000;
    this.ttlTimer = setInterval(() => {
      if (this.committed || !this.isStreaming) return;
      if (Date.now() - this.lastSentAt > ttl * 0.6) {
        this.send().catch(() => {});
      }
    }, ttl * 0.4);
  }

  private stopTtlGuard() {
    if (this.ttlTimer) clearInterval(this.ttlTimer);
  }

  async commit(opts: { stopped?: boolean } = {}): Promise<Api.Message | null> {
    this.committed = true;
    if (this.timer) clearTimeout(this.timer);
    this.stopTtlGuard();
    if (this.gaveUp) return null;

    try {
      const text = opts.stopped
        ? `⏹ _Stopped_\n\n${this.draftText.replace(/^💭 _Thinking.*?_/, `💭 _Stopped_`)}`
        : this.draftText;

      return await this.opts.client.sendMessage(this.opts.peer, {
        message: text,
        replyTo: this.replyToMsgId,
      });
    } catch (e) {
      this.opts.onError?.(e);
      return null;
    }
  }

  dispose() {
    if (this.timer) clearTimeout(this.timer);
    this.stopTtlGuard();
  }
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
