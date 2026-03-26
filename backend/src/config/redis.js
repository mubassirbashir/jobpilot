import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

let redis = null;

export async function connectRedis() {
  try {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
    await redis.connect();
    logger.info('✅ Redis connected');
  } catch {
    logger.warn('⚠️  Redis not available — using in-memory queue');
    redis = null;
  }
}

export function getRedis() { return redis; }
