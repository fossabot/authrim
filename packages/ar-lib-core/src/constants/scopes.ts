/**
 * Scope Constants
 *
 * Defines OIDC standard scopes, AI capability scopes, and reserved namespaces.
 *
 * Scope Namespace Design:
 * - Standard OIDC scopes: openid, profile, email, address, phone
 * - AI capability scopes: ai:read, ai:write, ai:execute, ai:admin
 * - Reserved namespaces: ai:, system:, internal: (cannot be used by custom scopes)
 *
 * @see §16 in architecture-decisions.md for AI scope design rationale
 */

// =============================================================================
// Standard OIDC Scopes
// =============================================================================

/**
 * Standard OIDC scopes (RFC 6749 + OIDC Core)
 *
 * These are always available for human profile tenants.
 */
export const STANDARD_SCOPES = ['openid', 'profile', 'email', 'address', 'phone'] as const;

/**
 * Type for standard OIDC scopes
 */
export type StandardScope = (typeof STANDARD_SCOPES)[number];

/**
 * Check if a scope is a standard OIDC scope
 */
export function isStandardScope(scope: string): scope is StandardScope {
  return STANDARD_SCOPES.includes(scope as StandardScope);
}

// =============================================================================
// AI Capability Scopes
// =============================================================================

/**
 * AI capability scopes
 *
 * Used for AI Ephemeral Auth profile tenants.
 * These scopes define what capabilities an AI agent can request.
 *
 * IMPORTANT: Flat implementation (no implicit inheritance)
 * Each scope must be explicitly requested. ai:admin does NOT implicitly grant
 * ai:read, ai:write, or ai:execute. This follows the MCP "Just-Enough" principle
 * and the OAuth 2.0 least privilege model.
 *
 * Scopes:
 * - ai:read    - Read-only access to resources
 * - ai:write   - Write access to resources (requires explicit request)
 * - ai:execute - Can execute tools/actions (requires explicit request)
 * - ai:admin   - Administrative operations (tenant admin approval required)
 *
 * Example: An agent needing read and write must request "ai:read ai:write"
 */
export const AI_SCOPES = ['ai:read', 'ai:write', 'ai:execute', 'ai:admin'] as const;

/**
 * Type for AI capability scopes
 */
export type AIScope = (typeof AI_SCOPES)[number];

/**
 * Check if a scope is an AI capability scope
 */
export function isAIScope(scope: string): scope is AIScope {
  return AI_SCOPES.includes(scope as AIScope);
}

/**
 * AI scope privilege levels (for display/ordering purposes only)
 *
 * NOTE: This does NOT imply automatic inheritance.
 * Higher levels do NOT automatically include lower level permissions.
 * Each scope must be explicitly requested.
 *
 * This constant is provided for UI ordering and risk classification only.
 */
export const AI_SCOPE_PRIVILEGE_LEVEL: Record<AIScope, number> = {
  'ai:read': 1,
  'ai:write': 2,
  'ai:execute': 3,
  'ai:admin': 4,
} as const;

/**
 * @deprecated Use AI_SCOPE_PRIVILEGE_LEVEL instead.
 * Kept for backward compatibility.
 */
export const AI_SCOPE_HIERARCHY = AI_SCOPE_PRIVILEGE_LEVEL;

// =============================================================================
// Reserved Namespaces
// =============================================================================

/**
 * Reserved scope namespaces
 *
 * Custom scopes MUST NOT start with these prefixes.
 * Only the platform can define scopes in these namespaces.
 */
export const RESERVED_NAMESPACES = ['ai:', 'system:', 'internal:', 'authrim:'] as const;

/**
 * Type for reserved namespaces
 */
export type ReservedNamespace = (typeof RESERVED_NAMESPACES)[number];

/**
 * Check if a scope starts with a reserved namespace
 */
export function isReservedNamespace(scope: string): boolean {
  return RESERVED_NAMESPACES.some((ns) => scope.startsWith(ns));
}

/**
 * Check if a scope is in the AI namespace
 */
export function isInAINamespace(scope: string): boolean {
  return scope.startsWith('ai:');
}

// =============================================================================
// Offline Access Scope
// =============================================================================

/**
 * Offline access scope (RFC 6749)
 *
 * Requests a refresh token. Only valid for human profile tenants.
 */
export const OFFLINE_ACCESS_SCOPE = 'offline_access' as const;

// =============================================================================
// Combined Scope Sets
// =============================================================================

/**
 * All platform-defined scopes
 */
export const ALL_PLATFORM_SCOPES = [
  ...STANDARD_SCOPES,
  ...AI_SCOPES,
  OFFLINE_ACCESS_SCOPE,
] as const;

/**
 * Scopes available for human profile tenants
 */
export const HUMAN_PROFILE_SCOPES = [...STANDARD_SCOPES, OFFLINE_ACCESS_SCOPE] as const;

/**
 * Scopes available for AI ephemeral profile tenants
 */
export const AI_EPHEMERAL_PROFILE_SCOPES = [...AI_SCOPES] as const;

// =============================================================================
// Scope Validation Helpers
// =============================================================================

/**
 * Scope validation options
 */
export interface ScopeValidationOptions {
  /** Allow custom scopes (non-platform scopes) */
  allowCustomScopes?: boolean;
  /** Allow AI namespace scopes */
  allowAIScopes?: boolean;
  /** Allow offline_access scope */
  allowOfflineAccess?: boolean;
  /** Allowed custom scope patterns (regex) */
  customScopePatterns?: RegExp[];
  /** Maximum scope length */
  maxScopeLength?: number;
}

/**
 * Default scope validation options
 */
export const DEFAULT_SCOPE_VALIDATION_OPTIONS: Required<ScopeValidationOptions> = {
  allowCustomScopes: true,
  allowAIScopes: false, // Secure default: AI scopes disabled
  allowOfflineAccess: true,
  customScopePatterns: [],
  maxScopeLength: 256,
} as const;

/**
 * Scope character validation regex
 *
 * RFC 6749 defines scope as: scope-token = 1*NQCHAR
 * NQCHAR = %x21 / %x23-5B / %x5D-7E (printable ASCII except backslash and double-quote)
 *
 * We use a more restrictive pattern for safety:
 * - Alphanumeric
 * - Underscore, hyphen, colon, period
 */
export const SCOPE_CHAR_PATTERN = /^[a-zA-Z0-9_\-:.]+$/;

/**
 * Validate scope character format
 */
export function isValidScopeFormat(scope: string): boolean {
  return SCOPE_CHAR_PATTERN.test(scope);
}

// =============================================================================
// Scope Parsing
// =============================================================================

/**
 * Parse scope string into array
 *
 * Handles both space-separated and array formats.
 */
export function parseScopeString(scope: string | string[] | undefined): string[] {
  if (!scope) return [];
  if (Array.isArray(scope)) return scope.filter((s) => typeof s === 'string' && s.length > 0);
  return scope
    .split(/\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Join scope array into string
 */
export function joinScopes(scopes: string[]): string {
  return scopes.join(' ');
}

/**
 * Deduplicate scopes while preserving order
 */
export function deduplicateScopes(scopes: string[]): string[] {
  return [...new Set(scopes)];
}
