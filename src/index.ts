#!/usr/bin/env node
import { config } from './config.js';
import { logger } from './obs/logger.js';
import { createBot } from './bot/client.js';
import { registerHandlers } from './bot/ingress.js';
import { metricsServer } from './obs/metrics.js';

async function main() {
  logger.info({ config }, 'Starting Hermes Mira Clone');

  const bot = await createBot();
  registerHandlers(bot);

  // Start metrics server
  metricsServer.listen(config.metricsPort, () => {
    logger.info({ port: config.metricsPort }, 'Metrics server listening');
  });

  // Start bot
  await bot.start();
  logger.info('Bot started successfully');

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down gracefully');
    await bot.stop();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  logger.error({ error }, 'Fatal error');
  process.exit(1);
});
