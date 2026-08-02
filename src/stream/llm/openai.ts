import OpenAI from 'openai';
import type { StreamEvent } from './types.js';

export interface OpenAIStreamOptions {
  client: OpenAI;
  messages: OpenAI.ChatCompletionMessageParam[];
  model?: string;
  signal?: AbortSignal;
}

export async function* openaiStream(opts: OpenAIStreamOptions): AsyncGenerator<StreamEvent> {
  const { client, messages, model = 'gpt-4o', signal } = opts;

  const stream = await client.chat.completions.create({
    model,
    messages,
    stream: true,
  }, { signal });

  let thinkingId: string | null = null;
  let stepCounter = 0;

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta;
    if (!delta) continue;

    // Handle thinking content (if model supports it)
    if ('reasoning' in delta && delta.reasoning) {
      if (!thinkingId) {
        thinkingId = crypto.randomUUID();
        yield {
          type: 'thinking_start',
          thinkingId,
          t0: Date.now(),
        };
        stepCounter++;
        yield {
          type: 'thinking_step',
          thinkingId,
          index: stepCounter,
          label: 'Analyzing the request',
          status: 'active',
        };
      }
      yield {
        type: 'thinking_delta',
        thinkingId,
        delta: delta.reasoning,
      };
    }

    // Handle text content
    if (delta.content) {
      if (thinkingId) {
        yield {
          type: 'thinking_end',
          thinkingId,
          tEnd: Date.now(),
        };
        thinkingId = null;
      }
      yield {
        type: 'text_delta',
        delta: delta.content,
      };
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
