/**
 * Feature Flag Utilities
 *
 * Implements hybrid approach: KV → Environment Variable → Default Value
 * Per CLAUDE.md: コード内のデフォルト値はセキュリティ的に安全な方の設定値にする
 *
 * Priority:
 * 1. KV (dynamic, no redeploy needed)
 * 2. Environment variable (deploy-time default)
 * 3. Code default (secure by default)
 */
import type { Env } from '../types/env';
/**
 * Get a boolean feature flag value
 *
 * Priority: Cache → KV → Environment Variable → Default
 *
 * @param flagName - Name of the feature flag (e.g., 'ENABLE_MOCK_AUTH')
 * @param env - Worker environment bindings
 * @param defaultValue - Default value if not configured (should be secure default)
 * @returns true if enabled, false otherwise
 */
export declare function getFeatureFlag(
  flagName: string,
  env: Env,
  defaultValue?: boolean
): Promise<boolean>;
/**
 * Check if mock authentication is enabled
 *
 * SECURITY WARNING: This should NEVER be enabled in production!
 * Mock auth allows device/CIBA flows to use mock users without real authentication.
 *
 * @param env - Worker environment bindings
 * @returns true if mock auth is enabled, false otherwise (secure default)
 */
export declare function isMockAuthEnabled(env: Env): Promise<boolean>;
/**
 * Clear the feature flag cache (for testing or dynamic updates)
 */
export declare function clearFeatureFlagCache(): void;
//# sourceMappingURL=feature-flags.d.ts.map
