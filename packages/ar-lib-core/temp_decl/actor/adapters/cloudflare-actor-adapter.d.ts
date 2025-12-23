import type { DurableObjectState } from '@cloudflare/workers-types';
import type { ActorContext } from '../actor-context';
import type { ActorStorage } from '../actor-storage';
/**
 * Cloudflare Durable Object implementation of ActorContext
 *
 * Wraps DurableObjectState to provide platform-agnostic storage access.
 *
 * @example
 * ```typescript
 * class SessionStore extends DurableObject {
 *   private actorCtx: ActorContext;
 *
 *   constructor(ctx: DurableObjectState, env: Env) {
 *     super(ctx, env);
 *     this.actorCtx = new CloudflareActorContext(ctx);
 *   }
 *
 *   async getSession(id: string) {
 *     return this.actorCtx.storage.get<Session>(`session:${id}`);
 *   }
 * }
 * ```
 */
export declare class CloudflareActorContext implements ActorContext {
  private ctx;
  readonly storage: ActorStorage;
  constructor(ctx: DurableObjectState);
  /**
   * Block concurrent requests during initialization
   * Delegates to Cloudflare's blockConcurrencyWhile
   */
  blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T>;
}
//# sourceMappingURL=cloudflare-actor-adapter.d.ts.map
