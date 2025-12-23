/**
 * Key Generation and Management Utilities
 *
 * Provides functions for generating and exporting RSA key pairs for JWT signing.
 * Uses the JOSE library for standards-compliant cryptographic operations.
 */
import type { JWK, CryptoKey } from 'jose';
/**
 * RSA key pair interface
 */
export interface RSAKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}
/**
 * Generate RSA key pair for RS256 signing algorithm
 *
 * @param modulusLength - RSA key size in bits (default: 2048)
 * @returns Promise<RSAKeyPair>
 */
export declare function generateRSAKeyPair(modulusLength?: number): Promise<RSAKeyPair>;
/**
 * Export public key as JWK (JSON Web Key) format
 *
 * @param publicKey - Public key to export
 * @param kid - Key ID (optional)
 * @returns Promise<JWK>
 */
export declare function exportPublicJWK(publicKey: CryptoKey, kid?: string): Promise<JWK>;
/**
 * Export private key as PEM format (PKCS#8)
 *
 * @param privateKey - Private key to export
 * @returns Promise<string> - PEM-formatted private key
 */
export declare function exportPrivateKey(privateKey: CryptoKey): Promise<string>;
/**
 * Generate a complete key set with public JWK and private PEM
 *
 * @param kid - Key ID
 * @param modulusLength - RSA key size in bits (default: 2048)
 * @returns Promise containing publicJWK and privatePEM
 */
export declare function generateKeySet(
  kid: string,
  modulusLength?: number
): Promise<{
  publicJWK: JWK;
  privatePEM: string;
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}>;
//# sourceMappingURL=keys.d.ts.map
