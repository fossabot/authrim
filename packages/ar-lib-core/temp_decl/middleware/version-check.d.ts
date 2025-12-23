/**
 * Version Check Middleware
 *
 * Validates that the Worker is running the latest deployed code version.
 * Rejects requests from stale bundles to ensure consistent behavior
 * across Cloudflare's globally distributed Points of Presence (PoPs).
 *
 * Key Features:
 * - Worker-specific version validation via VersionManager DO
 * - In-memory caching (5s TTL) to reduce DO access overhead
 * - Graceful handling for development (skips when version not set)
 * - Returns 503 + Retry-After for stale bundles
 * - Feature Flag: Set VERSION_CHECK_ENABLED="false" to disable (zero overhead)
 *
 * Security:
 * - Version UUIDs are never exposed in responses
 * - Logging is internal only (console.warn)
 */
import type { MiddlewareHandler } from 'hono';
import type { Env } from '../types/env';
/**
 * Version check middleware factory
 *
 * @param workerName - The name of the Worker (e.g., 'op-auth', 'op-token')
 * @returns Hono middleware handler
 *
 * @example
 * ```typescript
 * import { versionCheckMiddleware } from '@authrim/ar-lib-core';
 *
 * app.use('*', logger());
 * app.use('*', versionCheckMiddleware('op-auth'));
 * ```
 */
export declare function versionCheckMiddleware(workerName: string): MiddlewareHandler<{
  Bindings: Env;
}>;
/**
 * Clear the version cache for a specific worker
 * Useful for testing or forcing a refresh
 */
export declare function clearVersionCache(workerName?: string): void;
//# sourceMappingURL=version-check.d.ts.map
