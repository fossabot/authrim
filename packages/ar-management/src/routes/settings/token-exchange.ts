/**
 * Token Exchange (RFC 8693) Settings Admin API
 *
 * GET  /api/admin/settings/token-exchange     - Get Token Exchange settings
 * PUT  /api/admin/settings/token-exchange     - Update Token Exchange settings
 *
 * Settings stored in SETTINGS KV under "system_settings" key:
 * {
 *   "oidc": {
 *     "tokenExchange": {
 *       "enabled": boolean,
 *       "allowedSubjectTokenTypes": string[],
 *       "maxResourceParams": number,
 *       "maxAudienceParams": number
 *     }
 *   }
 * }
 */

import type { Context } from 'hono';
import type { Env } from '@authrim/ar-lib-core';

// Valid token types for Token Exchange
const VALID_TOKEN_TYPES = ['access_token', 'jwt', 'id_token'] as const;
type TokenType = (typeof VALID_TOKEN_TYPES)[number];

// Parameter limits constraints
const MIN_PARAM_LIMIT = 1;
const MAX_PARAM_LIMIT = 100; // Reasonable upper bound

// Default settings
const DEFAULT_SETTINGS = {
  enabled: false,
  allowedSubjectTokenTypes: ['access_token'] as TokenType[],
  maxResourceParams: 10,
  maxAudienceParams: 10,
};

interface TokenExchangeSettings {
  enabled: boolean;
  allowedSubjectTokenTypes: TokenType[];
  maxResourceParams: number;
  maxAudienceParams: number;
}

interface SystemSettings {
  oidc?: {
    tokenExchange?: Partial<TokenExchangeSettings>;
    clientCredentials?: { enabled?: boolean };
  };
  rateLimit?: unknown;
}

type SettingSource = 'kv' | 'env' | 'default';

interface TokenExchangeSettingsSources {
  enabled: SettingSource;
  allowedSubjectTokenTypes: SettingSource;
  maxResourceParams: SettingSource;
  maxAudienceParams: SettingSource;
}

/**
 * Get current Token Exchange settings (hybrid: KV > env > default)
 */
async function getTokenExchangeSettings(env: Env): Promise<{
  settings: TokenExchangeSettings;
  sources: TokenExchangeSettingsSources;
}> {
  const settings: TokenExchangeSettings = { ...DEFAULT_SETTINGS };
  const sources: TokenExchangeSettingsSources = {
    enabled: 'default',
    allowedSubjectTokenTypes: 'default',
    maxResourceParams: 'default',
    maxAudienceParams: 'default',
  };

  // Check environment variables
  if (env.ENABLE_TOKEN_EXCHANGE !== undefined) {
    settings.enabled = env.ENABLE_TOKEN_EXCHANGE === 'true';
    sources.enabled = 'env';
  }

  if (env.TOKEN_EXCHANGE_ALLOWED_TYPES) {
    const types = env.TOKEN_EXCHANGE_ALLOWED_TYPES.split(',')
      .map((t) => t.trim())
      .filter((t) => VALID_TOKEN_TYPES.includes(t as TokenType)) as TokenType[];
    if (types.length > 0) {
      settings.allowedSubjectTokenTypes = types;
      sources.allowedSubjectTokenTypes = 'env';
    }
  }

  // Environment variables for parameter limits
  if (env.TOKEN_EXCHANGE_MAX_RESOURCE_PARAMS) {
    const parsed = parseInt(env.TOKEN_EXCHANGE_MAX_RESOURCE_PARAMS, 10);
    if (!isNaN(parsed) && parsed >= MIN_PARAM_LIMIT && parsed <= MAX_PARAM_LIMIT) {
      settings.maxResourceParams = parsed;
      sources.maxResourceParams = 'env';
    }
  }

  if (env.TOKEN_EXCHANGE_MAX_AUDIENCE_PARAMS) {
    const parsed = parseInt(env.TOKEN_EXCHANGE_MAX_AUDIENCE_PARAMS, 10);
    if (!isNaN(parsed) && parsed >= MIN_PARAM_LIMIT && parsed <= MAX_PARAM_LIMIT) {
      settings.maxAudienceParams = parsed;
      sources.maxAudienceParams = 'env';
    }
  }

  // Check KV (takes priority)
  try {
    const settingsJson = await env.SETTINGS?.get('system_settings');
    if (settingsJson) {
      const systemSettings = JSON.parse(settingsJson) as SystemSettings;
      const kvSettings = systemSettings.oidc?.tokenExchange;

      if (kvSettings?.enabled !== undefined) {
        settings.enabled = kvSettings.enabled === true;
        sources.enabled = 'kv';
      }

      if (Array.isArray(kvSettings?.allowedSubjectTokenTypes)) {
        const validTypes = kvSettings.allowedSubjectTokenTypes.filter((t) =>
          VALID_TOKEN_TYPES.includes(t as TokenType)
        ) as TokenType[];
        if (validTypes.length > 0) {
          settings.allowedSubjectTokenTypes = validTypes;
          sources.allowedSubjectTokenTypes = 'kv';
        }
      }

      if (typeof kvSettings?.maxResourceParams === 'number') {
        const value = kvSettings.maxResourceParams;
        if (value >= MIN_PARAM_LIMIT && value <= MAX_PARAM_LIMIT) {
          settings.maxResourceParams = value;
          sources.maxResourceParams = 'kv';
        }
      }

      if (typeof kvSettings?.maxAudienceParams === 'number') {
        const value = kvSettings.maxAudienceParams;
        if (value >= MIN_PARAM_LIMIT && value <= MAX_PARAM_LIMIT) {
          settings.maxAudienceParams = value;
          sources.maxAudienceParams = 'kv';
        }
      }
    }
  } catch {
    // Ignore KV errors
  }

  return { settings, sources };
}

/**
 * GET /api/admin/settings/token-exchange
 * Get Token Exchange settings with their sources
 */
export async function getTokenExchangeConfig(c: Context<{ Bindings: Env }>) {
  try {
    const { settings, sources } = await getTokenExchangeSettings(c.env);

    return c.json({
      settings: {
        enabled: {
          value: settings.enabled,
          source: sources.enabled,
          default: DEFAULT_SETTINGS.enabled,
        },
        allowedSubjectTokenTypes: {
          value: settings.allowedSubjectTokenTypes,
          source: sources.allowedSubjectTokenTypes,
          default: DEFAULT_SETTINGS.allowedSubjectTokenTypes,
          validOptions: VALID_TOKEN_TYPES,
        },
        maxResourceParams: {
          value: settings.maxResourceParams,
          source: sources.maxResourceParams,
          default: DEFAULT_SETTINGS.maxResourceParams,
          min: MIN_PARAM_LIMIT,
          max: MAX_PARAM_LIMIT,
        },
        maxAudienceParams: {
          value: settings.maxAudienceParams,
          source: sources.maxAudienceParams,
          default: DEFAULT_SETTINGS.maxAudienceParams,
          min: MIN_PARAM_LIMIT,
          max: MAX_PARAM_LIMIT,
        },
      },
      note: 'refresh_token is never allowed for security reasons, regardless of settings.',
    });
  } catch (error) {
    console.error('[Token Exchange Settings API] Error getting settings:', error);
    return c.json(
      {
        error: 'internal_error',
        error_description: 'Failed to get Token Exchange settings',
      },
      500
    );
  }
}

/**
 * PUT /api/admin/settings/token-exchange
 * Update Token Exchange settings (stored in KV)
 *
 * Request body:
 * {
 *   "enabled": boolean,                    // Optional
 *   "allowedSubjectTokenTypes": string[],  // Optional
 *   "maxResourceParams": number,           // Optional (1-100)
 *   "maxAudienceParams": number            // Optional (1-100)
 * }
 */
export async function updateTokenExchangeConfig(c: Context<{ Bindings: Env }>) {
  // Check if KV is available
  if (!c.env.SETTINGS) {
    return c.json(
      {
        error: 'kv_not_configured',
        error_description: 'SETTINGS KV namespace is not configured',
      },
      500
    );
  }

  let body: Partial<TokenExchangeSettings>;
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      {
        error: 'invalid_request',
        error_description: 'Invalid JSON body',
      },
      400
    );
  }

  // Validate enabled
  if (body.enabled !== undefined && typeof body.enabled !== 'boolean') {
    return c.json(
      {
        error: 'invalid_value',
        error_description: '"enabled" must be a boolean',
      },
      400
    );
  }

  // Validate allowedSubjectTokenTypes
  if (body.allowedSubjectTokenTypes !== undefined) {
    if (!Array.isArray(body.allowedSubjectTokenTypes)) {
      return c.json(
        {
          error: 'invalid_value',
          error_description: '"allowedSubjectTokenTypes" must be an array',
        },
        400
      );
    }

    const invalidTypes = body.allowedSubjectTokenTypes.filter(
      (t) => !VALID_TOKEN_TYPES.includes(t as TokenType)
    );
    if (invalidTypes.length > 0) {
      return c.json(
        {
          error: 'invalid_value',
          error_description: `Invalid token types: ${invalidTypes.join(', ')}. Valid types: ${VALID_TOKEN_TYPES.join(', ')}`,
        },
        400
      );
    }

    // Security: reject if refresh_token is attempted
    if (body.allowedSubjectTokenTypes.includes('refresh_token' as TokenType)) {
      return c.json(
        {
          error: 'security_violation',
          error_description:
            'refresh_token cannot be allowed as subject_token_type for security reasons',
        },
        400
      );
    }
  }

  // Validate maxResourceParams
  if (body.maxResourceParams !== undefined) {
    if (typeof body.maxResourceParams !== 'number' || !Number.isInteger(body.maxResourceParams)) {
      return c.json(
        {
          error: 'invalid_value',
          error_description: '"maxResourceParams" must be an integer',
        },
        400
      );
    }
    if (body.maxResourceParams < MIN_PARAM_LIMIT || body.maxResourceParams > MAX_PARAM_LIMIT) {
      return c.json(
        {
          error: 'invalid_value',
          error_description: `"maxResourceParams" must be between ${MIN_PARAM_LIMIT} and ${MAX_PARAM_LIMIT}`,
        },
        400
      );
    }
  }

  // Validate maxAudienceParams
  if (body.maxAudienceParams !== undefined) {
    if (typeof body.maxAudienceParams !== 'number' || !Number.isInteger(body.maxAudienceParams)) {
      return c.json(
        {
          error: 'invalid_value',
          error_description: '"maxAudienceParams" must be an integer',
        },
        400
      );
    }
    if (body.maxAudienceParams < MIN_PARAM_LIMIT || body.maxAudienceParams > MAX_PARAM_LIMIT) {
      return c.json(
        {
          error: 'invalid_value',
          error_description: `"maxAudienceParams" must be between ${MIN_PARAM_LIMIT} and ${MAX_PARAM_LIMIT}`,
        },
        400
      );
    }
  }

  try {
    // Read existing system_settings
    let systemSettings: SystemSettings = {};
    const existingJson = await c.env.SETTINGS.get('system_settings');
    if (existingJson) {
      systemSettings = JSON.parse(existingJson);
    }

    // Initialize nested structure if needed
    if (!systemSettings.oidc) {
      systemSettings.oidc = {};
    }
    if (!systemSettings.oidc.tokenExchange) {
      systemSettings.oidc.tokenExchange = {};
    }

    // Update only provided fields
    if (body.enabled !== undefined) {
      systemSettings.oidc.tokenExchange.enabled = body.enabled;
    }
    if (body.allowedSubjectTokenTypes !== undefined) {
      systemSettings.oidc.tokenExchange.allowedSubjectTokenTypes =
        body.allowedSubjectTokenTypes as TokenType[];
    }
    if (body.maxResourceParams !== undefined) {
      systemSettings.oidc.tokenExchange.maxResourceParams = body.maxResourceParams;
    }
    if (body.maxAudienceParams !== undefined) {
      systemSettings.oidc.tokenExchange.maxAudienceParams = body.maxAudienceParams;
    }

    // Save back to KV
    await c.env.SETTINGS.put('system_settings', JSON.stringify(systemSettings));

    // Get updated settings
    const { settings } = await getTokenExchangeSettings(c.env);

    return c.json({
      success: true,
      settings,
      note: 'Settings updated successfully.',
    });
  } catch (error) {
    console.error('[Token Exchange Settings API] Error updating settings:', error);
    // SECURITY: Do not expose internal error details
    return c.json(
      {
        error: 'internal_error',
        error_description: 'Failed to update settings',
      },
      500
    );
  }
}

/**
 * DELETE /api/admin/settings/token-exchange
 * Clear Token Exchange settings override (revert to env/default)
 */
export async function clearTokenExchangeConfig(c: Context<{ Bindings: Env }>) {
  // Check if KV is available
  if (!c.env.SETTINGS) {
    return c.json(
      {
        error: 'kv_not_configured',
        error_description: 'SETTINGS KV namespace is not configured',
      },
      500
    );
  }

  try {
    // Read existing system_settings
    const existingJson = await c.env.SETTINGS.get('system_settings');
    if (existingJson) {
      const systemSettings = JSON.parse(existingJson) as SystemSettings;

      // Remove tokenExchange settings
      if (systemSettings.oidc?.tokenExchange) {
        delete systemSettings.oidc.tokenExchange;
      }

      // Save back to KV
      await c.env.SETTINGS.put('system_settings', JSON.stringify(systemSettings));
    }

    // Get updated settings (will fall back to env/default)
    const { settings, sources } = await getTokenExchangeSettings(c.env);

    return c.json({
      success: true,
      settings,
      sources,
      note: 'Token Exchange settings cleared. Using env/default values.',
    });
  } catch (error) {
    console.error('[Token Exchange Settings API] Error clearing settings:', error);
    // SECURITY: Do not expose internal error details
    return c.json(
      {
        error: 'internal_error',
        error_description: 'Failed to clear settings',
      },
      500
    );
  }
}
