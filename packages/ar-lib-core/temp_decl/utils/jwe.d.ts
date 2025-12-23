/**
 * JWE (JSON Web Encryption) Utilities
 * RFC 7516: https://datatracker.ietf.org/doc/html/rfc7516
 *
 * Provides functions for encrypting and decrypting JWTs using JWE.
 * Supports ID Token encryption and UserInfo response encryption per OIDC Core 5.1.
 */
import { type JWK } from 'jose';
/**
 * Supported JWE Key Management Algorithms (alg)
 * https://datatracker.ietf.org/doc/html/rfc7518#section-4.1
 */
export declare const SUPPORTED_JWE_ALG: readonly [
  'RSA-OAEP',
  'RSA-OAEP-256',
  'ECDH-ES',
  'ECDH-ES+A128KW',
  'ECDH-ES+A192KW',
  'ECDH-ES+A256KW',
];
export type JWEAlgorithm = (typeof SUPPORTED_JWE_ALG)[number];
/**
 * Supported JWE Content Encryption Algorithms (enc)
 * https://datatracker.ietf.org/doc/html/rfc7518#section-5.1
 */
export declare const SUPPORTED_JWE_ENC: readonly [
  'A128GCM',
  'A192GCM',
  'A256GCM',
  'A128CBC-HS256',
  'A192CBC-HS384',
  'A256CBC-HS512',
];
export type JWEEncryption = (typeof SUPPORTED_JWE_ENC)[number];
/**
 * JWE Encryption Options
 */
export interface JWEEncryptionOptions {
  /** Key management algorithm */
  alg: JWEAlgorithm;
  /** Content encryption algorithm */
  enc: JWEEncryption;
  /** Content type (typ header) - e.g., 'JWT' for encrypted ID tokens */
  cty?: string;
  /** Key ID (kid header) - identifies the client's public key */
  kid?: string;
}
/**
 * Encrypt a JWT payload using JWE
 *
 * This function takes a signed JWT (or any payload) and encrypts it using the client's public key.
 * The result is a JWE in compact serialization format (5 base64url-encoded parts separated by dots).
 *
 * @param payload - The payload to encrypt (typically a signed JWT string)
 * @param publicKey - Client's public key in JWK format
 * @param options - JWE encryption options (alg, enc, etc.)
 * @returns Promise<string> - JWE compact serialization
 *
 * @example
 * ```typescript
 * const signedIdToken = await createIDToken(...);
 * const encryptedIdToken = await encryptJWT(signedIdToken, clientPublicKey, {
 *   alg: 'RSA-OAEP-256',
 *   enc: 'A256GCM',
 *   cty: 'JWT',
 * });
 * ```
 */
export declare function encryptJWT(
  payload: string,
  publicKey: JWK,
  options: JWEEncryptionOptions
): Promise<string>;
/**
 * Decrypt a JWE using a private key
 *
 * This function is primarily for testing purposes.
 * In production, the client decrypts the JWE using their private key.
 *
 * @param jwe - JWE in compact serialization format
 * @param privateKey - Private key in JWK format
 * @returns Promise<string> - Decrypted payload
 */
export declare function decryptJWT(jwe: string, privateKey: JWK): Promise<string>;
/**
 * Validate JWE encryption options
 *
 * Ensures that the requested algorithm and encryption method are supported.
 *
 * @param alg - Key management algorithm
 * @param enc - Content encryption algorithm
 * @returns boolean - True if valid
 * @throws Error if invalid
 */
export declare function validateJWEOptions(alg: string, enc: string): boolean;
/**
 * Check if a client requires ID Token encryption
 *
 * @param clientMetadata - Client metadata from registration
 * @returns boolean - True if encryption is required
 */
export declare function isIDTokenEncryptionRequired(clientMetadata: {
  id_token_encrypted_response_alg?: string;
  id_token_encrypted_response_enc?: string;
}): boolean;
/**
 * Check if a client requires UserInfo encryption
 *
 * @param clientMetadata - Client metadata from registration
 * @returns boolean - True if encryption is required
 */
export declare function isUserInfoEncryptionRequired(clientMetadata: {
  userinfo_encrypted_response_alg?: string;
  userinfo_encrypted_response_enc?: string;
}): boolean;
/**
 * Get client's public JWK for encryption
 *
 * Retrieves the client's public key from either:
 * 1. jwks (embedded JWK Set in client metadata)
 * 2. jwks_uri (URL to client's published JWK Set)
 *
 * @param clientMetadata - Client metadata
 * @param kid - Optional Key ID to select specific key
 * @returns Promise<JWK | null> - Public key or null if not found
 */
export declare function getClientPublicKey(
  clientMetadata: {
    jwks?: {
      keys: JWK[];
    };
    jwks_uri?: string;
  },
  kid?: string
): Promise<JWK | null>;
//# sourceMappingURL=jwe.d.ts.map
