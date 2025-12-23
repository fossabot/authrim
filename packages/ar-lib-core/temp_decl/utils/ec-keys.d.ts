/**
 * EC Key Generation and Management Utilities
 *
 * Provides functions for generating and exporting EC (Elliptic Curve) key pairs
 * for JWT signing using ES256, ES384, and ES512 algorithms.
 * Required for OpenID4VP/VCI and SD-JWT VC support (Phase 9).
 *
 * HAIP requires ES256, ES384, or ES512 for high-assurance credentials.
 *
 * @see RFC 7518 - JSON Web Algorithms (JWA)
 * @see draft-oid4vc-haip-sd-jwt-vc-06
 */
import type { JWK } from 'jose';
/**
 * Clear all key caches
 *
 * Useful for testing or when security-critical events occur.
 */
export declare function clearKeyCaches(): void;
/**
 * Get cache statistics (for monitoring)
 *
 * @returns Cache statistics
 */
export declare function getKeyCacheStats(): {
  publicKeyCount: number;
  privateKeyCount: number;
};
/**
 * Supported EC algorithms
 */
export type ECAlgorithm = 'ES256' | 'ES384' | 'ES512';
/**
 * EC curve names corresponding to algorithms
 */
export type ECCurve = 'P-256' | 'P-384' | 'P-521';
/**
 * Algorithm to curve mapping
 */
export declare const ALGORITHM_TO_CURVE: Record<ECAlgorithm, ECCurve>;
/**
 * Curve to algorithm mapping
 */
export declare const CURVE_TO_ALGORITHM: Record<ECCurve, ECAlgorithm>;
/**
 * EC key pair interface
 */
export interface ECKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  algorithm: ECAlgorithm;
  curve: ECCurve;
}
/**
 * EC key set (for storage)
 */
export interface ECKeySet {
  /** Key ID */
  kid: string;
  /** Algorithm */
  algorithm: ECAlgorithm;
  /** Curve */
  curve: ECCurve;
  /** Public key as JWK */
  publicJWK: JWK;
  /** Private key as PEM (PKCS#8) */
  privatePEM: string;
  /** Public key as CryptoKey */
  publicKey: CryptoKey;
  /** Private key as CryptoKey */
  privateKey: CryptoKey;
}
/**
 * Generate EC key pair for signing
 *
 * @param algorithm - EC algorithm (ES256, ES384, ES512)
 * @returns Promise<ECKeyPair>
 */
export declare function generateECKeyPair(algorithm?: ECAlgorithm): Promise<ECKeyPair>;
/**
 * Export EC public key as JWK format
 *
 * @param publicKey - Public key to export
 * @param algorithm - EC algorithm
 * @param kid - Key ID (optional)
 * @returns Promise<JWK>
 */
export declare function exportECPublicJWK(
  publicKey: CryptoKey,
  algorithm: ECAlgorithm,
  kid?: string
): Promise<JWK>;
/**
 * Export EC private key as PEM format (PKCS#8)
 *
 * @param privateKey - Private key to export
 * @returns Promise<string> - PEM-formatted private key
 */
export declare function exportECPrivateKey(privateKey: CryptoKey): Promise<string>;
/**
 * Generate a complete EC key set with public JWK and private PEM
 *
 * @param kid - Key ID
 * @param algorithm - EC algorithm (default: ES256)
 * @returns Promise<ECKeySet>
 */
export declare function generateECKeySet(kid: string, algorithm?: ECAlgorithm): Promise<ECKeySet>;
/**
 * Import EC public key from JWK (with caching)
 *
 * Keys are cached by their JWK parameters to avoid repeated
 * expensive import operations. Cache uses LRU eviction.
 *
 * @param jwk - JWK to import
 * @param options - Import options
 * @returns Promise<CryptoKey>
 */
export declare function importECPublicKey(
  jwk: JWK,
  options?: {
    skipCache?: boolean;
  }
): Promise<CryptoKey>;
/**
 * Import EC private key from JWK (with caching)
 *
 * Keys are cached by their JWK parameters to avoid repeated
 * expensive import operations. Cache uses LRU eviction.
 *
 * @param jwk - JWK to import (must include private key 'd' parameter)
 * @param options - Import options
 * @returns Promise<CryptoKey>
 */
export declare function importECPrivateKey(
  jwk: JWK,
  options?: {
    skipCache?: boolean;
  }
): Promise<CryptoKey>;
/**
 * Get the EC curve from a JWK
 *
 * @param jwk - JWK to inspect
 * @returns ECCurve or null
 */
export declare function getECCurve(jwk: JWK): ECCurve | null;
/**
 * Get the algorithm for a given EC curve
 *
 * @param curve - EC curve
 * @returns ECAlgorithm
 */
export declare function getAlgorithmForCurve(curve: ECCurve): ECAlgorithm;
/**
 * Validate that a JWK is a valid EC key for signing
 *
 * @param jwk - JWK to validate
 * @returns Validation result
 */
export declare function validateECSigningKey(jwk: JWK): {
  valid: boolean;
  algorithm?: ECAlgorithm;
  curve?: ECCurve;
  error?: string;
};
/**
 * Generate a thumbprint (JWK Thumbprint) for an EC key
 *
 * @param jwk - JWK to generate thumbprint for
 * @returns Promise<string> - Base64url encoded thumbprint
 */
export declare function generateECKeyThumbprint(jwk: JWK): Promise<string>;
/**
 * Check if two EC public keys are equivalent
 *
 * @param jwk1 - First JWK
 * @param jwk2 - Second JWK
 * @returns True if keys are equivalent
 */
export declare function areECKeysEqual(jwk1: JWK, jwk2: JWK): boolean;
//# sourceMappingURL=ec-keys.d.ts.map
