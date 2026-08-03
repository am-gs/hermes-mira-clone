'use client';

import { useEffect, useReducer, useRef, useState } from 'react';
import { ThinkingBlock, ThinkingStep } from './ThinkingBlock';

type StreamEvent =
  | { type: 'thinking_start'; thinkingId: string; t0: number }
  | { type: 'thinking_step'; thinkingId: string; index: number; label: string; status: 'active' | 'done' }
  | { type: 'thinking_delta'; thinkingId: string; delta: string }
  | { type: 'thinking_end'; thinkingId: string; tEnd: number }
  | { type: 'text_delta'; delta: string }
  | { type: 'text_end' };

interface ThinkingState {
  thinkingId: string | null;
  t0: number | null;
  tEnd: number | null;
  steps: ThinkingStep[];
  isStreaming: boolean;
}

const initialThinking: ThinkingState = {
  thinkingId: null,
  t0: null,
  tEnd: null,
  steps: [],
  isStreaming: false,
};

function reduceThinking(state: ThinkingState, e: StreamEvent): ThinkingState {
  switch (e.type) {
    case 'thinking_start':
      return {
        thinkingId: e.thinkingId,
        t0: e.t0,
        tEnd: null,
        steps: [],
        isStreaming: true,
      };
    case 'thinking_step': {
      const next = state.steps.map((s) =>
        s.status === 'active' ? { ...s, status: 'done' as const } : s
      );
      const i = next.findIndex((s) => s.index === e.index);
      if (i >= 0) {
        next[i] = { ...next[i], label: e.label, status: e.status };
      } else {
        next.push({ index: e.index, label: e.label, status: e.status, text: '' });
      }
      return { ...state, steps: next };
    }
    case 'thinking_delta': {
      return {
        ...state,
        steps: state.steps.map((s) =>
          s.status === 'active' ? { ...s, text: (s.text || '') + e.delta } : s
        ),
      };
    }
    case 'thinking_end':
      return {
        ...state,
        tEnd: e.tEnd,
        isStreaming: false,
        steps: state.steps.map((s) => ({ ...s, status: 'done' as const })),
      };
    default:
      return state;
  }
}

interface AssistantTurnProps {
  stream: AsyncIterable<StreamEvent>;
  onCancel?: () => void;
}

export function AssistantTurn({ stream, onCancel }: AssistantTurnProps) {
  const [thinking, dispatch] = useReducer(reduceThinking, initialThinking);
  const [text, setText] = useState('');
  const textBuf = useRef('');
  const raf = useRef<number | null>(null);

  const flushText = () => {
    raf.current = null;
    if (!textBuf.current) return;
    const chunk = textBuf.current;
    textBuf.current = '';
    setText((t) => t + chunk);
  };

  const pushText = (s: string) => {
    textBuf.current += s;
    if (raf.current == null) {
      raf.current = requestAnimationFrame(flushText);
    }
  };

  useEffect(() => {
    (async () => {
      for await (const e of stream) {
        if (e.type === 'text_delta') pushText(e.delta);
        else dispatch(e);
      }
      if (raf.current) cancelAnimationFrame(raf.current);
      flushText();
    })();

    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [stream]);

  return (
    <div className="message message-assistant">
      {thinking.thinkingId && (
        <ThinkingBlock
          thinkingId={thinking.thinkingId}
          t0={thinking.t0!}
          steps={thinking.steps}
          isStreaming={thinking.isStreaming}
          tEnd={thinking.tEnd}
        />
      )}
      <div className="message-content">
        {text || (thinking.isStreaming ? <span className="streaming-indicator" /> : null)}
      </div>
      {thinking.isStreaming && onCancel && (
        <button
          onClick={onCancel}
          className="mt-2 px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded"
        >
          Stop
        </button>
      )}
    </div>
  );
}
