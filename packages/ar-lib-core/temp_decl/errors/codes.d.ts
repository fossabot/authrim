/**
 * Authrim Error Codes Definition
 *
 * Centralized error code registry for OAuth/OIDC and Authrim-specific errors.
 *
 * Error Code Format:
 * - RFC Standard: snake_case (invalid_request, invalid_grant, etc.)
 * - Authrim: AR + 6 digits (AR000001, AR010001, etc.)
 *
 * Code Ranges:
 * - AR000001 ~ AR009999: AUTH (Authentication)
 * - AR010001 ~ AR019999: TOKEN
 * - AR020001 ~ AR029999: CLIENT
 * - AR030001 ~ AR039999: USER
 * - AR040001 ~ AR049999: SESSION
 * - AR050001 ~ AR059999: POLICY
 * - AR060001 ~ AR069999: ADMIN
 * - AR070001 ~ AR079999: SAML
 * - AR080001 ~ AR089999: VC (Verifiable Credentials)
 * - AR090001 ~ AR099999: BRIDGE (External IdP)
 * - AR100001 ~ AR109999: CONFIG
 * - AR110001 ~ AR119999: RATE (Rate Limiting)
 * - AR900001 ~ AR999999: INTERNAL (Reserved)
 *
 * @packageDocumentation
 */
import type { ErrorCodeDefinition } from './types';
/**
 * RFC 6749 / OIDC Standard Error Codes
 * These are used as the `error` field in OAuth responses
 */
export declare const RFC_ERROR_CODES: {
  readonly INVALID_REQUEST: 'invalid_request';
  readonly INVALID_CLIENT: 'invalid_client';
  readonly INVALID_GRANT: 'invalid_grant';
  readonly UNAUTHORIZED_CLIENT: 'unauthorized_client';
  readonly UNSUPPORTED_GRANT_TYPE: 'unsupported_grant_type';
  readonly INVALID_SCOPE: 'invalid_scope';
  readonly ACCESS_DENIED: 'access_denied';
  readonly UNSUPPORTED_RESPONSE_TYPE: 'unsupported_response_type';
  readonly SERVER_ERROR: 'server_error';
  readonly TEMPORARILY_UNAVAILABLE: 'temporarily_unavailable';
  readonly INTERACTION_REQUIRED: 'interaction_required';
  readonly LOGIN_REQUIRED: 'login_required';
  readonly ACCOUNT_SELECTION_REQUIRED: 'account_selection_required';
  readonly CONSENT_REQUIRED: 'consent_required';
  readonly INVALID_REQUEST_URI: 'invalid_request_uri';
  readonly INVALID_REQUEST_OBJECT: 'invalid_request_object';
  readonly REQUEST_NOT_SUPPORTED: 'request_not_supported';
  readonly REQUEST_URI_NOT_SUPPORTED: 'request_uri_not_supported';
  readonly REGISTRATION_NOT_SUPPORTED: 'registration_not_supported';
  readonly INVALID_TOKEN: 'invalid_token';
  readonly INSUFFICIENT_SCOPE: 'insufficient_scope';
  readonly AUTHORIZATION_PENDING: 'authorization_pending';
  readonly SLOW_DOWN: 'slow_down';
  readonly EXPIRED_TOKEN: 'expired_token';
  readonly INVALID_DPOP_PROOF: 'invalid_dpop_proof';
  readonly USE_DPOP_NONCE: 'use_dpop_nonce';
  readonly INVALID_BINDING_MESSAGE: 'invalid_binding_message';
  readonly ISSUANCE_PENDING: 'issuance_pending';
  readonly UNSUPPORTED_CREDENTIAL_FORMAT: 'unsupported_credential_format';
  readonly INVALID_PROOF: 'invalid_proof';
  readonly INVALID_REDIRECT_URI: 'invalid_redirect_uri';
  readonly INVALID_CLIENT_METADATA: 'invalid_client_metadata';
};
export type RFCErrorCode = (typeof RFC_ERROR_CODES)[keyof typeof RFC_ERROR_CODES];
/**
 * Authrim Error Codes
 */
export declare const AR_ERROR_CODES: {
  readonly AUTH_SESSION_EXPIRED: 'AR000001';
  readonly AUTH_SESSION_NOT_FOUND: 'AR000002';
  readonly AUTH_LOGIN_REQUIRED: 'AR000003';
  readonly AUTH_MFA_REQUIRED: 'AR000004';
  readonly AUTH_PASSKEY_FAILED: 'AR000005';
  readonly AUTH_INVALID_CODE: 'AR000006';
  readonly AUTH_CODE_EXPIRED: 'AR000007';
  readonly AUTH_PKCE_REQUIRED: 'AR000008';
  readonly AUTH_PKCE_INVALID: 'AR000009';
  readonly AUTH_NONCE_MISMATCH: 'AR000010';
  readonly AUTH_STATE_MISMATCH: 'AR000011';
  readonly AUTH_REDIRECT_URI_MISMATCH: 'AR000012';
  readonly AUTH_PROMPT_NONE_FAILED: 'AR000013';
  readonly AUTH_MAX_AGE_EXCEEDED: 'AR000014';
  readonly AUTH_DID_VERIFICATION_FAILED: 'AR000015';
  readonly TOKEN_INVALID: 'AR010001';
  readonly TOKEN_EXPIRED: 'AR010002';
  readonly TOKEN_REVOKED: 'AR010003';
  readonly TOKEN_REUSE_DETECTED: 'AR010004';
  readonly TOKEN_INVALID_SIGNATURE: 'AR010005';
  readonly TOKEN_INVALID_AUDIENCE: 'AR010006';
  readonly TOKEN_INVALID_ISSUER: 'AR010007';
  readonly TOKEN_DPOP_REQUIRED: 'AR010008';
  readonly TOKEN_DPOP_INVALID: 'AR010009';
  readonly TOKEN_DPOP_NONCE_REQUIRED: 'AR010010';
  readonly CLIENT_AUTH_FAILED: 'AR020001';
  readonly CLIENT_INVALID: 'AR020002';
  readonly CLIENT_REDIRECT_URI_INVALID: 'AR020003';
  readonly CLIENT_METADATA_INVALID: 'AR020004';
  readonly CLIENT_NOT_ALLOWED_GRANT: 'AR020005';
  readonly CLIENT_NOT_ALLOWED_SCOPE: 'AR020006';
  readonly CLIENT_SECRET_EXPIRED: 'AR020007';
  readonly CLIENT_JWKS_INVALID: 'AR020008';
  readonly USER_INVALID_CREDENTIALS: 'AR030001';
  readonly USER_LOCKED: 'AR030002';
  readonly USER_INACTIVE: 'AR030003';
  readonly USER_NOT_FOUND: 'AR030004';
  readonly USER_EMAIL_NOT_VERIFIED: 'AR030005';
  readonly USER_PHONE_NOT_VERIFIED: 'AR030006';
  readonly SESSION_STORE_ERROR: 'AR040001';
  readonly SESSION_INVALID_STATE: 'AR040002';
  readonly SESSION_CONCURRENT_LIMIT: 'AR040003';
  readonly POLICY_FEATURE_DISABLED: 'AR050001';
  readonly POLICY_NOT_CONFIGURED: 'AR050002';
  readonly POLICY_INVALID_API_KEY: 'AR050003';
  readonly POLICY_API_KEY_EXPIRED: 'AR050004';
  readonly POLICY_API_KEY_INACTIVE: 'AR050005';
  readonly POLICY_INSUFFICIENT_PERMISSIONS: 'AR050006';
  readonly POLICY_REBAC_DENIED: 'AR050007';
  readonly POLICY_ABAC_DENIED: 'AR050008';
  readonly ADMIN_AUTH_REQUIRED: 'AR060001';
  readonly ADMIN_INSUFFICIENT_PERMISSIONS: 'AR060002';
  readonly ADMIN_INVALID_REQUEST: 'AR060003';
  readonly ADMIN_RESOURCE_NOT_FOUND: 'AR060004';
  readonly ADMIN_CONFLICT: 'AR060005';
  readonly SAML_INVALID_RESPONSE: 'AR070001';
  readonly SAML_SLO_FAILED: 'AR070002';
  readonly SAML_SIGNATURE_INVALID: 'AR070003';
  readonly SAML_ASSERTION_EXPIRED: 'AR070004';
  readonly SAML_IDP_NOT_CONFIGURED: 'AR070005';
  readonly VC_ISSUANCE_PENDING: 'AR080001';
  readonly VC_UNSUPPORTED_FORMAT: 'AR080002';
  readonly VC_INVALID_PROOF: 'AR080003';
  readonly VC_CREDENTIAL_REVOKED: 'AR080004';
  readonly VC_STATUS_CHECK_FAILED: 'AR080005';
  readonly VC_DID_RESOLUTION_FAILED: 'AR080006';
  readonly BRIDGE_LINK_REQUIRED: 'AR090001';
  readonly BRIDGE_PROVIDER_AUTH_FAILED: 'AR090002';
  readonly BRIDGE_PROVIDER_UNAVAILABLE: 'AR090003';
  readonly BRIDGE_ACCOUNT_ALREADY_LINKED: 'AR090004';
  readonly BRIDGE_TOKEN_REFRESH_FAILED: 'AR090005';
  readonly BRIDGE_JIT_PROVISIONING_FAILED: 'AR090006';
  readonly CONFIG_KV_NOT_CONFIGURED: 'AR100001';
  readonly CONFIG_INVALID_VALUE: 'AR100002';
  readonly CONFIG_LOAD_ERROR: 'AR100003';
  readonly CONFIG_MISSING_SECRET: 'AR100004';
  readonly CONFIG_DB_NOT_CONFIGURED: 'AR100005';
  readonly RATE_LIMIT_EXCEEDED: 'AR110001';
  readonly RATE_SLOW_DOWN: 'AR110002';
  readonly RATE_TOO_MANY_REQUESTS: 'AR110003';
  readonly INTERNAL_ERROR: 'AR900001';
  readonly INTERNAL_DO_ERROR: 'AR900002';
  readonly INTERNAL_QUEUE_ERROR: 'AR900003';
};
export type ARErrorCode = (typeof AR_ERROR_CODES)[keyof typeof AR_ERROR_CODES];
/**
 * Complete error code definitions with metadata
 */
export declare const ERROR_DEFINITIONS: Record<ARErrorCode, ErrorCodeDefinition>;
/**
 * Get error definition by AR code
 */
export declare function getErrorDefinition(code: ARErrorCode): ErrorCodeDefinition | undefined;
/**
 * Get error definition by type slug
 */
export declare function getErrorDefinitionBySlug(slug: string): ErrorCodeDefinition | undefined;
//# sourceMappingURL=codes.d.ts.map
