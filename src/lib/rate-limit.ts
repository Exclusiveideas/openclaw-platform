import { NextResponse } from "next/server";
import { redis } from "./redis";

type RateLimitResult =
  | { limited: false }
  | { limited: true; response: NextResponse };

export async function rateLimit(
  route: string,
  userId: string,
  maxRequests: number,
  windowSeconds: number = 60,
): Promise<RateLimitResult> {
  if (!redis) return { limited: false };

  const key = `ratelimit:${route}:${userId}`;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  try {
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(key, 0, now - windowMs);
    pipeline.zadd(key, now.toString(), `${now}:${Math.random()}`);
    pipeline.zcard(key);
    pipeline.expire(key, windowSeconds + 1);

    const results = await pipeline.exec();
    const count = results?.[2]?.[1] as number | undefined;

    if (count && count > maxRequests) {
      return {
        limited: true,
        response: NextResponse.json(
          { error: "Too many requests. Please try again later." },
          { status: 429 },
        ),
      };
    }
  } catch {
    // Redis failure — allow request through
  }

  return { limited: false };
}
