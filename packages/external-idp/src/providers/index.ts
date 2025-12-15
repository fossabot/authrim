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
  // Future providers:
  // github: {
  //   name: 'GitHub',
  //   providerType: 'oauth2' as const,
  // },
} as const;

export type KnownProviderId = keyof typeof KNOWN_PROVIDERS;
