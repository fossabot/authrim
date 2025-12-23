/**
 * Audit Log Utility
 *
 * This module provides utilities for creating audit log entries to track
 * admin operations for compliance and security monitoring.
 *
 * Key features:
 * - Non-blocking: Failures don't stop the main operation
 * - Severity levels: info, warning, critical
 * - Critical operations logged to console for immediate visibility
 */
import type { Context } from 'hono';
import type { Env } from '../types/env';
import type { AuditLogEntry } from '../types/admin';
/**
 * Create an audit log entry in the database
 *
 * This function is non-blocking - if the audit log creation fails,
 * it will log the error but not throw, allowing the main operation to continue.
 *
 * @param env - Cloudflare Workers environment bindings
 * @param entry - Audit log entry data (id, tenantId, and createdAt will be generated/defaulted)
 */
export declare function createAuditLog(
  env: Env,
  entry: Omit<AuditLogEntry, 'id' | 'tenantId' | 'createdAt'> & {
    tenantId?: string;
  }
): Promise<void>;
/**
 * Helper function to create audit log from Hono context
 *
 * Automatically extracts tenantId, IP address, and user agent from the request.
 * Requires adminAuth context to be set by adminAuthMiddleware.
 * tenantId is obtained from requestContextMiddleware if available.
 *
 * @param c - Hono context
 * @param action - Action performed (e.g., 'signing_keys.rotate.emergency')
 * @param resource - Resource type (e.g., 'signing_keys')
 * @param resourceId - Resource identifier (e.g., kid)
 * @param metadata - Additional metadata object (will be JSON stringified)
 * @param severity - Severity level (default: 'info')
 */
export declare function createAuditLogFromContext(
  c: Context<{
    Bindings: Env;
  }>,
  action: string,
  resource: string,
  resourceId: string,
  metadata: Record<string, unknown>,
  severity?: 'info' | 'warning' | 'critical'
): Promise<void>;
//# sourceMappingURL=audit-log.d.ts.map
