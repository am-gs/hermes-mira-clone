import Redis from 'ioredis';
import { config } from '../config.js';

const redis = new Redis(config.redisUrl);

const RATE_LIMIT = {
  maxMessages: 5,
  windowMs: 10000,
};

export async function isRateLimited(userId: number): Promise<boolean> {
  const key = `ratelimit:${userId}`;
  const now = Date.now();
  const windowStart = now - RATE_LIMIT.windowMs;

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, 0, windowStart);
  pipeline.zadd(key, now, now);
  pipeline.zcard(key);
  pipeline.expire(key, Math.ceil(RATE_LIMIT.windowMs / 1000));

  const results = await pipeline.exec();
  if (!results) return false;

  const count = results[2]?.[1] as number;
  return count > RATE_LIMIT.maxMessages;
}
