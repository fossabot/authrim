/**
 * Permission Change Notifier Service
 *
 * Phase 8.3: Real-time Check API Model
 *
 * Publishes permission change events for:
 * - KV cache invalidation
 * - Audit log recording
 * - WebSocket notification via PermissionChangeHub
 *
 * Usage:
 * ```typescript
 * const notifier = createPermissionChangeNotifier({
 *   db: env.DB,
 *   cache: env.REBAC_CACHE,
 *   permissionChangeHub: env.PERMISSION_CHANGE_HUB,
 *   tenantId: 'default',
 * });
 *
 * await notifier.publish({
 *   event: 'grant',
 *   tenant_id: 'default',
 *   subject_id: 'user_123',
 *   resource: 'document:doc_456',
 *   relation: 'viewer',
 *   timestamp: Date.now(),
 * });
 * ```
 */
import type { KVNamespace, DurableObjectNamespace } from '@cloudflare/workers-types';
import type { PermissionChangeEvent, AuditLogConfig } from '../types/check-api';
/**
 * Permission Change Notifier configuration
 */
export interface PermissionChangeNotifierConfig {
  /** D1 Database (for audit log) */
  db?: D1Database;
  /** KV Namespace for cache invalidation */
  cache?: KVNamespace;
  /** PermissionChangeHub Durable Object namespace */
  permissionChangeHub?: DurableObjectNamespace;
  /** Default tenant ID */
  tenantId?: string;
  /** Audit log configuration */
  auditConfig?: AuditLogConfig;
  /** Enable debug logging */
  debug?: boolean;
}
/**
 * Permission Change Notifier interface
 */
export interface PermissionChangeNotifier {
  /**
   * Publish a permission change event
   */
  publish(event: PermissionChangeEvent): Promise<PublishResult>;
  /**
   * Invalidate cache for a subject
   */
  invalidateCacheForSubject(tenantId: string, subjectId: string): Promise<void>;
  /**
   * Invalidate cache for a resource
   */
  invalidateCacheForResource(tenantId: string, resource: string): Promise<void>;
}
/**
 * Result of publishing an event
 */
export interface PublishResult {
  /** Whether the event was published successfully */
  success: boolean;
  /** Whether the cache was invalidated */
  cacheInvalidated: boolean;
  /** Whether the audit log was recorded */
  auditLogged: boolean;
  /** Number of WebSocket clients notified */
  websocketNotified: number;
  /** Error message if any operation failed */
  error?: string;
}
/**
 * Create a Permission Change Notifier instance
 */
export declare function createPermissionChangeNotifier(
  config: PermissionChangeNotifierConfig
): PermissionChangeNotifier;
/**
 * Helper function to create a permission change event
 */
export declare function createPermissionChangeEvent(
  event: 'grant' | 'revoke' | 'modify',
  tenantId: string,
  subjectId: string,
  options?: {
    resource?: string;
    relation?: string;
    permission?: string;
  }
): PermissionChangeEvent;
//# sourceMappingURL=permission-change-notifier.d.ts.map
