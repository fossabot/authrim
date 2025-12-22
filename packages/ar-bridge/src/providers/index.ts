/**
 * Provider Registry
 * Central registry for external IdP provider configurations
 */

export {
  GOOGLE_ISSUER,
  GOOGLE_DEFAULT_CONFIG,
  GOOGLE_CLAIM_MAPPINGS,
  validateGoogleConfig,
} from './google';

export {
  MICROSOFT_ISSUER,
  MICROSOFT_DEFAULT_CONFIG,
  MICROSOFT_CLAIM_MAPPINGS,
  MICROSOFT_TENANT_LABELS,
  validateMicrosoftConfig,
  getMicrosoftIssuer,
  getMicrosoftEffectiveIssuer,
  createMicrosoftConfig,
  type MicrosoftTenantType,
  type MicrosoftProviderQuirks,
} from './microsoft';

export {
  GITHUB_DEFAULT_CONFIG,
  GITHUB_CLAIM_MAPPINGS,
  GITHUB_AUTHORIZATION_ENDPOINT,
  GITHUB_TOKEN_ENDPOINT,
  GITHUB_USERINFO_ENDPOINT,
  GITHUB_USER_EMAILS_ENDPOINT,
  validateGitHubConfig,
  getGitHubEffectiveEndpoints,
  getGitHubEnterpriseEndpoints,
  createGitHubConfig,
  type GitHubProviderQuirks,
  type GitHubEmail,
} from './github';

export {
  LINKEDIN_ISSUER,
  LINKEDIN_DEFAULT_CONFIG,
  LINKEDIN_CLAIM_MAPPINGS,
  LINKEDIN_AUTHORIZATION_ENDPOINT,
  LINKEDIN_TOKEN_ENDPOINT,
  LINKEDIN_USERINFO_ENDPOINT,
  LINKEDIN_JWKS_URI,
  validateLinkedInConfig,
} from './linkedin';

export {
  FACEBOOK_API_VERSION,
  FACEBOOK_DEFAULT_CONFIG,
  FACEBOOK_CLAIM_MAPPINGS,
  FACEBOOK_AUTHORIZATION_ENDPOINT,
  FACEBOOK_TOKEN_ENDPOINT,
  FACEBOOK_USERINFO_ENDPOINT,
  FACEBOOK_REVOCATION_ENDPOINT,
  validateFacebookConfig,
  getFacebookEndpoints,
  getFacebookEffectiveEndpoints,
  generateAppSecretProof,
  createFacebookConfig,
  type FacebookProviderQuirks,
} from './facebook';

export {
  TWITTER_DEFAULT_CONFIG,
  TWITTER_CLAIM_MAPPINGS,
  TWITTER_AUTHORIZATION_ENDPOINT,
  TWITTER_TOKEN_ENDPOINT,
  TWITTER_USERINFO_ENDPOINT,
  TWITTER_REVOCATION_ENDPOINT,
  validateTwitterConfig,
  getTwitterUserInfoUrl,
  getTwitterEffectiveEndpoints,
  createTwitterConfig,
  type TwitterProviderQuirks,
} from './twitter';

export {
  APPLE_ISSUER,
  APPLE_DEFAULT_CONFIG,
  APPLE_CLAIM_MAPPINGS,
  APPLE_AUTHORIZATION_ENDPOINT,
  APPLE_TOKEN_ENDPOINT,
  APPLE_JWKS_URI,
  APPLE_REVOCATION_ENDPOINT,
  APPLE_REAL_USER_STATUS,
  validateAppleConfig,
  isAppleProvider,
  createAppleConfig,
  type AppleProviderQuirks,
} from './apple';

/**
 * Known provider types with their default configurations
 */
export const KNOWN_PROVIDERS = {
  google: {
    name: 'Google',
    issuer: 'https://accounts.google.com',
    providerType: 'oidc' as const,
  },
  microsoft: {
    name: 'Microsoft',
    issuer: 'https://login.microsoftonline.com/common/v2.0',
    providerType: 'oidc' as const,
  },
  github: {
    name: 'GitHub',
    providerType: 'oauth2' as const,
  },
  linkedin: {
    name: 'LinkedIn',
    issuer: 'https://www.linkedin.com/oauth',
    providerType: 'oidc' as const,
  },
  facebook: {
    name: 'Facebook',
    providerType: 'oauth2' as const,
  },
  twitter: {
    name: 'Twitter',
    providerType: 'oauth2' as const,
  },
  apple: {
    name: 'Apple',
    issuer: 'https://appleid.apple.com',
    providerType: 'oidc' as const,
  },
} as const;

export type KnownProviderId = keyof typeof KNOWN_PROVIDERS;
