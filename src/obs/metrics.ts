import { Registry, Counter, Histogram, collectDefaultMetrics } from 'prom-client';
import { createServer } from 'http';

export const register = new Registry();
collectDefaultMetrics({ register });

export const metrics = {
  turnCompleted: new Counter({
    name: 'turn_completed_total',
    help: 'Total number of completed turns',
    registers: [register],
  }),
  turnCancelled: new Counter({
    name: 'turn_cancelled_total',
    help: 'Total number of cancelled turns',
    registers: [register],
  }),
  firstPaintMs: new Histogram({
    name: 'stream_first_paint_ms',
    help: 'Time from user message to first draft',
    buckets: [50, 100, 200, 500, 1000, 2000],
    registers: [register],
  }),
  commitMs: new Histogram({
    name: 'stream_commit_ms',
    help: 'Time from user message to final commit',
    buckets: [1000, 2000, 5000, 10000, 20000, 30000],
    registers: [register],
  }),
  draftSendErrors: new Counter({
    name: 'draft_send_errors_total',
    help: 'Total number of draft send failures',
    registers: [register],
  }),
  draftExpiredFallbacks: new Counter({
    name: 'draft_expired_fallbacks_total',
    help: 'Total number of TTL expirations',
    registers: [register],
  }),
  tokensStreamed: new Counter({
    name: 'tokens_streamed_total',
    help: 'Total tokens streamed',
    registers: [register],
  }),
};

export const metricsServer = createServer(async (req, res) => {
  if (req.url === '/metrics') {
    res.setHeader('Content-Type', register.contentType);
    res.end(await register.metrics());
  } else {
    res.statusCode = 404;
    res.end('Not found');
  }
});
