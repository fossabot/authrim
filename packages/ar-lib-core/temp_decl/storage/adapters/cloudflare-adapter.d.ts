/**
 * Cloudflare Storage Adapter
 *
 * Implements the unified storage adapter interface for Cloudflare Workers.
 * Integrates D1, KV, and Durable Objects with intelligent routing logic.
 *
 * Routing Strategy:
 * - session:* → SessionStore Durable Object (hot data) + D1 fallback (cold data)
 * - client:* → D1 database + KV cache (read-through cache pattern)
 * - user:* → D1 database
 * - authcode:* → AuthorizationCodeStore Durable Object (one-time use guarantee)
 * - refreshtoken:* → RefreshTokenRotator Durable Object (atomic rotation)
 * - Other keys → KV storage (fallback)
 */
import type {
  IStorageAdapter,
  IUserStore,
  IClientStore,
  ISessionStore,
  IPasskeyStore,
  IOrganizationStore,
  IRoleStore,
  IRoleAssignmentStore,
  IRelationshipStore,
  User,
  ClientData,
  Session,
  Passkey,
} from '../interfaces';
import type { Env } from '../../types/env';
import type { D1Result } from '../../utils/d1-retry';
/**
 * CloudflareStorageAdapter
 *
 * Unified storage adapter for Cloudflare Workers that routes operations
 * to the appropriate backend (D1, KV, or Durable Objects).
 */
export declare class CloudflareStorageAdapter implements IStorageAdapter {
  private env;
  constructor(env: Env);
  /**
   * Get value by key (routes to appropriate storage backend)
   */
  get(key: string): Promise<string | null>;
  /**
   * Set value with optional TTL
   */
  set(key: string, value: string, ttl?: number): Promise<void>;
  /**
   * Delete value by key
   */
  delete(key: string): Promise<void>;
  /**
   * Execute SQL query (D1 only)
   */
  query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
  /**
   * Execute SQL statement (D1 only, returns execution result)
   */
  execute(sql: string, params?: unknown[]): Promise<D1Result>;
  /**
   * Get from SessionStore Durable Object (RPC)
   */
  private getFromSessionStore;
  /**
   * Set to SessionStore Durable Object (RPC)
   */
  private setToSessionStore;
  /**
   * Delete from SessionStore Durable Object (RPC)
   */
  private deleteFromSessionStore;
  /**
   * Get from D1 with KV cache (read-through cache pattern)
   */
  private getFromD1WithKVCache;
  /**
   * Set to D1 with KV cache invalidation
   *
   * Strategy: Delete-Then-Write
   * 1. Delete KV cache first to prevent stale cache reads
   * 2. Then update D1 (source of truth)
   *
   * This ensures that even if D1 write fails, the cache is invalidated,
   * so future reads will fetch fresh data from D1 instead of stale cache.
   */
  private setToD1WithKVCache;
  /**
   * Delete from D1 with KV cache invalidation
   *
   * Strategy: Delete-Then-Write (same as setToD1WithKVCache)
   * 1. Delete KV cache first to prevent stale cache reads
   * 2. Then delete from D1 (source of truth)
   *
   * This ensures cache consistency even if D1 deletion fails.
   */
  private deleteFromD1WithKVCache;
  /**
   * Get from D1 database
   */
  private getFromD1;
  /**
   * Set to D1 database
   */
  private setToD1;
  /**
   * Delete from D1 database
   */
  private deleteFromD1;
  /**
   * Get from AuthCodeStore Durable Object (RPC)
   */
  private getFromAuthCodeStore;
  /**
   * Set to AuthCodeStore Durable Object (RPC)
   */
  private setToAuthCodeStore;
  /**
   * Delete from AuthCodeStore Durable Object (RPC)
   */
  private deleteFromAuthCodeStore;
  /**
   * Get from RefreshTokenRotator Durable Object (RPC)
   *
   * @deprecated This method uses legacy (non-sharded) routing.
   * For V3 sharding support, use getRefreshToken() from @authrim/ar-lib-core/utils/kv instead.
   * Key format: refreshtoken:{familyId} - lacks JTI/clientId for sharding.
   */
  private getFromRefreshTokenRotator;
  /**
   * Set to RefreshTokenRotator Durable Object (RPC)
   *
   * V3: Supports sharding if familyData contains jti and clientId.
   * Falls back to legacy routing if sharding info is not available.
   */
  private setToRefreshTokenRotator;
  /**
   * Delete from RefreshTokenRotator Durable Object (RPC)
   *
   * @deprecated This method uses legacy (non-sharded) routing.
   * For V3 sharding support, use deleteRefreshToken() from @authrim/ar-lib-core/utils/kv instead.
   * Key format: refreshtoken:{familyId} - lacks JTI/clientId for sharding.
   */
  private deleteFromRefreshTokenRotator;
  /**
   * Get from KV storage (fallback) - DEPRECATED
   * @deprecated CLIENTS KV has been removed. Use D1+CLIENTS_CACHE instead.
   */
  private getFromKV;
  /**
   * Set to KV storage (fallback) - DEPRECATED
   * @deprecated CLIENTS KV has been removed. Use D1+CLIENTS_CACHE instead.
   */
  private setToKV;
  /**
   * Delete from KV storage (fallback) - DEPRECATED
   * @deprecated CLIENTS KV has been removed. Use D1+CLIENTS_CACHE instead.
   */
  private deleteFromKV;
  /**
   * Query from PII database (DB_PII)
   *
   * Used by UserStore for PII data (email, name, etc.)
   * DB_PII is required - no fallback to DB (per migration strategy: no backward compatibility).
   */
  queryPII<T>(sql: string, params: unknown[]): Promise<T[]>;
  /**
   * Execute on PII database (DB_PII)
   *
   * Used by UserStore for PII data operations.
   * DB_PII is required - no fallback to DB (per migration strategy: no backward compatibility).
   */
  executePII(sql: string, params: unknown[]): Promise<D1Result>;
}
/**
 * UserStore implementation (D1-based with PII/Non-PII DB separation)
 *
 * Users are stored in two separate databases:
 * - users_core (DB): Non-PII data (id, email_verified, is_active, etc.)
 * - users_pii (DB_PII): PII data (email, name, phone, address, etc.)
 *
 * This separation enables:
 * - GDPR/CCPA compliance (PII can be stored in regional DBs)
 * - Fine-grained access control (PII requires explicit access)
 * - Audit-friendly data classification
 */
export declare class UserStore implements IUserStore {
  private adapter;
  constructor(adapter: CloudflareStorageAdapter);
  /**
   * Get user by ID
   *
   * Queries both users_core (DB) and users_pii (DB_PII) and merges the results.
   */
  get(userId: string): Promise<User | null>;
  /**
   * Get user by email
   *
   * Queries users_pii first (since email is stored there), then fetches users_core.
   */
  getByEmail(email: string): Promise<User | null>;
  /**
   * Create a new user
   *
   * Inserts into both users_core (DB) and users_pii (DB_PII).
   */
  create(user: Partial<User>): Promise<User>;
  /**
   * Update an existing user
   *
   * Updates both users_core (DB) and users_pii (DB_PII).
   */
  update(userId: string, updates: Partial<User>): Promise<User>;
  /**
   * Delete a user (soft delete)
   *
   * Sets is_active = 0 in users_core instead of physically deleting.
   * For GDPR Art.17 compliance, use the Admin API's PII deletion endpoint.
   */
  delete(userId: string): Promise<void>;
  /**
   * Merge users_core and users_pii data into a single User object
   */
  private mergeUserData;
}
/**
 * ClientStore implementation (D1 + KV cache)
 */
export declare class ClientStore implements IClientStore {
  private adapter;
  constructor(adapter: CloudflareStorageAdapter);
  get(clientId: string): Promise<ClientData | null>;
  create(client: Partial<ClientData>): Promise<ClientData>;
  update(clientId: string, updates: Partial<ClientData>): Promise<ClientData>;
  delete(clientId: string): Promise<void>;
  list(options?: { limit?: number; offset?: number }): Promise<ClientData[]>;
}
/**
 * SessionStore implementation (Durable Object + D1)
 */
export declare class SessionStore implements ISessionStore {
  private adapter;
  private env;
  constructor(adapter: CloudflareStorageAdapter, env: Env);
  get(sessionId: string): Promise<Session | null>;
  create(session: Partial<Session>): Promise<Session>;
  delete(sessionId: string): Promise<void>;
  listByUser(userId: string): Promise<Session[]>;
  extend(sessionId: string, additionalSeconds: number): Promise<Session | null>;
}
/**
 * PasskeyStore implementation (D1-based)
 */
export declare class PasskeyStore implements IPasskeyStore {
  private adapter;
  constructor(adapter: CloudflareStorageAdapter);
  getByCredentialId(credentialId: string): Promise<Passkey | null>;
  listByUser(userId: string): Promise<Passkey[]>;
  create(passkey: Partial<Passkey>): Promise<Passkey>;
  updateCounter(passkeyId: string, counter: number): Promise<Passkey>;
  delete(passkeyId: string): Promise<void>;
}
/**
 * Factory function to create CloudflareStorageAdapter with stores
 */
export declare function createStorageAdapter(env: Env): {
  adapter: CloudflareStorageAdapter;
  userStore: IUserStore;
  clientStore: IClientStore;
  sessionStore: ISessionStore;
  passkeyStore: IPasskeyStore;
  organizationStore: IOrganizationStore;
  roleStore: IRoleStore;
  roleAssignmentStore: IRoleAssignmentStore;
  relationshipStore: IRelationshipStore;
};
//# sourceMappingURL=cloudflare-adapter.d.ts.map
