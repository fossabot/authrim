/**
 * Context Factory
 *
 * Factory for creating AuthContext and PIIContext instances.
 * Provides type-safe access to repositories based on handler requirements.
 *
 * Usage:
 * ```typescript
 * // In your worker entry point
 * const factory = new ContextFactory({
 *   coreAdapter: createD1Adapter(env.DB, 'core'),
 *   defaultPiiAdapter: createD1Adapter(env.DB_PII, 'pii'),
 *   partitionRouter: createPIIPartitionRouter(coreAdapter, piiAdapter, env.AUTHRIM_CONFIG),
 * });
 *
 * // In route handlers
 * app.get('/userinfo', async (c) => {
 *   const ctx = factory.createPIIContext(c);
 *   return handleUserInfo(ctx, c);
 * });
 *
 * app.post('/token', async (c) => {
 *   const ctx = factory.createAuthContext(c);
 *   return handleToken(ctx, c);
 * });
 * ```
 */
import type { Context as HonoContext } from 'hono';
import type { DatabaseAdapter } from '../db/adapter';
import type { PIIPartitionRouter } from '../db/partition-router';
import {
  type AuthContext,
  type PIIContext,
  type ContextFactoryOptions,
  type IContextFactory,
} from './types';
/**
 * Factory for creating contexts.
 *
 * This factory is typically created once per worker and reused for all requests.
 * Each context is request-scoped (includes request-specific cache).
 */
export declare class ContextFactory implements IContextFactory {
  private coreAdapter;
  private defaultPiiAdapter;
  private partitionRouter;
  private tenantId;
  /**
   * Create a new ContextFactory.
   *
   * @param options - Factory options
   */
  constructor(options: ContextFactoryOptions);
  /**
   * Create a base AuthContext (Non-PII only).
   *
   * Use this for handlers that don't need personal information.
   *
   * @param c - Hono context
   * @returns AuthContext
   */
  createAuthContext(c: HonoContext): AuthContext;
  /**
   * Create a PIIContext (with PII access).
   *
   * Use this for handlers that need personal information.
   *
   * @param c - Hono context
   * @returns PIIContext
   * @throws Error if PII adapters are not configured
   */
  createPIIContext(c: HonoContext): PIIContext;
  /**
   * Elevate an AuthContext to PIIContext.
   *
   * Use this when a handler starts without PII access
   * but needs to access PII conditionally.
   *
   * @param authCtx - Existing AuthContext
   * @returns PIIContext
   * @throws Error if PII adapters are not configured
   */
  elevateToPIIContext(authCtx: AuthContext): PIIContext;
  /**
   * Update the tenant ID for subsequent context creation.
   *
   * @param tenantId - New tenant ID
   */
  setTenantId(tenantId: string): void;
  /**
   * Get the current tenant ID.
   *
   * @returns Current tenant ID
   */
  getTenantId(): string;
  /**
   * Create core repositories instance.
   */
  private createCoreRepositories;
  /**
   * Create PII repositories instance.
   *
   * @param piiAdapter - PII database adapter
   */
  private createPIIRepositories;
}
/**
 * Create a ContextFactory with standard configuration.
 *
 * This is a convenience function for creating a factory with common setup.
 *
 * @param coreAdapter - Core database adapter
 * @param piiAdapter - PII database adapter (optional)
 * @param partitionRouter - Partition router (optional)
 * @param tenantId - Default tenant ID (optional)
 * @returns Configured ContextFactory
 *
 * @example
 * // Minimal setup (Non-PII only)
 * const factory = createContextFactory(createD1Adapter(env.DB, 'core'));
 *
 * // Full setup (with PII)
 * const factory = createContextFactory(
 *   createD1Adapter(env.DB, 'core'),
 *   createD1Adapter(env.DB_PII, 'pii'),
 *   createPIIPartitionRouter(coreAdapter, piiAdapter, env.AUTHRIM_CONFIG)
 * );
 */
export declare function createContextFactory(
  coreAdapter: DatabaseAdapter,
  piiAdapter?: DatabaseAdapter,
  partitionRouter?: PIIPartitionRouter,
  tenantId?: string
): ContextFactory;
/**
 * Type guard to check if a context is a PIIContext.
 *
 * @param ctx - Context to check
 * @returns True if the context is a PIIContext
 */
export declare function isPIIContext(ctx: AuthContext | PIIContext): ctx is PIIContext;
/**
 * Get user with PII data (cross-database lookup).
 *
 * This is a common pattern for fetching user data from both Core and PII databases.
 *
 * @param ctx - PIIContext
 * @param userId - User ID
 * @returns Combined user data or null
 */
export declare function getUserWithPII(
  ctx: PIIContext,
  userId: string
): Promise<{
  core: Awaited<ReturnType<typeof ctx.repositories.userCore.findById>>;
  pii: Awaited<ReturnType<typeof ctx.piiRepositories.userPII.findByUserId>> | null;
} | null>;
//# sourceMappingURL=factory.d.ts.map
