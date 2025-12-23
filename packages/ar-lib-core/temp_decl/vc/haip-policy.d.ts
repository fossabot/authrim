/**
 * HAIP (High Assurance Interoperability Profile) Abstraction Layer
 *
 * Implements the HAIP profile for OpenID4VP and OpenID4VCI.
 * This layer abstracts HAIP-specific requirements to allow easy migration
 * when the specification transitions from draft to Final.
 *
 * Current: draft-oid4vc-haip-sd-jwt-vc-06
 *
 * @see https://openid.net/specs/openid4vc-high-assurance-interoperability-profile-sd-jwt-vc-1_0.html
 */
/**
 * HAIP Policy configuration
 * Defines the requirements for high-assurance credential verification
 */
export interface HaipPolicy {
  /** Require holder binding verification (KB-JWT) */
  requireHolderBinding: boolean;
  /** Require issuer to be in trusted registry */
  requireIssuerTrust: boolean;
  /** Require credential status check (Status List 2021) */
  requireStatusCheck: boolean;
  /** Allowed signature algorithms */
  allowedAlgorithms: HaipSignatureAlgorithm[];
  /** Maximum credential age in seconds (optional) */
  maxCredentialAge?: number;
  /** Allowed credential formats */
  allowedFormats: HaipCredentialFormat[];
  /** Require DCQL for presentation definition (vs legacy Presentation Exchange) */
  preferDCQL: boolean;
  /** Require direct_post response mode */
  requireDirectPost: boolean;
  /** Require JWT-Secured Authorization Request (JAR) */
  requireRequestObject?: boolean;
  /** Require nonce in KB-JWT (replay protection) */
  requireNonceInKBJWT?: boolean;
  /** Require aud claim in KB-JWT to match verifier ID */
  requireAudienceInKBJWT?: boolean;
  /** Allowed client ID schemes (HAIP: x509_san_dns, verifier_attestation required; did, x509_san_uri optional) */
  allowedClientIdSchemes?: HaipClientIdScheme[];
  /** Require confirmation claim (cnf) to use JWK thumbprint (jkt) vs full JWK */
  requireJktInCnf?: boolean;
  /** Require type header (typ: "dc+sd-jwt") in issuer JWT */
  requireTypHeader?: boolean;
  /** Maximum allowed clock skew in seconds */
  maxClockSkew?: number;
  /** Require trust chain header for issuer verification */
  requireTrustChain?: boolean;
  /** Trust anchors for X.509 certificate chain validation */
  trustAnchors?: string[];
}
/**
 * HAIP-compliant Client ID Schemes
 */
export type HaipClientIdScheme =
  | 'pre-registered'
  | 'redirect_uri'
  | 'entity_id'
  | 'did'
  | 'verifier_attestation'
  | 'x509_san_dns'
  | 'x509_san_uri';
/**
 * HAIP-compliant signature algorithms
 * HAIP requires ES256, ES384, or ES512 for SD-JWT VC
 */
export type HaipSignatureAlgorithm = 'ES256' | 'ES384' | 'ES512';
/**
 * HAIP-compliant credential formats
 */
export type HaipCredentialFormat = 'dc+sd-jwt' | 'mso_mdoc';
/**
 * HAIP Profile versions
 */
export type HaipProfileVersion = 'draft-06' | 'final-1.0';
/**
 * HAIP draft-06 default policy
 * Strict requirements for high-assurance use cases
 */
export declare const HAIP_DRAFT_06: HaipPolicy;
/**
 * Standard (non-HAIP) policy
 * Relaxed requirements for general use cases
 */
export declare const STANDARD_POLICY: HaipPolicy;
/**
 * Get HAIP policy by version
 *
 * @param version - HAIP profile version
 * @returns HaipPolicy for the specified version
 */
export declare function getHaipPolicy(version: HaipProfileVersion): HaipPolicy;
/**
 * HAIP Credential Type requirements
 * Maps VCT to required claims for HAIP compliance
 */
export interface HaipCredentialTypeRequirement {
  /** Verifiable Credential Type (VCT) */
  vct: string;
  /** Required claims that must be present */
  requiredClaims: string[];
  /** Claims that must be selectively disclosable */
  selectiveDisclosureClaims: string[];
  /** Minimum assurance level */
  minAssuranceLevel?: 'low' | 'substantial' | 'high';
}
/**
 * Common HAIP credential types
 */
export declare const HAIP_CREDENTIAL_TYPES: Record<string, HaipCredentialTypeRequirement>;
/**
 * HAIP Policy Evaluator
 *
 * Evaluates credentials and presentations against HAIP requirements.
 * Abstracts HAIP-specific logic for easy migration when spec changes.
 */
export declare class HaipPolicyEvaluator {
  private policy;
  constructor(policy?: HaipPolicy);
  /**
   * Check if a signature algorithm is allowed
   */
  isAlgorithmAllowed(alg: string): boolean;
  /**
   * Check if a credential format is allowed
   */
  isFormatAllowed(format: string): boolean;
  /**
   * Check if holder binding is required
   */
  isHolderBindingRequired(): boolean;
  /**
   * Check if issuer trust verification is required
   */
  isIssuerTrustRequired(): boolean;
  /**
   * Check if status check is required
   */
  isStatusCheckRequired(): boolean;
  /**
   * Check if credential is within max age
   */
  isWithinMaxAge(issuedAt: number): boolean;
  /**
   * Get the current policy configuration
   */
  getPolicy(): Readonly<HaipPolicy>;
  /**
   * Update policy (for dynamic configuration)
   */
  updatePolicy(updates: Partial<HaipPolicy>): void;
  /**
   * Validate a credential verification result against HAIP requirements
   */
  validateVerificationResult(result: HaipVerificationInput): HaipValidationResult;
  /**
   * Check if a client ID scheme is allowed
   */
  isClientIdSchemeAllowed(scheme: HaipClientIdScheme): boolean;
  /**
   * Check if credential is expired considering clock skew
   */
  isExpired(expiresAt: number): boolean;
}
/**
 * Input for HAIP verification validation
 */
export interface HaipVerificationInput {
  /** Signature algorithm used */
  algorithm: string;
  /** Credential format */
  format: string;
  /** Was holder binding verified */
  holderBindingVerified: boolean;
  /** Is issuer in trusted registry */
  issuerTrusted: boolean;
  /** Is credential status valid (not revoked) */
  statusValid: boolean;
  /** Credential issuance timestamp (Unix seconds) */
  issuedAt?: number;
  /** Was a request object (JAR) used */
  usedRequestObject?: boolean;
  /** Was nonce present in KB-JWT */
  kbJwtHasNonce?: boolean;
  /** Was audience present in KB-JWT */
  kbJwtHasAudience?: boolean;
  /** Client ID scheme used */
  clientIdScheme?: HaipClientIdScheme;
  /** Does cnf claim use JWK thumbprint (jkt) */
  cnfUsesJkt?: boolean;
  /** Does issuer JWT have correct type header (dc+sd-jwt) */
  hasCorrectTypHeader?: boolean;
  /** Was trust chain verified */
  trustChainVerified?: boolean;
  /** Credential expiration timestamp (Unix seconds) */
  expiresAt?: number;
}
/**
 * HAIP validation result
 */
export interface HaipValidationResult {
  /** Is the verification valid (meets minimum requirements) */
  valid: boolean;
  /** Is the verification fully HAIP compliant */
  haipCompliant: boolean;
  /** List of validation errors */
  errors: string[];
  /** List of validation warnings */
  warnings: string[];
}
//# sourceMappingURL=haip-policy.d.ts.map
