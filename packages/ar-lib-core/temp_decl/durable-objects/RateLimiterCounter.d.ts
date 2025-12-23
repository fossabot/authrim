/**
 * RateLimiterCounter Durable Object
 *
 * Provides atomic rate limiting with perfect precision.
 * Solves issue #6: Rate Limiting accuracy in distributed environment.
 *
 * Features:
 * - Atomic increment operations (100% accuracy)
 * - Sliding window rate limiting
 * - Automatic cleanup of expired entries
 * - Persistent state across DO restarts
 *
 * Benefits over KV-based rate limiting:
 * - ✅ No race conditions on concurrent requests
 * - ✅ Precise counting even under high load
 * - ✅ Immediate consistency (no eventual consistency issues)
 */
import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../types/env';
/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  windowSeconds: number;
  maxRequests: number;
}
/**
 * Rate limit record
 */
export interface RateLimitRecord {
  count: number;
  resetAt: number;
  firstRequestAt: number;
}
/**
 * Rate limit check result
 */
export interface RateLimitResult {
  allowed: boolean;
  current: number;
  limit: number;
  resetAt: number;
  retryAfter: number;
}
/**
 * Increment request payload
 */
export interface IncrementRequest {
  clientIP: string;
  config: RateLimitConfig;
}
/**
 * RateLimiterCounter Durable Object
 *
 * Manages rate limiting counters with atomic operations.
 * Each DO instance handles a shard of IP addresses.
 *
 * RPC Support:
 * - Extends DurableObject base class for RPC method exposure
 * - RPC methods have 'Rpc' suffix (e.g., incrementRpc, getStatusRpc)
 * - fetch() handler is maintained for backward compatibility and debugging
 */
export declare class RateLimiterCounter extends DurableObject<Env> {
  private counts;
  private cleanupInterval;
  private initialized;
  private readonly CLEANUP_INTERVAL;
  private readonly MAX_ENTRIES;
  private readonly RETENTION_PERIOD;
  constructor(ctx: DurableObjectState, env: Env);
  /**
   * RPC: Atomically increment rate limit counter
   */
  incrementRpc(clientIP: string, config: RateLimitConfig): Promise<RateLimitResult>;
  /**
   * RPC: Get current rate limit status without incrementing
   */
  getStatusRpc(clientIP: string): Promise<RateLimitRecord | null>;
  /**
   * RPC: Reset rate limit for a specific client IP
   */
  resetRpc(clientIP: string): Promise<boolean>;
  /**
   * RPC: Get health check status
   */
  getHealthRpc(): Promise<{
    status: string;
    records: {
      total: number;
      active: number;
      expired: number;
    };
    timestamp: number;
  }>;
  /**
   * Initialize state from Durable Storage
   */
  private initializeState;
  /**
   * Save current state to Durable Storage
   */
  private saveState;
  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanup;
  /**
   * Cleanup expired entries
   */
  private cleanup;
  /**
   * Atomically increment rate limit counter
   *
   * CRITICAL: This operation is atomic within the DO
   * - Checks current count
   * - Increments counter
   * - Returns allow/deny decision
   *
   * Parallel requests are serialized by the DO runtime,
   * ensuring perfect counting accuracy.
   */
  increment(clientIP: string, config: RateLimitConfig): Promise<RateLimitResult>;
  /**
   * Get current rate limit status without incrementing
   */
  getStatus(clientIP: string): Promise<RateLimitRecord | null>;
  /**
   * Reset rate limit for a specific client IP
   * (e.g., for testing or manual intervention)
   */
  reset(clientIP: string): Promise<boolean>;
  /**
   * Handle HTTP requests to the RateLimiterCounter Durable Object
   */
  fetch(request: Request): Promise<Response>;
}
//# sourceMappingURL=RateLimiterCounter.d.ts.map
