import { redis, KEYS } from "@/lib/redis";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const RATE_LIMIT = 100; // requests
const WINDOW_SECONDS = 60; // per minute

/**
 * Returns true if the IP is within the rate limit, false if exceeded.
 */
export async function checkRateLimit(ip: string): Promise<boolean> {
  try {
    const key = KEYS.rateLimit(ip);
    const count = await redis.incr(key);
    if (count === 1) {
      // Set expiry on first request in window
      await redis.expire(key, WINDOW_SECONDS);
    }
    return count <= RATE_LIMIT;
  } catch {
    // If Redis is unavailable, allow the request (fail open)
    return true;
  }
}

/**
 * Middleware-style helper: returns a 429 response if rate limited, null if ok.
 * Usage:
 *   const limited = await rateLimitResponse(req);
 *   if (limited) return limited;
 */
export async function rateLimitResponse(req: NextRequest): Promise<NextResponse | null> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const allowed = await checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      {
        status: 429,
        headers: {
          "Retry-After": String(WINDOW_SECONDS),
          "X-RateLimit-Limit": String(RATE_LIMIT),
          "X-RateLimit-Window": `${WINDOW_SECONDS}s`,
        },
      }
    );
  }
  return null;
}
