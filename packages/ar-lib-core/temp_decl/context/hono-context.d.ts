/**
 * Hono Context Integration
 *
 * Helper functions to create AuthContext and PIIContext from Hono Context.
 * Simplifies repository access in Hono route handlers.
 *
 * Usage:
 * ```typescript
 * import { createAuthContextFromHono, createPIIContextFromHono } from '@authrim/ar-lib-core';
 *
 * app.get('/authorize', async (c) => {
 *   const ctx = createAuthContextFromHono(c);
 *   const session = await ctx.repositories.session.findById(sessionId);
 *   // ...
 * });
 *
 * app.get('/userinfo', async (c) => {
 *   const ctx = createPIIContextFromHono(c);
 *   const userPII = await ctx.piiRepositories.userPII.findByUserId(userId);
 *   // ...
 * });
 * ```
 */
import type { Context as HonoContext } from 'hono';
import type { Env } from '../types/env';
import type { AuthContext, PIIContext } from './types';
/**
 * Create AuthContext from Hono Context
 *
 * Use this for handlers that only need non-PII data:
 * - /authorize
 * - /token
 * - /introspect
 * - /revoke
 *
 * @param c - Hono context
 * @param tenantId - Optional tenant ID (default: 'default')
 * @returns AuthContext with core repositories
 */
export declare function createAuthContextFromHono(
  c: HonoContext<{
    Bindings: Env;
  }>,
  tenantId?: string
): AuthContext;
/**
 * Create PIIContext from Hono Context
 *
 * Use this for handlers that need PII data:
 * - /userinfo
 * - /admin/users
 * - User registration
 * - GDPR data export/deletion
 *
 * @param c - Hono context
 * @param tenantId - Optional tenant ID (default: 'default')
 * @returns PIIContext with both core and PII repositories
 * @throws Error if DB_PII is not configured
 */
export declare function createPIIContextFromHono(
  c: HonoContext<{
    Bindings: Env;
  }>,
  tenantId?: string
): PIIContext;
/**
 * Create PIIContext from existing AuthContext
 *
 * Use this when a handler needs to access PII conditionally.
 * Reuses the existing core repositories and cache.
 *
 * @param authCtx - Existing AuthContext
 * @returns PIIContext with PII repositories added
 * @throws Error if DB_PII is not configured
 */
export declare function elevateToPIIContext(authCtx: AuthContext): PIIContext;
/**
 * Type guard to check if DB_PII is available
 *
 * @param c - Hono context
 * @returns True if DB_PII is configured
 */
export declare function hasPIIDatabase(
  c: HonoContext<{
    Bindings: Env;
  }>
): boolean;
//# sourceMappingURL=hono-context.d.ts.map
