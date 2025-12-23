/**
 * SD-JWT (Selective Disclosure JWT) Implementation
 *
 * Implements SD-JWT as specified in RFC 9901.
 * SD-JWT allows issuers to create JWTs where certain claims can be selectively
 * disclosed by the holder to verifiers.
 *
 * Key concepts:
 * - Issuer creates SD-JWT with hashed claims (_sd array)
 * - Holder receives SD-JWT + disclosures
 * - Holder presents SD-JWT + selected disclosures to verifier
 * - Verifier can only see disclosed claims
 *
 * Format: <JWT>~<Disclosure1>~<Disclosure2>~...~<DisclosureN>~
 *
 * @see https://www.rfc-editor.org/rfc/rfc9901.html
 */
import type { JWTPayload, JWK } from 'jose';
/**
 * SD-JWT Disclosure
 * Format: base64url([salt, claim_name, claim_value])
 */
export interface SDJWTDisclosure {
  /** Base64url encoded disclosure */
  encoded: string;
  /** Salt used for hashing */
  salt: string;
  /** Claim name */
  claimName: string;
  /** Claim value */
  claimValue: unknown;
  /** SHA-256 hash of the disclosure */
  hash: string;
}
/**
 * SD-JWT with disclosures
 */
export interface SDJWT {
  /** The signed JWT containing _sd array */
  jwt: string;
  /** Array of disclosures */
  disclosures: SDJWTDisclosure[];
  /** Combined SD-JWT string (JWT~disclosure1~disclosure2~...~) */
  combined: string;
}
/**
 * SD-JWT Payload with selective disclosure metadata
 */
export interface SDJWTPayload extends JWTPayload {
  /** Array of disclosure hashes */
  _sd?: string[];
  /** Hash algorithm used (default: sha-256) */
  _sd_alg?: string;
  /** Confirmation claim for holder binding (optional) */
  cnf?: {
    jwk?: JWK;
    jkt?: string;
  };
}
/**
 * Verified SD-JWT result
 */
export interface VerifiedSDJWT {
  /** Original JWT payload */
  payload: SDJWTPayload;
  /** Disclosed claims (after processing disclosures) */
  disclosedClaims: Record<string, unknown>;
  /** All disclosure objects */
  disclosures: SDJWTDisclosure[];
  /** Claims that were not disclosed */
  undisclosedCount: number;
}
/**
 * Array element disclosure marker per RFC 9901
 * Format: {"...": "<hash>"}
 */
export interface ArrayDisclosureMarker {
  '...': string;
}
/**
 * Nested selective disclosure path
 * Supports dot notation for nested claims (e.g., "address.street")
 */
export type SDClaimPath =
  | string
  | {
      path: string;
      isArray?: boolean;
    };
/**
 * Options for creating SD-JWT with nested/array disclosure
 */
export interface SDJWTAdvancedCreateOptions {
  /** Simple flat claims to make selectively disclosable */
  selectiveDisclosureClaims?: string[];
  /** Nested claim paths using dot notation (e.g., "address.street", "address.city") */
  nestedSelectiveDisclosureClaims?: string[];
  /** Array element disclosure - specify path and indices (e.g., { "nationalities": [0, 2] }) */
  arrayElementDisclosure?: Record<string, number[]>;
  /** Hash algorithm (default: sha-256) */
  hashAlgorithm?: 'sha-256';
  /** Add holder binding with JWK */
  holderBinding?: JWK;
}
/**
 * Options for creating SD-JWT
 */
export interface SDJWTCreateOptions {
  /** Claims to make selectively disclosable */
  selectiveDisclosureClaims: string[];
  /** Hash algorithm (default: sha-256) */
  hashAlgorithm?: 'sha-256';
  /** Add holder binding with JWK */
  holderBinding?: JWK;
}
/** SD-JWT disclosure separator */
export declare const SD_JWT_SEPARATOR = '~';
/** Default hash algorithm */
export declare const SD_JWT_DEFAULT_ALG = 'sha-256';
/**
 * Build a Map for O(1) disclosure lookup by hash
 *
 * This optimizes repeated lookups during verification/processing
 * from O(n) per lookup to O(1) per lookup.
 *
 * @param disclosures - Array of disclosures
 * @returns Map from hash to disclosure
 */
export declare function buildDisclosureMap(
  disclosures: SDJWTDisclosure[]
): Map<string, SDJWTDisclosure>;
/**
 * Create a disclosure for a claim
 *
 * @param claimName - Name of the claim
 * @param claimValue - Value of the claim
 * @returns Disclosure object with encoded string and hash
 * @throws Error if claim name is reserved (_sd or ...)
 */
export declare function createDisclosure(
  claimName: string,
  claimValue: unknown
): Promise<SDJWTDisclosure>;
/**
 * Decode a disclosure string
 *
 * @param encoded - Base64url encoded disclosure
 * @returns Decoded disclosure or null if invalid
 */
export declare function decodeDisclosure(encoded: string): Promise<SDJWTDisclosure | null>;
/**
 * Create an SD-JWT from claims
 *
 * @param claims - All claims to include in the JWT
 * @param privateKey - Private key for signing
 * @param kid - Key ID
 * @param options - SD-JWT creation options
 * @returns SD-JWT with disclosures
 */
export declare function createSDJWT(
  claims: Record<string, unknown>,
  privateKey: CryptoKey,
  kid: string,
  options: SDJWTCreateOptions
): Promise<SDJWT>;
/**
 * Create SD-JWT for ID Token
 *
 * Convenience function that handles standard OIDC claims appropriately.
 * Required claims (iss, sub, aud, exp, iat) are never made selective.
 *
 * @param claims - ID Token claims
 * @param privateKey - Private key for signing
 * @param kid - Key ID
 * @param selectiveClaims - Claims to make selectively disclosable
 * @returns SD-JWT
 */
export declare function createSDJWTIDToken(
  claims: Record<string, unknown>,
  privateKey: CryptoKey,
  kid: string,
  selectiveClaims?: string[]
): Promise<SDJWT>;
/**
 * Parse an SD-JWT combined string
 *
 * @param combined - Combined SD-JWT string (JWT~disclosure1~...~)
 * @returns Parsed JWT and disclosures
 */
export declare function parseSDJWT(combined: string): Promise<{
  jwt: string;
  disclosures: SDJWTDisclosure[];
} | null>;
/**
 * Verify an SD-JWT and extract disclosed claims
 *
 * @param combined - Combined SD-JWT string
 * @param publicKey - Public key for verification
 * @param issuer - Expected issuer
 * @param audience - Expected audience
 * @returns Verified SD-JWT with disclosed claims
 */
export declare function verifySDJWT(
  combined: string,
  publicKey: CryptoKey,
  issuer: string,
  audience: string
): Promise<VerifiedSDJWT>;
/**
 * Create a presentation from SD-JWT with selected disclosures
 *
 * Allows holder to choose which claims to disclose.
 *
 * @param sdJwt - Original SD-JWT
 * @param claimsToDisclose - Names of claims to include in presentation
 * @returns New combined SD-JWT string with only selected disclosures
 */
export declare function createPresentation(sdJwt: SDJWT, claimsToDisclose: string[]): string;
/**
 * Check if a JWT is an SD-JWT
 *
 * @param token - JWT or SD-JWT string
 * @returns True if the token is an SD-JWT
 */
export declare function isSDJWT(token: string): boolean;
/**
 * Get the JWT part from an SD-JWT (strips disclosures)
 *
 * @param sdJwtOrJwt - SD-JWT combined string or regular JWT
 * @returns The JWT part only
 */
export declare function getJWTFromSDJWT(sdJwtOrJwt: string): string;
/**
 * Create an array element disclosure
 *
 * Array elements use a different format: [salt, value] (no claim name)
 *
 * @param value - The array element value
 * @returns Disclosure object
 */
export declare function createArrayElementDisclosure(value: unknown): Promise<SDJWTDisclosure>;
/**
 * Decode an array element disclosure
 *
 * @param encoded - Base64url encoded disclosure
 * @returns Decoded disclosure or null if invalid
 */
export declare function decodeArrayElementDisclosure(
  encoded: string
): Promise<SDJWTDisclosure | null>;
/**
 * Check if an object is an array disclosure marker
 *
 * @param obj - Object to check
 * @returns True if it's an array disclosure marker
 */
export declare function isArrayDisclosureMarker(obj: unknown): obj is ArrayDisclosureMarker;
/**
 * Process nested object for selective disclosure
 *
 * Recursively processes an object to add selective disclosure at nested levels.
 *
 * @param obj - Object to process
 * @param nestedPaths - Paths to make selectively disclosable (e.g., ["street", "city"])
 * @param disclosures - Array to collect disclosures
 * @returns Processed object with _sd array
 */
export declare function processNestedObjectForSD(
  obj: Record<string, unknown>,
  nestedPaths: string[],
  disclosures: SDJWTDisclosure[]
): Promise<Record<string, unknown>>;
/**
 * Process array for selective disclosure
 *
 * Replaces specified array elements with disclosure markers.
 *
 * @param arr - Array to process
 * @param indicesToHide - Indices to make selectively disclosable
 * @param disclosures - Array to collect disclosures
 * @returns Processed array with disclosure markers
 */
export declare function processArrayForSD(
  arr: unknown[],
  indicesToHide: number[],
  disclosures: SDJWTDisclosure[]
): Promise<unknown[]>;
/**
 * Reconstruct array from disclosures
 *
 * Processes an array with disclosure markers and replaces them with actual values.
 * Accepts either a Map (O(1) lookups) or an array (O(n) lookups) for flexibility.
 *
 * @param arr - Array with potential disclosure markers
 * @param disclosures - Available disclosures (array or Map for O(1) lookups)
 * @returns Reconstructed array and count of undisclosed elements
 */
export declare function reconstructArrayFromDisclosures(
  arr: unknown[],
  disclosures: SDJWTDisclosure[] | Map<string, SDJWTDisclosure>
): {
  result: unknown[];
  undisclosedCount: number;
};
/**
 * Recursively process claims with nested _sd arrays
 *
 * Handles nested selective disclosure by walking through the object
 * and processing _sd arrays at each level.
 *
 * Uses Map for O(1) disclosure lookups instead of O(n) find().
 *
 * @param claims - Claims object (may contain nested _sd arrays)
 * @param disclosures - All available disclosures (array or Map for O(1) lookups)
 * @returns Processed claims with disclosed values and undisclosed count
 */
export declare function processNestedDisclosures(
  claims: Record<string, unknown>,
  disclosures: SDJWTDisclosure[] | Map<string, SDJWTDisclosure>
): {
  result: Record<string, unknown>;
  undisclosedCount: number;
};
/**
 * Create SD-JWT with advanced nested/array disclosure support
 *
 * @param claims - All claims to include
 * @param privateKey - Private key for signing
 * @param kid - Key ID
 * @param options - Advanced SD-JWT creation options
 * @returns SD-JWT with disclosures
 */
export declare function createAdvancedSDJWT(
  claims: Record<string, unknown>,
  privateKey: CryptoKey,
  kid: string,
  options: SDJWTAdvancedCreateOptions
): Promise<SDJWT>;
/**
 * Verify SD-JWT with nested/array disclosure support
 *
 * @param combined - Combined SD-JWT string
 * @param publicKey - Public key for verification
 * @param issuer - Expected issuer
 * @param audience - Expected audience
 * @returns Verified SD-JWT with all disclosed claims (including nested)
 */
export declare function verifyAdvancedSDJWT(
  combined: string,
  publicKey: CryptoKey,
  issuer: string,
  audience: string
): Promise<VerifiedSDJWT>;
//# sourceMappingURL=sd-jwt.d.ts.map
