// Tiny in-process memoizer with a TTL. Used to keep the database from
// being hit on every request for things that change rarely (the writing
// course, the writing guide, tutorial lists). The first request after
// expiry refetches; everything in between is served from RAM and never
// touches the DB.
//
// Deliberately not Redis-based: Upstash credentials may not be set on
// the hosting plan, and a per-instance memory map is enough to flatten
// the request-multiplier effect (1 DB hit serves N concurrent visitors
// instead of N). Cache lives only for the lifetime of the process, so a
// fresh deploy starts cold; that is the intended behaviour.

type Entry<T> = { value: T; expiresAt: number };
const store = new Map<string, Entry<unknown>>();

export async function memoize<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && hit.expiresAt > now) return hit.value;
  const value = await fetcher();
  store.set(key, { value, expiresAt: now + ttlSeconds * 1000 });
  return value;
}

// Clear any cache entries whose key starts with `prefix`. Call this from
// admin writes (e.g. seeding lessons) so the next read picks up fresh
// data immediately instead of waiting for the TTL.
export function invalidate(prefix: string): void {
  for (const k of Array.from(store.keys())) {
    if (k.startsWith(prefix)) store.delete(k);
  }
}
