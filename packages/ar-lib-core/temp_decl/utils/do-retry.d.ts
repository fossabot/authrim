/**
 * Durable Object Retry Utility
 *
 * Provides retry logic for Durable Object RPC calls with:
 * - Overloaded error detection and exponential backoff
 * - Retryable error handling
 * - OIDC-compliant error responses
 *
 * Usage:
 * ```typescript
 * const session = await callDOWithRetry(
 *   () => sessionStore.getSessionRpc(sessionId),
 *   { operationName: 'SessionStore.getSession' }
 * );
 * ```
 */
/**
 * Options for DO retry operation
 */
export interface DORetryOptions {
  /** Maximum number of retries (default: 3) */
  maxRetries?: number;
  /** Initial delay in milliseconds (default: 50) */
  initialDelayMs?: number;
  /** Maximum delay in milliseconds (default: 500) */
  maxDelayMs?: number;
  /** Operation name for logging */
  operationName: string;
}
/**
 * Custom error class for DO overloaded errors
 * Can be caught and handled by callers for OIDC error responses
 */
export declare class DOOverloadedError extends Error {
  readonly retryable = false;
  readonly cause: Error | null;
  constructor(message: string, cause?: Error | null);
}
/**
 * Call a Durable Object method with retry logic
 *
 * Automatically retries on:
 * - Overloaded errors (with exponential backoff)
 * - Retryable errors (with exponential backoff)
 *
 * Throws immediately on:
 * - Non-retryable errors (e.g., invalid_grant, invalid_request)
 *
 * @param operation - Async function that calls the DO method
 * @param options - Retry configuration
 * @returns The result of the operation
 * @throws DOOverloadedError if all retries are exhausted due to overloaded state
 * @throws Original error if it's not retryable
 */
export declare function callDOWithRetry<T>(
  operation: () => Promise<T>,
  options: DORetryOptions
): Promise<T>;
/**
 * Helper to determine OIDC error response for DO errors
 *
 * Returns appropriate OAuth 2.0 error code based on the error type:
 * - DOOverloadedError -> 'temporarily_unavailable'
 * - Other errors -> 'server_error'
 */
export declare function getOIDCErrorForDOError(error: unknown): {
  error: string;
  errorDescription: string;
  httpStatus: number;
};
//# sourceMappingURL=do-retry.d.ts.map
