import Anthropic from '@anthropic-ai/sdk';
import type { StreamEvent } from './types.js';

export interface AnthropicStreamOptions {
  client: Anthropic;
  messages: Anthropic.MessageParam[];
  system?: string;
  model?: string;
  thinking?: { budgetTokens: number };
  signal?: AbortSignal;
}

export async function* anthropicStream(opts: AnthropicStreamOptions): AsyncGenerator<StreamEvent> {
  const { client, messages, system, model = 'claude-3-5-sonnet-20241022', thinking, signal } = opts;

  const stream = client.messages.stream({
    model,
    max_tokens: 8192,
    system,
    messages,
    thinking,
  }, { signal });

  let thinkingId: string | null = null;
  let stepCounter = 0;
  let currentBlockType: 'thinking' | 'text' | null = null;

  for await (const event of stream) {
    if (event.type === 'content_block_start') {
      const block = event.content_block;
      if (block.type === 'thinking') {
        if (!thinkingId) {
          thinkingId = crypto.randomUUID();
          yield {
            type: 'thinking_start',
            thinkingId,
            t0: Date.now(),
          };
        }
        stepCounter++;
        yield {
          type: 'thinking_step',
          thinkingId,
          index: stepCounter,
          label: labelForBlock(block),
          status: 'active',
        };
        currentBlockType = 'thinking';
      } else if (block.type === 'text') {
        if (thinkingId) {
          yield {
            type: 'thinking_end',
            thinkingId,
            tEnd: Date.now(),
          };
          thinkingId = null;
        }
        currentBlockType = 'text';
      }
    }

    if (event.type === 'content_block_delta') {
      if (event.delta.type === 'thinking_delta' && thinkingId) {
        yield {
          type: 'thinking_delta',
          thinkingId,
          delta: event.delta.thinking,
        };
      } else if (event.delta.type === 'text_delta') {
        yield {
          type: 'text_delta',
          delta: event.delta.text,
        };
      }
    }

    if (event.type === 'content_block_stop') {
      if (currentBlockType === 'thinking' && thinkingId) {
        // Mark current step as done
        yield {
          type: 'thinking_step',
          thinkingId,
          index: stepCounter,
          label: '',
          status: 'done',
        };
      }
      currentBlockType = null;
    }
  }

  if (thinkingId) {
    yield {
      type: 'thinking_end',
      thinkingId,
      tEnd: Date.now(),
    };
  }

  yield { type: 'text_end' };
}

function labelForBlock(block: any): string {
  if (block.tool_use?.name === 'web_search') return 'Searching the web';
  if (block.tool_use?.name === 'code_exec') return 'Running code';
  if (block.tool_use?.name === 'read_file') return 'Reading file';
  if (block.tool_use?.name === 'calculator') return 'Working through the math';
  return 'Analyzing the request';
}
