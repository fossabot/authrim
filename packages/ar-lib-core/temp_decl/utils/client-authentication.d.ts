/**
 * Client Authentication Utilities
 * Implements private_key_jwt and client_secret_jwt authentication methods
 * RFC 7523: JSON Web Token (JWT) Profile for OAuth 2.0 Client Authentication
 */
import type { ClientMetadata } from '../types/oidc';
/**
 * Client Assertion Claims (RFC 7523 Section 3)
 * Used for private_key_jwt and client_secret_jwt authentication
 */
export interface ClientAssertionClaims {
  iss: string;
  sub: string;
  aud: string | string[];
  exp: number;
  iat?: number;
  jti?: string;
  nbf?: number;
}
/**
 * Client Assertion Validation Result
 */
export interface ClientAssertionValidationResult {
  valid: boolean;
  client_id?: string;
  error?: string;
  error_description?: string;
}
/**
 * Validate Client Assertion JWT
 *
 * Validates private_key_jwt or client_secret_jwt authentication
 * per RFC 7523 Section 3
 *
 * @param assertion - JWT assertion string
 * @param tokenEndpoint - Token endpoint URL (expected audience)
 * @param client - Client metadata (must include jwks or jwks_uri for private_key_jwt)
 * @returns Validation result
 */
export declare function validateClientAssertion(
  assertion: string,
  tokenEndpoint: string,
  client: ClientMetadata
): Promise<ClientAssertionValidationResult>;
//# sourceMappingURL=client-authentication.d.ts.map
