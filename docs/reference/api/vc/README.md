# Verifiable Credentials API Reference

This document describes the VC-related APIs in Authrim, implementing OpenID4VP (Verifiable Presentations) and OpenID4VCI (Verifiable Credentials Issuance).

## Overview

### Design Philosophy

**VC = Attribute Proof, NOT Login**

VCs are used for attribute verification (e.g., age verification, country residence proof), not as a login method. Users authenticate via Passkey/Email/Social first, then use VCs to prove additional attributes.

```
┌─────────────────────────────────────────────────────────────┐
│  1. User logs in via Passkey/Email/Social (AuthN)          │
│  2. User accesses age-restricted feature                    │
│  3. "Verify with Wallet" button shown                       │
│  4. OpenID4VP requests VC from wallet                       │
│  5. Wallet presents age_over_18 VC                          │
│  6. Verification success → attribute stored in DB           │
│  7. Raw VC discarded, only result saved (Data Minimization) │
│  8. ABAC policy checks verified_age_over_18 = true          │
└─────────────────────────────────────────────────────────────┘
```

## OpenID4VP (Verifier) Endpoints

### Discovery

#### GET `/.well-known/openid-credential-verifier`

Returns verifier metadata.

**Response:**
```json
{
  "verifier_identifier": "did:web:authrim.com",
  "vp_formats_supported": {
    "dc+sd-jwt": {
      "alg_values_supported": ["ES256", "ES384", "ES512"]
    }
  },
  "client_id_schemes_supported": ["pre-registered", "did"],
  "response_types_supported": ["vp_token"],
  "response_modes_supported": ["direct_post"],
  "dcql_supported": true
}
```

### Authorization

#### POST `/vp/authorize`

Creates a VP authorization request for the wallet.

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "presentation_definition": {
    "id": "age-verification",
    "input_descriptors": [{
      "id": "age-over-18",
      "format": {
        "dc+sd-jwt": {
          "alg": ["ES256"]
        }
      },
      "constraints": {
        "fields": [{
          "path": ["$.vct"],
          "filter": {
            "type": "string",
            "pattern": "age-verification"
          }
        }, {
          "path": ["$.age_over_18"]
        }]
      }
    }]
  },
  "client_id": "did:web:authrim.com",
  "nonce": "random-nonce",
  "response_mode": "direct_post"
}
```

**Response:**
```json
{
  "request_id": "req-123",
  "request_uri": "https://authrim.com/vp/request/req-123",
  "nonce": "random-nonce",
  "expires_in": 300
}
```

#### POST `/vp/response`

Receives VP token from wallet (direct_post mode).

**Request Headers:**
```
Content-Type: application/x-www-form-urlencoded
```

**Request Body:**
```
vp_token=<SD-JWT-VC>&state=<request_id>&presentation_submission=<JSON>
```

**Success Response:**
```json
{
  "success": true,
  "request_id": "req-123",
  "disclosed_claims": {
    "age_over_18": true,
    "given_name": "John"
  },
  "haip_compliant": true
}
```

**Error Response:**
```json
{
  "error": "invalid_presentation",
  "error_description": "Signature verification failed",
  "warnings": ["No status claim present"]
}
```

### Authenticated Attribute Verification

#### POST `/vp/initiate`

Initiates attribute verification for an authenticated user.

**Request Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "attribute_type": "age_over_18",
  "credential_types": ["https://authrim.com/credentials/age-verification/v1"],
  "callback_url": "https://app.example.com/callback"
}
```

**Response:**
```json
{
  "request_id": "req-456",
  "authorization_request": "openid4vp://?response_type=vp_token&...",
  "nonce": "random-nonce",
  "expires_in": 300,
  "state": "req-456"
}
```

#### POST `/vp/attribute-response`

Receives VP response for authenticated attribute verification.

**Request Headers:**
```
Content-Type: application/x-www-form-urlencoded
```

**Request Body:**
```
vp_token=<SD-JWT-VC>&state=<request_id>
```

**Success Response:**
```json
{
  "success": true,
  "request_id": "req-456",
  "attributes_verified": ["verified_age_over_18", "verified_country"],
  "haip_compliant": true
}
```

#### GET `/vp/attributes`

Get verified attributes for authenticated user.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "user_id": "user-123",
  "attributes": {
    "verified_age_over_18": "true",
    "verified_country": "JP",
    "verified_given_name": "John"
  }
}
```

### Request Status

#### GET `/vp/request/{id}`

Get status of a VP request.

**Response:**
```json
{
  "id": "req-123",
  "status": "verified",
  "verified_claims": {
    "age_over_18": true
  }
}
```

## OpenID4VCI (Issuer) Endpoints

### Discovery

#### GET `/.well-known/openid-credential-issuer`

Returns issuer metadata.

**Response:**
```json
{
  "credential_issuer": "did:web:authrim.com",
  "credential_endpoint": "https://authrim.com/vci/credential",
  "deferred_credential_endpoint": "https://authrim.com/vci/deferred",
  "credential_configurations_supported": {
    "AuthrimIdentityCredential": {
      "format": "dc+sd-jwt",
      "vct": "https://authrim.com/credentials/identity/v1",
      "cryptographic_binding_methods_supported": ["jwk"],
      "credential_signing_alg_values_supported": ["ES256"],
      "claims": {
        "given_name": {},
        "family_name": {},
        "email": {},
        "birthdate": {}
      }
    },
    "AuthrimAgeVerification": {
      "format": "dc+sd-jwt",
      "vct": "https://authrim.com/credentials/age-verification/v1",
      "claims": {
        "age_over_18": { "mandatory": true },
        "age_over_21": {}
      }
    }
  }
}
```

### Credential Offer

#### GET `/vci/offer/{id}`

Get a credential offer.

**Response:**
```json
{
  "credential_issuer": "did:web:authrim.com",
  "credential_configuration_ids": ["AuthrimIdentityCredential"],
  "grants": {
    "urn:ietf:params:oauth:grant-type:pre-authorized_code": {
      "pre-authorized_code": "pre-auth-123",
      "tx_code": {
        "input_mode": "numeric",
        "length": 6
      }
    }
  }
}
```

### Credential Issuance

#### POST `/vci/credential`

Issue a credential to the wallet.

**Request Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "format": "dc+sd-jwt",
  "vct": "https://authrim.com/credentials/identity/v1",
  "proof": {
    "proof_type": "jwt",
    "jwt": "<proof-jwt>"
  }
}
```

**Success Response:**
```json
{
  "credential": "eyJ0eXAiOiJkYytzZC1qd3Qi...~disc1~disc2~",
  "c_nonce": "new-c-nonce",
  "c_nonce_expires_in": 300
}
```

**Deferred Response (202):**
```json
{
  "transaction_id": "tx-123",
  "c_nonce": "new-c-nonce",
  "c_nonce_expires_in": 300
}
```

### Deferred Credential

#### POST `/vci/deferred`

Retrieve a deferred credential.

**Request Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "transaction_id": "tx-123"
}
```

**Ready Response:**
```json
{
  "credential": "eyJ0eXAiOiJkYytzZC1qd3Qi...~disc1~disc2~",
  "c_nonce": "new-c-nonce",
  "c_nonce_expires_in": 300
}
```

**Pending Response (400):**
```json
{
  "error": "issuance_pending",
  "error_description": "Credential issuance is still pending",
  "interval": 5
}
```

## DID Resolution Endpoints

#### GET `/.well-known/did.json`

Returns Authrim's DID document.

**Response:**
```json
{
  "@context": ["https://www.w3.org/ns/did/v1"],
  "id": "did:web:authrim.com",
  "verificationMethod": [{
    "id": "did:web:authrim.com#key-1",
    "type": "JsonWebKey2020",
    "controller": "did:web:authrim.com",
    "publicKeyJwk": {
      "kty": "EC",
      "crv": "P-256",
      "x": "...",
      "y": "..."
    }
  }],
  "assertionMethod": ["did:web:authrim.com#key-1"]
}
```

#### GET `/did/resolve/{did}`

Resolve any DID (did:web, did:key).

**Response:**
```json
{
  "didDocument": {
    "@context": ["https://www.w3.org/ns/did/v1"],
    "id": "did:web:issuer.example.com",
    "verificationMethod": [...]
  },
  "didResolutionMetadata": {
    "contentType": "application/did+ld+json"
  }
}
```

## Error Codes

| Error | Description |
|-------|-------------|
| `invalid_request` | Missing or invalid request parameters |
| `invalid_token` | Invalid or expired access token |
| `invalid_presentation` | VP token verification failed |
| `invalid_proof` | Proof of possession verification failed |
| `issuer_not_trusted` | VC issuer not in trusted registry |
| `self_issued_credential_rejected` | Cannot accept self-issued credentials |
| `issuance_pending` | Deferred credential not ready |
| `invalid_transaction_id` | Deferred transaction not found |

## Attribute Mapping

VCs claims are normalized to verified attributes:

| VC Claim | Normalized Attribute |
|----------|---------------------|
| `given_name` | `verified_given_name` |
| `family_name` | `verified_family_name` |
| `email` | `verified_email` |
| `birthdate` | `verified_birthdate` |
| `age_over_18` | `verified_age_over_18` |
| `age_over_21` | `verified_age_over_21` |
| `address.country` | `verified_country` |
| `address.region` | `verified_region` |

## HAIP Compliance

Authrim implements HAIP (High Assurance Interoperability Profile) draft-06:

- **Holder Binding**: Required (Key Binding JWT)
- **Issuer Trust**: Configurable per deployment
- **Status Check**: Required if present
- **Algorithms**: ES256, ES384, ES512

## Security Considerations

1. **Self-Issuance Prevention**: Authrim rejects VCs issued by itself
2. **Nonce Single-Use**: Nonces are consumed on first use (Durable Object)
3. **Data Minimization**: Raw VCs are never stored; only normalized attributes
4. **GDPR Compliance**: Attribute deletion APIs available

## Related Specifications

- [OpenID4VP 1.0](https://openid.net/specs/openid-4-verifiable-presentations-1_0.html)
- [OpenID4VCI 1.0](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html)
- [SD-JWT RFC 9901](https://www.rfc-editor.org/rfc/rfc9901.html)
- [HAIP draft-06](https://openid.net/specs/openid4vc-high-assurance-interoperability-profile-1_0.html)
