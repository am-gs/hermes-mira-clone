import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import { openaiStream } from './llm/openai.js';
import { anthropicStream } from './llm/anthropic.js';
import type { StreamEvent } from './llm/types.js';

export type LLMProvider = 'openai' | 'anthropic';

export interface StreamRouterOptions {
  provider: LLMProvider;
  messages: any[];
  system?: string;
  signal?: AbortSignal;
}

export async function* routeStream(opts: StreamRouterOptions): AsyncGenerator<StreamEvent> {
  const { provider, messages, system, signal } = opts;

  if (provider === 'openai') {
    if (!config.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }
    const client = new OpenAI({ apiKey: config.openaiApiKey });
    yield* openaiStream({ client, messages, signal });
  } else if (provider === 'anthropic') {
    if (!config.anthropicApiKey) {
      throw new Error('Anthropic API key not configured');
    }
    const client = new Anthropic({ apiKey: config.anthropicApiKey });
    yield* anthropicStream({ client, messages, system, signal });
  } else {
    throw new Error(`Unknown provider: ${provider}`);
  }
}

export function getDefaultProvider(): LLMProvider {
  if (config.anthropicApiKey) return 'anthropic';
  if (config.openaiApiKey) return 'openai';
  throw new Error('No LLM provider configured');
}
