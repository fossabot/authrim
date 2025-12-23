/**
 * OIDC and OAuth 2.0 Constants
 *
 * Centralized constant definitions for OpenID Connect and OAuth 2.0 protocol.
 * This file provides type-safe constants to avoid magic strings and numbers.
 */
/**
 * OpenID Connect Scopes
 * https://openid.net/specs/openid-connect-core-1_0.html#ScopeClaims
 */
export declare const OIDC_SCOPES: {
  readonly OPENID: 'openid';
  readonly PROFILE: 'profile';
  readonly EMAIL: 'email';
  readonly ADDRESS: 'address';
  readonly PHONE: 'phone';
  readonly OFFLINE_ACCESS: 'offline_access';
};
/**
 * Standard OIDC Claims
 * https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims
 */
export declare const STANDARD_CLAIMS: {
  readonly SUB: 'sub';
  readonly NAME: 'name';
  readonly GIVEN_NAME: 'given_name';
  readonly FAMILY_NAME: 'family_name';
  readonly MIDDLE_NAME: 'middle_name';
  readonly NICKNAME: 'nickname';
  readonly PREFERRED_USERNAME: 'preferred_username';
  readonly PROFILE: 'profile';
  readonly PICTURE: 'picture';
  readonly WEBSITE: 'website';
  readonly EMAIL: 'email';
  readonly EMAIL_VERIFIED: 'email_verified';
  readonly GENDER: 'gender';
  readonly BIRTHDATE: 'birthdate';
  readonly ZONEINFO: 'zoneinfo';
  readonly LOCALE: 'locale';
  readonly PHONE_NUMBER: 'phone_number';
  readonly PHONE_NUMBER_VERIFIED: 'phone_number_verified';
  readonly ADDRESS: 'address';
  readonly UPDATED_AT: 'updated_at';
  readonly ISS: 'iss';
  readonly AUD: 'aud';
  readonly EXP: 'exp';
  readonly IAT: 'iat';
  readonly AUTH_TIME: 'auth_time';
  readonly NONCE: 'nonce';
  readonly ACR: 'acr';
  readonly AMR: 'amr';
  readonly AZP: 'azp';
  readonly AT_HASH: 'at_hash';
  readonly C_HASH: 'c_hash';
};
/**
 * OAuth 2.0 and OIDC Error Codes
 * https://tools.ietf.org/html/rfc6749#section-4.1.2.1
 * https://openid.net/specs/openid-connect-core-1_0.html#AuthError
 */
export declare const ERROR_CODES: {
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
};
/**
 * PKCE (Proof Key for Code Exchange) Constants
 * https://tools.ietf.org/html/rfc7636
 */
export declare const PKCE: {
  readonly METHOD_S256: 'S256';
  readonly METHOD_PLAIN: 'plain';
  readonly VERIFIER_MIN_LENGTH: 43;
  readonly VERIFIER_MAX_LENGTH: 128;
  readonly CHALLENGE_MIN_LENGTH: 43;
  readonly CHALLENGE_MAX_LENGTH: 128;
  readonly VERIFIER_PATTERN: RegExp;
  readonly CHALLENGE_PATTERN: RegExp;
};
/**
 * OAuth 2.0 Grant Types
 */
export declare const GRANT_TYPES: {
  readonly AUTHORIZATION_CODE: 'authorization_code';
  readonly REFRESH_TOKEN: 'refresh_token';
  readonly CLIENT_CREDENTIALS: 'client_credentials';
  readonly PASSWORD: 'password';
  readonly IMPLICIT: 'implicit';
};
/**
 * OAuth 2.0 Response Types
 */
export declare const RESPONSE_TYPES: {
  readonly CODE: 'code';
  readonly TOKEN: 'token';
  readonly ID_TOKEN: 'id_token';
  readonly CODE_ID_TOKEN: 'code id_token';
  readonly CODE_TOKEN: 'code token';
  readonly ID_TOKEN_TOKEN: 'id_token token';
  readonly CODE_ID_TOKEN_TOKEN: 'code id_token token';
};
/**
 * Response Modes
 */
export declare const RESPONSE_MODES: {
  readonly QUERY: 'query';
  readonly FRAGMENT: 'fragment';
  readonly FORM_POST: 'form_post';
};
/**
 * Token Types
 */
export declare const TOKEN_TYPES: {
  readonly BEARER: 'Bearer';
  readonly DPoP: 'DPoP';
};
/**
 * Subject Types
 */
export declare const SUBJECT_TYPES: {
  readonly PUBLIC: 'public';
  readonly PAIRWISE: 'pairwise';
};
/**
 * Client Authentication Methods
 */
export declare const CLIENT_AUTH_METHODS: {
  readonly CLIENT_SECRET_POST: 'client_secret_post';
  readonly CLIENT_SECRET_BASIC: 'client_secret_basic';
  readonly CLIENT_SECRET_JWT: 'client_secret_jwt';
  readonly PRIVATE_KEY_JWT: 'private_key_jwt';
  readonly NONE: 'none';
};
/**
 * Signing Algorithms
 */
export declare const SIGNING_ALGS: {
  readonly RS256: 'RS256';
  readonly RS384: 'RS384';
  readonly RS512: 'RS512';
  readonly ES256: 'ES256';
  readonly ES384: 'ES384';
  readonly ES512: 'ES512';
  readonly HS256: 'HS256';
  readonly HS384: 'HS384';
  readonly HS512: 'HS512';
  readonly PS256: 'PS256';
  readonly PS384: 'PS384';
  readonly PS512: 'PS512';
};
/**
 * Allowed asymmetric signing algorithms (no symmetric HS* algorithms)
 * Used for client assertions, DPoP proofs, and other public key cryptography
 *
 * SECURITY: Symmetric algorithms (HS256, HS384, HS512) are excluded to prevent
 * algorithm confusion attacks where an attacker uses a public key as a symmetric key.
 */
export declare const ALLOWED_ASYMMETRIC_ALGS: readonly [
  'RS256',
  'RS384',
  'RS512',
  'ES256',
  'ES384',
  'ES512',
  'PS256',
  'PS384',
  'PS512',
];
/**
 * Allowed DPoP signing algorithms per discovery.ts
 * A subset of asymmetric algorithms supported for DPoP proofs
 */
export declare const ALLOWED_DPOP_ALGS: readonly ['RS256', 'ES256'];
/**
 * HTTP Status Codes (commonly used in OIDC)
 */
export declare const HTTP_STATUS: {
  readonly OK: 200;
  readonly CREATED: 201;
  readonly NO_CONTENT: 204;
  readonly FOUND: 302;
  readonly BAD_REQUEST: 400;
  readonly UNAUTHORIZED: 401;
  readonly FORBIDDEN: 403;
  readonly NOT_FOUND: 404;
  readonly METHOD_NOT_ALLOWED: 405;
  readonly INTERNAL_SERVER_ERROR: 500;
  readonly SERVICE_UNAVAILABLE: 503;
};
/**
 * Default Expiry Times (in seconds)
 */
export declare const DEFAULT_EXPIRY: {
  readonly AUTHORIZATION_CODE: 120;
  readonly ACCESS_TOKEN: 3600;
  readonly REFRESH_TOKEN: 2592000;
  readonly ID_TOKEN: 3600;
  readonly STATE: 300;
  readonly NONCE: 300;
};
/**
 * Validation Limits
 */
export declare const VALIDATION_LIMITS: {
  readonly CLIENT_ID_MAX_LENGTH: 256;
  readonly STATE_MAX_LENGTH: 512;
  readonly NONCE_MAX_LENGTH: 512;
  readonly REDIRECT_URI_MAX_LENGTH: 2048;
  readonly SCOPE_MAX_COUNT: 20;
};
/**
 * Cache Control Values
 */
export declare const CACHE_CONTROL: {
  readonly NO_STORE: 'no-store';
  readonly NO_CACHE: 'no-cache';
  readonly PUBLIC_1H: 'public, max-age=3600';
  readonly PUBLIC_24H: 'public, max-age=86400';
  readonly PRIVATE_1H: 'private, max-age=3600';
};
/**
 * Content Types
 */
export declare const CONTENT_TYPES: {
  readonly JSON: 'application/json';
  readonly FORM_URLENCODED: 'application/x-www-form-urlencoded';
  readonly JWT: 'application/jwt';
  readonly JWKS_JSON: 'application/jwk-set+json';
};
/**
 * Well-Known Endpoints
 */
export declare const WELL_KNOWN: {
  readonly OPENID_CONFIGURATION: '/.well-known/openid-configuration';
  readonly JWKS: '/.well-known/jwks.json';
  readonly OAUTH_AUTHORIZATION_SERVER: '/.well-known/oauth-authorization-server';
};
/**
 * Standard Endpoints
 */
export declare const ENDPOINTS: {
  readonly AUTHORIZE: '/authorize';
  readonly TOKEN: '/token';
  readonly USERINFO: '/userinfo';
  readonly REVOCATION: '/revoke';
  readonly INTROSPECTION: '/introspect';
  readonly REGISTRATION: '/register';
  readonly END_SESSION: '/endsession';
};
//# sourceMappingURL=constants.d.ts.map
