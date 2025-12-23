/**
 * SAML 2.0 Type Definitions
 *
 * Type definitions for SAML 2.0 protocol implementation.
 * Includes types for both IdP (Identity Provider) and SP (Service Provider) roles.
 */
/**
 * SAML Binding types
 */
export type SAMLBinding = 'post' | 'redirect' | 'artifact';
/**
 * SAML NameID Format URIs
 */
export declare const NameIDFormats: {
  readonly EMAIL: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress';
  readonly PERSISTENT: 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent';
  readonly TRANSIENT: 'urn:oasis:names:tc:SAML:2.0:nameid-format:transient';
  readonly UNSPECIFIED: 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified';
  readonly X509_SUBJECT: 'urn:oasis:names:tc:SAML:1.1:nameid-format:X509SubjectName';
  readonly WINDOWS_DQN: 'urn:oasis:names:tc:SAML:1.1:nameid-format:WindowsDomainQualifiedName';
  readonly KERBEROS: 'urn:oasis:names:tc:SAML:2.0:nameid-format:kerberos';
  readonly ENTITY: 'urn:oasis:names:tc:SAML:2.0:nameid-format:entity';
};
export type NameIDFormat = (typeof NameIDFormats)[keyof typeof NameIDFormats];
/**
 * SAML Protocol Binding URIs
 */
export declare const SAMLBindingURIs: {
  readonly HTTP_POST: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST';
  readonly HTTP_REDIRECT: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect';
  readonly HTTP_ARTIFACT: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Artifact';
  readonly SOAP: 'urn:oasis:names:tc:SAML:2.0:bindings:SOAP';
};
export type SAMLBindingURI = (typeof SAMLBindingURIs)[keyof typeof SAMLBindingURIs];
/**
 * SAML Status Codes
 */
export declare const SAMLStatusCodes: {
  readonly SUCCESS: 'urn:oasis:names:tc:SAML:2.0:status:Success';
  readonly REQUESTER: 'urn:oasis:names:tc:SAML:2.0:status:Requester';
  readonly RESPONDER: 'urn:oasis:names:tc:SAML:2.0:status:Responder';
  readonly VERSION_MISMATCH: 'urn:oasis:names:tc:SAML:2.0:status:VersionMismatch';
  readonly AUTHN_FAILED: 'urn:oasis:names:tc:SAML:2.0:status:AuthnFailed';
  readonly INVALID_ATTR_NAMEID_POLICY: 'urn:oasis:names:tc:SAML:2.0:status:InvalidAttrNameOrValue';
  readonly INVALID_NAMEID_POLICY: 'urn:oasis:names:tc:SAML:2.0:status:InvalidNameIDPolicy';
  readonly NO_AUTHN_CONTEXT: 'urn:oasis:names:tc:SAML:2.0:status:NoAuthnContext';
  readonly NO_AVAILABLE_IDP: 'urn:oasis:names:tc:SAML:2.0:status:NoAvailableIDP';
  readonly NO_PASSIVE: 'urn:oasis:names:tc:SAML:2.0:status:NoPassive';
  readonly NO_SUPPORTED_IDP: 'urn:oasis:names:tc:SAML:2.0:status:NoSupportedIDP';
  readonly PARTIAL_LOGOUT: 'urn:oasis:names:tc:SAML:2.0:status:PartialLogout';
  readonly PROXY_COUNT_EXCEEDED: 'urn:oasis:names:tc:SAML:2.0:status:ProxyCountExceeded';
  readonly REQUEST_DENIED: 'urn:oasis:names:tc:SAML:2.0:status:RequestDenied';
  readonly REQUEST_UNSUPPORTED: 'urn:oasis:names:tc:SAML:2.0:status:RequestUnsupported';
  readonly REQUEST_VERSION_DEPRECATED: 'urn:oasis:names:tc:SAML:2.0:status:RequestVersionDeprecated';
  readonly REQUEST_VERSION_TOO_HIGH: 'urn:oasis:names:tc:SAML:2.0:status:RequestVersionTooHigh';
  readonly REQUEST_VERSION_TOO_LOW: 'urn:oasis:names:tc:SAML:2.0:status:RequestVersionTooLow';
  readonly RESOURCE_NOT_RECOGNIZED: 'urn:oasis:names:tc:SAML:2.0:status:ResourceNotRecognized';
  readonly TOO_MANY_RESPONSES: 'urn:oasis:names:tc:SAML:2.0:status:TooManyResponses';
  readonly UNKNOWN_ATTR_PROFILE: 'urn:oasis:names:tc:SAML:2.0:status:UnknownAttrProfile';
  readonly UNKNOWN_PRINCIPAL: 'urn:oasis:names:tc:SAML:2.0:status:UnknownPrincipal';
  readonly UNSUPPORTED_BINDING: 'urn:oasis:names:tc:SAML:2.0:status:UnsupportedBinding';
};
export type SAMLStatusCode = (typeof SAMLStatusCodes)[keyof typeof SAMLStatusCodes];
/**
 * SAML AuthnContext Class URIs
 */
export declare const AuthnContextClassRefs: {
  readonly PASSWORD: 'urn:oasis:names:tc:SAML:2.0:ac:classes:Password';
  readonly PASSWORD_PROTECTED_TRANSPORT: 'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport';
  readonly TLS_CLIENT: 'urn:oasis:names:tc:SAML:2.0:ac:classes:TLSClient';
  readonly X509: 'urn:oasis:names:tc:SAML:2.0:ac:classes:X509';
  readonly UNSPECIFIED: 'urn:oasis:names:tc:SAML:2.0:ac:classes:unspecified';
};
export type AuthnContextClassRef =
  (typeof AuthnContextClassRefs)[keyof typeof AuthnContextClassRefs];
/**
 * Parsed SAML AuthnRequest data
 */
export interface SAMLAuthnRequest {
  id: string;
  issueInstant: string;
  destination?: string;
  assertionConsumerServiceURL?: string;
  assertionConsumerServiceIndex?: number;
  protocolBinding?: SAMLBindingURI;
  issuer: string;
  nameIdPolicy?: {
    format?: NameIDFormat;
    allowCreate?: boolean;
    spNameQualifier?: string;
  };
  requestedAuthnContext?: {
    comparison?: 'exact' | 'minimum' | 'maximum' | 'better';
    authnContextClassRef?: string[];
  };
  forceAuthn?: boolean;
  isPassive?: boolean;
  relayState?: string;
}
/**
 * SAML Assertion data
 */
export interface SAMLAssertion {
  id: string;
  issueInstant: string;
  issuer: string;
  subject: {
    nameId: string;
    nameIdFormat: NameIDFormat;
    subjectConfirmation?: {
      method: string;
      notOnOrAfter?: string;
      recipient?: string;
      inResponseTo?: string;
    };
  };
  conditions?: {
    notBefore?: string;
    notOnOrAfter?: string;
    audienceRestriction?: string[];
    oneTimeUse?: boolean;
    proxyRestriction?: number;
  };
  authnStatement?: {
    authnInstant: string;
    sessionIndex?: string;
    sessionNotOnOrAfter?: string;
    authnContext: {
      authnContextClassRef: string;
    };
  };
  attributeStatement?: SAMLAttribute[];
}
/**
 * SAML Attribute
 */
export interface SAMLAttribute {
  name: string;
  nameFormat?: string;
  friendlyName?: string;
  values: string[];
}
/**
 * SAML Response data
 */
export interface SAMLResponse {
  id: string;
  issueInstant: string;
  destination?: string;
  inResponseTo?: string;
  issuer: string;
  status: {
    statusCode: SAMLStatusCode;
    statusMessage?: string;
    statusDetail?: string;
  };
  assertion?: SAMLAssertion;
}
/**
 * SAML LogoutRequest data
 */
export interface SAMLLogoutRequest {
  id: string;
  issueInstant: string;
  destination?: string;
  issuer: string;
  nameId: string;
  nameIdFormat: NameIDFormat;
  sessionIndex?: string;
  reason?: string;
  notOnOrAfter?: string;
  relayState?: string;
}
/**
 * SAML LogoutResponse data
 */
export interface SAMLLogoutResponse {
  id: string;
  issueInstant: string;
  destination?: string;
  inResponseTo?: string;
  issuer: string;
  status: {
    statusCode: SAMLStatusCode;
    statusMessage?: string;
  };
}
/**
 * SAML SP Configuration (stored in identity_providers table)
 * Used when Authrim acts as IdP
 */
export interface SAMLSPConfig {
  /** SP Entity ID */
  entityId: string;
  /** Assertion Consumer Service URL */
  acsUrl: string;
  /** Single Logout URL */
  sloUrl?: string;
  /** SP certificate for signature verification (PEM format) */
  certificate?: string;
  /** NameID format preference */
  nameIdFormat: NameIDFormat;
  /** OIDC claim to SAML attribute mapping */
  attributeMapping: Record<string, string>;
  /** Sign SAML Assertions */
  signAssertions: boolean;
  /** Sign SAML Responses */
  signResponses: boolean;
  /** Allowed bindings */
  allowedBindings: SAMLBinding[];
  /** Assertion validity duration in seconds (default: 300 = 5 minutes) */
  assertionValiditySeconds?: number;
  /** SP metadata XML (cached) */
  metadataXml?: string;
  /** Metadata last fetched timestamp */
  metadataLastFetched?: number;
}
/**
 * SAML IdP Configuration (stored in identity_providers table)
 * Used when Authrim acts as SP
 */
export interface SAMLIdPConfig {
  /** IdP Entity ID */
  entityId: string;
  /** SSO URL */
  ssoUrl: string;
  /** Single Logout URL */
  sloUrl?: string;
  /** IdP certificate for signature verification (PEM format) */
  certificate: string;
  /** NameID format */
  nameIdFormat: NameIDFormat;
  /** SAML attribute to OIDC claim mapping */
  attributeMapping: Record<string, string>;
  /** Allowed bindings */
  allowedBindings: SAMLBinding[];
  /** IdP metadata XML (cached) */
  metadataXml?: string;
  /** Metadata last fetched timestamp */
  metadataLastFetched?: number;
}
/**
 * SAML Request data stored in SAMLRequestStore DO
 */
export interface SAMLRequestData {
  /** SAML Request ID (_xxx format) */
  requestId: string;
  /** RelayState value */
  relayState?: string;
  /** Issuer Entity ID (SP or IdP) */
  issuer: string;
  /** Destination URL */
  destination: string;
  /** Assertion Consumer Service URL (for AuthnRequest) */
  acsUrl?: string;
  /** Binding type */
  binding: SAMLBinding;
  /** Whether this request has been consumed */
  used: boolean;
  /** Expiration timestamp (default: 5 minutes) */
  expiresAt: number;
  /** Creation timestamp */
  createdAt: number;
  /** Request type */
  type: 'authn_request' | 'logout_request' | 'artifact';
  /** Additional data (e.g., parsed AuthnRequest) */
  data?: SAMLAuthnRequest | SAMLLogoutRequest;
}
/**
 * SAML Artifact data (for Artifact Binding)
 */
export interface SAMLArtifactData {
  /** Artifact value */
  artifact: string;
  /** Associated SAML Response XML */
  responseXml: string;
  /** Issuer Entity ID */
  issuer: string;
  /** Whether consumed */
  used: boolean;
  /** Expiration timestamp */
  expiresAt: number;
  /** Creation timestamp */
  createdAt: number;
}
/**
 * IdP Metadata structure
 */
export interface IdPMetadata {
  entityId: string;
  ssoServices: Array<{
    binding: SAMLBindingURI;
    location: string;
  }>;
  sloServices?: Array<{
    binding: SAMLBindingURI;
    location: string;
  }>;
  nameIdFormats: NameIDFormat[];
  signingCertificates: string[];
  encryptionCertificates?: string[];
  organization?: {
    name: string;
    displayName: string;
    url: string;
  };
  contactPerson?: {
    type: 'technical' | 'support' | 'administrative' | 'billing' | 'other';
    company?: string;
    givenName?: string;
    surName?: string;
    emailAddress?: string;
    telephoneNumber?: string;
  };
}
/**
 * SP Metadata structure
 */
export interface SPMetadata {
  entityId: string;
  acsServices: Array<{
    binding: SAMLBindingURI;
    location: string;
    index: number;
    isDefault?: boolean;
  }>;
  sloServices?: Array<{
    binding: SAMLBindingURI;
    location: string;
  }>;
  nameIdFormats: NameIDFormat[];
  signingCertificates?: string[];
  encryptionCertificates?: string[];
  authnRequestsSigned?: boolean;
  wantAssertionsSigned?: boolean;
  organization?: {
    name: string;
    displayName: string;
    url: string;
  };
}
/**
 * SAML Provider registration request
 */
export interface SAMLProviderCreateRequest {
  /** Provider name for display */
  name: string;
  /** Provider type */
  providerType: 'saml_idp' | 'saml_sp';
  /** Configuration */
  config: SAMLIdPConfig | SAMLSPConfig;
  /** Enable/disable */
  enabled?: boolean;
}
/**
 * SAML Provider update request
 */
export interface SAMLProviderUpdateRequest {
  /** Provider name for display */
  name?: string;
  /** Configuration */
  config?: Partial<SAMLIdPConfig | SAMLSPConfig>;
  /** Enable/disable */
  enabled?: boolean;
}
/**
 * SAML Provider response
 */
export interface SAMLProviderResponse {
  id: string;
  name: string;
  providerType: 'saml_idp' | 'saml_sp';
  config: SAMLIdPConfig | SAMLSPConfig;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}
/**
 * Metadata import request
 */
export interface MetadataImportRequest {
  /** Metadata XML string */
  metadataXml?: string;
  /** Metadata URL to fetch */
  metadataUrl?: string;
}
//# sourceMappingURL=saml.d.ts.map
