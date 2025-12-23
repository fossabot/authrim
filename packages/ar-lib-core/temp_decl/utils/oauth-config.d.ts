/**
 * OAuth/OIDC Configuration Manager
 *
 * Hybrid approach for managing OAuth configuration:
 * - Environment variables provide defaults (requires deploy to change)
 * - KV storage provides dynamic overrides (changes without deploy)
 *
 * Priority: Cache > KV > Environment variable > Default value
 *
 * Supported configurations:
 * - TOKEN_EXPIRY: Access token TTL in seconds (default: 3600 = 1 hour)
 * - AUTH_CODE_TTL: Authorization code TTL in seconds (default: 60)
 * - STATE_EXPIRY: OAuth state parameter TTL in seconds (default: 300 = 5 min)
 * - NONCE_EXPIRY: OIDC nonce TTL in seconds (default: 300 = 5 min)
 * - REFRESH_TOKEN_EXPIRY: Refresh token TTL in seconds (default: 7776000 = 90 days)
 * - REFRESH_TOKEN_ROTATION_ENABLED: Enable refresh token rotation (default: true)
 * - MAX_CODES_PER_USER: Max auth codes per user for DDoS protection (default: 100)
 * - CODE_SHARDS: Number of auth code DO shards (default: 64)
 * - USER_CACHE_TTL: User cache TTL in seconds (default: 3600 = 1 hour)
 * - CONSENT_CACHE_TTL: Consent cache TTL in seconds (default: 86400 = 24 hours)
 */
import type { Env } from '../types/env';
/**
 * OAuth configuration values
 */
export interface OAuthConfig {
  /** Access token TTL in seconds */
  TOKEN_EXPIRY: number;
  /** Authorization code TTL in seconds */
  AUTH_CODE_TTL: number;
  /** OAuth state parameter TTL in seconds */
  STATE_EXPIRY: number;
  /** OIDC nonce TTL in seconds */
  NONCE_EXPIRY: number;
  /** Refresh token TTL in seconds */
  REFRESH_TOKEN_EXPIRY: number;
  /** Enable refresh token rotation (security best practice) */
  REFRESH_TOKEN_ROTATION_ENABLED: boolean;
  /** Max authorization codes per user (DDoS protection) */
  MAX_CODES_PER_USER: number;
  /** Number of auth code DO shards for load distribution */
  CODE_SHARDS: number;
  /** Require state parameter for CSRF protection */
  STATE_REQUIRED: boolean;
  /** Require openid scope for UserInfo endpoint (OIDC compliance) */
  USERINFO_REQUIRE_OPENID_SCOPE: boolean;
  /** User cache TTL in seconds (default: 3600 = 1 hour) */
  USER_CACHE_TTL: number;
  /** Consent cache TTL in seconds (default: 86400 = 24 hours) */
  CONSENT_CACHE_TTL: number;
  /** Config cache TTL in seconds (default: 180 = 3 minutes) */
  CONFIG_CACHE_TTL: number;
}
/**
 * Default in-memory cache TTL for config values (milliseconds)
 * This controls how often the config manager re-reads from KV
 * Balance: Higher = fewer KV reads (cost saving), Lower = faster config propagation
 */
export declare const DEFAULT_CONFIG_CACHE_TTL_MS = 180000;
/**
 * Default values for OAuth configuration
 * Based on OAuth 2.0 Security BCP and common practices
 */
export declare const DEFAULT_CONFIG: OAuthConfig;
/**
 * Configuration key names
 */
export declare const CONFIG_NAMES: readonly [
  'TOKEN_EXPIRY',
  'AUTH_CODE_TTL',
  'STATE_EXPIRY',
  'NONCE_EXPIRY',
  'REFRESH_TOKEN_EXPIRY',
  'REFRESH_TOKEN_ROTATION_ENABLED',
  'MAX_CODES_PER_USER',
  'CODE_SHARDS',
  'STATE_REQUIRED',
  'USERINFO_REQUIRE_OPENID_SCOPE',
  'USER_CACHE_TTL',
  'CONSENT_CACHE_TTL',
  'CONFIG_CACHE_TTL',
];
export type ConfigName = (typeof CONFIG_NAMES)[number];
/**
 * Configuration metadata for Admin UI
 */
export declare const CONFIG_METADATA: Record<
  ConfigName,
  {
    type: 'number' | 'boolean';
    label: string;
    description: string;
    min?: number;
    max?: number;
    unit?: string;
  }
>;
/**
 * Get OAuth config from environment variables only
 * Use this when KV is not available
 */
export declare function getConfigFromEnv(env: Partial<Env>): OAuthConfig;
/**
 * OAuth Configuration Manager
 *
 * Provides hybrid config resolution with caching
 */
export declare class OAuthConfigManager {
  private envConfig;
  private kv;
  private cache;
  private cacheTTL;
  /**
   * @param env Environment variables
   * @param kv KV namespace for dynamic overrides (AUTHRIM_CONFIG)
   * @param cacheTTL Cache TTL in milliseconds (default: 180 seconds / 3 minutes)
   */
  constructor(env: Partial<Env>, kv?: KVNamespace | null, cacheTTL?: number);
  /**
   * Get a numeric configuration value
   * Priority: Cache > KV > Environment > Default
   */
  getNumber(name: ConfigName): Promise<number>;
  /**
   * Get a boolean configuration value
   * Priority: Cache > KV > Environment > Default
   */
  getBoolean(name: ConfigName): Promise<boolean>;
  /**
   * Get all configuration values
   */
  getAllConfig(): Promise<OAuthConfig>;
  /**
   * Get config synchronously from cache/env only (no KV lookup)
   * Use this for performance-critical paths after initial warm-up
   */
  getConfigSync(): OAuthConfig;
  /**
   * Set a configuration override in KV
   * Requires KV to be configured
   */
  setConfig(name: ConfigName, value: number | boolean): Promise<void>;
  /**
   * Remove a configuration override from KV (revert to env/default)
   */
  clearConfig(name: ConfigName): Promise<void>;
  /**
   * Clear all configuration overrides from KV
   */
  clearAllConfig(): Promise<void>;
  /**
   * Get configuration sources (for debugging/admin UI)
   */
  getConfigSources(): Promise<
    Record<
      ConfigName,
      {
        value: number | boolean;
        source: 'kv' | 'env' | 'default';
      }
    >
  >;
  /** Get access token expiry in seconds */
  getTokenExpiry(): Promise<number>;
  /** Get authorization code TTL in seconds */
  getAuthCodeTTL(): Promise<number>;
  /** Get state parameter expiry in seconds */
  getStateExpiry(): Promise<number>;
  /** Get nonce expiry in seconds */
  getNonceExpiry(): Promise<number>;
  /** Get refresh token expiry in seconds */
  getRefreshTokenExpiry(): Promise<number>;
  /** Check if refresh token rotation is enabled */
  isRefreshTokenRotationEnabled(): Promise<boolean>;
  /** Get max codes per user limit */
  getMaxCodesPerUser(): Promise<number>;
  /** Get auth code shard count */
  getCodeShards(): Promise<number>;
  /** Check if state parameter is required (CSRF protection) */
  isStateRequired(): Promise<boolean>;
  /** Check if UserInfo endpoint requires openid scope (OIDC compliance) */
  isUserInfoRequireOpenidScope(): Promise<boolean>;
  /** Get user cache TTL in seconds */
  getUserCacheTTL(): Promise<number>;
  /** Get consent cache TTL in seconds */
  getConsentCacheTTL(): Promise<number>;
  /** Get config cache TTL in seconds */
  getConfigCacheTTL(): Promise<number>;
  /** Get current cache TTL in milliseconds (for diagnostics) */
  getCurrentCacheTTLMs(): number;
  /**
   * Clear cache (force re-read from KV on next access)
   */
  clearCache(): void;
}
/**
 * Create an OAuth config manager
 *
 * Cache TTL resolution order:
 * 1. Explicit cacheTTL parameter (for testing/override)
 * 2. Environment variable CONFIG_CACHE_TTL (in seconds, converted to ms)
 * 3. Default: 180 seconds (3 minutes)
 *
 * Note: KV-based CONFIG_CACHE_TTL is read asynchronously and applied on next instance.
 * For immediate KV override, use createOAuthConfigManagerAsync().
 */
export declare function createOAuthConfigManager(
  env: Partial<Env>,
  cacheTTL?: number
): OAuthConfigManager;
/**
 * Create an OAuth config manager with KV-based cache TTL (async)
 *
 * This reads CONFIG_CACHE_TTL from KV for immediate application.
 * Use this when you need KV override to take effect immediately.
 */
export declare function createOAuthConfigManagerAsync(
  env: Partial<Env>
): Promise<OAuthConfigManager>;
/**
 * Get or create the global OAuth config manager
 * Call this at the start of each request with the env binding
 */
export declare function getOAuthConfigManager(env: Partial<Env>): OAuthConfigManager;
//# sourceMappingURL=oauth-config.d.ts.map
