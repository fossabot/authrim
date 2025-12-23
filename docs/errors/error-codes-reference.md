# Authrim Error Codes Reference

> **Version**: 1.0.0
> **Last Updated**: 2024-12-22

This document provides a complete reference of all error codes used in Authrim.

## Table of Contents

- [RFC Standard Errors](#rfc-standard-errors)
- [Authrim Error Codes](#authrim-error-codes)
  - [Authentication & Authorization (AR000001-AR009999)](#authentication--authorization-ar000001-ar009999)
  - [Token (AR010001-AR019999)](#token-ar010001-ar019999)
  - [Client (AR020001-AR029999)](#client-ar020001-ar029999)
  - [User (AR030001-AR039999)](#user-ar030001-ar039999)
  - [Session (AR040001-AR049999)](#session-ar040001-ar049999)
  - [Policy (AR050001-AR059999)](#policy-ar050001-ar059999)
  - [Admin (AR060001-AR069999)](#admin-ar060001-ar069999)
  - [SAML (AR070001-AR079999)](#saml-ar070001-ar079999)
  - [Verifiable Credentials (AR080001-AR089999)](#verifiable-credentials-ar080001-ar089999)
  - [External IdP Bridge (AR090001-AR099999)](#external-idp-bridge-ar090001-ar099999)
  - [Configuration (AR100001-AR109999)](#configuration-ar100001-ar109999)
  - [Rate Limiting (AR110001-AR119999)](#rate-limiting-ar110001-ar119999)
  - [Internal (AR900001-AR999999)](#internal-ar900001-ar999999)
- [Endpoint Error Mapping](#endpoint-error-mapping)

---

## RFC Standard Errors

These are standard OAuth 2.0 / OpenID Connect error codes as defined in RFC 6749, RFC 6750, and OpenID Connect Core 1.0.

### OAuth 2.0 Core (RFC 6749)

| Error                     | HTTP | Description                                                                                                 | Usage                                    |
| ------------------------- | ---- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `invalid_request`         | 400  | The request is missing a required parameter, includes an invalid parameter value, or is otherwise malformed | Malformed requests, missing parameters   |
| `invalid_client`          | 401  | Client authentication failed                                                                                | Wrong client_secret, unknown client_id   |
| `invalid_grant`           | 400  | The provided authorization grant is invalid, expired, or revoked                                            | Invalid auth code, expired refresh token |
| `unauthorized_client`     | 400  | The client is not authorized for this grant type                                                            | Grant type not allowed for client        |
| `unsupported_grant_type`  | 400  | The grant type is not supported                                                                             | Unknown grant_type parameter             |
| `invalid_scope`           | 400  | The requested scope is invalid, unknown, or malformed                                                       | Invalid scope requested                  |
| `access_denied`           | 403  | The resource owner denied the request                                                                       | User denied consent, access forbidden    |
| `server_error`            | 500  | An unexpected server error occurred                                                                         | Internal errors                          |
| `temporarily_unavailable` | 503  | The server is temporarily unavailable                                                                       | Maintenance, overload                    |

### OAuth 2.0 Bearer Token (RFC 6750)

| Error                | HTTP | Description                                      | Usage                     |
| -------------------- | ---- | ------------------------------------------------ | ------------------------- |
| `invalid_token`      | 401  | The access token is invalid, expired, or revoked | Token validation failures |
| `insufficient_scope` | 403  | The token lacks the required scope               | Missing required scope    |

### OpenID Connect Core 1.0

| Error                        | HTTP | Description                                | Usage                          |
| ---------------------------- | ---- | ------------------------------------------ | ------------------------------ |
| `login_required`             | 401  | User must authenticate                     | Session expired, not logged in |
| `interaction_required`       | 400  | User interaction is required               | MFA needed, consent required   |
| `consent_required`           | 400  | User consent is required                   | New scope requested            |
| `account_selection_required` | 400  | User must select an account                | Multiple accounts available    |
| `invalid_request_uri`        | 400  | The request_uri parameter is invalid       | PAR/JAR errors                 |
| `invalid_request_object`     | 400  | The request object is invalid              | JWT request validation failure |
| `request_not_supported`      | 400  | The request parameter is not supported     | Feature not enabled            |
| `request_uri_not_supported`  | 400  | The request_uri parameter is not supported | Feature not enabled            |
| `registration_not_supported` | 400  | Dynamic registration is not supported      | Feature not enabled            |

### Device Authorization Grant (RFC 8628)

| Error                   | HTTP | Description                            | Usage                               |
| ----------------------- | ---- | -------------------------------------- | ----------------------------------- |
| `authorization_pending` | 400  | Authorization request is still pending | User hasn't completed authorization |
| `slow_down`             | 400  | Polling too frequently                 | Client should increase interval     |
| `expired_token`         | 400  | The device code has expired            | Device code timeout                 |

### CIBA (OpenID Connect CIBA)

| Error                   | HTTP | Description                         | Usage                        |
| ----------------------- | ---- | ----------------------------------- | ---------------------------- |
| `authorization_pending` | 400  | CIBA request is pending             | User hasn't responded        |
| `access_denied`         | 403  | User denied the CIBA request        | User rejected authentication |
| `expired_token`         | 400  | The auth_req_id has expired         | CIBA request timeout         |
| `unknown_user_id`       | 400  | The login_hint identifies no user   | User not found               |
| `unauthorized_client`   | 400  | Client not authorized for CIBA      | CIBA not enabled             |
| `missing_user_code`     | 400  | User code required but not provided | binding_message required     |

### DPoP (RFC 9449)

| Error                | HTTP | Description                  | Usage                         |
| -------------------- | ---- | ---------------------------- | ----------------------------- |
| `use_dpop_nonce`     | 400  | A new DPoP nonce is required | Server requires nonce refresh |
| `invalid_dpop_proof` | 400  | The DPoP proof is invalid    | Malformed or expired proof    |

### Token Introspection/Revocation

| Error                    | HTTP | Description                      | Usage                   |
| ------------------------ | ---- | -------------------------------- | ----------------------- |
| `unsupported_token_type` | 400  | Token type hint is not supported | Unknown token_type_hint |

---

## Authrim Error Codes

### Authentication & Authorization (AR000001-AR009999)

| Code     | RFC Error            | Type Slug              | HTTP | Description                          | error_meta                                            |
| -------- | -------------------- | ---------------------- | ---- | ------------------------------------ | ----------------------------------------------------- |
| AR000001 | login_required       | auth/session-expired   | 401  | Authentication session has expired   | retryable: false, user_action: login, severity: warn  |
| AR000002 | login_required       | auth/session-not-found | 401  | Session not found                    | retryable: false, user_action: login, severity: warn  |
| AR000003 | login_required       | auth/login-required    | 401  | Authentication required              | retryable: false, user_action: login, severity: info  |
| AR000004 | interaction_required | auth/mfa-required      | 401  | Multi-factor authentication required | retryable: false, user_action: reauth, severity: info |
| AR000005 | interaction_required | auth/passkey-failed    | 400  | Passkey authentication failed        | retryable: false, user_action: retry, severity: warn  |
| AR000006 | interaction_required | auth/invalid-code      | 400  | Invalid email verification code      | retryable: false, user_action: retry, severity: warn  |
| AR000007 | interaction_required | auth/code-expired      | 400  | Email verification code has expired  | retryable: false, user_action: login, severity: warn  |
| AR000008 | access_denied        | auth/consent-denied    | 403  | User denied consent                  | retryable: false, user_action: none, severity: info   |

### Token (AR010001-AR019999)

| Code     | RFC Error       | Type Slug            | HTTP | Description                             | error_meta                                                   |
| -------- | --------------- | -------------------- | ---- | --------------------------------------- | ------------------------------------------------------------ |
| AR010001 | invalid_grant   | token/invalid        | 400  | Token is invalid                        | retryable: false, user_action: login, severity: warn         |
| AR010002 | invalid_grant   | token/expired        | 400  | Token has expired                       | retryable: false, user_action: login, severity: warn         |
| AR010003 | invalid_grant   | token/revoked        | 400  | Token has been revoked                  | retryable: false, user_action: login, severity: warn         |
| AR010004 | invalid_grant   | token/reuse-detected | 400  | Refresh token reuse detected (security) | retryable: false, user_action: login, severity: critical     |
| AR010005 | invalid_grant   | token/invalid-code   | 400  | Invalid or expired authorization code   | retryable: false, user_action: login, severity: warn         |
| AR010006 | invalid_request | token/missing-pkce   | 400  | PKCE code_verifier required             | retryable: false, user_action: update_client, severity: warn |
| AR010007 | invalid_grant   | token/pkce-mismatch  | 400  | PKCE verification failed                | retryable: false, user_action: retry, severity: warn         |

### Client (AR020001-AR029999)

| Code     | RFC Error               | Type Slug                    | HTTP | Description                          | error_meta                                                   |
| -------- | ----------------------- | ---------------------------- | ---- | ------------------------------------ | ------------------------------------------------------------ |
| AR020001 | invalid_client          | client/authentication-failed | 401  | Client authentication failed         | retryable: false, user_action: update_client, severity: warn |
| AR020002 | invalid_client          | client/invalid               | 400  | Client is invalid or disabled        | retryable: false, user_action: contact_admin, severity: warn |
| AR020003 | invalid_redirect_uri    | client/invalid-redirect-uri  | 400  | Invalid redirect URI                 | retryable: false, user_action: update_client, severity: warn |
| AR020004 | invalid_client_metadata | client/invalid-metadata      | 400  | Invalid client metadata              | retryable: false, user_action: update_client, severity: warn |
| AR020005 | unauthorized_client     | client/unauthorized-grant    | 400  | Client not authorized for grant type | retryable: false, user_action: contact_admin, severity: warn |
| AR020006 | invalid_client          | client/secret-expired        | 401  | Client secret has expired            | retryable: false, user_action: update_client, severity: warn |

### User (AR030001-AR039999)

| Code     | RFC Error     | Type Slug                | HTTP | Description               | error_meta                                                    |
| -------- | ------------- | ------------------------ | ---- | ------------------------- | ------------------------------------------------------------- |
| AR030001 | invalid_grant | user/invalid-credentials | 400  | Invalid credentials       | retryable: true, user_action: retry, severity: warn           |
| AR030002 | access_denied | user/locked              | 403  | User account is locked    | retryable: false, user_action: contact_admin, severity: error |
| AR030003 | access_denied | user/inactive            | 403  | User account is inactive  | retryable: false, user_action: contact_admin, severity: warn  |
| AR030004 | invalid_grant | user/not-verified        | 400  | User email not verified   | retryable: false, user_action: login, severity: warn          |
| AR030005 | access_denied | user/suspended           | 403  | User account is suspended | retryable: false, user_action: contact_admin, severity: error |

### Session (AR040001-AR049999)

| Code     | RFC Error       | Type Slug             | HTTP | Description                    | error_meta                                           |
| -------- | --------------- | --------------------- | ---- | ------------------------------ | ---------------------------------------------------- |
| AR040001 | server_error    | session/store-error   | 500  | Session store connection error | retryable: true, user_action: retry, severity: error |
| AR040002 | invalid_request | session/invalid-state | 400  | Invalid session state          | retryable: false, user_action: login, severity: warn |
| AR040003 | login_required  | session/timeout       | 401  | Session has timed out          | retryable: false, user_action: login, severity: info |

### Policy (AR050001-AR059999)

| Code     | RFC Error     | Type Slug                       | HTTP | Description                  | error_meta                                                    |
| -------- | ------------- | ------------------------------- | ---- | ---------------------------- | ------------------------------------------------------------- |
| AR050001 | access_denied | policy/feature-disabled         | 403  | Feature is disabled          | retryable: false, user_action: contact_admin, severity: info  |
| AR050002 | server_error  | policy/not-configured           | 500  | Policy not configured        | retryable: false, user_action: contact_admin, severity: error |
| AR050003 | invalid_token | policy/invalid-api-key          | 401  | Invalid API key              | retryable: false, user_action: update_client, severity: warn  |
| AR050004 | invalid_token | policy/api-key-expired          | 401  | API key has expired          | retryable: false, user_action: update_client, severity: warn  |
| AR050005 | invalid_token | policy/api-key-inactive         | 401  | API key is inactive          | retryable: false, user_action: contact_admin, severity: warn  |
| AR050006 | access_denied | policy/insufficient-permissions | 403  | Insufficient permissions     | retryable: false, user_action: contact_admin, severity: warn  |
| AR050007 | access_denied | policy/resource-forbidden       | 403  | Access to resource forbidden | retryable: false, user_action: none, severity: warn           |

### Admin (AR060001-AR069999)

| Code     | RFC Error       | Type Slug                      | HTTP | Description                    | error_meta                                                   |
| -------- | --------------- | ------------------------------ | ---- | ------------------------------ | ------------------------------------------------------------ |
| AR060001 | invalid_token   | admin/authentication-required  | 401  | Admin authentication required  | retryable: false, user_action: login, severity: warn         |
| AR060002 | access_denied   | admin/insufficient-permissions | 403  | Insufficient admin permissions | retryable: false, user_action: contact_admin, severity: warn |
| AR060003 | invalid_request | admin/invalid-request          | 400  | Invalid admin request          | retryable: false, user_action: none, severity: warn          |
| AR060004 | invalid_request | admin/resource-not-found       | 404  | Admin resource not found       | retryable: false, user_action: none, severity: warn          |
| AR060005 | invalid_request | admin/resource-conflict        | 409  | Resource conflict              | retryable: false, user_action: none, severity: warn          |

### SAML (AR070001-AR079999)

| Code     | RFC Error       | Type Slug              | HTTP | Description                        | error_meta                                                    |
| -------- | --------------- | ---------------------- | ---- | ---------------------------------- | ------------------------------------------------------------- |
| AR070001 | invalid_request | saml/invalid-response  | 400  | Invalid SAML response              | retryable: true, user_action: retry, severity: warn           |
| AR070002 | server_error    | saml/slo-failed        | 500  | Single logout failed               | retryable: true, user_action: retry, severity: error          |
| AR070003 | invalid_request | saml/signature-invalid | 400  | SAML signature verification failed | retryable: false, user_action: contact_admin, severity: error |
| AR070004 | invalid_request | saml/assertion-expired | 400  | SAML assertion has expired         | retryable: false, user_action: retry, severity: warn          |
| AR070005 | invalid_request | saml/audience-mismatch | 400  | SAML audience mismatch             | retryable: false, user_action: contact_admin, severity: warn  |

### Verifiable Credentials (AR080001-AR089999)

| Code     | RFC Error                     | Type Slug                 | HTTP | Description                    | error_meta                                                   |
| -------- | ----------------------------- | ------------------------- | ---- | ------------------------------ | ------------------------------------------------------------ |
| AR080001 | issuance_pending              | vc/issuance-pending       | 200  | Credential issuance is pending | retryable: true, user_action: retry, severity: info          |
| AR080002 | unsupported_credential_format | vc/unsupported-format     | 400  | Unsupported credential format  | retryable: false, user_action: update_client, severity: warn |
| AR080003 | invalid_proof                 | vc/invalid-proof          | 400  | Invalid credential proof       | retryable: true, user_action: retry, severity: warn          |
| AR080004 | invalid_request               | vc/credential-revoked     | 400  | Credential has been revoked    | retryable: false, user_action: none, severity: warn          |
| AR080005 | invalid_request               | vc/invalid-holder-binding | 400  | Invalid holder binding         | retryable: false, user_action: retry, severity: warn         |

### External IdP Bridge (AR090001-AR099999)

| Code     | RFC Error               | Type Slug                   | HTTP | Description                      | error_meta                                                            |
| -------- | ----------------------- | --------------------------- | ---- | -------------------------------- | --------------------------------------------------------------------- |
| AR090001 | interaction_required    | bridge/link-required        | 400  | Account linking required         | retryable: false, user_action: login, severity: info                  |
| AR090002 | interaction_required    | bridge/provider-auth-failed | 400  | Provider authentication failed   | retryable: false, transient: true, user_action: retry, severity: warn |
| AR090003 | temporarily_unavailable | bridge/provider-unavailable | 503  | Provider temporarily unavailable | retryable: true, user_action: retry, severity: error                  |
| AR090004 | invalid_request         | bridge/state-mismatch       | 400  | OAuth state mismatch             | retryable: false, user_action: login, severity: warn                  |
| AR090005 | invalid_request         | bridge/invalid-callback     | 400  | Invalid callback from provider   | retryable: false, user_action: login, severity: warn                  |

### Configuration (AR100001-AR109999)

| Code     | RFC Error       | Type Slug                | HTTP | Description                    | error_meta                                                       |
| -------- | --------------- | ------------------------ | ---- | ------------------------------ | ---------------------------------------------------------------- |
| AR100001 | server_error    | config/kv-not-configured | 500  | KV storage not configured      | retryable: false, user_action: contact_admin, severity: critical |
| AR100002 | invalid_request | config/invalid-value     | 400  | Invalid configuration value    | retryable: false, user_action: contact_admin, severity: warn     |
| AR100003 | server_error    | config/load-error        | 500  | Configuration load error       | retryable: true, user_action: retry, severity: error             |
| AR100004 | server_error    | config/missing-secret    | 500  | Required secret not configured | retryable: false, user_action: contact_admin, severity: critical |

### Rate Limiting (AR110001-AR119999)

| Code     | RFC Error | Type Slug             | HTTP | Description                    | error_meta                                          |
| -------- | --------- | --------------------- | ---- | ------------------------------ | --------------------------------------------------- |
| AR110001 | slow_down | rate-limit/exceeded   | 429  | Rate limit exceeded            | retryable: true, user_action: retry, severity: warn |
| AR110002 | slow_down | rate-limit/slow-down  | 400  | Polling interval too short     | retryable: true, user_action: retry, severity: info |
| AR110003 | slow_down | rate-limit/ip-blocked | 429  | IP address temporarily blocked | retryable: true, user_action: retry, severity: warn |

### Internal (AR900001-AR999999)

| Code     | RFC Error    | Type Slug                 | HTTP | Description                  | error_meta                                                            |
| -------- | ------------ | ------------------------- | ---- | ---------------------------- | --------------------------------------------------------------------- |
| AR900001 | server_error | internal/unexpected       | 500  | An unexpected error occurred | retryable: true, user_action: retry, severity: error                  |
| AR900002 | server_error | internal/database         | 500  | Database error               | retryable: true, user_action: retry, severity: error                  |
| AR900003 | server_error | internal/external-service | 500  | External service error       | retryable: true, transient: true, user_action: retry, severity: error |

---

## Endpoint Error Mapping

### Token Endpoint (`/token`)

| Scenario                   | Error Code | RFC Error              |
| -------------------------- | ---------- | ---------------------- |
| Invalid authorization code | AR010005   | invalid_grant          |
| Expired authorization code | AR010005   | invalid_grant          |
| Code already used          | AR010005   | invalid_grant          |
| Invalid refresh token      | AR010001   | invalid_grant          |
| Expired refresh token      | AR010002   | invalid_grant          |
| Refresh token reuse        | AR010004   | invalid_grant          |
| Invalid client credentials | AR020001   | invalid_client         |
| PKCE verification failed   | AR010007   | invalid_grant          |
| Unsupported grant type     | -          | unsupported_grant_type |

### Authorization Endpoint (`/authorize`)

| Scenario             | Error Code | RFC Error            |
| -------------------- | ---------- | -------------------- |
| Session expired      | AR000001   | login_required       |
| Session not found    | AR000002   | login_required       |
| MFA required         | AR000004   | interaction_required |
| Passkey auth failed  | AR000005   | interaction_required |
| Invalid redirect URI | AR020003   | invalid_redirect_uri |
| Invalid client       | AR020002   | invalid_client       |
| Consent denied       | AR000008   | access_denied        |

### Userinfo Endpoint (`/userinfo`)

| Scenario             | Error Code | RFC Error          |
| -------------------- | ---------- | ------------------ |
| Invalid access token | AR010001   | invalid_token      |
| Expired access token | AR010002   | invalid_token      |
| Revoked access token | AR010003   | invalid_token      |
| Insufficient scope   | -          | insufficient_scope |

### Introspection Endpoint (`/introspect`)

| Scenario                   | Error Code | RFC Error              |
| -------------------------- | ---------- | ---------------------- |
| Invalid client credentials | AR020001   | invalid_client         |
| Unsupported token type     | -          | unsupported_token_type |

### Admin API (`/api/admin/*`)

| Scenario                 | Error Code | RFC Error       |
| ------------------------ | ---------- | --------------- |
| Missing authentication   | AR060001   | invalid_token   |
| Insufficient permissions | AR060002   | access_denied   |
| Resource not found       | AR060004   | invalid_request |
| Validation error         | AR060003   | invalid_request |
| Resource conflict        | AR060005   | invalid_request |

### Device Authorization (`/device/*`)

| Scenario              | Error Code | RFC Error             |
| --------------------- | ---------- | --------------------- |
| Invalid client        | AR020001   | invalid_client        |
| Pending authorization | -          | authorization_pending |
| User denied           | -          | access_denied         |
| Device code expired   | -          | expired_token         |
| Slow down             | AR110002   | slow_down             |

### CIBA (`/bc-authorize`, `/token`)

| Scenario              | Error Code | RFC Error             |
| --------------------- | ---------- | --------------------- |
| Invalid client        | AR020001   | invalid_client        |
| Unknown user          | -          | unknown_user_id       |
| Pending authorization | -          | authorization_pending |
| User denied           | -          | access_denied         |
| Request expired       | -          | expired_token         |

---

## Quick Reference

### By HTTP Status Code

| Status | Common Errors                                        |
| ------ | ---------------------------------------------------- |
| 400    | invalid_request, invalid_grant, interaction_required |
| 401    | invalid_client, invalid_token, login_required        |
| 403    | access_denied, insufficient_scope                    |
| 404    | AR060004 (admin/resource-not-found)                  |
| 409    | AR060005 (admin/resource-conflict)                   |
| 429    | AR110001 (rate-limit/exceeded)                       |
| 500    | server_error, AR900001                               |
| 503    | temporarily_unavailable                              |

### By User Action

| Action          | When to Use                              |
| --------------- | ---------------------------------------- |
| `login`         | Session expired, authentication required |
| `reauth`        | Step-up authentication, MFA required     |
| `consent`       | New permissions requested                |
| `retry`         | Temporary failure, user can try again    |
| `contact_admin` | Configuration issue, account locked      |
| `update_client` | Client configuration problem             |
| `none`          | No automatic recovery possible           |

### Security-Tracked Errors

These errors always generate trace IDs when `error_id_mode` is `security_only`:

- `invalid_client`
- `invalid_grant`
- `unauthorized_client`
- `access_denied`
- `client/authentication-failed` (AR020001)
- `user/invalid-credentials` (AR030001)
- `user/locked` (AR030002)
- `token/reuse-detected` (AR010004)
- `rate-limit/exceeded` (AR110001)
- `policy/invalid-api-key` (AR050003)
- `admin/authentication-required` (AR060001)
