/**
 * Admin Authentication Middleware
 *
 * This middleware provides dual authentication for admin endpoints:
 * 1. Bearer Token authentication (for headless/API usage)
 * 2. Session-based authentication (for UI usage)
 *
 * Security features:
 * - Constant-time comparison to prevent timing attacks
 * - Admin role verification for session auth
 * - Sets adminAuth context for downstream handlers
 */
import type { Context, Next } from 'hono';
import type { Env } from '../types/env';
/**
 * Admin authentication middleware
 *
 * Supports dual authentication:
 * - Bearer Token: Authorization: Bearer <token>
 * - Session Cookie: session_id=<id>
 *
 * Sets adminAuth context on successful authentication:
 * - c.get('adminAuth') => { userId, authMethod, roles }
 *
 * Returns 401 if authentication fails.
 */
export declare function adminAuthMiddleware(): (
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
        },
        401,
        'json'
      >)
>;
//# sourceMappingURL=admin-auth.d.ts.map
