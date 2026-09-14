/**
 * High-Performance In-Memory Sliding Window Rate Limiter
 * Provides IP-based and key-based rate limiting for sensitive endpoints and general API traffic.
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in seconds
  retryAfter: number; // Seconds until window reset
}

export class SlidingWindowRateLimiter {
  private store = new Map<string, RateLimitRecord>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    public readonly limit: number,
    public readonly windowMs: number
  ) {
    // Periodically clean up expired keys every 2 minutes
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 2 * 60 * 1000);
      if (this.cleanupInterval.unref) {
        this.cleanupInterval.unref();
      }
    }
  }

  public check(key: string): RateLimitResult {
    const now = Date.now();
    const record = this.store.get(key);

    if (!record || now >= record.resetTime) {
      const resetTime = now + this.windowMs;
      this.store.set(key, { count: 1, resetTime });
      return {
        success: true,
        limit: this.limit,
        remaining: this.limit - 1,
        reset: Math.ceil(resetTime / 1000),
        retryAfter: 0,
      };
    }

    if (record.count >= this.limit) {
      const retryAfter = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
      return {
        success: false,
        limit: this.limit,
        remaining: 0,
        reset: Math.ceil(record.resetTime / 1000),
        retryAfter,
      };
    }

    record.count += 1;
    return {
      success: true,
      limit: this.limit,
      remaining: Math.max(0, this.limit - record.count),
      reset: Math.ceil(record.resetTime / 1000),
      retryAfter: 0,
    };
  }

  public reset(key: string): void {
    this.store.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now >= record.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

/** Helper to reliably extract the client's real IP address from proxy headers */
export function getClientIp(req: Request | { headers: Headers }): string {
  const headers = req.headers;

  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp.trim();

  const xForwardedFor = headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const firstIp = xForwardedFor.split(',')[0];
    if (firstIp) return firstIp.trim();
  }

  const xRealIp = headers.get('x-real-ip');
  if (xRealIp) return xRealIp.trim();

  return '127.0.0.1';
}

/** 
 * Pre-configured rate limiters:
 * 1. authLimiter: 5 attempts per 60 seconds (Login, OTP, password reset)
 * 2. resendLimiter: 5 requests per 300 seconds (Credentials resend, email OTP re-dispatch)
 * 3. apiLimiter: 120 requests per 60 seconds (General API anti-DDoS)
 */
export const authLimiter = new SlidingWindowRateLimiter(5, 60 * 1000);
export const resendLimiter = new SlidingWindowRateLimiter(5, 5 * 60 * 1000);
export const apiLimiter = new SlidingWindowRateLimiter(120, 60 * 1000);
