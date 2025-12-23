/**
 * Issuer URL Builder
 *
 * Single-tenant mode: returns ISSUER_URL from environment as-is
 * Future MT: builds dynamic issuer URL from subdomain + BASE_DOMAIN
 *
 * This abstraction allows easy migration to multi-tenant mode
 * by simply modifying this function.
 */
import type { Env } from '../types/env';
/**
 * Build the OIDC issuer URL for a tenant.
 *
 * In single-tenant mode, this simply returns the configured ISSUER_URL.
 * In future multi-tenant mode, this will construct the issuer URL
 * from the tenant subdomain and base domain.
 *
 * @param env - Cloudflare Workers environment bindings
 * @param _tenantSubdomain - Tenant subdomain (unused in single-tenant mode)
 * @returns The issuer URL string
 *
 * @example
 * // Single-tenant (current)
 * buildIssuerUrl(env) // => 'https://auth.example.com'
 *
 * // Future multi-tenant
 * buildIssuerUrl(env, 'acme') // => 'https://acme.authrim.app'
 */
export declare function buildIssuerUrl(env: Env, _tenantSubdomain?: string): string;
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
export declare function extractSubdomain(hostname: string, baseDomain: string): string | null;
//# sourceMappingURL=issuer.d.ts.map
