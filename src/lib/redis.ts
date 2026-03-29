import Redis from 'ioredis';

const globalForRedis = global as unknown as { redis: Redis };

export const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Prevent multiple connections in development mode (Next.js hot reload)
export const redis = globalForRedis.redis || new Redis(redisUrl, {
  maxRetriesPerRequest: null, // Required by BullMQ
});

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;

export default redis;
