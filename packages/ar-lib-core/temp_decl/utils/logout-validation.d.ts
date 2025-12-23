/**
 * Logout Validation Utilities
 *
 * Provides validation functions for OpenID Connect logout endpoints.
 * Implements validation for id_token_hint and post_logout_redirect_uri
 * per OpenID Connect RP-Initiated Logout 1.0 specification.
 */
import type { CryptoKey } from 'jose';
import type { ValidationResult } from './validation';
/**
 * ID Token Hint validation result
 */
export interface IdTokenHintValidationResult {
  valid: boolean;
  userId?: string;
  clientId?: string;
  sid?: string;
  error?: string;
  errorCode?: 'invalid_token' | 'invalid_request';
}
/**
 * Options for ID Token Hint validation
 */
export interface IdTokenHintValidationOptions {
  /** Whether id_token_hint is required (default: false) */
  required?: boolean;
  /** Whether to allow expired tokens (default: true for logout) */
  allowExpired?: boolean;
}
/**
 * Validate ID Token Hint for logout endpoints
 *
 * Per OpenID Connect RP-Initiated Logout 1.0:
 * - If provided, MUST be a valid ID Token issued by this OP
 * - The OP SHOULD verify the token signature
 * - May be expired (users should be able to logout even with expired tokens)
 *
 * @param idTokenHint - The id_token_hint parameter
 * @param getPublicKey - Function to get the public key for verification
 * @param issuer - Expected issuer URL
 * @param options - Validation options
 * @returns Validation result with extracted claims
 */
export declare function validateIdTokenHint(
  idTokenHint: string | undefined,
  getPublicKey: () => Promise<CryptoKey>,
  issuer: string,
  options?: IdTokenHintValidationOptions
): Promise<IdTokenHintValidationResult>;
/**
 * Validate post_logout_redirect_uri
 *
 * Per OpenID Connect RP-Initiated Logout 1.0:
 * - MUST be a valid URI
 * - MUST be registered for the client (exact match)
 * - Query parameters in the URI must match exactly
 *
 * @param uri - The post_logout_redirect_uri to validate
 * @param registeredUris - List of registered redirect URIs for the client
 * @returns ValidationResult
 */
export declare function validatePostLogoutRedirectUri(
  uri: string | undefined,
  registeredUris: string[]
): ValidationResult;
/**
 * Check if post_logout_redirect_uri requires id_token_hint
 *
 * Per OpenID Connect RP-Initiated Logout 1.0:
 * - If post_logout_redirect_uri is provided, id_token_hint SHOULD be provided
 * - Some OPs require id_token_hint when post_logout_redirect_uri is present
 *
 * @param postLogoutRedirectUri - The post_logout_redirect_uri parameter
 * @param idTokenHint - The id_token_hint parameter
 * @param requireIdTokenHint - Whether to require id_token_hint (default: true for security)
 * @returns ValidationResult
 */
export declare function validateLogoutParameters(
  postLogoutRedirectUri: string | undefined,
  idTokenHint: string | undefined,
  requireIdTokenHint?: boolean
): ValidationResult;
//# sourceMappingURL=logout-validation.d.ts.map
