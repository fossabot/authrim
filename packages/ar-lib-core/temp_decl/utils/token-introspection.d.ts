/**
 * Internal Token Introspection Utility
 *
 * Provides comprehensive token validation for Protected Resource endpoints.
 * This is different from RFC 7662 introspection - it's an internal utility
 * that handles DPoP validation, token verification, and error response building.
 *
 * Benefits:
 * - Simplifies Protected Resource endpoint implementation
 * - Handles all token validation logic in one place
 * - Automatically validates DPoP proofs when present
 * - Builds RFC 6750-compliant error responses
 */
import type { Context } from 'hono';
import type { Env } from '../types/env';
import type { JWTPayload } from 'jose';
/**
 * Token introspection result
 */
export interface TokenIntrospectionResult {
  /** Whether the token is valid and active */
  valid: boolean;
  /** Token claims (if valid) */
  claims?: JWTPayload;
  /** Error information (if invalid) */
  error?: {
    /** OAuth 2.0 error code */
    error: string;
    /** Human-readable error description */
    error_description: string;
    /** WWW-Authenticate header value */
    wwwAuthenticate: string;
    /** HTTP status code */
    statusCode: number;
  };
}
/**
 * Internal token introspection request parameters
 * (Not to be confused with RFC 7662 TokenValidationRequest from types/oidc)
 */
export interface TokenValidationRequest {
  /** HTTP method (GET, POST, etc.) */
  method: string;
  /** Full request URL */
  url: string;
  /** Request headers */
  headers: Headers;
  /** Environment bindings */
  env: Env;
  /** Request body (for form-encoded POST requests) */
  body?: URLSearchParams;
}
/**
 * Comprehensive token introspection with DPoP validation
 *
 * This function performs all necessary validations for a Protected Resource:
 * 1. Extracts access token from Authorization header
 * 2. Verifies JWT signature and expiration
 * 3. Validates DPoP proof (if token is DPoP-bound)
 * 4. Checks token revocation status
 * 5. Returns validation result with claims or error details
 *
 * @param request - Introspection request parameters
 * @returns Token introspection result
 *
 * @example
 * ```typescript
 * const result = await introspectToken({
 *   method: c.req.method,
 *   url: c.req.url,
 *   headers: c.req.raw.headers,
 *   env: c.env,
 * });
 *
 * if (!result.valid) {
 *   c.header('WWW-Authenticate', result.error!.wwwAuthenticate);
 *   return c.json({
 *     error: result.error!.error,
 *     error_description: result.error!.error_description,
 *   }, result.error!.statusCode);
 * }
 *
 * // Token is valid, use result.claims
 * const sub = result.claims!.sub;
 * ```
 */
export declare function introspectToken(
  request: TokenValidationRequest
): Promise<TokenIntrospectionResult>;
/**
 * Convenience function for Hono context
 *
 * @example
 * ```typescript
 * const result = await introspectTokenFromContext(c);
 * if (!result.valid) {
 *   c.header('WWW-Authenticate', result.error!.wwwAuthenticate);
 *   return c.json({
 *     error: result.error!.error,
 *     error_description: result.error!.error_description,
 *   }, result.error!.statusCode);
 * }
 * ```
 */
export declare function introspectTokenFromContext(
  c: Context<{
    Bindings: Env;
  }>
): Promise<TokenIntrospectionResult>;
//# sourceMappingURL=token-introspection.d.ts.map
