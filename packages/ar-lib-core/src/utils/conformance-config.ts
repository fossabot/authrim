/**
 * Conformance Mode Configuration Manager
 *
 * Hybrid approach for managing conformance mode:
 * - Environment variables provide defaults (requires deploy to change)
 * - KV storage provides dynamic overrides (changes without deploy)
 *
 * Priority: KV > Environment variable > Default value
 *
 * Conformance Mode Behavior:
 * - enabled = true  → Use built-in HTML forms (for OIDC conformance testing)
 * - enabled = false → Redirect to external UI (production mode)
 * - enabled = false + UI_URL not set → Return 500 configuration error
 */

import type { Env } from '../types/env';

/**
 * Conformance mode configuration
 */
export interface ConformanceConfig {
  /** Enable conformance mode (use built-in forms instead of external UI) */
  enabled: boolean;
  /** Use built-in HTML forms when conformance mode is enabled */
  useBuiltinForms: boolean;
}

/**
 * Default conformance configuration
 * Default: disabled for security (production mode)
 */
export const DEFAULT_CONFORMANCE_CONFIG: ConformanceConfig = {
  enabled: false,
  useBuiltinForms: true, // When conformance is enabled, use built-in forms
};

/**
 * Configuration metadata for Admin UI
 */
export const CONFORMANCE_CONFIG_METADATA: Record<
  keyof ConformanceConfig,
  {
    label: string;
    description: string;
    type: 'boolean';
  }
> = {
  enabled: {
    label: 'Conformance Mode',
    description:
      'Enable conformance mode for OIDC certification testing. When enabled, built-in HTML forms are used instead of external UI.',
    type: 'boolean',
  },
  useBuiltinForms: {
    label: 'Use Built-in Forms',
    description:
      'Use built-in HTML login/consent forms when conformance mode is enabled. Required for OIDC conformance testing.',
    type: 'boolean',
  },
};

/**
 * Get conformance mode configuration
 * Priority: KV (system_settings.conformance) > env.CONFORMANCE_MODE > default
 *
 * @param env Environment bindings
 * @returns Conformance configuration
 */
export async function getConformanceConfig(
  env: Partial<Pick<Env, 'SETTINGS' | 'CONFORMANCE_MODE'>>
): Promise<ConformanceConfig> {
  // 1. Try KV first
  if (env.SETTINGS) {
    try {
      const settings = await env.SETTINGS.get('system_settings');
      if (settings) {
        const parsed = JSON.parse(settings) as { conformance?: Partial<ConformanceConfig> };
        if (parsed.conformance !== undefined) {
          return {
            enabled: parsed.conformance.enabled ?? DEFAULT_CONFORMANCE_CONFIG.enabled,
            useBuiltinForms:
              parsed.conformance.useBuiltinForms ?? DEFAULT_CONFORMANCE_CONFIG.useBuiltinForms,
          };
        }
      }
    } catch {
      // Fall through to environment variable
    }
  }

  // 2. Try environment variable
  if (env.CONFORMANCE_MODE !== undefined) {
    const enabled = parseBoolean(env.CONFORMANCE_MODE);
    return {
      enabled,
      useBuiltinForms: enabled, // When conformance is enabled via env, use built-in forms
    };
  }

  // 3. Return default
  return DEFAULT_CONFORMANCE_CONFIG;
}

/**
 * Check if conformance mode is enabled
 * Convenience function for quick checks
 *
 * @param env Environment bindings
 * @returns true if conformance mode is enabled
 */
export async function isConformanceMode(
  env: Partial<Pick<Env, 'SETTINGS' | 'CONFORMANCE_MODE'>>
): Promise<boolean> {
  const config = await getConformanceConfig(env);
  return config.enabled;
}

/**
 * Check if built-in forms should be used
 *
 * @param env Environment bindings
 * @returns true if built-in forms should be used
 */
export async function shouldUseBuiltinForms(
  env: Partial<Pick<Env, 'SETTINGS' | 'CONFORMANCE_MODE'>>
): Promise<boolean> {
  const config = await getConformanceConfig(env);
  return config.enabled && config.useBuiltinForms;
}

/**
 * Get configuration source for debugging
 *
 * @param env Environment bindings
 * @returns Source of the configuration
 */
export async function getConformanceConfigSource(
  env: Partial<Pick<Env, 'SETTINGS' | 'CONFORMANCE_MODE'>>
): Promise<'kv' | 'env' | 'default'> {
  // Check KV first
  if (env.SETTINGS) {
    try {
      const settings = await env.SETTINGS.get('system_settings');
      if (settings) {
        const parsed = JSON.parse(settings) as { conformance?: Partial<ConformanceConfig> };
        if (parsed.conformance !== undefined) {
          return 'kv';
        }
      }
    } catch {
      // Fall through
    }
  }

  // Check environment variable
  if (env.CONFORMANCE_MODE !== undefined) {
    return 'env';
  }

  return 'default';
}

/**
 * Parse boolean from string
 */
function parseBoolean(value: string): boolean {
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Conformance mode error response
 * Used when conformance mode is disabled but UI_URL is not configured
 */
export interface ConformanceConfigError {
  error: 'configuration_error';
  error_description: string;
}

/**
 * Create configuration error response
 * For use when UI_URL is not configured and conformance mode is disabled
 */
export function createConfigurationError(): ConformanceConfigError {
  return {
    error: 'configuration_error',
    error_description: 'UI_URL is not configured and conformance mode is disabled',
  };
}
