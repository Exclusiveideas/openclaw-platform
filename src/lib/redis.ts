import Redis from "ioredis";

function createRedisClient(): Redis | null {
  const host = process.env.REDIS_HOST;
  const port = process.env.REDIS_PORT;

  if (!host) {
    console.warn("REDIS_HOST not set — rate limiting disabled");
    return null;
  }

  const client = new Redis({
    host,
    port: port ? parseInt(port, 10) : 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    keyPrefix: "openclaw:",
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 200, 2000);
    },
  });

  client.on("error", (err) => {
    console.error("Redis connection error:", err.message);
  });

  client.connect().catch(() => {
    console.warn("Redis connection failed — rate limiting degraded");
  });

  return client;
}

const globalForRedis = globalThis as unknown as {
  redis: Redis | null | undefined;
};

export const redis: Redis | null =
  globalForRedis.redis !== undefined
    ? globalForRedis.redis
    : (globalForRedis.redis = createRedisClient());
