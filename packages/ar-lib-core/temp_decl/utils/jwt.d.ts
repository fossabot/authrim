/**
 * JWT Token Utilities
 *
 * Provides functions for creating and verifying JWT tokens (ID tokens and access tokens).
 * Uses the JOSE library for standards-compliant JWT operations.
 */
import type { JWK, CryptoKey, JWTPayload } from 'jose';
import type { IDTokenClaims } from '../types/oidc';
/**
 * Access Token claims interface
 */
export interface AccessTokenClaims extends JWTPayload {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  jti: string;
  scope: string;
  client_id: string;
  claims?: string;
  cnf?: {
    jkt: string;
  };
}
/**
 * Create ID Token (signed JWT)
 *
 * @param claims - ID token claims
 * @param privateKey - Private key for signing
 * @param kid - Key ID
 * @param expiresIn - Token expiration time in seconds (default: 3600)
 * @returns Promise<string> - Signed JWT
 */
export declare function createIDToken(
  claims: Omit<IDTokenClaims, 'iat' | 'exp'>,
  privateKey: CryptoKey,
  kid: string,
  expiresIn?: number
): Promise<string>;
/**
 * Create SD-JWT ID Token (Selective Disclosure JWT)
 *
 * Creates an ID Token in SD-JWT format per RFC 9901.
 * Sensitive claims (email, phone_number, address, birthdate by default)
 * are made selectively disclosable.
 *
 * @param claims - ID token claims (some will be made selective)
 * @param privateKey - Private key for signing
 * @param kid - Key ID
 * @param expiresIn - Token expiration time in seconds (default: 3600)
 * @param selectiveClaims - Claims to make selectively disclosable
 * @returns Promise<string> - SD-JWT combined string (JWT~disclosure1~...~)
 */
export declare function createSDJWTIDTokenFromClaims(
  claims: Omit<IDTokenClaims, 'iat' | 'exp'>,
  privateKey: CryptoKey,
  kid: string,
  expiresIn?: number,
  selectiveClaims?: string[]
): Promise<string>;
/**
 * Create Access Token (signed JWT)
 *
 * @param claims - Access token claims
 * @param privateKey - Private key for signing
 * @param kid - Key ID
 * @param expiresIn - Token expiration time in seconds (default: 3600)
 * @param providedJti - Optional pre-generated JTI (for region-aware sharding)
 * @returns Promise<{ token: string; jti: string }> - Signed JWT and its unique identifier
 */
export declare function createAccessToken(
  claims: Omit<AccessTokenClaims, 'iat' | 'exp' | 'jti'>,
  privateKey: CryptoKey,
  kid: string,
  expiresIn?: number,
  providedJti?: string
): Promise<{
  token: string;
  jti: string;
}>;
/**
 * Options for verifyToken function
 */
export interface VerifyTokenOptions {
  /**
   * Expected audience(s). Required unless skipAudienceCheck is true.
   */
  audience?: string | string[];
  /**
   * Explicitly skip audience verification.
   * SECURITY: Only set to true when you validate audience separately (e.g., Token Exchange).
   * Default: false
   */
  skipAudienceCheck?: boolean;
}
/**
 * Verify JWT token signature and claims
 *
 * @param token - JWT token to verify
 * @param publicKey - Public key for verification
 * @param issuer - Expected issuer
 * @param options - Verification options (audience, skipAudienceCheck)
 * @returns Promise<JWTPayload> - Decoded and verified claims
 * @throws Error if audience is not provided and skipAudienceCheck is not true
 */
export declare function verifyToken(
  token: string,
  publicKey: CryptoKey,
  issuer: string,
  options?: VerifyTokenOptions
): Promise<JWTPayload>;
/**
 * Parse JWT token without verification (use with caution!)
 *
 * WARNING: This function does NOT verify the token signature.
 * Only use for extracting claims from already verified tokens.
 *
 * @param token - JWT token to parse
 * @returns Decoded payload (unverified)
 */
export declare function parseToken(token: string): JWTPayload;
/**
 * JWT Header interface
 */
export interface JWTHeader {
  alg: string;
  typ?: string;
  kid?: string;
}
/**
 * Parse JWT header without verification
 * Used to extract kid for key selection before signature verification
 *
 * @param token - JWT token to parse
 * @returns Decoded header (unverified)
 */
export declare function parseTokenHeader(token: string): JWTHeader;
/**
 * Import private key from PEM format (PKCS#8)
 *
 * @param pem - PEM-formatted private key
 * @returns Promise<CryptoKey>
 */
export declare function importPrivateKeyFromPEM(pem: string): Promise<CryptoKey>;
/**
 * Import public key from JWK format
 *
 * @param jwk - JWK public key
 * @returns Promise<CryptoKey>
 */
export declare function importPublicKeyFromJWK(jwk: JWK): Promise<CryptoKey>;
/**
 * Calculate at_hash (Access Token Hash) for ID Token
 * https://openid.net/specs/openid-connect-core-1_0.html#CodeIDToken
 *
 * The at_hash is the base64url encoding of the left-most half of the hash
 * of the octets of the ASCII representation of the access_token value.
 *
 * @param accessToken - Access token to hash
 * @param algorithm - Hash algorithm (default: SHA-256 for RS256)
 * @returns Promise<string> - base64url encoded hash
 */
export declare function calculateAtHash(
  accessToken: string,
  algorithm?: 'SHA-256' | 'SHA-384' | 'SHA-512'
): Promise<string>;
/**
 * Calculate c_hash (Code Hash) for ID Token
 * Used in implicit and hybrid flows
 *
 * @param code - Authorization code to hash
 * @param algorithm - Hash algorithm (default: SHA-256 for RS256)
 * @returns Promise<string> - base64url encoded hash
 */
export declare function calculateCHash(
  code: string,
  algorithm?: 'SHA-256' | 'SHA-384' | 'SHA-512'
): Promise<string>;
/**
 * Check if a token string is JWE format (5 parts) or JWT format (3 parts)
 *
 * @param token - Token string to check
 * @returns 'jwe' | 'jwt' | 'unknown'
 */
export declare function getTokenFormat(token: string): 'jwe' | 'jwt' | 'unknown';
/**
 * Refresh Token claims interface (V2)
 *
 * V2 adds rtv (Refresh Token Version) for version-based theft detection.
 * Each rotation increments the version, allowing detection of old token reuse.
 */
export interface RefreshTokenClaims extends JWTPayload {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  jti: string;
  scope: string;
  client_id: string;
  rtv?: number;
}
/**
 * Create Refresh Token (signed JWT) - V2
 * https://tools.ietf.org/html/rfc6749#section-6
 *
 * V2 adds rtv (Refresh Token Version) for version-based theft detection.
 *
 * @param claims - Refresh token claims
 * @param privateKey - Private key for signing
 * @param kid - Key ID
 * @param expiresIn - Token expiration time in seconds (default: 2592000 = 30 days)
 * @param providedJti - Optional JTI from RefreshTokenRotator DO
 * @param rtv - Optional Refresh Token Version (V2) for theft detection
 * @returns Promise<{ token: string; jti: string; rtv?: number }> - Signed JWT with metadata
 */
export declare function createRefreshToken(
  claims: Omit<RefreshTokenClaims, 'iat' | 'exp' | 'jti' | 'rtv'>,
  privateKey: CryptoKey,
  kid: string,
  expiresIn?: number,
  providedJti?: string,
  rtv?: number
): Promise<{
  token: string;
  jti: string;
  rtv?: number;
}>;
//# sourceMappingURL=jwt.d.ts.map
