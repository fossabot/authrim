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
import { generateSecureRandomString } from './crypto';
import { DEFAULT_TENANT_ID } from './tenant-context';
import { D1Adapter } from '../db/adapters/d1-adapter';
import type { DatabaseAdapter } from '../db/adapter';
import { createLogger } from './logger';

const log = createLogger().module('AUDIT_LOG');

/**
 * Create an audit log entry in the database
 *
 * This function is non-blocking - if the audit log creation fails,
 * it will log the error but not throw, allowing the main operation to continue.
 *
 * @param env - Cloudflare Workers environment bindings
 * @param entry - Audit log entry data (id, tenantId, and createdAt will be generated/defaulted)
 */
export async function createAuditLog(
  env: Env,
  entry: Omit<AuditLogEntry, 'id' | 'tenantId' | 'createdAt'> & { tenantId?: string }
): Promise<void> {
  try {
    const id = generateSecureRandomString(16);
    const tenantId = entry.tenantId || DEFAULT_TENANT_ID;
    // Use seconds (not milliseconds) for consistency with other audit log writers
    const createdAt = Math.floor(Date.now() / 1000);

    log.info('createAuditLog: Starting INSERT', { id, action: entry.action, tenantId, createdAt });

    const coreAdapter: DatabaseAdapter = new D1Adapter({ db: env.DB });
    await coreAdapter.execute(
      `INSERT INTO audit_log (
        id, tenant_id, user_id, action, resource_type, resource_id,
        ip_address, user_agent, metadata_json, severity, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        tenantId,
        entry.userId,
        entry.action,
        entry.resource,
        entry.resourceId,
        entry.ipAddress,
        entry.userAgent,
        entry.metadata,
        entry.severity,
        createdAt,
      ]
    );

    log.info('createAuditLog: INSERT completed successfully', { id, action: entry.action });

    // Log critical operations to console for immediate visibility
    // PII Protection: Only log safe fields (no metadata which may contain PII)
    if (entry.severity === 'critical') {
      log.warn('CRITICAL AUDIT', {
        tenantId,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        // Note: userId and metadata intentionally omitted (may contain PII)
      });
    }
  } catch (error) {
    // Non-blocking: log error but don't fail the main operation
    // PII Protection: Don't log entry details (may contain PII in metadata)
    log.error('Failed to create audit log', {}, error as Error);
  }
}

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
export async function createAuditLogFromContext(
  c: Context<{ Bindings: Env }>,
  action: string,
  resource: string,
  resourceId: string,
  metadata: Record<string, unknown>,
  severity: 'info' | 'warning' | 'critical' = 'info'
): Promise<void> {
  // Debug: Log that we're attempting to create audit log
  log.info('Creating audit log from context', { action, resource, resourceId });

  // Get admin auth context (set by adminAuthMiddleware)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAuth = (c as any).get('adminAuth') as { userId: string } | undefined;
  if (!adminAuth) {
    log.error('Cannot create audit log: adminAuth context not found', {
      action,
      resource,
      resourceId,
    });
    return;
  }

  log.info('Admin auth found', { userId: adminAuth.userId, action });

  // Get tenantId from request context (set by requestContextMiddleware)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenantId = ((c as any).get('tenantId') as string | undefined) || DEFAULT_TENANT_ID;

  // Extract IP address (check CF headers first, then fallback)
  const ipAddress =
    c.req.header('CF-Connecting-IP') ||
    c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ||
    c.req.header('X-Real-IP') ||
    'unknown';

  // Extract user agent
  const userAgent = c.req.header('User-Agent') || 'unknown';

  await createAuditLog(c.env, {
    tenantId,
    userId: adminAuth.userId,
    action,
    resource,
    resourceId,
    ipAddress,
    userAgent,
    metadata: JSON.stringify(metadata),
    severity,
  });
}

/**
 * Safely schedule audit log creation with waitUntil
 *
 * Handles cases where executionCtx may be undefined (tests, local dev, Node runtime).
 * This ensures audit logs are written even after the response is sent,
 * without blocking the main request handling.
 *
 * @param executionCtx - Cloudflare Workers execution context (may be undefined in tests)
 * @param auditLogPromise - Promise that creates the audit log entry
 */
export function scheduleAuditLog(
  executionCtx: ExecutionContext | undefined,
  auditLogPromise: Promise<void>
): void {
  if (executionCtx) {
    executionCtx.waitUntil(auditLogPromise);
  }
  // If no executionCtx, the promise runs but may be cut off after response
  // This is acceptable for test environments where D1 writes are mocked
}

/**
 * Helper to create and schedule audit log from Hono context
 *
 * Combines createAuditLogFromContext with waitUntil scheduling.
 * This is the recommended way to create audit logs in admin handlers
 * as it ensures the log is written even after the response is sent.
 *
 * Note: This function is designed for future policy engine integration.
 * The scheduling logic can be extended to include policy checks before logging.
 *
 * @param c - Hono context with Cloudflare Workers bindings
 * @param action - Action performed (e.g., 'user.created', 'client.deleted')
 * @param resource - Resource type (e.g., 'user', 'client', 'session')
 * @param resourceId - Resource identifier
 * @param metadata - Additional metadata object (will be JSON stringified)
 * @param severity - Severity level (default: 'info')
 */
export function scheduleAuditLogFromContext(
  c: Context<{ Bindings: Env }>,
  action: string,
  resource: string,
  resourceId: string,
  metadata: Record<string, unknown>,
  severity: 'info' | 'warning' | 'critical' = 'info'
): void {
  const promise = createAuditLogFromContext(
    c,
    action,
    resource,
    resourceId,
    metadata,
    severity
  ).catch((err: unknown) => {
    log.error('Failed to create audit log', { action }, err as Error);
  });

  scheduleAuditLog(c.executionCtx, promise);
}
