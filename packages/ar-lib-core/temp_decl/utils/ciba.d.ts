/**
 * CIBA (Client Initiated Backchannel Authentication) Utilities
 * OpenID Connect CIBA Flow Core 1.0
 * https://openid.net/specs/openid-client-initiated-backchannel-authentication-core-1_0.html
 */
import type { CIBARequestMetadata } from '../types/oidc';
import type { JWK } from 'jose';
/**
 * JWT Payload structure for CIBA hints
 */
interface CIBAJWTPayload {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  nbf?: number;
  jti?: string;
  [key: string]: unknown;
}
/**
 * Result of JWT hint validation
 */
export interface JWTHintValidationResult {
  valid: boolean;
  error?: string;
  error_description?: string;
  payload?: CIBAJWTPayload;
  subjectId?: string;
}
/**
 * Options for validating JWT hints
 */
export interface ValidateJWTHintOptions {
  /** Expected issuer (required for id_token_hint, this server's URL) */
  issuerUrl?: string;
  /** Expected audience (required for login_hint_token) */
  audience?: string;
  /** Clock skew tolerance in seconds (default: 60) */
  clockSkewSeconds?: number;
  /** JWKS for signature verification (optional, if not provided, signature is not verified) */
  jwks?: {
    keys: JWK[];
  };
}
/**
 * Generate an authentication request ID (auth_req_id)
 * Should be cryptographically random and unique
 *
 * @returns Authentication request ID (UUID v4)
 */
export declare function generateAuthReqId(): string;
/**
 * Generate a user code for CIBA (optional)
 * Similar to device flow user code but for CIBA binding message
 *
 * Examples: "WDJB-MJHT", "BDSD-HQMK", "PPZZ-JJKK"
 *
 * Character set: Excludes ambiguous characters (0, O, 1, I, L)
 *
 * @returns User code string (format: XXXX-XXXX)
 */
export declare function generateCIBAUserCode(): string;
/**
 * Check if CIBA request has expired
 *
 * @param metadata - CIBA request metadata
 * @returns true if expired, false otherwise
 */
export declare function isCIBARequestExpired(metadata: CIBARequestMetadata): boolean;
/**
 * Check if client is polling too frequently (slow down detection)
 * CIBA spec: Clients should wait at least the interval specified
 *
 * @param metadata - CIBA request metadata
 * @returns true if polling too fast, false otherwise
 */
export declare function isPollingTooFast(metadata: CIBARequestMetadata): boolean;
/**
 * Extract user identifier from login_hint
 * Supports formats:
 * - Email: user@example.com
 * - Phone: +1234567890 or tel:+1234567890
 * - Subject: sub:user123
 * - Username: username
 *
 * @param loginHint - Login hint string
 * @returns Parsed login hint info
 */
export declare function parseLoginHint(loginHint: string): {
  type: 'email' | 'phone' | 'sub' | 'username';
  value: string;
};
/**
 * Validate binding message format
 * Should be human-readable and not too long
 *
 * @param bindingMessage - Binding message to validate
 * @returns Validation result with error if invalid
 */
export declare function validateBindingMessage(bindingMessage?: string): {
  valid: boolean;
  error?: string;
};
/**
 * Determine token delivery mode from client configuration
 *
 * @param requestedMode - Requested delivery mode
 * @param notificationEndpoint - Client notification endpoint URL
 * @param clientNotificationToken - Client notification token
 * @returns Delivery mode
 */
export declare function determineDeliveryMode(
  requestedMode: string | null,
  notificationEndpoint: string | null,
  clientNotificationToken: string | null
): 'poll' | 'ping' | 'push';
/**
 * Calculate appropriate polling interval based on request expiry
 *
 * @param requestedInterval - Requested interval in seconds (null for default)
 * @returns Polling interval in seconds
 */
export declare function calculatePollingInterval(requestedInterval: number | null): number;
/**
 * CIBA Flow Constants
 * OpenID Connect CIBA Core 1.0 recommended values
 */
export declare const CIBA_CONSTANTS: {
  readonly DEFAULT_EXPIRES_IN: 300;
  readonly MIN_EXPIRES_IN: 60;
  readonly MAX_EXPIRES_IN: 600;
  readonly DEFAULT_INTERVAL: 5;
  readonly MIN_INTERVAL: 2;
  readonly MAX_INTERVAL: 60;
  readonly SLOW_DOWN_INCREMENT: 5;
  readonly MAX_POLL_COUNT: 120;
  readonly MAX_BINDING_MESSAGE_LENGTH: 140;
  readonly MIN_BINDING_MESSAGE_LENGTH: 1;
  readonly USER_CODE_LENGTH: 9;
  readonly AUTH_REQ_ID_FORMAT: 'uuid';
  readonly DELIVERY_MODES: readonly ['poll', 'ping', 'push'];
  readonly DEFAULT_AUTH_REQ_TTL: 300;
};
/**
 * Validate id_token_hint JWT for CIBA flow
 *
 * Per CIBA spec, id_token_hint must be a valid ID token previously issued
 * by this authorization server. It's used to identify the end-user.
 *
 * Security validations:
 * - Algorithm must be asymmetric (RS256, ES256, etc.) - not 'none' or symmetric
 * - Issuer must match this authorization server
 * - Token must not be expired (with clock skew tolerance)
 * - Token must not be used before nbf (if present)
 * - Sub claim must be present
 *
 * @param idTokenHint - The id_token_hint JWT string
 * @param options - Validation options
 * @returns Validation result with extracted subject ID
 */
export declare function validateCIBAIdTokenHint(
  idTokenHint: string,
  options?: ValidateJWTHintOptions
): JWTHintValidationResult;
/**
 * Validate login_hint_token JWT for CIBA flow
 *
 * Per CIBA spec, login_hint_token is a JWT that contains information about
 * the end-user. It may be issued by a third party that can identify users.
 *
 * Security validations:
 * - Algorithm must be asymmetric (RS256, ES256, etc.)
 * - Audience must match this authorization server
 * - Token must not be expired
 * - Token must not be used before nbf (if present)
 * - Sub or subject claim must be present
 *
 * @param loginHintToken - The login_hint_token JWT string
 * @param options - Validation options
 * @returns Validation result with extracted subject ID
 */
export declare function validateCIBALoginHintToken(
  loginHintToken: string,
  options?: ValidateJWTHintOptions
): JWTHintValidationResult;
/**
 * Validate CIBA authentication request parameters
 *
 * @param params - Request parameters
 * @returns Validation result
 */
export declare function validateCIBARequest(params: {
  scope?: string;
  login_hint?: string;
  login_hint_token?: string;
  id_token_hint?: string;
  binding_message?: string;
  user_code?: string;
  requested_expiry?: number;
}): {
  valid: boolean;
  error?: string;
  error_description?: string;
};
export {};
//# sourceMappingURL=ciba.d.ts.map
