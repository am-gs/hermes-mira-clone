import { parseFloodWait, isRetryable, isFatal } from '../../util/errors.js';

export class RetryingSender {
  private baseMinIntervalMs = 100;
  private currentMinIntervalMs = 100;
  private consecutiveFailures = 0;
  private maxConsecutiveFailures = 3;
  private totalFailures = 0;
  private onGiveUp?: () => void;

  constructor(
    private send: () => Promise<void>,
    private log: (e: unknown) => void,
  ) {}

  setGiveUpHook(fn: () => void) {
    this.onGiveUp = fn;
  }

  async runOnce(): Promise<'ok' | 'retry-later' | 'give-up'> {
    try {
      await this.send();
      this.consecutiveFailures = 0;
      this.currentMinIntervalMs = Math.max(
        this.baseMinIntervalMs,
        this.currentMinIntervalMs * 0.9
      );
      return 'ok';
    } catch (e) {
      this.consecutiveFailures += 1;
      this.totalFailures += 1;
      this.log(e);

      if (isFatal(e)) {
        this.onGiveUp?.();
        return 'give-up';
      }

      const wait = parseFloodWait(e);
      if (wait !== null) {
        await sleep((wait + 0.5) * 1000);
        this.currentMinIntervalMs = Math.max(this.currentMinIntervalMs, (wait + 1) * 100);
        return 'retry-later';
      }

      if (isRetryable(e) && this.consecutiveFailures < this.maxConsecutiveFailures) {
        const backoff = 250 * 2 ** (this.consecutiveFailures - 1);
        this.currentMinIntervalMs = Math.max(this.currentMinIntervalMs, backoff);
        await sleep(backoff);
        return 'retry-later';
      }

      this.onGiveUp?.();
      return 'give-up';
    }
  }

  get throttleMs(): number {
    return this.currentMinIntervalMs;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
