/**
 * Request Context Middleware
 *
 * This middleware establishes request-scoped context including:
 * - Request ID for correlation across logs
 * - Tenant ID for future multi-tenant support
 * - Structured logger instance
 *
 * Should be added early in the middleware chain so all subsequent
 * handlers have access to the context.
 */
import type { Context, Next } from 'hono';
import type { Env } from '../types/env';
import { type Logger } from '../utils/logger';
/**
 * Request context available to all handlers via c.get()
 */
export interface RequestContext {
  /** Unique request identifier (UUID v4) */
  requestId: string;
  /** Tenant identifier ('default' in single-tenant mode) */
  tenantId: string;
  /** Request start timestamp for duration calculation */
  startTime: number;
  /** Structured logger with request context */
  logger: Logger;
}
/**
 * Request context middleware
 *
 * Sets the following context values accessible via c.get():
 * - 'requestId': Unique request identifier
 * - 'tenantId': Tenant identifier
 * - 'logger': Structured logger instance
 * - 'startTime': Request start timestamp
 *
 * @example
 * // In router setup
 * app.use('*', requestContextMiddleware());
 *
 * // In handler
 * const requestId = c.get('requestId');
 * const logger = c.get('logger');
 * logger.info('Processing request', { action: 'process' });
 */
export declare function requestContextMiddleware(): (
  c: Context<{
    Bindings: Env;
  }>,
  next: Next
) => Promise<void>;
/**
 * Get request context from Hono context.
 * Helper function for type-safe context access.
 *
 * @param c - Hono context
 * @returns Request context object
 */
export declare function getRequestContext(
  c: Context<{
    Bindings: Env;
  }>
): RequestContext;
/**
 * Get the logger from Hono context.
 * Convenience function for the most common use case.
 *
 * @param c - Hono context
 * @returns Logger instance
 */
export declare function getLogger(
  c: Context<{
    Bindings: Env;
  }>
): Logger;
/**
 * Get the tenant ID from Hono context.
 *
 * @param c - Hono context
 * @returns Tenant ID string
 */
export declare function getTenantIdFromContext(
  c: Context<{
    Bindings: Env;
  }>
): string;
//# sourceMappingURL=request-context.d.ts.map
