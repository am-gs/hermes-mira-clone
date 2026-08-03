import { ThinkingDrafter } from './telegram/thinkingDrafter.js';
import { AnswerDrafter } from './telegram/answerDrafter.js';
import { CancelToken } from './cancel.js';
import type { StreamEvent } from './llm/types.js';
import { logger } from '../obs/logger.js';

export interface TelegramLifecycleOpts {
  thinkDrafter: ThinkingDrafter;
  answerDrafter: AnswerDrafter;
  runLLM: (signal: AbortSignal) => AsyncIterable<StreamEvent>;
  onError: (e: unknown) => void;
  onCancel?: () => void;
}

export interface TurnHandle {
  cancel: () => void;
  done: Promise<void>;
}

export function startTelegramTurn(opts: TelegramLifecycleOpts): TurnHandle {
  const { thinkDrafter, answerDrafter } = opts;
  const ac = new AbortController();
  const cancelToken = new CancelToken();

  const unsubThink = cancelToken.onCancel(() => thinkDrafter.dispose());
  const unsubAnswer = cancelToken.onCancel(() => answerDrafter.dispose());

  const done = (async () => {
    thinkDrafter.apply({
      type: 'thinking_start',
      thinkingId: crypto.randomUUID(),
      t0: Date.now(),
    });

    const textBuf = { value: '' };
    const raf = { id: null as ReturnType<typeof setTimeout> | null };

    const flushText = () => {
      raf.id = null;
      if (!textBuf.value) return;
      const chunk = textBuf.value;
      textBuf.value = '';
      answerDrafter.push(chunk);
    };

    const pushText = (s: string) => {
      if (cancelToken.cancelled) return;
      textBuf.value += s;
      if (raf.id == null) raf.id = setTimeout(flushText, 30);
    };

    try {
      for await (const ev of opts.runLLM(ac.signal)) {
        if (cancelToken.cancelled) break;
        if (ev.type === 'text_delta') pushText(ev.delta);
        else thinkDrafter.apply(ev);
      }
      if (raf.id) clearTimeout(raf.id);
      flushText();
    } catch (e) {
      if (raf.id) clearTimeout(raf.id);
      flushText();
      if ((e as Error).name !== 'AbortError') opts.onError(e);
    } finally {
      unsubThink();
      unsubAnswer();
    }
  })();

  return {
    cancel: () => {
      ac.abort();
      cancelToken.cancel();
      opts.onCancel?.();
    },
    done,
  };
}
