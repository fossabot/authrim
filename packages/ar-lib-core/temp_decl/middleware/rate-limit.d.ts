/**
 * Rate Limiting Middleware
 *
 * Provides per-IP rate limiting to protect against abuse and DDoS attacks.
 * Uses Cloudflare KV for distributed rate limit tracking.
 *
 * Configuration Priority:
 * 1. In-memory cache (10s TTL)
 * 2. KV (AUTHRIM_CONFIG namespace) - Dynamic override without deployment
 * 3. Environment variables (RATE_LIMIT_PROFILE)
 * 4. Default profiles (RateLimitProfiles)
 */
import type { Context, Next } from 'hono';
import type { Env } from '../types/env';
/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
  endpoints?: string[];
  skipIPs?: string[];
}
/**
 * Rate limiting middleware factory
 *
 * @param config - Rate limit configuration
 * @returns Middleware function
 */
export declare function rateLimitMiddleware(config: RateLimitConfig): (
  c: Context<{
    Bindings: Env;
  }>,
  next: Next
) => Promise<
  | void
  | (Response &
      import('hono').TypedResponse<
        {
          error: string;
          error_description: string;
          retry_after: number;
        },
        429,
        'json'
      >)
>;
/**
 * Pre-configured rate limit profiles (defaults)
 */
export declare const RateLimitProfiles: {
  /**
   * Strict rate limiting for sensitive endpoints (e.g., token, register)
   * 10 requests per minute
   */
  readonly strict: {
    readonly maxRequests: 10;
    readonly windowSeconds: 60;
  };
  /**
   * Moderate rate limiting for API endpoints
   * 60 requests per minute
   */
  readonly moderate: {
    readonly maxRequests: 60;
    readonly windowSeconds: 60;
  };
  /**
   * Lenient rate limiting for public endpoints (e.g., discovery, JWKS)
   * 300 requests per minute
   */
  readonly lenient: {
    readonly maxRequests: 300;
    readonly windowSeconds: 60;
  };
  /**
   * Load testing profile - very high limits
   * Default: 10000 requests per minute
   * Can be overridden via KV: rate_limit_loadtest_max_requests, rate_limit_loadtest_window_seconds
   */
  readonly loadTest: {
    readonly maxRequests: 10000;
    readonly windowSeconds: 60;
  };
};
/**
 * Get rate limit profile with environment variable override (synchronous version)
 *
 * @param env - Environment bindings
 * @param profileName - Profile name (strict, moderate, lenient, loadTest)
 * @returns Rate limit config (may be overridden by RATE_LIMIT_PROFILE env var)
 * @deprecated Use getRateLimitProfileAsync for KV-based dynamic configuration
 */
export declare function getRateLimitProfile(
  env: {
    RATE_LIMIT_PROFILE?: string;
  },
  profileName: keyof typeof RateLimitProfiles
): RateLimitConfig;
/**
 * Get rate limit profile with KV override support (async version)
 *
 * Priority:
 * 1. Cache (10s TTL)
 * 2. KV profile override (rate_limit_profile_override) - switches ALL endpoints to specified profile
 * 3. KV per-profile settings (rate_limit_{profile}_max_requests, rate_limit_{profile}_window_seconds)
 * 4. Environment variable (RATE_LIMIT_PROFILE for profile selection)
 * 5. Default profile values
 *
 * @param env - Environment bindings with AUTHRIM_CONFIG KV
 * @param profileName - Profile name (strict, moderate, lenient, loadTest)
 * @returns Rate limit config with KV overrides applied
 *
 * @example
 * // Set global profile override via KV (no deployment required):
 * // npx wrangler kv key put "rate_limit_profile_override" "loadTest" --namespace-id=... --remote
 * // Or via Admin API: PUT /api/admin/settings/rate-limit/profile-override {"profile": "loadTest"}
 *
 * // Set per-profile settings via KV:
 * // npx wrangler kv key put "rate_limit_loadtest_max_requests" "20000" --namespace-id=... --remote
 *
 * const config = await getRateLimitProfileAsync(env, 'strict');
 * // If rate_limit_profile_override=loadTest, returns loadTest config instead of strict
 */
export declare function getRateLimitProfileAsync(
  env: Env,
  profileName: keyof typeof RateLimitProfiles
): Promise<RateLimitConfig>;
/**
 * Get the KV key for profile override
 * Exported for use in Admin API
 */
export declare function getProfileOverrideKVKey(): string;
/**
 * Clear rate limit config cache.
 * Useful for testing or when immediate KV changes are needed.
 */
export declare function clearRateLimitConfigCache(): void;
//# sourceMappingURL=rate-limit.d.ts.map
