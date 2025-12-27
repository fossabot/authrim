/**
 * Tenant Profile Types
 *
 * Defines the two-layer authentication model for AI Agent era:
 * - Human Auth: Traditional web/mobile authentication (login, session, MFA, consent)
 * - AI Ephemeral Auth: Short-lived, capability-scoped tokens for AI agents
 *
 * The profile determines which authentication features are available for a tenant.
 * This is a capability set model, not just a simple flag.
 *
 * @see §16 in architecture-decisions.md for detailed design rationale
 */

// =============================================================================
// Profile Type
// =============================================================================

/**
 * Tenant Profile Type
 *
 * - human: Traditional authentication for human users
 * - ai_ephemeral: Short-lived, stateless tokens for AI agents/tools
 */
export type TenantProfileType = 'human' | 'ai_ephemeral';

// =============================================================================
// Profile Capability Set
// =============================================================================

/**
 * Tenant Profile Capability Set
 *
 * Defines what authentication features are available for the tenant.
 * Each capability can be enabled/disabled based on the profile type.
 */
export interface TenantProfile {
  /** Profile type identifier */
  readonly type: TenantProfileType;

  // ========== Authentication Capabilities ==========

  /** Human login UI flow allowed (login page, credentials) */
  readonly allows_login: boolean;

  /** Session-based authentication allowed (session cookies, session DO) */
  readonly allows_session: boolean;

  /** Multi-factor authentication allowed/required */
  readonly allows_mfa: boolean;

  /** Refresh token issuance allowed */
  readonly allows_refresh_token: boolean;

  // ========== Authorization Capabilities ==========

  /** Client Credentials grant allowed (M2M, RFC 6749 §4.4) */
  readonly allows_client_credentials: boolean;

  /** Token Exchange grant allowed (RFC 8693) */
  readonly allows_token_exchange: boolean;

  // ========== Token Constraints ==========

  /** Maximum access token TTL in seconds */
  readonly max_token_ttl_seconds: number;

  /** Requires capability-based scopes (ai:* namespace) */
  readonly requires_capability_scope: boolean;

  // ========== State Management ==========

  /** Uses Durable Objects for state management (session, authcode, etc.) */
  readonly uses_do_for_state: boolean;
}

// =============================================================================
// Profile Presets
// =============================================================================

/**
 * Default Human Profile
 *
 * Traditional web/mobile authentication with full session management.
 * - Long-lived sessions with refresh tokens
 * - MFA support
 * - Human-readable consent flows
 * - DO-based state management for consistency
 */
export const DEFAULT_HUMAN_PROFILE: TenantProfile = {
  type: 'human',

  // Authentication: Full human auth flow
  allows_login: true,
  allows_session: true,
  allows_mfa: true,
  allows_refresh_token: true,

  // Authorization: Token Exchange only (no client_credentials for human tenants)
  allows_client_credentials: false,
  allows_token_exchange: true,

  // Token: 24-hour max TTL, standard scopes
  max_token_ttl_seconds: 86400, // 24 hours
  requires_capability_scope: false,

  // State: DO for consistency
  uses_do_for_state: true,
} as const;

/**
 * Default AI Ephemeral Profile
 *
 * Short-lived, capability-scoped tokens for AI agents and tools.
 * - No login/session (stateless)
 * - No refresh tokens (re-acquire via client_credentials)
 * - Capability-based scopes (ai:read, ai:execute, etc.)
 * - KV-based state (minimal, quota/rate-limit only)
 */
export const DEFAULT_AI_EPHEMERAL_PROFILE: TenantProfile = {
  type: 'ai_ephemeral',

  // Authentication: No human auth (agents use client_credentials)
  allows_login: false,
  allows_session: false,
  allows_mfa: false,
  allows_refresh_token: false,

  // Authorization: Client Credentials + Token Exchange
  allows_client_credentials: true,
  allows_token_exchange: true,

  // Token: 1-hour max TTL, capability scopes required
  max_token_ttl_seconds: 3600, // 1 hour
  requires_capability_scope: true,

  // State: Minimal (KV-based)
  uses_do_for_state: false,
} as const;

// =============================================================================
// Profile Registry
// =============================================================================

/**
 * Profile registry for lookup by type
 */
export const TENANT_PROFILES: Record<TenantProfileType, TenantProfile> = {
  human: DEFAULT_HUMAN_PROFILE,
  ai_ephemeral: DEFAULT_AI_EPHEMERAL_PROFILE,
} as const;

/**
 * Get profile by type with fallback to human
 */
export function getTenantProfile(type?: TenantProfileType): TenantProfile {
  if (!type) {
    return DEFAULT_HUMAN_PROFILE;
  }
  return TENANT_PROFILES[type] ?? DEFAULT_HUMAN_PROFILE;
}

/**
 * Validate profile type
 */
export function isValidProfileType(type: unknown): type is TenantProfileType {
  return type === 'human' || type === 'ai_ephemeral';
}
