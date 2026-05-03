type Bucket = {
  count: number;
  resetAt: number;
};

const store: Map<string, Bucket> =
  (globalThis as any).__alveoRateLimitStore || new Map<string, Bucket>();
(globalThis as any).__alveoRateLimitStore = store;

export function checkRateLimit(
  key: string,
  options: { windowMs: number; max: number },
): { allowed: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now();
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + options.windowMs });
    return {
      allowed: true,
      remaining: options.max - 1,
      retryAfterSec: Math.ceil(options.windowMs / 1000),
    };
  }

  if (current.count >= options.max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  store.set(key, current);
  return {
    allowed: true,
    remaining: options.max - current.count,
    retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}
