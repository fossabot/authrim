/**
 * Error Handling Middleware for Hono
 *
 * Integrates ErrorFactory with Hono applications for consistent error handling.
 *
 * Usage:
 * ```ts
 * import { errorMiddleware } from '@authrim/ar-lib-core';
 *
 * const app = new Hono();
 * app.use('*', errorMiddleware());
 *
 * // Errors thrown with AR codes will be automatically serialized
 * app.get('/api/resource', (c) => {
 *   throw new AuthrimError(AR_ERROR_CODES.AUTH_SESSION_EXPIRED);
 * });
 * ```
 *
 * @packageDocumentation
 */
import type { Context, MiddlewareHandler } from 'hono';
import type { ErrorLocale, ErrorIdMode, ErrorResponseFormat } from './types';
import type { ARErrorCode, RFCErrorCode } from './codes';
import { ErrorFactory } from './factory';
/**
 * Authrim Error class for throwing errors with AR codes
 *
 * Use this to throw errors that will be automatically handled by the middleware.
 *
 * @example
 * ```ts
 * throw new AuthrimError(AR_ERROR_CODES.AUTH_SESSION_EXPIRED);
 * throw new AuthrimError(AR_ERROR_CODES.RATE_LIMIT_EXCEEDED, {
 *   variables: { retry_after: 60 },
 *   state: 'abc123',
 * });
 * ```
 */
export declare class AuthrimError extends Error {
  readonly code: ARErrorCode;
  readonly options: {
    variables?: Record<string, string | number>;
    state?: string;
  };
  constructor(
    code: ARErrorCode,
    options?: {
      variables?: Record<string, string | number>;
      state?: string;
    }
  );
}
/**
 * RFC Error class for throwing standard RFC errors
 */
export declare class RFCError extends Error {
  readonly rfcError: RFCErrorCode;
  readonly status: number;
  readonly detail?: string;
  constructor(rfcError: RFCErrorCode, status: number, detail?: string);
}
/**
 * Error middleware configuration
 */
interface ErrorMiddlewareOptions {
  /**
   * Default locale (can be overridden by KV)
   */
  locale?: ErrorLocale;
  /**
   * Default response format (can be overridden by KV or Accept header)
   */
  format?: ErrorResponseFormat;
  /**
   * Default error ID mode (can be overridden by KV)
   */
  errorIdMode?: ErrorIdMode;
  /**
   * Base URL for Problem Details type URIs
   */
  baseUrl?: string;
  /**
   * Custom error handler for unhandled errors
   */
  onError?: (error: unknown, c: Context) => void;
}
/**
 * Create error handling middleware for Hono
 *
 * This middleware catches errors thrown in handlers and serializes them
 * using the ErrorFactory system.
 *
 * @param options - Middleware configuration
 * @returns Hono middleware handler
 */
export declare function errorMiddleware(options?: ErrorMiddlewareOptions): MiddlewareHandler;
/**
 * Create a pre-configured error factory from Hono context
 *
 * Use this to create errors with proper localization in handlers.
 *
 * @example
 * ```ts
 * app.get('/api/resource', async (c) => {
 *   const factory = await createErrorFactoryFromContext(c);
 *   const error = factory.create(AR_ERROR_CODES.AUTH_SESSION_EXPIRED);
 *   return errorResponse(c, error);
 * });
 * ```
 */
export declare function createErrorFactoryFromContext(c: Context): Promise<ErrorFactory>;
/**
 * Helper to create error response directly in handlers
 *
 * @example
 * ```ts
 * app.get('/api/resource', (c) => {
 *   return createErrorResponse(c, AR_ERROR_CODES.AUTH_SESSION_EXPIRED);
 * });
 * ```
 */
export declare function createErrorResponse(
  c: Context,
  code: ARErrorCode,
  options?: {
    variables?: Record<string, string | number>;
    state?: string;
  }
): Promise<Response>;
/**
 * Helper to create RFC error response
 */
export declare function createRFCErrorResponse(
  c: Context,
  rfcError: RFCErrorCode,
  status: number,
  detail?: string
): Promise<Response>;
export {};
//# sourceMappingURL=middleware.d.ts.map
