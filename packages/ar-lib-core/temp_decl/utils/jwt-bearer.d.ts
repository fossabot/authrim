/**
 * JWT Bearer Flow Utilities (RFC 7523)
 * https://datatracker.ietf.org/doc/html/rfc7523
 *
 * Implements JWT Bearer Grant Type for OAuth 2.0
 * Used for service-to-service authentication without user interaction
 */
import { type JWK, type JWTPayload } from 'jose';
/**
 * JWT Bearer Assertion Claims
 * RFC 7523 Section 3
 */
export interface JWTBearerAssertion extends JWTPayload {
  iss: string;
  sub: string;
  aud: string | string[];
  exp: number;
  iat: number;
  jti?: string;
  scope?: string;
}
/**
 * Trusted Issuer Configuration
 * Defines which issuers are allowed to issue JWT assertions
 */
export interface TrustedIssuer {
  /** Issuer identifier (iss claim value) */
  issuer: string;
  /** Public key or JWKS URI for signature verification */
  jwks?: {
    keys: JWK[];
  };
  jwks_uri?: string;
  /** Allowed subjects (sub claim values) - if empty, any subject is allowed */
  allowed_subjects?: string[];
  /** Allowed scopes for this issuer */
  allowed_scopes?: string[];
}
/**
 * JWT Bearer Validation Result
 */
export interface JWTBearerValidationResult {
  valid: boolean;
  claims?: JWTBearerAssertion;
  error?: string;
  error_description?: string;
}
/**
 * Validate JWT Bearer Assertion
 *
 * RFC 7523 Section 3: JWT Format and Processing Requirements
 *
 * @param assertion - JWT assertion string
 * @param expectedAudience - Expected audience (OP's issuer URL)
 * @param trustedIssuers - Map of trusted issuers
 * @returns Validation result
 */
export declare function validateJWTBearerAssertion(
  assertion: string,
  expectedAudience: string,
  trustedIssuers: Map<string, TrustedIssuer>
): Promise<JWTBearerValidationResult>;
/**
 * Create a trusted issuer configuration from environment variables
 *
 * Format: TRUSTED_ISSUERS=issuer1:jwks_uri1,issuer2:jwks_uri2
 *
 * @param envVar - Environment variable value
 * @returns Map of trusted issuers
 */
export declare function parseTrustedIssuers(envVar?: string): Map<string, TrustedIssuer>;
//# sourceMappingURL=jwt-bearer.d.ts.map
