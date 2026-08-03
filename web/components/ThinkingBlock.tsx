'use client';

import { useEffect, useState } from 'react';

export interface ThinkingStep {
  index: number;
  label: string;
  status: 'active' | 'done';
  text?: string;
}

interface ThinkingBlockProps {
  thinkingId: string;
  t0: number;
  steps: ThinkingStep[];
  isStreaming: boolean;
  tEnd: number | null;
}

export function ThinkingBlock({
  thinkingId,
  t0,
  steps,
  isStreaming,
  tEnd,
}: ThinkingBlockProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      setElapsed(Date.now() - t0);
    }, 100);

    return () => clearInterval(interval);
  }, [isStreaming, t0]);

  useEffect(() => {
    if (tEnd) {
      setElapsed(tEnd - t0);
    }
  }, [tEnd, t0]);

  const activeStep = steps.find((s) => s.status === 'active');
  const allDone = steps.length > 0 && !activeStep && !isStreaming;

  const formatTime = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

  const header = isStreaming
    ? activeStep?.label || 'Thinking'
    : allDone
    ? `Thought for ${formatTime(elapsed)} · ${steps.length} ${steps.length === 1 ? 'step' : 'steps'}`
    : 'Thinking';

  return (
    <div className="thinking-block">
      <div className="thinking-header">
        <span className={isStreaming ? 'thinking-shimmer' : ''}>
          {header}
        </span>
        {isStreaming && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatTime(elapsed)}
          </span>
        )}
      </div>

      {steps.length > 0 && (
        <div className="thinking-steps">
          {steps.map((step) => (
            <div key={step.index} className="thinking-step">
              <div className="thinking-step-icon">
                {step.status === 'active' ? (
                  <svg
                    className="thinking-step-active animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="thinking-step-done"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <div>
                <div className="thinking-step-label">{step.label}</div>
                {step.text && (
                  <div className="thinking-step-text">{step.text}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
