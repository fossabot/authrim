/**
 * LinkedIn Provider Configuration
 * Pre-configured settings for LinkedIn OpenID Connect authentication
 *
 * LinkedIn migrated to OpenID Connect in 2024.
 * - OIDC-compliant with standard endpoints
 * - ID token contains user claims
 * - Userinfo endpoint available for additional data
 *
 * Scopes:
 * - openid: Required for OIDC
 * - profile: User profile data (name, picture)
 * - email: User email address
 *
 * Token Lifecycle:
 * - Access tokens are valid for 60 days (5,184,000 seconds)
 * - LinkedIn does NOT provide a token revocation endpoint
 * - Tokens expire naturally; re-authorization creates new tokens
 * - To "logout", simply discard the tokens on the client side
 *
 * References:
 * - https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2
 * - https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow
 * - https://learn.microsoft.com/en-us/linkedin/shared/authentication/programmatic-refresh-tokens
 */

import type { UpstreamProvider } from '../types';

// =============================================================================
// LinkedIn Constants
// =============================================================================

export const LINKEDIN_ISSUER = 'https://www.linkedin.com/oauth';
export const LINKEDIN_AUTHORIZATION_ENDPOINT = 'https://www.linkedin.com/oauth/v2/authorization';
export const LINKEDIN_TOKEN_ENDPOINT = 'https://www.linkedin.com/oauth/v2/accessToken';
export const LINKEDIN_USERINFO_ENDPOINT = 'https://api.linkedin.com/v2/userinfo';
export const LINKEDIN_JWKS_URI = 'https://www.linkedin.com/oauth/openid/jwks';

// =============================================================================
// LinkedIn Default Configuration
// =============================================================================

/**
 * Default configuration for LinkedIn provider
 * Use this as a template when creating a new LinkedIn provider via Admin API
 */
export const LINKEDIN_DEFAULT_CONFIG: Partial<UpstreamProvider> = {
  name: 'LinkedIn',
  providerType: 'oidc',
  issuer: LINKEDIN_ISSUER,
  authorizationEndpoint: LINKEDIN_AUTHORIZATION_ENDPOINT,
  tokenEndpoint: LINKEDIN_TOKEN_ENDPOINT,
  userinfoEndpoint: LINKEDIN_USERINFO_ENDPOINT,
  jwksUri: LINKEDIN_JWKS_URI,
  scopes: 'openid profile email',
  attributeMapping: {
    sub: 'sub',
    email: 'email',
    email_verified: 'email_verified',
    name: 'name',
    given_name: 'given_name',
    family_name: 'family_name',
    picture: 'picture',
    locale: 'locale',
  },
  autoLinkEmail: true,
  jitProvisioning: true,
  requireEmailVerified: true,
  iconUrl: 'https://www.linkedin.com/favicon.ico',
  buttonColor: '#0A66C2',
  buttonText: 'Continue with LinkedIn',
  providerQuirks: {},
};

// =============================================================================
// LinkedIn Claim Mappings
// =============================================================================

/**
 * LinkedIn OIDC claim mappings
 * LinkedIn follows OIDC standard closely, so most claims map 1:1
 */
export const LINKEDIN_CLAIM_MAPPINGS = {
  // Standard OIDC claims
  sub: 'sub',
  email: 'email',
  email_verified: 'email_verified',
  name: 'name',
  given_name: 'given_name',
  family_name: 'family_name',
  picture: 'picture',
  locale: 'locale',
};

// =============================================================================
// Validation
// =============================================================================

/**
 * Validate LinkedIn-specific requirements
 */
export function validateLinkedInConfig(provider: Partial<UpstreamProvider>): string[] {
  const errors: string[] = [];

  if (!provider.clientId) {
    errors.push('clientId is required');
  }

  if (!provider.clientSecretEncrypted) {
    errors.push('clientSecret is required');
  }

  // LinkedIn requires specific scopes
  const scopes = provider.scopes?.split(/[\s,]+/) || [];
  if (!scopes.includes('openid')) {
    errors.push('openid scope is required for OIDC');
  }

  return errors;
}
