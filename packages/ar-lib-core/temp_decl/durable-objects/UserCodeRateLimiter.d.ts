/**
 * UserCodeRateLimiter Durable Object
 *
 * Protects against brute force attacks on device flow user codes
 *
 * Security Features:
 * - Track failed verification attempts per IP address
 * - Exponential backoff after repeated failures
 * - Automatic cleanup of old records
 */
import type { DurableObjectState } from '@cloudflare/workers-types';
import type { Env } from '../types/env';
export declare class UserCodeRateLimiter {
  private state;
  private env;
  private attempts;
  private static readonly MAX_ATTEMPTS_PER_HOUR;
  private static readonly BLOCK_DURATION_MS;
  private static readonly CLEANUP_INTERVAL_MS;
  constructor(state: DurableObjectState, env: Env);
  fetch(request: Request): Promise<Response>;
  /**
   * Check if an IP address is currently rate limited
   */
  private isRateLimited;
  /**
   * Get retry-after seconds for a blocked IP
   */
  private getRetryAfter;
  /**
   * Record a failed verification attempt
   */
  private recordFailure;
  /**
   * Cleanup expired rate limit records
   */
  alarm(): Promise<void>;
}
//# sourceMappingURL=UserCodeRateLimiter.d.ts.map
