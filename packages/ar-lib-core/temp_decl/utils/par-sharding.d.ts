/**
 * PAR (Pushed Authorization Request) Sharding Helper (Region Sharding Version)
 *
 * Provides utilities for generating region-sharded PAR request URIs and routing
 * PAR operations to the correct Durable Object shard with locationHint.
 *
 * Request URI format: g{gen}:{region}:{shard}:par_{uuid}
 * DO instance name: {tenantId}:{region}:par:{shard}
 *
 * Sharding Strategy:
 * - Uses FNV-1a hash of `client_id` as shard key
 * - Colocates PAR requests from the same client for better caching
 * - Region-aware placement using locationHint
 *
 * Security Considerations:
 * - Request URI single-use enforcement is per-DO instance (atomic)
 * - ID format embeds shard info for self-routing (no external lookup)
 * - Generation-based versioning for configuration changes
 * - Short TTL (typically 60 seconds) for PAR requests
 *
 * @see docs/architecture/durable-objects-sharding.md
 * @see RFC 9126 - OAuth 2.0 Pushed Authorization Requests
 */
import type { Env } from '../types/env';
import type { DurableObjectStub } from '@cloudflare/workers-types';
import type { PARRequestData } from '../durable-objects/PARRequestStore';
import { type ParsedRegionId, type ShardResolution } from './region-sharding';
/**
 * PARRequestStore RPC stub interface
 * Includes RPC methods exposed by the PARRequestStore Durable Object
 */
interface PARRequestStoreStub extends DurableObjectStub {
  storeRequestRpc(request: {
    requestUri: string;
    data: Record<string, unknown>;
    ttl: number;
  }): Promise<void>;
  consumeRequestRpc(request: { requestUri: string; client_id: string }): Promise<PARRequestData>;
}
/**
 * PAR request URI prefix as per RFC 9126
 */
export declare const PAR_REQUEST_URI_PREFIX = 'urn:ietf:params:oauth:request_uri:';
/**
 * Default PAR request TTL (60 seconds as per RFC 9126)
 */
export declare const PAR_DEFAULT_TTL_SECONDS = 60;
/**
 * Generate a new region-sharded PAR request URI.
 *
 * Uses FNV-1a hash of client_id to determine shard.
 * This colocates PAR requests from the same client for better performance.
 *
 * @param env - Environment with KV binding
 * @param tenantId - Tenant ID
 * @param clientId - Client identifier (for sharding)
 * @param uuid - Unique request identifier
 * @returns Object containing requestUri, shardIndex, regionKey, generation
 *
 * @example
 * const { requestUri, shardIndex } = await generatePARRequestUri(
 *   env, 'tenant1', 'client123', crypto.randomUUID()
 * );
 * // requestUri: "urn:ietf:params:oauth:request_uri:g1:apac:3:par_abc123..."
 */
export declare function generatePARRequestUri(
  env: Env,
  tenantId: string,
  clientId: string,
  uuid: string
): Promise<{
  requestUri: string;
  internalId: string;
  shardIndex: number;
  regionKey: string;
  generation: number;
}>;
/**
 * Parse a PAR request URI to extract shard info.
 *
 * @param requestUri - PAR request URI (with or without urn: prefix)
 * @returns Parsed region ID with uuid, or null if invalid format
 *
 * @example
 * const result = parsePARRequestUri("urn:ietf:params:oauth:request_uri:g1:apac:3:par_abc123");
 * // { generation: 1, regionKey: 'apac', shardIndex: 3, uuid: 'abc123' }
 */
export declare function parsePARRequestUri(requestUri: string):
  | (ParsedRegionId & {
      uuid: string;
    })
  | null;
/**
 * Get PARRequestStore Durable Object stub for an existing request URI.
 *
 * Parses the request URI to extract region and shard info, then routes
 * to the correct DO instance with locationHint.
 *
 * @param env - Environment with DO bindings
 * @param requestUri - PAR request URI
 * @param tenantId - Tenant ID
 * @returns Object containing DO stub and resolution info
 * @throws Error if requestUri format is invalid
 *
 * @example
 * const { stub, resolution } = getPARRequestStoreByUri(env, "urn:...:g1:apac:3:par_abc...");
 * const response = await stub.fetch(new Request('https://internal/consume'));
 */
export declare function getPARRequestStoreByUri(
  env: Env,
  requestUri: string,
  tenantId?: string
): {
  stub: PARRequestStoreStub;
  resolution: ShardResolution;
  instanceName: string;
  uuid: string;
};
/**
 * Get PARRequestStore Durable Object stub for creating a new PAR request.
 *
 * @param env - Environment with DO bindings
 * @param tenantId - Tenant ID
 * @param clientId - Client identifier
 * @param uuid - Unique request identifier
 * @returns Object containing DO stub, requestUri, and resolution info
 *
 * @example
 * const { stub, requestUri } = await getPARRequestStoreForNewRequest(
 *   env, 'tenant1', 'client123', crypto.randomUUID()
 * );
 */
export declare function getPARRequestStoreForNewRequest(
  env: Env,
  tenantId: string,
  clientId: string,
  uuid: string
): Promise<{
  stub: PARRequestStoreStub;
  requestUri: string;
  internalId: string;
  resolution: ShardResolution;
  instanceName: string;
}>;
export {};
//# sourceMappingURL=par-sharding.d.ts.map
