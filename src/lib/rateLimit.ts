// Simple in-memory rate limiter (token bucket)
const buckets = new Map<string, { tokens: number; lastRefill: number }>();

interface RateLimitConfig {
  maxTokens: number;
  refillRate: number; // tokens per second
  windowMs: number;
}

const configs: Record<string, RateLimitConfig> = {
  translate: { maxTokens: 30, refillRate: 0.5, windowMs: 60000 },
  stt: { maxTokens: 10, refillRate: 0.17, windowMs: 60000 },
  tts: { maxTokens: 20, refillRate: 0.33, windowMs: 60000 },
  interview: { maxTokens: 12, refillRate: 0.15, windowMs: 60000 },
  summarize: { maxTokens: 8, refillRate: 0.1, windowMs: 60000 },
};

export function checkRateLimit(
  ip: string,
  endpoint: string
): { allowed: boolean; retryAfter?: number } {
  const config = configs[endpoint] || configs.translate;
  const key = `${ip}:${endpoint}`;
  const now = Date.now();

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { tokens: config.maxTokens, lastRefill: now };
    buckets.set(key, bucket);
  }

  // Refill tokens
  const elapsed = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(config.maxTokens, bucket.tokens + elapsed * config.refillRate);
  bucket.lastRefill = now;

  if (bucket.tokens < 1) {
    const retryAfter = Math.ceil((1 - bucket.tokens) / config.refillRate);
    return { allowed: false, retryAfter };
  }

  bucket.tokens -= 1;
  return { allowed: true };
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (now - bucket.lastRefill > 300000) {
      buckets.delete(key);
    }
  }
}, 60000);

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}
