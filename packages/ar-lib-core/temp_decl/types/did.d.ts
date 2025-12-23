/**
 * DID (Decentralized Identifier) Types
 *
 * Type definitions for DID Core 1.0 (W3C Recommendation)
 * Supports did:web and did:key methods for Phase 9.
 *
 * @see https://www.w3.org/TR/did-core/
 */
/**
 * DID Document
 * The core data model for a DID
 */
export interface DIDDocument {
  /** JSON-LD context */
  '@context': string | string[];
  /** The DID subject */
  id: string;
  /** Alternative identifiers */
  alsoKnownAs?: string[];
  /** Controllers of this DID */
  controller?: string | string[];
  /** Verification methods (public keys) */
  verificationMethod?: VerificationMethod[];
  /** Authentication verification relationships */
  authentication?: (string | VerificationMethod)[];
  /** Assertion method verification relationships */
  assertionMethod?: (string | VerificationMethod)[];
  /** Key agreement verification relationships */
  keyAgreement?: (string | VerificationMethod)[];
  /** Capability invocation verification relationships */
  capabilityInvocation?: (string | VerificationMethod)[];
  /** Capability delegation verification relationships */
  capabilityDelegation?: (string | VerificationMethod)[];
  /** Service endpoints */
  service?: ServiceEndpoint[];
}
/**
 * Verification Method
 * A public key or other verification material
 */
export interface VerificationMethod {
  /** Verification method ID (usually DID#key-id) */
  id: string;
  /** Type of verification method */
  type: VerificationMethodType;
  /** Controller of this verification method */
  controller: string;
  /** Public key in JWK format */
  publicKeyJwk?: JsonWebKey2020;
  /** Public key in multibase format */
  publicKeyMultibase?: string;
  /** Blockchain account ID (for blockchain-based DIDs) */
  blockchainAccountId?: string;
}
/**
 * Verification Method Types
 */
export type VerificationMethodType =
  | 'JsonWebKey2020'
  | 'Ed25519VerificationKey2020'
  | 'EcdsaSecp256k1VerificationKey2019'
  | 'X25519KeyAgreementKey2020'
  | 'Multikey';
/**
 * JWK for verification methods
 */
export interface JsonWebKey2020 {
  /** Key type */
  kty: 'EC' | 'OKP' | 'RSA';
  /** Curve (for EC/OKP) */
  crv?: 'P-256' | 'P-384' | 'P-521' | 'Ed25519' | 'X25519' | 'secp256k1';
  /** X coordinate (for EC) */
  x?: string;
  /** Y coordinate (for EC) */
  y?: string;
  /** RSA modulus */
  n?: string;
  /** RSA exponent */
  e?: string;
  /** Key ID */
  kid?: string;
  /** Key use */
  use?: 'sig' | 'enc';
  /** Algorithm */
  alg?: string;
}
/**
 * Service Endpoint
 */
export interface ServiceEndpoint {
  /** Service ID */
  id: string;
  /** Service type */
  type: string | string[];
  /** Service endpoint URL(s) */
  serviceEndpoint: string | string[] | ServiceEndpointMap;
}
/**
 * Service Endpoint Map (for complex endpoints)
 */
export interface ServiceEndpointMap {
  [key: string]: string | string[];
}
/**
 * DID Resolution Result
 */
export interface DIDResolutionResult {
  /** Resolution context */
  '@context'?: string;
  /** The resolved DID Document */
  didDocument: DIDDocument | null;
  /** Resolution metadata */
  didResolutionMetadata: DIDResolutionMetadata;
  /** Document metadata */
  didDocumentMetadata: DIDDocumentMetadata;
}
/**
 * DID Resolution Metadata
 */
export interface DIDResolutionMetadata {
  /** Content type of the document */
  contentType?: string;
  /** Error code if resolution failed */
  error?: DIDResolutionError;
  /** Error message */
  message?: string;
  /** Duration of resolution in milliseconds */
  duration?: number;
}
/**
 * DID Resolution Errors
 */
export type DIDResolutionError =
  | 'invalidDid'
  | 'notFound'
  | 'representationNotSupported'
  | 'methodNotSupported'
  | 'internalError';
/**
 * DID Document Metadata
 */
export interface DIDDocumentMetadata {
  /** Created timestamp */
  created?: string;
  /** Updated timestamp */
  updated?: string;
  /** Deactivated flag */
  deactivated?: boolean;
  /** Next update hint */
  nextUpdate?: string;
  /** Version ID */
  versionId?: string;
  /** Next version ID */
  nextVersionId?: string;
  /** Equivalent IDs */
  equivalentId?: string[];
  /** Canonical ID */
  canonicalId?: string;
}
/**
 * DID Method
 */
export type DIDMethod = 'web' | 'key' | 'ion' | 'ethr' | 'pkh';
/**
 * Parsed DID
 */
export interface ParsedDID {
  /** Full DID string */
  did: string;
  /** DID method */
  method: DIDMethod;
  /** Method-specific identifier */
  methodSpecificId: string;
  /** Path (if present) */
  path?: string;
  /** Query (if present) */
  query?: string;
  /** Fragment (if present) */
  fragment?: string;
}
/**
 * DID Resolver interface
 */
export interface DIDResolver {
  /**
   * Resolve a DID to its DID Document
   *
   * @param did - The DID to resolve
   * @returns Resolution result
   */
  resolve(did: string): Promise<DIDResolutionResult>;
  /**
   * Check if this resolver supports the given DID method
   *
   * @param method - DID method
   * @returns True if supported
   */
  supportsMethod(method: DIDMethod): boolean;
}
/**
 * Parse a DID string into components
 *
 * @param did - DID string to parse
 * @returns Parsed DID or null if invalid
 */
export declare function parseDID(did: string): ParsedDID | null;
/**
 * Validate a DID string
 *
 * @param did - DID string to validate
 * @returns True if valid
 */
export declare function isValidDID(did: string): boolean;
/**
 * Check if a DID uses a supported method
 *
 * @param did - DID string
 * @param supportedMethods - List of supported methods
 * @returns True if method is supported
 */
export declare function isDIDMethodSupported(did: string, supportedMethods: DIDMethod[]): boolean;
/**
 * Resolve a DID to its DID Document
 *
 * Supports:
 * - did:web - fetches from HTTPS URL
 * - did:key - decodes multibase key (basic implementation)
 *
 * @param did - DID string to resolve
 * @returns DID Document
 * @throws Error if resolution fails
 */
export declare function resolveDID(did: string): Promise<DIDDocument>;
/**
 * Convert did:web to HTTPS URL
 *
 * @param did - did:web DID string
 * @returns HTTPS URL for the DID document
 */
export declare function didWebToUrl(did: string): string | null;
//# sourceMappingURL=did.d.ts.map
