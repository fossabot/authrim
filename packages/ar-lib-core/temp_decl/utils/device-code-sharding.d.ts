/**
 * Device Code Sharding Helper (Region Sharding Version)
 *
 * Provides utilities for generating region-sharded device codes and routing
 * device authorization operations to the correct Durable Object shard with locationHint.
 *
 * Device Code format: g{gen}:{region}:{shard}:dev_{device_code}
 * DO instance name: {tenantId}:{region}:dev:{shard}
 *
 * Sharding Strategy:
 * - Uses FNV-1a hash of `client_id` as shard key
 * - Colocates device authorization requests from the same client
 * - Region-aware placement using locationHint
 *
 * Security Considerations:
 * - Device code single-use enforcement is per-DO instance (atomic)
 * - User code polling is rate-limited per shard
 * - ID format embeds shard info for self-routing (no external lookup)
 * - Generation-based versioning for configuration changes
 *
 * @see docs/architecture/durable-objects-sharding.md
 * @see RFC 8628 - OAuth 2.0 Device Authorization Grant
 */
import type { Env } from '../types/env';
import type { DurableObjectStub } from '@cloudflare/workers-types';
import { type ParsedRegionId, type ShardResolution } from './region-sharding';
/**
 * Type alias for DeviceCodeStore stub
 * Uses generic stub type since DeviceCodeStore uses fetch() pattern
 */
type DeviceCodeStoreStub = DurableObjectStub;
/**
 * Default device code TTL (600 seconds = 10 minutes as per RFC 8628)
 */
export declare const DEVICE_CODE_DEFAULT_TTL_SECONDS = 600;
/**
 * Default polling interval (5 seconds as per RFC 8628)
 */
export declare const DEVICE_CODE_DEFAULT_INTERVAL_SECONDS = 5;
/**
 * Generate a new region-sharded device code.
 *
 * Uses FNV-1a hash of client_id to determine shard.
 * This colocates device authorization requests from the same client.
 *
 * @param env - Environment with KV binding
 * @param tenantId - Tenant ID
 * @param clientId - Client identifier (for sharding)
 * @param deviceCode - The device code value
 * @returns Object containing deviceCodeId, shardIndex, regionKey, generation
 *
 * @example
 * const { deviceCodeId, shardIndex } = await generateDeviceCodeId(
 *   env, 'tenant1', 'client123', 'GmRhmhcxhwAzkoEqiMEg_DnyEysNkuNhszIyS'
 * );
 * // deviceCodeId: "g1:apac:3:dev_GmRhmhcxhwAzkoEqiMEg_DnyEysNkuNhszIyS"
 */
export declare function generateDeviceCodeId(
  env: Env,
  tenantId: string,
  clientId: string,
  deviceCode: string
): Promise<{
  deviceCodeId: string;
  shardIndex: number;
  regionKey: string;
  generation: number;
}>;
/**
 * Parse a region-sharded device code ID to extract shard info.
 *
 * @param deviceCodeId - Region-sharded device code ID
 * @returns Parsed region ID with deviceCode, or null if invalid format
 *
 * @example
 * const result = parseDeviceCodeId("g1:apac:3:dev_GmRhmhcxhw...");
 * // { generation: 1, regionKey: 'apac', shardIndex: 3, deviceCode: 'GmRhmhcxhw...' }
 */
export declare function parseDeviceCodeId(deviceCodeId: string):
  | (ParsedRegionId & {
      deviceCode: string;
    })
  | null;
/**
 * Get DeviceCodeStore Durable Object stub for an existing device code ID.
 *
 * Parses the device code ID to extract region and shard info, then routes
 * to the correct DO instance with locationHint.
 *
 * @param env - Environment with DO bindings
 * @param deviceCodeId - Region-sharded device code ID
 * @param tenantId - Tenant ID
 * @returns Object containing DO stub and resolution info
 * @throws Error if deviceCodeId format is invalid
 *
 * @example
 * const { stub, resolution } = getDeviceCodeStoreById(env, "g1:apac:3:dev_abc...");
 * const response = await stub.fetch(new Request('https://internal/poll'));
 */
export declare function getDeviceCodeStoreById(
  env: Env,
  deviceCodeId: string,
  tenantId?: string
): {
  stub: DeviceCodeStoreStub;
  resolution: ShardResolution;
  instanceName: string;
  deviceCode: string;
};
/**
 * Get DeviceCodeStore Durable Object stub for creating a new device code.
 *
 * @param env - Environment with DO bindings
 * @param tenantId - Tenant ID
 * @param clientId - Client identifier
 * @param deviceCode - The device code value
 * @returns Object containing DO stub, deviceCodeId, and resolution info
 *
 * @example
 * const { stub, deviceCodeId } = await getDeviceCodeStoreForNewCode(
 *   env, 'tenant1', 'client123', 'GmRhmhcxhw...'
 * );
 */
export declare function getDeviceCodeStoreForNewCode(
  env: Env,
  tenantId: string,
  clientId: string,
  deviceCode: string
): Promise<{
  stub: DeviceCodeStoreStub;
  deviceCodeId: string;
  resolution: ShardResolution;
  instanceName: string;
}>;
export {};
//# sourceMappingURL=device-code-sharding.d.ts.map
