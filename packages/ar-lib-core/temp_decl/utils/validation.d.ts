/**
 * Validation Utilities
 *
 * Provides validation functions for OpenID Connect and OAuth 2.0 parameters.
 * Ensures that all input parameters meet specification requirements.
 */
import type { PresentationDefinition, ClientIdScheme } from '../types/openid4vp';
/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}
/**
 * Client ID validation
 * Must be a non-empty string with reasonable length
 *
 * @param clientId - Client identifier to validate
 * @returns ValidationResult
 */
export declare function validateClientId(clientId: string | undefined): ValidationResult;
/**
 * Re-export ClientIdScheme from openid4vp types for convenience
 * Note: The canonical definition is in types/openid4vp.ts
 */
export type { ClientIdScheme } from '../types/openid4vp';
/**
 * Client ID Scheme validation result
 */
export interface ClientIdSchemeValidationResult extends ValidationResult {
  /** The validated client_id scheme */
  scheme?: ClientIdScheme;
  /** Extracted identifier from client_id (e.g., DID, domain) */
  identifier?: string;
}
/**
 * Validate client_id based on client_id_scheme per OpenID4VP draft-23
 *
 * Each scheme has different validation rules:
 * - pre-registered: client_id matches pre-registered verifier
 * - redirect_uri: client_id is the redirect URI itself
 * - entity_id: client_id is an OpenID Federation Entity ID
 * - did: client_id is a DID (did:web, did:key, etc.)
 * - verifier_attestation: client_id from attestation JWT
 * - x509_san_dns: client_id is DNS name from X.509 SAN
 * - x509_san_uri: client_id is URI from X.509 SAN
 *
 * @param clientId - Client identifier
 * @param scheme - Client ID scheme
 * @param options - Validation options
 * @returns ClientIdSchemeValidationResult
 */
export declare function validateClientIdScheme(
  clientId: string | undefined,
  scheme: string | undefined,
  options?: {
    /** List of pre-registered client IDs (for pre-registered scheme) */
    preRegisteredClients?: string[];
    /** Allow HTTP for redirect_uri scheme in development */
    allowHttp?: boolean;
  }
): ClientIdSchemeValidationResult;
/**
 * Redirect URI validation
 * Must be a valid HTTPS URL (or http://localhost for development)
 *
 * @param redirectUri - Redirect URI to validate
 * @param allowHttp - Allow http:// for development (default: false)
 * @returns ValidationResult
 */
export declare function validateRedirectUri(
  redirectUri: string | undefined,
  allowHttp?: boolean
): ValidationResult;
/**
 * Scope validation
 * Must contain 'openid' and only valid scope values
 *
 * @param scope - Space-separated scope string
 * @param allowCustomScopes - Allow custom scopes (for resource server integration)
 * @returns ValidationResult
 */
export declare function validateScope(
  scope: string | undefined,
  allowCustomScopes?: boolean
): ValidationResult;
/**
 * State parameter validation
 * Optional but recommended for CSRF protection
 *
 * @param state - State parameter to validate
 * @returns ValidationResult
 */
export declare function validateState(state: string | undefined): ValidationResult;
/**
 * Nonce parameter validation
 * Optional but recommended for replay protection
 *
 * @param nonce - Nonce parameter to validate
 * @returns ValidationResult
 */
export declare function validateNonce(nonce: string | undefined): ValidationResult;
/**
 * Grant type validation
 * Supports 'authorization_code' and 'refresh_token' grant types
 *
 * @param grantType - Grant type to validate
 * @returns ValidationResult
 */
export declare function validateGrantType(grantType: string | undefined): ValidationResult;
/**
 * Response type validation
 * Must be 'code' for authorization code flow
 *
 * @param responseType - Response type to validate
 * @returns ValidationResult
 */
export declare function validateResponseType(responseType: string | undefined): ValidationResult;
/**
 * Authorization code validation
 * Accepts base64url-encoded random strings (recommended minimum 32 characters)
 *
 * @param code - Authorization code to validate
 * @returns ValidationResult
 */
export declare function validateAuthCode(code: string | undefined): ValidationResult;
/**
 * Token validation (JWT format)
 * Must be a valid JWT format (3 parts separated by dots)
 *
 * @param token - Token to validate
 * @returns ValidationResult
 */
export declare function validateToken(token: string | undefined): ValidationResult;
/**
 * Normalize a URL for secure comparison
 *
 * RFC 6749 Section 3.1.2.3: Comparing redirect URIs
 * - Case-sensitive comparison for scheme and host (after normalization)
 * - Path comparison is case-sensitive
 * - Default ports should be normalized (80 for http, 443 for https)
 * - Trailing slashes and query strings need careful handling
 *
 * Security considerations:
 * - Prevents Open Redirect attacks via URL manipulation
 * - Handles edge cases like trailing slashes, default ports, empty paths
 *
 * @param uri - URL to normalize
 * @returns Normalized URL string or null if invalid
 */
export declare function normalizeRedirectUri(uri: string): string | null;
/**
 * Check if a provided redirect_uri matches any registered URI
 *
 * This function performs secure URL comparison with normalization
 * to prevent Open Redirect vulnerabilities.
 *
 * @param providedUri - The redirect_uri from the authorization request
 * @param registeredUris - Array of registered redirect_uris for the client
 * @returns true if the providedUri matches any registered URI
 */
export declare function isRedirectUriRegistered(
  providedUri: string,
  registeredUris: string[]
): boolean;
/**
 * Presentation Definition validation result
 */
export interface PDValidationResult {
  valid: boolean;
  errors: string[];
}
/**
 * Validate a Presentation Definition
 *
 * Validates the structure and content of a Presentation Definition
 * per DIF Presentation Exchange specification.
 *
 * @param pd - The Presentation Definition to validate
 * @returns Validation result with errors
 */
export declare function validatePresentationDefinition(pd: unknown): PDValidationResult;
/**
 * JAR Request Object validation result
 */
export interface JARValidationResult {
  valid: boolean;
  errors: string[];
  claims?: Record<string, unknown>;
}
/**
 * JAR validation options
 */
export interface JARValidationOptions {
  /** Expected audience (usually the authorization server's issuer identifier) */
  audience: string;
  /** Expected issuer (the client_id for OIDC, or client's entity identifier) */
  expectedIssuer?: string;
  /** Maximum age of the request object in seconds (default: 300 = 5 minutes) */
  maxAge?: number;
  /** Clock skew tolerance in seconds (default: 60) */
  clockSkew?: number;
  /** Whether to require jti for replay prevention (default: false) */
  requireJti?: boolean;
  /** Set of previously seen jti values for replay prevention */
  seenJtiSet?: Set<string>;
}
/**
 * Validate JWT-Secured Authorization Request (JAR) claims
 *
 * Per RFC 9101:
 * - iss (REQUIRED): Must match client_id or client's registered issuer
 * - aud (REQUIRED): Must include the authorization server's issuer identifier
 * - exp (RECOMMENDED): Expiration time
 * - iat (RECOMMENDED): Issued at time
 * - jti (OPTIONAL): JWT ID for replay prevention
 *
 * @param claims - Parsed JWT claims from the request object
 * @param options - Validation options
 * @returns JARValidationResult
 */
export declare function validateJARClaims(
  claims: unknown,
  options: JARValidationOptions
): JARValidationResult;
/**
 * Validate that request object claims don't conflict with query parameters
 *
 * Per RFC 9101 Section 6.3:
 * - client_id in query parameter and request object MUST match if both present
 * - Other parameters in request object take precedence
 *
 * @param requestObjectClaims - Claims from the request object
 * @param queryParams - Query parameters from the authorization request
 * @returns Array of error messages
 */
export declare function validateJARParameterConsistency(
  requestObjectClaims: Record<string, unknown>,
  queryParams: Record<string, string | undefined>
): string[];
/**
 * Re-export types from openid4vp for convenience
 * Note: The canonical definitions are in types/openid4vp.ts
 */
export type { DescriptorMapEntry, PresentationSubmission } from '../types/openid4vp';
/**
 * Presentation Submission validation result
 */
export interface PSValidationResult {
  valid: boolean;
  errors: string[];
}
/**
 * Validate a Presentation Submission against a Presentation Definition
 *
 * Per DIF Presentation Exchange specification:
 * - id and definition_id must be strings
 * - descriptor_map must have entries for all required Input Descriptors
 * - Each descriptor_map entry must reference a valid Input Descriptor id
 * - path must be valid JSONPath syntax
 * - format must be a recognized credential format
 *
 * @param submission - The Presentation Submission to validate
 * @param definition - The Presentation Definition to validate against
 * @returns PSValidationResult with errors if invalid
 */
export declare function validatePresentationSubmission(
  submission: unknown,
  definition: PresentationDefinition
): PSValidationResult;
//# sourceMappingURL=validation.d.ts.map
