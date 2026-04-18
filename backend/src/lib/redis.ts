import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redis: Redis | undefined };

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

// ── Cache helpers ──────────────────────────────────────────────────────

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const val = await redis.get(key);
    return val ? (JSON.parse(val) as T) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 86400) {
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // Silent failure — cache is best-effort
  }
}

export async function cacheDel(key: string) {
  try {
    await redis.del(key);
  } catch {}
}

export const KEYS = {
  aiRecs: (userId: string) => `ai:recs:${userId}`,
  mlRecs: (userId: string, query: string) => `ml:recs:${userId}:${Buffer.from(query).toString("base64")}`,
  rateLimit: (ip: string) => `rl:${ip}`,
};
