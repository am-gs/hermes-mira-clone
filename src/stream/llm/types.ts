export type TokenKind = 'thinking' | 'text' | 'tool_call' | 'tool_result';

export interface TokenEvent {
  kind: TokenKind;
  delta: string;
  thinkingId?: string;
  reasoningStep?: {
    index: number;
    label: string;
    status: 'active' | 'done';
  };
  toolName?: string;
  toolArgs?: unknown;
  toolCallId?: string;
}

export interface StreamHandle {
  cancel(): void;
  done: Promise<{ text: string; thinking: string; toolCalls: ToolCall[] }>;
}

export interface ToolCall {
  name: string;
  args: unknown;
  id: string;
}

export type StreamEvent =
  | { type: 'thinking_start'; thinkingId: string; t0: number }
  | { type: 'thinking_step'; thinkingId: string; index: number; label: string; status: 'active' | 'done' }
  | { type: 'thinking_delta'; thinkingId: string; delta: string }
  | { type: 'thinking_end'; thinkingId: string; tEnd: number }
  | { type: 'text_delta'; delta: string }
  | { type: 'text_end' };
