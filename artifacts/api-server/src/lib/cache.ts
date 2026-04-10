// ---------------------------------------------------------------------------
// cache.ts — Thin Redis caching layer using Upstash
//
// When UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set the cache
// is live.  Otherwise every method is a silent no-op so the app works
// identically without Redis during local development.
//
// Usage:
//   import { cache } from "./lib/cache";
//   const books = await cache.getOrSet("public:books", 120, () => storage.getPublishedBooks());
// ---------------------------------------------------------------------------

import { Redis } from "@upstash/redis";
import { logger } from "./logger";

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis =
  REDIS_URL && REDIS_TOKEN
    ? new Redis({ url: REDIS_URL, token: REDIS_TOKEN })
    : null;

if (redis) {
  logger.info("Redis cache enabled (Upstash)");
} else {
  logger.info("Redis cache disabled — set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to enable");
}

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

/**
 * Fetch from cache or execute `fetcher`, caching the result for `ttlSeconds`.
 *
 * This is the primary method you should use.  It guarantees:
 *   - If Redis is unavailable the fetcher is always called (zero downtime).
 *   - Serialization round-trips through JSON so Dates become strings — same
 *     as what Express sends to the client anyway.
 */
async function getOrSet<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  if (!redis) return fetcher();

  try {
    const cached = await redis.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }
  } catch (err) {
    logger.warn({ err }, `cache GET failed for key=${key}, falling through to DB`);
  }

  const fresh = await fetcher();

  // Fire-and-forget — don't block the response on the SET
  if (redis) {
    redis.set(key, JSON.stringify(fresh), { ex: ttlSeconds }).catch((err) => {
      logger.warn({ err }, `cache SET failed for key=${key}`);
    });
  }

  return fresh;
}

/** Remove a specific key (e.g. after a publish/unpublish mutation). */
async function invalidate(key: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(key);
  } catch (err) {
    logger.warn({ err }, `cache DEL failed for key=${key}`);
  }
}

/** Remove all keys matching a prefix (e.g. "public:books*"). */
async function invalidatePrefix(prefix: string): Promise<void> {
  if (!redis) return;
  try {
    let cursor = "0";
    do {
      const result = await redis.scan(cursor, {
        match: `${prefix}*`,
        count: 100,
      });
      cursor = String(result[0]);
      const keys = result[1] as string[];
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== "0");
  } catch (err) {
    logger.warn({ err }, `cache prefix invalidation failed for prefix=${prefix}`);
  }
}

export const cache = { getOrSet, invalidate, invalidatePrefix };
