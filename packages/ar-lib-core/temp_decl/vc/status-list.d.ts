/**
 * Status List 2021 Implementation
 *
 * Implements Token Status List (draft-ietf-oauth-status-list) for credential revocation.
 *
 * @see https://datatracker.ietf.org/doc/draft-ietf-oauth-status-list/
 */
import type { JWK } from 'jose';
/**
 * Status List credential structure
 */
export interface StatusListCredential {
  /** Credential type */
  type: string[];
  /** Issuer identifier */
  issuer: string;
  /** Issuance date */
  validFrom: string;
  /** Credential subject with encoded list */
  credentialSubject: {
    id: string;
    type: 'StatusList2021';
    statusPurpose: 'revocation' | 'suspension';
    encodedList: string;
  };
}
/**
 * Status values
 */
export declare enum StatusValue {
  VALID = 0,
  INVALID = 1,
}
/**
 * Key resolver function type
 * Used to get the issuer's public key for signature verification
 */
export type StatusListKeyResolver = (issuerUri: string, kid?: string) => Promise<CryptoKey | JWK>;
/**
 * Clear all caches (for testing or manual cleanup)
 */
export declare function clearStatusListCaches(): void;
/**
 * Options for fetching status lists
 */
export interface StatusListFetchOptions {
  /** Cache TTL in milliseconds (default: 5 minutes) */
  cacheTtlMs?: number;
  /** Force refresh even if cached */
  forceRefresh?: boolean;
  /**
   * Verify JWT signature (default: true for security)
   * IMPORTANT: Set to false ONLY when the Status List is self-issued or
   * the issuer key is not available (e.g., testing environments)
   */
  verifySignature?: boolean;
  /**
   * Custom key resolver for signature verification
   * If not provided, the default resolver will fetch JWKS from the issuer
   */
  keyResolver?: StatusListKeyResolver;
}
/**
 * Fetch and decode a status list
 *
 * @param statusListUri - URI to the status list credential
 * @param options - Fetch options including signature verification settings
 * @returns Decoded bitstring
 * @throws Error if fetch fails, signature verification fails, or format is invalid
 */
export declare function fetchStatusList(
  statusListUri: string,
  options?: StatusListFetchOptions
): Promise<Uint8Array>;
/**
 * Get the status value at a specific index in the bitstring
 *
 * @param bitstring The decoded bitstring
 * @param index The index to check
 * @param bitsPerStatus Number of bits per status (default: 1)
 * @returns The status value at the index
 */
export declare function getStatusAtIndex(
  bitstring: Uint8Array,
  index: number,
  bitsPerStatus?: number
): number;
/**
 * Options for checking credential status
 */
export interface CheckStatusOptions extends StatusListFetchOptions {
  /** Bits per status value (default: 1) */
  bitsPerStatus?: number;
}
/**
 * Check if a credential is valid (not revoked/suspended)
 *
 * SECURITY: By default, this function verifies the Status List JWT signature.
 * This ensures the status list hasn't been tampered with (MITM protection).
 *
 * @param statusListUri URI to the status list
 * @param index Index in the status list
 * @param options Fetch and verification options
 * @returns true if valid, false if revoked/suspended
 * @throws Error if status list fetch or signature verification fails
 */
export declare function checkCredentialStatus(
  statusListUri: string,
  index: number,
  options?: CheckStatusOptions
): Promise<boolean>;
/**
 * Clear the status list cache
 */
export declare function clearStatusListCache(): void;
/**
 * Clear the issuer JWKS cache
 */
export declare function clearIssuerJwksCache(): void;
/**
 * Clear all status list related caches
 */
export declare function clearAllStatusListCaches(): void;
/**
 * Get cache statistics
 */
export declare function getStatusListCacheStats(): {
  size: number;
  entries: string[];
};
//# sourceMappingURL=status-list.d.ts.map
