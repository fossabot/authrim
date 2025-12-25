/**
 * Settings Types Index
 *
 * Exports all setting category types and metadata.
 */

// Common types
export * from './common';

// Category types
export * from './oauth';
export * from './session';
export * from './security';
export * from './infrastructure';
export * from './consent';
export * from './ciba';
export * from './rate-limit';
export * from './device-flow';
export * from './tokens';
export * from './external-idp';
export * from './credentials';
export * from './federation';
export * from './scim';
export * from './client';
export * from './encryption';

// Re-export SettingsManager types
export type {
  SettingScope,
  SettingSource,
  SettingMeta,
  CategoryMeta,
  SettingsGetResult,
  SettingsPatchRequest,
  SettingsPatchResult,
  SettingsValidationError,
  SettingsValidationResult,
  SettingsAuditEvent,
} from '../../utils/settings-manager';

export {
  DISABLED_MARKER,
  isDisabled,
  generateVersion,
  SettingsManager,
  ConflictError,
  createSettingsManager,
} from '../../utils/settings-manager';

// Import all category metadata for registration
import { OAUTH_CATEGORY_META } from './oauth';
import { SESSION_CATEGORY_META } from './session';
import { SECURITY_CATEGORY_META } from './security';
import { INFRASTRUCTURE_CATEGORY_META } from './infrastructure';
import { CONSENT_CATEGORY_META } from './consent';
import { CIBA_CATEGORY_META } from './ciba';
import { RATE_LIMIT_CATEGORY_META } from './rate-limit';
import { DEVICE_FLOW_CATEGORY_META } from './device-flow';
import { TOKENS_CATEGORY_META } from './tokens';
import { EXTERNAL_IDP_CATEGORY_META } from './external-idp';
import { CREDENTIALS_CATEGORY_META } from './credentials';
import { FEDERATION_CATEGORY_META } from './federation';
import { SCIM_CATEGORY_META } from './scim';
import { CLIENT_CATEGORY_META } from './client';
import { ENCRYPTION_CATEGORY_META } from './encryption';

/**
 * All category metadata for easy registration
 */
export const ALL_CATEGORY_META = {
  // Tenant Settings
  oauth: OAUTH_CATEGORY_META,
  session: SESSION_CATEGORY_META,
  security: SECURITY_CATEGORY_META,
  consent: CONSENT_CATEGORY_META,
  ciba: CIBA_CATEGORY_META,
  'rate-limit': RATE_LIMIT_CATEGORY_META,
  'device-flow': DEVICE_FLOW_CATEGORY_META,
  tokens: TOKENS_CATEGORY_META,
  'external-idp': EXTERNAL_IDP_CATEGORY_META,
  credentials: CREDENTIALS_CATEGORY_META,
  federation: FEDERATION_CATEGORY_META,
  scim: SCIM_CATEGORY_META,
  // Client Settings
  client: CLIENT_CATEGORY_META,
  // Platform Settings (read-only)
  infrastructure: INFRASTRUCTURE_CATEGORY_META,
  encryption: ENCRYPTION_CATEGORY_META,
} as const;

/**
 * Category names (for type safety)
 */
export type CategoryName = keyof typeof ALL_CATEGORY_META;
