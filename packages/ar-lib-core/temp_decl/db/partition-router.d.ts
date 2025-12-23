/**
 * PII Partition Router
 *
 * Routes PII data access to the correct database partition.
 * Supports flexible partitioning strategies: geographic (GDPR), tenant-specific,
 * plan-based, and attribute-based routing.
 *
 * Architecture:
 * - Each partition maps to a separate DatabaseAdapter (D1, Postgres via Hyperdrive, etc.)
 * - users_core.pii_partition column tracks which partition contains user's PII
 * - New user partition is determined by trust hierarchy:
 *   1. Tenant policy (high trust)
 *   2. User-declared residence (high trust)
 *   3. Custom rules (attribute-based)
 *   4. IP routing (low trust, fallback only)
 *   5. Default partition
 *
 * @see docs/architecture/pii-separation.md
 */
import type { DatabaseAdapter } from './adapter';
/**
 * Partition key types.
 * Flexible naming to support various partitioning strategies.
 *
 * Examples:
 * - Geographic: 'eu', 'apac', 'us'
 * - Tenant-specific: 'tenant-acme', 'tenant-contoso'
 * - Plan-based: 'premium', 'enterprise'
 * - Attribute-based: 'high-security'
 */
export type PartitionKey = string;
/**
 * Condition operator for partition rules.
 */
export type PartitionRuleOperator = 'eq' | 'ne' | 'in' | 'not_in' | 'gt' | 'lt' | 'gte' | 'lte';
/**
 * Condition for partition rule evaluation.
 */
export interface PartitionRuleCondition {
  /** Attribute name to evaluate */
  attribute: string;
  /** Comparison operator */
  operator: PartitionRuleOperator;
  /** Value to compare against */
  value: unknown;
}
/**
 * Custom partition routing rule.
 */
export interface PartitionRule {
  /** Rule name for identification */
  name: string;
  /** Priority (lower = higher priority) */
  priority: number;
  /** Condition to evaluate */
  condition: PartitionRuleCondition;
  /** Target partition if condition matches */
  targetPartition: PartitionKey;
  /** Whether this rule is active */
  enabled: boolean;
}
/**
 * Partition settings configuration.
 */
export interface PartitionSettings {
  /** Default partition for new users when no rules match */
  defaultPartition: PartitionKey;
  /** Whether IP-based routing is enabled (low trust, fallback only) */
  ipRoutingEnabled: boolean;
  /** List of available partition keys */
  availablePartitions: PartitionKey[];
  /** Tenant-specific partition overrides (high trust) */
  tenantPartitions: Record<string, PartitionKey>;
  /** Custom partition rules */
  partitionRules: PartitionRule[];
  /** Last update timestamp */
  updatedAt?: number;
  /** Who updated the settings */
  updatedBy?: string;
}
/**
 * Cloudflare request properties subset for geo-routing.
 */
export interface CfGeoProperties {
  country?: string;
  continent?: string;
  region?: string;
  city?: string;
}
/**
 * User attributes for partition resolution.
 */
export interface UserPartitionAttributes {
  /** User-declared residence (high trust) */
  declared_residence?: string;
  /** User's plan type */
  plan?: string;
  /** Custom attributes for rule evaluation */
  [key: string]: unknown;
}
/**
 * Partition resolution result.
 */
export interface PartitionResolution {
  /** Resolved partition key */
  partition: PartitionKey;
  /** How the partition was determined */
  method: PartitionResolutionMethod;
  /** Rule name if resolved by rule */
  ruleName?: string;
}
/**
 * How partition was determined.
 */
export type PartitionResolutionMethod =
  | 'tenant_policy'
  | 'declared_residence'
  | 'custom_rule'
  | 'ip_routing'
  | 'default';
/** Default partition key */
export declare const DEFAULT_PARTITION = 'default';
/** KV key prefix for partition settings */
export declare const PARTITION_SETTINGS_KV_PREFIX = 'pii_partition_config';
/** Cache TTL for partition settings (10 seconds) */
export declare const PARTITION_SETTINGS_CACHE_TTL_MS = 10000;
/**
 * Country to partition mapping for IP-based routing.
 * Note: IP routing is LOW TRUST and should only be used as fallback.
 */
export declare const COUNTRY_TO_PARTITION: Record<string, PartitionKey>;
/**
 * Clear partition settings cache.
 * Useful for testing or after configuration changes.
 */
export declare function clearPartitionSettingsCache(): void;
/**
 * PII Partition Router
 *
 * Routes PII database access to the correct partition based on configuration.
 */
export declare class PIIPartitionRouter {
  /** Partition key → DatabaseAdapter mapping */
  private piiAdapters;
  /** Core database adapter (for users_core lookups) */
  private coreAdapter;
  /** KV namespace for settings */
  private kvNamespace;
  /**
   * Create a new PIIPartitionRouter.
   *
   * @param coreAdapter - Adapter for D1_CORE (users_core table)
   * @param defaultPiiAdapter - Default PII adapter (D1_PII)
   * @param kvNamespace - KV namespace for partition settings (optional)
   */
  constructor(
    coreAdapter: DatabaseAdapter,
    defaultPiiAdapter: DatabaseAdapter,
    kvNamespace?: KVNamespace
  );
  /**
   * Register a PII adapter for a specific partition.
   *
   * @param partition - Partition key
   * @param adapter - DatabaseAdapter for this partition
   */
  registerPartition(partition: PartitionKey, adapter: DatabaseAdapter): void;
  /**
   * Get all registered partition adapters.
   *
   * @returns Iterator of [partition, adapter] pairs
   */
  getAllAdapters(): IterableIterator<[PartitionKey, DatabaseAdapter]>;
  /**
   * Get available partition keys.
   *
   * @returns Array of registered partition keys
   */
  getAvailablePartitions(): PartitionKey[];
  /**
   * Check if a partition is registered.
   *
   * @param partition - Partition key to check
   * @returns True if partition is registered
   */
  hasPartition(partition: PartitionKey): boolean;
  /**
   * Get adapter for a specific partition.
   *
   * @param partition - Partition key
   * @returns DatabaseAdapter for the partition (falls back to default)
   */
  getAdapterForPartition(partition: PartitionKey): DatabaseAdapter;
  /**
   * Resolve partition for an existing user.
   *
   * @param userId - User ID
   * @returns Partition key from users_core.pii_partition
   */
  resolvePartitionForUser(userId: string): Promise<PartitionKey>;
  /**
   * Resolve partition for new user creation.
   *
   * Trust Level Hierarchy:
   * 1. Tenant policy (high trust) - tenant-specific partition override
   * 2. Declared residence (high trust) - user's self-declared residence
   * 3. Custom rules (medium trust) - attribute-based routing rules
   * 4. IP routing (low trust) - fallback based on request origin
   * 5. Default partition - last resort
   *
   * @param tenantId - Tenant ID
   * @param attributes - User attributes for rule evaluation
   * @param cfData - Cloudflare geo properties (optional)
   * @param settings - Partition settings (optional, fetched if not provided)
   * @returns Partition resolution result
   */
  resolvePartitionForNewUser(
    tenantId: string,
    attributes: UserPartitionAttributes,
    cfData?: CfGeoProperties,
    settings?: PartitionSettings
  ): Promise<PartitionResolution>;
  /**
   * Evaluate a partition rule against user attributes.
   *
   * @param rule - Rule to evaluate
   * @param attributes - User attributes
   * @returns True if rule matches
   */
  private evaluateRule;
  /**
   * Map country code to partition key.
   *
   * @param country - ISO 3166-1 alpha-2 country code
   * @returns Partition key
   */
  private countryToPartition;
  /**
   * Get partition settings from KV with caching.
   *
   * @param tenantId - Tenant ID
   * @returns Partition settings
   */
  getPartitionSettings(tenantId: string): Promise<PartitionSettings>;
  /**
   * Save partition settings to KV.
   *
   * @param tenantId - Tenant ID
   * @param settings - Settings to save
   */
  savePartitionSettings(tenantId: string, settings: PartitionSettings): Promise<void>;
  /**
   * Get partition statistics (user counts per partition).
   *
   * @param tenantId - Optional tenant filter
   * @returns Map of partition → user count
   */
  getPartitionStats(tenantId?: string): Promise<Map<PartitionKey, number>>;
}
/**
 * Build KV key for partition settings.
 *
 * @param tenantId - Tenant ID
 * @returns KV key string
 */
export declare function buildPartitionSettingsKvKey(tenantId: string): string;
/**
 * Get default partition settings.
 *
 * @param availablePartitions - List of available partitions
 * @returns Default settings
 */
export declare function getDefaultPartitionSettings(
  availablePartitions?: PartitionKey[]
): PartitionSettings;
/**
 * Validate partition settings.
 *
 * @param settings - Settings to validate
 * @param availablePartitions - List of available partitions
 * @returns Validation result
 */
export declare function validatePartitionSettings(
  settings: PartitionSettings,
  availablePartitions: PartitionKey[]
): {
  valid: boolean;
  error?: string;
};
/**
 * Create a PIIPartitionRouter with standard configuration.
 *
 * This is a convenience factory function for common setups.
 *
 * @param coreAdapter - Adapter for D1_CORE
 * @param defaultPiiAdapter - Default adapter for D1_PII
 * @param additionalPartitions - Additional partition adapters
 * @param kvNamespace - KV namespace for settings
 * @returns Configured PIIPartitionRouter
 */
export declare function createPIIPartitionRouter(
  coreAdapter: DatabaseAdapter,
  defaultPiiAdapter: DatabaseAdapter,
  additionalPartitions?: Map<PartitionKey, DatabaseAdapter>,
  kvNamespace?: KVNamespace
): PIIPartitionRouter;
//# sourceMappingURL=partition-router.d.ts.map
