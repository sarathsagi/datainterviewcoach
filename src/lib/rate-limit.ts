/**
 * Simple in-memory rate limiter for auth endpoints.
 * Tracks attempts by IP address with a sliding window.
 *
 * Note: For multi-instance deployments, replace with Redis-based rate limiting.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  login: { maxAttempts: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 min
  signup: { maxAttempts: 3, windowMs: 60 * 60 * 1000 }, // 3 signups per hour
  "forgot-password": { maxAttempts: 3, windowMs: 15 * 60 * 1000 }, // 3 resets per 15 min
};

export function checkRateLimit(
  ip: string,
  action: keyof typeof RATE_LIMIT_CONFIGS
): { allowed: boolean; retryAfterSeconds: number } {
  const config = RATE_LIMIT_CONFIGS[action];
  if (!config) return { allowed: true, retryAfterSeconds: 0 };

  const key = `${action}:${ip}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetTime < now) {
    rateLimitStore.set(key, { count: 1, resetTime: now + config.windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (entry.count >= config.maxAttempts) {
    const retryAfterSeconds = Math.ceil((entry.resetTime - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  entry.count++;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
