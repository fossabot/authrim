/**
 * OpenID Connect and OAuth 2.0 Type Definitions
 */
import type { OrganizationType, PlanType, UserType } from './rbac';
/**
 * OpenID Provider Metadata (Discovery Document)
 * https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata
 */
export interface OIDCProviderMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
  response_types_supported: string[];
  response_modes_supported?: string[];
  grant_types_supported: string[];
  id_token_signing_alg_values_supported: string[];
  subject_types_supported: string[];
  scopes_supported: string[];
  claims_supported: string[];
  token_endpoint_auth_methods_supported?: string[];
  token_endpoint_auth_signing_alg_values_supported?: string[];
  code_challenge_methods_supported?: string[];
  registration_endpoint?: string;
  revocation_endpoint?: string;
  introspection_endpoint?: string;
  pushed_authorization_request_endpoint?: string;
  require_pushed_authorization_requests?: boolean;
  dpop_signing_alg_values_supported?: string[];
  request_parameter_supported?: boolean;
  request_uri_parameter_supported?: boolean;
  request_object_signing_alg_values_supported?: string[];
  request_object_encryption_alg_values_supported?: string[];
  request_object_encryption_enc_values_supported?: string[];
  authorization_signing_alg_values_supported?: string[];
  authorization_encryption_alg_values_supported?: string[];
  authorization_encryption_enc_values_supported?: string[];
  id_token_encryption_alg_values_supported?: string[];
  id_token_encryption_enc_values_supported?: string[];
  userinfo_encryption_alg_values_supported?: string[];
  userinfo_encryption_enc_values_supported?: string[];
  userinfo_signing_alg_values_supported?: string[];
  device_authorization_endpoint?: string;
  backchannel_authentication_endpoint?: string;
  backchannel_token_delivery_modes_supported?: string[];
  backchannel_authentication_request_signing_alg_values_supported?: string[];
  backchannel_user_code_parameter_supported?: boolean;
  claim_types_supported?: string[];
  claims_parameter_supported?: boolean;
  acr_values_supported?: string[];
  check_session_iframe?: string;
  end_session_endpoint?: string;
  frontchannel_logout_supported?: boolean;
  frontchannel_logout_session_supported?: boolean;
  backchannel_logout_supported?: boolean;
  backchannel_logout_session_supported?: boolean;
  service_documentation?: string;
  ui_locales_supported?: string[];
  claims_locales_supported?: string[];
  display_values_supported?: string[];
  op_policy_uri?: string;
  op_tos_uri?: string;
}
/**
 * Authorization Request Parameters
 */
export interface AuthorizationRequest {
  response_type: string;
  client_id: string;
  redirect_uri: string;
  scope: string;
  state?: string;
  nonce?: string;
}
/**
 * Token Request Parameters
 */
export interface TokenRequest {
  grant_type: string;
  code: string;
  client_id: string;
  redirect_uri: string;
  client_secret?: string;
  code_verifier?: string;
}
/**
 * Token Response
 * https://tools.ietf.org/html/rfc6749#section-5.1
 */
export interface TokenResponse {
  access_token: string;
  id_token: string;
  token_type: 'Bearer' | 'DPoP';
  expires_in: number;
  scope?: string;
  refresh_token?: string;
}
/**
 * ID Token Claims
 * https://openid.net/specs/openid-connect-core-1_0.html#IDToken
 */
export interface IDTokenClaims {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  auth_time?: number;
  nonce?: string;
  at_hash?: string;
  c_hash?: string;
  acr?: string;
  amr?: string[];
  azp?: string;
  sid?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  middle_name?: string;
  nickname?: string;
  preferred_username?: string;
  profile?: string;
  picture?: string;
  website?: string;
  gender?: string;
  birthdate?: string;
  zoneinfo?: string;
  locale?: string;
  updated_at?: number;
  email?: string;
  email_verified?: boolean;
  phone_number?: string;
  phone_number_verified?: boolean;
  address?: {
    formatted?: string;
    street_address?: string;
    locality?: string;
    region?: string;
    postal_code?: string;
    country?: string;
  };
  /** User's effective roles */
  authrim_roles?: string[];
  /** User type classification (for UI/logging purposes) */
  authrim_user_type?: UserType;
  /** Primary organization ID */
  authrim_org_id?: string;
  /** Organization's subscription plan */
  authrim_plan?: PlanType;
  /** Organization type */
  authrim_org_type?: OrganizationType;
}
/**
 * UserInfo Response
 */
export interface UserInfoResponse {
  sub: string;
  name?: string;
  email?: string;
  email_verified?: boolean;
  [key: string]: unknown;
}
/**
 * Authorization Code Metadata
 */
export interface AuthCodeMetadata {
  client_id: string;
  redirect_uri: string;
  scope: string;
  sub: string;
  nonce?: string;
  timestamp: number;
  code_challenge?: string;
  code_challenge_method?: 'S256' | 'plain';
}
/**
 * OAuth 2.0 Error Response
 */
export interface OAuthErrorResponse {
  error: string;
  error_description?: string;
  error_uri?: string;
}
/**
 * Dynamic Client Registration Request
 * https://openid.net/specs/openid-connect-registration-1_0.html#ClientMetadata
 */
export interface ClientRegistrationRequest {
  redirect_uris: string[];
  client_name?: string;
  client_uri?: string;
  logo_uri?: string;
  contacts?: string[];
  tos_uri?: string;
  policy_uri?: string;
  jwks_uri?: string;
  jwks?: {
    keys: unknown[];
  };
  software_id?: string;
  software_version?: string;
  token_endpoint_auth_method?: 'client_secret_basic' | 'client_secret_post' | 'none';
  grant_types?: string[];
  response_types?: string[];
  application_type?: 'web' | 'native';
  scope?: string;
  subject_type?: 'public' | 'pairwise';
  sector_identifier_uri?: string;
  id_token_encrypted_response_alg?: string;
  id_token_encrypted_response_enc?: string;
  userinfo_encrypted_response_alg?: string;
  userinfo_encrypted_response_enc?: string;
  userinfo_signed_response_alg?: string;
  id_token_signed_response_type?: 'jwt' | 'sd-jwt';
  sd_jwt_selective_claims?: string[];
  post_logout_redirect_uris?: string[];
}
/**
 * Dynamic Client Registration Response
 * https://openid.net/specs/openid-connect-registration-1_0.html#RegistrationResponse
 */
export interface ClientRegistrationResponse {
  client_id: string;
  client_secret?: string;
  client_id_issued_at?: number;
  client_secret_expires_at?: number;
  redirect_uris: string[];
  client_name?: string;
  client_uri?: string;
  logo_uri?: string;
  contacts?: string[];
  tos_uri?: string;
  policy_uri?: string;
  jwks_uri?: string;
  jwks?: {
    keys: unknown[];
  };
  software_id?: string;
  software_version?: string;
  token_endpoint_auth_method?: string;
  grant_types?: string[];
  response_types?: string[];
  application_type?: string;
  scope?: string;
  subject_type?: 'public' | 'pairwise';
  sector_identifier_uri?: string;
  id_token_encrypted_response_alg?: string;
  id_token_encrypted_response_enc?: string;
  userinfo_encrypted_response_alg?: string;
  userinfo_encrypted_response_enc?: string;
  userinfo_signed_response_alg?: string;
  request_object_signing_alg?: string;
  request_object_encryption_alg?: string;
  request_object_encryption_enc?: string;
  authorization_signed_response_alg?: string;
  authorization_encrypted_response_alg?: string;
  authorization_encrypted_response_enc?: string;
  id_token_signed_response_type?: 'jwt' | 'sd-jwt';
  sd_jwt_selective_claims?: string[];
  post_logout_redirect_uris?: string[];
}
/**
 * Stored Client Metadata
 */
export interface ClientMetadata extends ClientRegistrationResponse {
  created_at: number;
  updated_at: number;
  subject_type?: 'public' | 'pairwise';
  sector_identifier_uri?: string;
  is_trusted?: boolean;
  skip_consent?: boolean;
  allow_claims_without_scope?: boolean;
  id_token_encrypted_response_alg?: string;
  id_token_encrypted_response_enc?: string;
  userinfo_encrypted_response_alg?: string;
  userinfo_encrypted_response_enc?: string;
  jwks?: {
    keys: unknown[];
  };
  backchannel_token_delivery_mode?: string;
  backchannel_client_notification_endpoint?: string;
  backchannel_authentication_request_signing_alg?: string;
  backchannel_user_code_parameter?: boolean;
  /** Allow Token Exchange for this client */
  token_exchange_allowed?: boolean;
  /** Client IDs allowed as subject_token issuers */
  allowed_subject_token_clients?: string[];
  /** Allowed resource/audience values for Token Exchange */
  allowed_token_exchange_resources?: string[];
  /**
   * Delegation mode for Token Exchange
   * - 'none': Token Exchange disabled
   * - 'delegation': Include act claim (default, recommended)
   * - 'impersonation': Omit act claim (requires enhanced audit)
   */
  delegation_mode?: DelegationMode;
  /** Allow Client Credentials grant for this client */
  client_credentials_allowed?: boolean;
  /** Allowed scopes for M2M tokens */
  allowed_scopes?: string[];
  /** Default scope when scope parameter is omitted */
  default_scope?: string;
  /** Default audience when audience parameter is omitted */
  default_audience?: string;
}
/**
 * Refresh Token Metadata
 * Stored in KV for refresh token management
 */
export interface RefreshTokenData {
  jti: string;
  client_id: string;
  sub: string;
  scope: string;
  iat: number;
  exp: number;
  familyId?: string;
}
/**
 * Token Introspection Request
 * https://tools.ietf.org/html/rfc7662#section-2.1
 */
export interface IntrospectionRequest {
  token: string;
  token_type_hint?: 'access_token' | 'refresh_token';
}
/**
 * Token Introspection Response
 * https://tools.ietf.org/html/rfc7662#section-2.2
 * Extended for RFC 8693 Token Exchange (act claim)
 */
export interface IntrospectionResponse {
  active: boolean;
  scope?: string;
  client_id?: string;
  username?: string;
  token_type?: string;
  exp?: number;
  iat?: number;
  nbf?: number;
  sub?: string;
  aud?: string;
  iss?: string;
  jti?: string;
  cnf?: {
    jkt: string;
  };
  act?: {
    sub: string;
    client_id?: string;
    act?: object;
  };
  resource?: string;
}
/**
 * Token Revocation Request
 * https://tools.ietf.org/html/rfc7009#section-2.1
 */
export interface RevocationRequest {
  token: string;
  token_type_hint?: 'access_token' | 'refresh_token';
}
/**
 * DPoP (Demonstrating Proof of Possession) JWT Header
 * https://datatracker.ietf.org/doc/html/rfc9449#section-4.2
 */
export interface DPoPHeader {
  typ: 'dpop+jwt';
  alg: string;
  jwk: {
    kty: string;
    n?: string;
    e?: string;
    crv?: string;
    x?: string;
    y?: string;
  };
}
/**
 * DPoP JWT Claims
 * https://datatracker.ietf.org/doc/html/rfc9449#section-4.2
 */
export interface DPoPClaims {
  jti: string;
  htm: string;
  htu: string;
  iat: number;
  ath?: string;
  nonce?: string;
}
/**
 * DPoP Proof Validation Result
 */
export interface DPoPValidationResult {
  valid: boolean;
  error?: string;
  error_description?: string;
  jwk?: {
    kty: string;
    n?: string;
    e?: string;
    crv?: string;
    x?: string;
    y?: string;
  };
  jkt?: string;
}
/**
 * Device Authorization Request
 * RFC 8628: OAuth 2.0 Device Authorization Grant
 * https://datatracker.ietf.org/doc/html/rfc8628#section-3.1
 */
export interface DeviceAuthorizationRequest {
  client_id: string;
  scope?: string;
}
/**
 * Device Authorization Response
 * RFC 8628: OAuth 2.0 Device Authorization Grant
 * https://datatracker.ietf.org/doc/html/rfc8628#section-3.2
 */
export interface DeviceAuthorizationResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete?: string;
  expires_in: number;
  interval?: number;
}
/**
 * Device Code Metadata
 * Internal storage for device authorization flow
 */
export interface DeviceCodeMetadata {
  device_code: string;
  user_code: string;
  client_id: string;
  scope: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  created_at: number;
  expires_at: number;
  last_poll_at?: number;
  poll_count?: number;
  user_id?: string;
  sub?: string;
  token_issued?: boolean;
  token_issued_at?: number;
}
/**
 * CIBA (Client Initiated Backchannel Authentication) Request
 * OpenID Connect CIBA Flow Core 1.0
 * https://openid.net/specs/openid-client-initiated-backchannel-authentication-core-1_0.html
 */
export interface CIBAAuthenticationRequest {
  scope: string;
  client_notification_token?: string;
  acr_values?: string;
  login_hint_token?: string;
  id_token_hint?: string;
  login_hint?: string;
  binding_message?: string;
  user_code?: string;
  requested_expiry?: number;
}
/**
 * CIBA Authentication Response
 * https://openid.net/specs/openid-client-initiated-backchannel-authentication-core-1_0.html#auth_response
 */
export interface CIBAAuthenticationResponse {
  auth_req_id: string;
  expires_in: number;
  interval?: number;
}
/**
 * CIBA Request Metadata
 * Internal storage for CIBA authentication flow
 */
export interface CIBARequestMetadata {
  auth_req_id: string;
  client_id: string;
  scope: string;
  login_hint?: string;
  login_hint_token?: string;
  id_token_hint?: string;
  binding_message?: string;
  user_code?: string;
  acr_values?: string;
  requested_expiry?: number;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  delivery_mode: 'poll' | 'ping' | 'push';
  client_notification_token?: string;
  client_notification_endpoint?: string;
  created_at: number;
  expires_at: number;
  last_poll_at?: number;
  poll_count?: number;
  interval: number;
  user_id?: string;
  sub?: string;
  nonce?: string;
  token_issued?: boolean;
  token_issued_at?: number;
  resolved_subject_id?: string;
}
/**
 * CIBA Request Row from D1 Database
 * SQLite stores booleans as integers (0 or 1), so we need a separate type
 * for data coming directly from the database
 */
export interface CIBARequestRow extends Omit<CIBARequestMetadata, 'token_issued'> {
  token_issued: number;
}
/**
 * Token Type URN values for Token Exchange
 * https://datatracker.ietf.org/doc/html/rfc8693#section-3
 */
export type TokenTypeURN =
  | 'urn:ietf:params:oauth:token-type:access_token'
  | 'urn:ietf:params:oauth:token-type:refresh_token'
  | 'urn:ietf:params:oauth:token-type:id_token';
/**
 * Token Exchange Request Parameters
 * https://datatracker.ietf.org/doc/html/rfc8693#section-2.1
 */
export interface TokenExchangeRequest {
  grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange';
  /** REQUIRED - The token to be exchanged */
  subject_token: string;
  /** REQUIRED - The type of the subject_token */
  subject_token_type: TokenTypeURN;
  /** OPTIONAL - Token representing the actor (for delegation) */
  actor_token?: string;
  /** OPTIONAL - The type of the actor_token */
  actor_token_type?: TokenTypeURN;
  /** OPTIONAL - URI of the target resource server */
  resource?: string;
  /** OPTIONAL - Intended audience of the token */
  audience?: string;
  /** OPTIONAL - Requested scope for the new token */
  scope?: string;
  /** OPTIONAL - Requested token type for the response */
  requested_token_type?: TokenTypeURN;
}
/**
 * Token Exchange Response
 * https://datatracker.ietf.org/doc/html/rfc8693#section-2.2
 */
export interface TokenExchangeResponse {
  /** The newly issued token */
  access_token: string;
  /** The type of token issued */
  issued_token_type: TokenTypeURN;
  /** Token type (Bearer or DPoP) */
  token_type: 'Bearer' | 'DPoP';
  /** Token expiration in seconds */
  expires_in: number;
  /** Granted scope (may be subset of requested) */
  scope?: string;
  /** Refresh token (only if requested and permitted) */
  refresh_token?: string;
}
/**
 * Actor Claim (act) for delegation chain
 * https://datatracker.ietf.org/doc/html/rfc8693#section-4.1
 */
export interface ActClaim {
  /** Subject of the actor */
  sub: string;
  /** Client ID of the actor (optional but recommended) */
  client_id?: string;
  /** Nested actor claim (for multi-hop delegation, max 2 levels in Authrim) */
  act?: ActClaim;
}
/**
 * Delegation Mode for Token Exchange
 * - 'none': Token Exchange disabled
 * - 'delegation': act claim included (default, recommended)
 * - 'impersonation': act claim omitted (requires enhanced audit logging)
 */
export type DelegationMode = 'none' | 'delegation' | 'impersonation';
/**
 * Client Credentials Request Parameters
 * https://datatracker.ietf.org/doc/html/rfc6749#section-4.4.2
 */
export interface ClientCredentialsRequest {
  grant_type: 'client_credentials';
  /** OPTIONAL - Requested scope */
  scope?: string;
  /** OPTIONAL - Target audience for the token */
  audience?: string;
}
/**
 * Client Credentials Response
 * https://datatracker.ietf.org/doc/html/rfc6749#section-4.4.3
 * Note: Does NOT include refresh_token (per RFC 6749)
 */
export interface ClientCredentialsResponse {
  access_token: string;
  token_type: 'Bearer' | 'DPoP';
  expires_in: number;
  scope?: string;
}
//# sourceMappingURL=oidc.d.ts.map
