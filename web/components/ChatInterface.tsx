'use client';

import { useState } from 'react';
import { AssistantTurn } from './AssistantTurn';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  stream?: AsyncIterable<any>;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // TODO: Replace with actual API call to your backend
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      // Create a mock stream for demonstration
      const mockStream = createMockStream();

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        stream: mockStream,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="space-y-4 mb-4">
        {messages.map((msg) =>
          msg.role === 'user' ? (
            <div key={msg.id} className="message message-user">
              <div className="message-content">{msg.content}</div>
            </div>
          ) : (
            <AssistantTurn
              key={msg.id}
              stream={msg.stream || (async function* () {})()}
            />
          )
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading}
          className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}

// Mock stream for demonstration
function createMockStream(): AsyncIterable<any> {
  return (async function* () {
    const thinkingId = crypto.randomUUID();
    const t0 = Date.now();

    yield { type: 'thinking_start', thinkingId, t0 };

    yield {
      type: 'thinking_step',
      thinkingId,
      index: 1,
      label: 'Analyzing the request',
      status: 'active',
    };

    await sleep(500);
    yield {
      type: 'thinking_delta',
      thinkingId,
      delta: 'Processing user input...',
    };

    await sleep(500);
    yield {
      type: 'thinking_step',
      thinkingId,
      index: 2,
      label: 'Generating response',
      status: 'active',
    };

    await sleep(500);
    yield {
      type: 'thinking_delta',
      thinkingId,
      delta: 'Formulating answer...',
    };

    await sleep(500);
    yield { type: 'thinking_end', thinkingId, tEnd: Date.now() };

    const response = 'This is a mock response from the assistant. In a real implementation, this would stream from your backend API.';
    for (const char of response) {
      yield { type: 'text_delta', delta: char };
      await sleep(20);
    }

    yield { type: 'text_end' };
  })();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
