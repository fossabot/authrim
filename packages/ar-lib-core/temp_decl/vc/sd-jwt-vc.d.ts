/**
 * SD-JWT VC (Verifiable Credential) Implementation
 *
 * Extends the base SD-JWT (RFC 9901) implementation for Verifiable Credentials.
 * Implements:
 * - SD-JWT VC format (dc+sd-jwt) per draft-ietf-oauth-sd-jwt-vc-13
 * - Key Binding JWT (KB-JWT) for holder binding
 * - Status List 2021 integration for revocation
 *
 * @see https://datatracker.ietf.org/doc/draft-ietf-oauth-sd-jwt-vc/
 * @see RFC 9901 (SD-JWT)
 */
import type { JWTPayload, JWK } from 'jose';
import { type SDJWTDisclosure } from '../utils/sd-jwt';
import type { ECAlgorithm } from '../utils/ec-keys';
import type { HaipPolicy, HaipSignatureAlgorithm } from './haip-policy';
/**
 * SD-JWT VC Header
 */
export interface SDJWTVCHeader {
  /** Algorithm (ES256, ES384, ES512 for HAIP) */
  alg: HaipSignatureAlgorithm;
  /** Type (must be 'dc+sd-jwt' for SD-JWT VC) */
  typ: 'dc+sd-jwt';
  /** Key ID */
  kid?: string;
  /** Trust chain */
  trust_chain?: string[];
}
/**
 * SD-JWT VC Payload
 */
export interface SDJWTVCPayload extends JWTPayload {
  /** Issuer (DID or URL) */
  iss: string;
  /** Subject (holder identifier) */
  sub?: string;
  /** Verifiable Credential Type */
  vct: string;
  /** Issued at */
  iat: number;
  /** Expiration */
  exp?: number;
  /** Not before */
  nbf?: number;
  /** JWT ID */
  jti?: string;
  /** Selective disclosure hashes */
  _sd?: string[];
  /** Hash algorithm */
  _sd_alg?: string;
  /** Confirmation claim (holder binding) */
  cnf?: ConfirmationClaim;
  /** Status (for revocation) */
  status?: StatusClaim;
}
/**
 * Confirmation Claim (cnf)
 * Used for holder binding
 */
export interface ConfirmationClaim {
  /** JWK thumbprint */
  jkt?: string;
  /** JWK (full key) */
  jwk?: JWK;
}
/**
 * Status Claim
 * For credential status (revocation) checking
 */
export interface StatusClaim {
  /** Status list index */
  status_list?: {
    idx: number;
    uri: string;
  };
}
/**
 * Key Binding JWT (KB-JWT) Payload
 */
export interface KBJWTPayload extends JWTPayload {
  /** Audience (Verifier identifier) */
  aud: string;
  /** Issued at */
  iat: number;
  /** Nonce from Verifier */
  nonce: string;
  /** Hash of SD-JWT */
  sd_hash: string;
}
/**
 * SD-JWT VC Creation Options
 */
export interface SDJWTVCCreateOptions {
  /** Verifiable Credential Type */
  vct: string;
  /** Claims to make selectively disclosable */
  selectiveDisclosureClaims: string[];
  /** Holder binding key (JWK) */
  holderBinding?: JWK;
  /** Credential expiration (Unix timestamp) */
  expiresAt?: number;
  /** Credential not before (Unix timestamp) */
  notBefore?: number;
  /** Status list for revocation */
  status?: StatusClaim;
  /** JWT ID */
  jti?: string;
}
/**
 * SD-JWT VC Result
 */
export interface SDJWTVC {
  /** Issuer-signed JWT */
  issuerJwt: string;
  /** Disclosures */
  disclosures: SDJWTDisclosure[];
  /** Combined SD-JWT VC (without KB-JWT) */
  combined: string;
}
/**
 * Parsed SD-JWT VC
 */
export interface ParsedSDJWTVC {
  /** Issuer-signed JWT */
  issuerJwt: string;
  /** Decoded issuer JWT payload */
  payload: SDJWTVCPayload;
  /** Disclosures */
  disclosures: SDJWTDisclosure[];
  /** Key Binding JWT (if present) */
  kbJwt?: string;
  /** Decoded KB-JWT payload (if present) */
  kbPayload?: KBJWTPayload;
}
/**
 * SD-JWT VC Verification Options
 */
export interface SDJWTVCVerifyOptions {
  /** Expected issuer */
  issuer: string;
  /** Expected VCT */
  vct?: string;
  /** HAIP policy to apply */
  haipPolicy?: HaipPolicy;
  /** Nonce (for KB-JWT verification) */
  nonce?: string;
  /** Audience (for KB-JWT verification) */
  audience?: string;
  /** Current time for expiration check */
  currentTime?: number;
}
/**
 * SD-JWT VC Verification Result
 */
export interface SDJWTVCVerifyResult {
  /** Verification success */
  verified: boolean;
  /** Issuer JWT payload */
  payload: SDJWTVCPayload;
  /** Disclosed claims */
  disclosedClaims: Record<string, unknown>;
  /** Holder binding verified */
  holderBindingVerified: boolean;
  /** Disclosures */
  disclosures: SDJWTDisclosure[];
  /** Number of undisclosed claims */
  undisclosedCount: number;
}
/**
 * Create an SD-JWT VC
 *
 * @param claims - All claims to include
 * @param issuer - Issuer identifier (DID or URL)
 * @param privateKey - Issuer's private key
 * @param algorithm - Signing algorithm
 * @param kid - Key ID
 * @param options - Creation options
 * @returns SD-JWT VC
 */
export declare function createSDJWTVC(
  claims: Record<string, unknown>,
  issuer: string,
  privateKey: CryptoKey,
  algorithm: ECAlgorithm,
  kid: string,
  options: SDJWTVCCreateOptions
): Promise<SDJWTVC>;
/**
 * Parse an SD-JWT VC string
 *
 * @param sdjwtvc - SD-JWT VC string
 * @returns Parsed SD-JWT VC
 */
export declare function parseSDJWTVC(sdjwtvc: string): Promise<ParsedSDJWTVC | null>;
/**
 * Verify an SD-JWT VC
 *
 * @param sdjwtvc - SD-JWT VC string
 * @param issuerKey - Issuer's public key
 * @param holderKey - Holder's public key (for KB-JWT verification)
 * @param options - Verification options
 * @returns Verification result
 */
export declare function verifySDJWTVC(
  sdjwtvc: string,
  issuerKey: CryptoKey,
  holderKey: CryptoKey | null,
  options: SDJWTVCVerifyOptions
): Promise<SDJWTVCVerifyResult>;
/**
 * Create a Key Binding JWT
 *
 * @param holderPrivateKey - Holder's private key
 * @param algorithm - Signing algorithm
 * @param nonce - Nonce from Verifier
 * @param audience - Verifier identifier
 * @param sdjwtvc - SD-JWT VC string (without KB-JWT)
 * @returns KB-JWT string
 */
export declare function createKeyBindingJWT(
  holderPrivateKey: CryptoKey,
  algorithm: ECAlgorithm,
  nonce: string,
  audience: string,
  sdjwtvc: string
): Promise<string>;
/**
 * Create a presentation from SD-JWT VC with Key Binding
 *
 * @param sdjwtvc - Original SD-JWT VC
 * @param claimsToDisclose - Claims to include in presentation
 * @param holderPrivateKey - Holder's private key
 * @param algorithm - Signing algorithm
 * @param nonce - Nonce from Verifier
 * @param audience - Verifier identifier
 * @returns Presentation string (SD-JWT VC + KB-JWT)
 */
export declare function createVCPresentation(
  sdjwtvc: SDJWTVC,
  claimsToDisclose: string[],
  holderPrivateKey: CryptoKey,
  algorithm: ECAlgorithm,
  nonce: string,
  audience: string
): Promise<string>;
/**
 * Check if an SD-JWT VC is valid (type check only)
 */
export declare function isSDJWTVC(token: string): boolean;
/**
 * Extract VCT from an SD-JWT VC without full verification
 */
export declare function extractVCT(token: string): string | null;
//# sourceMappingURL=sd-jwt-vc.d.ts.map
