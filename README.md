# Hermes Mira Clone

Production-ready 1:1 Mira clone for Hermes Agent — Telegram bot with MTProto live drafts, thinking blocks, streaming UI, and web companion.

## Features

- **Live streaming responses** via Telegram's native `sendMessageTextDraftAction` API
- **Thinking blocks** with real-time reasoning steps, shimmer animations, and live timer
- **Two-bubble pattern** — separate drafts for thinking and answer text
- **Web companion** — React 19 + Server Components with identical UX
- **Production-ready** — flood-wait handling, TTL guards, graceful shutdown, metrics
- **Stop button** — cancel in-flight requests across all layers
- **Forum topic support** — works in Telegram groups with topics
- **Accessibility** — ARIA live regions, reduced-motion support, screen reader announcements

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          TELEGRAM (MTProto)                         │
│   sendMessageTextDraftAction / sendMessageTextDraft (rich)         │
└───────────────▲──────────────────────────▲──────────────────────────┘
                │                          │
        streaming updates           final commit (sendMessage)
                │                          │
┌───────────────┴──────────────────────────┴──────────────────────────┐
│                       Hermes Bot Service                            │
│  ┌──────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────┐ │
│  │ Ingress  │──▶│ Stream Router│──▶│   LLM Driver │──▶│  Drafter │ │
│  └──────────┘   └──────────────┘   └──────────────┘   └──────────┘ │
│       │              │                   │                │        │
│       ▼              ▼                   ▼                ▼        │
│  [rate limit]   [thread ctx]     [OpenAI/Anthropic]   [MTProto]   │
└─────────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 20+
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))
- Telegram API credentials (from [my.telegram.org](https://my.telegram.org))
- OpenAI or Anthropic API key
- Redis (for rate limiting and session storage)

### 1. Clone and install

```bash
git clone https://github.com/am-gs/hermes-mira-clone.git
cd hermes-mira-clone
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Telegram Bot API
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Telegram MTProto (for live drafts)
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
TELEGRAM_SESSION_STRING=your_session_string

# LLM Provider (choose one)
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key

# Redis
REDIS_URL=redis://localhost:6379

# Optional
LOG_LEVEL=info
DRAFT_TTL_MS=30000
DRAFT_MIN_INTERVAL_MS=100
```

### 3. Get Telegram session string

You need a MTProto session string for live drafts. Run:

```bash
pnpm ts-node scripts/get-session.ts
```

Follow the prompts to authenticate and copy the session string to `.env`.

### 4. Start the bot

```bash
pnpm dev
```

The bot will start and listen for messages. Send `/start` to your bot in Telegram.

## Deployment

### Docker (recommended)

```bash
docker-compose up -d
```

### Manual

```bash
pnpm build
pnpm start
```

### Systemd

```bash
sudo cp deploy/systemd/hermes-bot.service /etc/systemd/system/
sudo systemctl enable hermes-bot
sudo systemctl start hermes-bot
```

## Web Companion (Optional)

The web companion provides the same UX in a browser:

```bash
cd web
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Configuration

### Thinking Block Behavior

The thinking block shows real-time reasoning steps. Configure in `src/config.ts`:

```typescript
export const config = {
  thinking: {
    autoCollapseDelayMs: 800,  // Collapse after streaming ends
    timerTickMs: 100,          // Timer update frequency
    maxStepTextLength: 140,    // Truncate long step text
  },
  streaming: {
    minIntervalMs: 100,        // Minimum time between draft updates
    ttlGuardIntervalMs: 10000, // Refresh draft before TTL expires
  },
};
```

### Rate Limiting

Per-user rate limiting is configured in `src/bot/rateLimit.ts`:

```typescript
const RATE_LIMIT = {
  maxMessages: 5,
  windowMs: 10000,
};
```

### LLM Provider

Switch between OpenAI and Anthropic in `src/stream/router.ts`:

```typescript
export function getLLMDriver(provider: 'openai' | 'anthropic') {
  return provider === 'openai' ? openaiStream : anthropicStream;
}
```

## Development

### Project Structure

```
hermes-mira-clone/
├── src/
│   ├── index.ts                 # Entry point
│   ├── bot/
│   │   ├── client.ts            # grammY + MTProto init
│   │   ├── ingress.ts           # Message handlers
│   │   ├── handlers/
│   │   │   ├── text.ts          # Text message handler
│   │   │   └── stop.ts          # Stop button handler
│   │   └── middlewares.ts       # Auth, logging, error wrap
│   ├── stream/
│   │   ├── router.ts            # Picks model, builds prompt
│   │   ├── llm/
│   │   │   ├── types.ts         # StreamEvent types
│   │   │   ├── openai.ts        # OpenAI streaming driver
│   │   │   └── anthropic.ts     # Anthropic streaming driver
│   │   ├── telegram/
│   │   │   ├── thinkingDrafter.ts  # Thinking block drafter
│   │   │   ├── answerDrafter.ts    # Answer text drafter
│   │   │   ├── retryingSender.ts   # Flood-wait handling
│   │   │   └── fallbackBuffer.ts   # Fallback to sendMessage
│   │   ├── lifecycle.telegram.ts   # Orchestrator
│   │   └── cancel.ts               # Cancel token
│   ├── ui/
│   │   ├── richMessage.ts       # Build InputRichMessage AST
│   │   └── markdown.ts          # Markdown parser
│   ├── obs/
│   │   ├── logger.ts            # Structured logging
│   │   └── metrics.ts           # Prometheus metrics
│   └── util/
│       ├── randomId.ts          # Generate random IDs
│       └── errors.ts            # Error parsing
├── web/                         # React 19 web companion
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   └── components/
│       ├── ThinkingBlock.tsx
│       ├── AssistantTurn.tsx
│       └── MessageStream.tsx
├── scripts/
│   └── get-session.ts           # Get Telegram session string
├── deploy/
│   ├── docker-compose.yml
│   └── systemd/
│       └── hermes-bot.service
├── package.json
├── tsconfig.json
└── .env.example
```

### Testing

```bash
pnpm test
```

### Linting

```bash
pnpm lint
```

## Troubleshooting

### Drafts not appearing

- Check `TELEGRAM_SESSION_STRING` is valid
- Verify `TELEGRAM_API_ID` and `TELEGRAM_API_HASH` are correct
- Check logs for `FLOOD_WAIT` errors

### Thinking block not collapsing

- Ensure `thinking_end` event is emitted by the LLM driver
- Check `autoCollapseDelayMs` in config

### Stop button not working

- Verify callback handler is registered
- Check `activeTurns` map is being populated
- Ensure `AbortController` is being passed to LLM driver

### Web companion not streaming

- Check SSE endpoint is configured
- Verify React Server Components are enabled
- Check browser console for errors

## Metrics

The bot exposes Prometheus metrics at `/metrics`:

- `stream_first_paint_ms` — Time from user message to first draft
- `stream_commit_ms` — Time from user message to final commit
- `draft_send_errors_total` — Number of draft send failures
- `draft_expired_fallbacks_total` — Number of TTL expirations
- `tokens_streamed_total` — Total tokens streamed

## License

MIT

## Contributing

Pull requests welcome. For major changes, open an issue first.

## Credits

Built as a 1:1 clone of [Mira](https://t.me/mira) by the Hermes Agent team.
