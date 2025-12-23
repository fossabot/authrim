/**
 * DPoP (Demonstrating Proof of Possession) Utilities
 * RFC 9449: OAuth 2.0 Demonstrating Proof of Possession (DPoP)
 * https://datatracker.ietf.org/doc/html/rfc9449
 */
import type { DPoPValidationResult } from '../types/oidc';
import type { DurableObjectNamespace } from '@cloudflare/workers-types';
import type { Env } from '../types/env';
/**
 * Validates a DPoP proof JWT
 * @param dpopProof - The DPoP proof JWT from the DPoP header
 * @param method - HTTP method (e.g., 'POST', 'GET')
 * @param url - Full request URL
 * @param accessToken - Optional access token for validation (when present, ath claim must match)
 * @param envOrJTIStore - Environment with DO bindings (preferred) or legacy DPoP JTI Store DO namespace
 * @param clientId - Optional client ID for JTI binding (used for sharding)
 * @param tenantId - Optional tenant ID for multi-tenant support (defaults to 'default')
 * @returns Validation result with JWK thumbprint if valid
 */
export declare function validateDPoPProof(
  dpopProof: string,
  method: string,
  url: string,
  accessToken?: string,
  envOrJTIStore?: Env | DurableObjectNamespace,
  clientId?: string,
  tenantId?: string
): Promise<DPoPValidationResult>;
/**
 * Calculates the access token hash (ath) for DPoP
 * RFC 9449 Section 4.2: ath = base64url(SHA-256(access_token))
 * @param accessToken - The access token to hash
 * @returns Base64url-encoded SHA-256 hash of the access token
 */
export declare function calculateAccessTokenHash(accessToken: string): Promise<string>;
/**
 * Extracts the DPoP proof from the request headers
 * @param headers - Request headers
 * @returns DPoP proof JWT or undefined if not present
 */
export declare function extractDPoPProof(headers: Headers): string | undefined;
/**
 * Checks if the Authorization header contains a DPoP-bound token
 * @param authHeader - Authorization header value
 * @returns True if the token is DPoP-bound
 */
export declare function isDPoPBoundToken(authHeader: string): boolean;
/**
 * Extracts the access token from a DPoP Authorization header
 * @param authHeader - Authorization header value
 * @returns Access token or undefined if invalid
 */
export declare function extractDPoPToken(authHeader: string): string | undefined;
//# sourceMappingURL=dpop.d.ts.map
