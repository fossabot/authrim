/**
 * Issuer URL Builder
 *
 * Supports both single-tenant and multi-tenant modes:
 * - Single-tenant: returns ISSUER_URL from environment as-is
 * - Multi-tenant: builds dynamic issuer URL from subdomain + BASE_DOMAIN
 *
 * Multi-tenant issuer format: iss = https://{tenant}.{BASE_DOMAIN}
 * Example: https://acme.authrim.com
 *
 * Security: Issuer determination is based on Host header (trusted),
 * NOT tenant_hint (untrusted UX hint).
 */

import type { Env } from '../types/env';
import { DEFAULT_TENANT_ID } from './tenant-context';

/**
 * Result of Host validation
 */
export interface HostValidationResult {
  valid: boolean;
  tenantId: string | null;
  error?: 'invalid_format' | 'missing_host' | 'tenant_not_found';
  statusCode?: 400 | 404;
}

/**
 * Build the OIDC issuer URL for a tenant.
 *
 * In single-tenant mode (BASE_DOMAIN not set), returns ISSUER_URL.
 * In multi-tenant mode (BASE_DOMAIN set), constructs issuer from subdomain.
 *
 * @param env - Cloudflare Workers environment bindings
 * @param tenantSubdomain - Tenant subdomain (required in multi-tenant mode)
 * @returns The issuer URL string
 *
 * @example
 * // Single-tenant
 * buildIssuerUrl(env) // => 'https://auth.example.com'
 *
 * // Multi-tenant
 * buildIssuerUrl(env, 'acme') // => 'https://acme.authrim.com'
 */
export function buildIssuerUrl(env: Env, tenantSubdomain: string = DEFAULT_TENANT_ID): string {
  // Multi-tenant mode: construct from subdomain + BASE_DOMAIN
  if (env.BASE_DOMAIN && env.ENABLE_TENANT_ISOLATION === 'true') {
    return `https://${tenantSubdomain}.${env.BASE_DOMAIN}`;
  }

  // Single-tenant mode: use configured ISSUER_URL
  return env.ISSUER_URL;
}

/**
 * Check if multi-tenant mode is enabled
 *
 * @param env - Environment bindings
 * @returns true if multi-tenant mode is enabled
 */
export function isMultiTenantEnabled(env: Partial<Env>): boolean {
  return !!env.BASE_DOMAIN && env.ENABLE_TENANT_ISOLATION === 'true';
}

/**
 * Validate Host header and extract tenant ID
 *
 * Error codes:
 * - 400 Bad Request: missing_host, invalid_format
 * - 404 Not Found: tenant_not_found (tenant existence hidden for security)
 *
 * @param host - Host header value
 * @param env - Environment bindings
 * @returns Validation result with tenant ID or error
 */
export function validateHostHeader(
  host: string | undefined,
  env: Partial<Env>
): HostValidationResult {
  // Single-tenant mode: always valid with default tenant
  if (!isMultiTenantEnabled(env)) {
    return {
      valid: true,
      tenantId: env.DEFAULT_TENANT_ID || DEFAULT_TENANT_ID,
    };
  }

  // Multi-tenant mode requires Host header
  if (!host) {
    return {
      valid: false,
      tenantId: null,
      error: 'missing_host',
      statusCode: 400,
    };
  }

  // Validate Host format (basic check)
  if (!isValidHostFormat(host)) {
    return {
      valid: false,
      tenantId: null,
      error: 'invalid_format',
      statusCode: 400,
    };
  }

  // Extract tenant subdomain
  const tenantId = extractSubdomain(host, env.BASE_DOMAIN!);

  if (!tenantId) {
    // No subdomain found - could be apex domain access
    return {
      valid: false,
      tenantId: null,
      error: 'tenant_not_found',
      statusCode: 404,
    };
  }

  // Tenant ID extracted successfully
  // Note: Actual tenant existence check should be done in middleware
  return {
    valid: true,
    tenantId,
  };
}

/**
 * Validate Host header format
 *
 * @param host - Host header value
 * @returns true if format is valid
 */
function isValidHostFormat(host: string): boolean {
  // Remove port if present
  const hostWithoutPort = host.split(':')[0];

  // Basic validation: alphanumeric, hyphens, dots
  // Must not start or end with hyphen/dot
  const validPattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i;
  return validPattern.test(hostWithoutPort);
}

/**
 * Extract the tenant subdomain from a full hostname.
 * For future multi-tenant use.
 *
 * @param hostname - Full hostname (e.g., 'acme.authrim.app')
 * @param baseDomain - Base domain to strip (e.g., 'authrim.app')
 * @returns Tenant subdomain or null if not found
 *
 * @example
 * extractSubdomain('acme.authrim.app', 'authrim.app') // => 'acme'
 * extractSubdomain('authrim.app', 'authrim.app') // => null
 */
export function extractSubdomain(hostname: string, baseDomain: string): string | null {
  // Remove port if present
  const host = hostname.split(':')[0];

  // Check if hostname ends with ".baseDomain" to prevent partial matches
  // e.g., "acme.notauthrim.com" should NOT match "authrim.com"
  const fullSuffix = '.' + baseDomain;
  if (!host.endsWith(fullSuffix)) {
    return null;
  }

  // Extract subdomain (exclude the dot separator)
  const subdomain = host.slice(0, -fullSuffix.length);

  // Return null if no subdomain or if it's empty
  if (!subdomain || subdomain === '') {
    return null;
  }

  return subdomain;
}
