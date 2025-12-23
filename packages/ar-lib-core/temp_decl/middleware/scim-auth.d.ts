/**
 * SCIM 2.0 Authentication Middleware
 *
 * Implements Bearer token authentication for SCIM endpoints
 * as per RFC 7644 Section 2
 *
 * Security features:
 * - Rate limiting for failed authentication attempts (brute force protection)
 * - Logging of failed attempts for security monitoring
 * - Timing-safe token comparison (via hash comparison)
 * - Configurable delay on failed attempts
 *
 * @see https://datatracker.ietf.org/doc/html/rfc7644#section-2
 */
import type { Context, Next } from 'hono';
import type { Env } from '../types/env';
/**
 * SCIM Bearer Token Authentication Middleware
 *
 * Validates Bearer tokens against configured SCIM tokens in KV storage
 * or database. Tokens should be generated and stored securely.
 *
 * Security features:
 * - Rate limiting for failed attempts (5 failures per 5 minutes)
 * - Exponential backoff delay on failures
 * - Detailed logging for security monitoring
 */
export declare function scimAuthMiddleware(
  c: Context<{
    Bindings: Env;
  }>,
  next: Next
): Promise<
  | (Response &
      import('hono').TypedResponse<
        {
          schemas: string[];
          status: string | number;
          scimType?: import('../types/scim').ScimErrorType | undefined;
          detail?: string | undefined;
        },
        400 | 401 | 403 | 404 | 500 | 409,
        'json'
      >)
  | undefined
>;
/**
 * Generate a new SCIM token (for admin use)
 */
export declare function generateScimToken(
  env: Env,
  options?: {
    description?: string;
    expiresInDays?: number;
    enabled?: boolean;
  }
): Promise<{
  token: string;
  tokenHash: string;
}>;
/**
 * Revoke a SCIM token
 */
export declare function revokeScimToken(env: Env, tokenHash: string): Promise<boolean>;
/**
 * List all SCIM tokens (admin function)
 */
export declare function listScimTokens(env: Env): Promise<
  Array<{
    tokenHash: string;
    description: string;
    createdAt: string;
    expiresAt: string | null;
    enabled: boolean;
  }>
>;
/**
 * Optional: Database-based token validation
 *
 * If you prefer to store SCIM tokens in the database instead of KV,
 * you can create a `scim_tokens` table and use this function.
 */
export declare function validateScimTokenFromDB(db: D1Database, token: string): Promise<boolean>;
//# sourceMappingURL=scim-auth.d.ts.map
