/**
 * Initial Access Token Middleware
 *
 * Implements Initial Access Token validation for Dynamic Client Registration
 * as described in OpenID Connect Dynamic Client Registration 1.0 Section 3.1
 *
 * Security: Tokens are stored with SHA-256 hash as the key, not plaintext.
 * This prevents token leakage if KV storage is compromised.
 *
 * https://openid.net/specs/openid-connect-registration-1_0.html#ClientRegistration
 */
import type { MiddlewareHandler } from 'hono';
import type { Env } from '../types/env';
/**
 * Token metadata stored in context
 */
interface TokenMetadata {
  single_use?: boolean;
  description?: string;
}
/**
 * Hash token for secure storage comparison using SHA-256
 * Same implementation as SCIM tokens for consistency
 * Exported for use by Admin API
 */
export declare function hashInitialAccessToken(token: string): Promise<string>;
/**
 * Variables added to Hono context
 */
interface ContextVariables {
  initialAccessTokenMetadata?: TokenMetadata;
}
/**
 * Middleware to validate Initial Access Token for Dynamic Client Registration
 *
 * Behavior:
 * - If OPEN_REGISTRATION=true: Allow requests without token
 * - If OPEN_REGISTRATION=false or unset: Require valid Initial Access Token
 *
 * Token validation:
 * - Token must be present in Authorization: Bearer <token> header
 * - Token must exist in INITIAL_ACCESS_TOKENS KV store
 * - Token can be single-use (deleted after use) or reusable (kept in KV)
 */
export declare function initialAccessTokenMiddleware(): MiddlewareHandler<{
  Bindings: Env;
  Variables: ContextVariables;
}>;
export {};
//# sourceMappingURL=initial-access-token.d.ts.map
