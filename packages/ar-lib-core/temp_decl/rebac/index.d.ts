/**
 * ReBAC (Relationship-Based Access Control) Module
 *
 * Phase 3 implementation of Zanzibar-lite access control:
 * - Check API: check(user, relation, object)
 * - List API: listObjects, listUsers
 * - Relation DSL: union, tuple-to-userset (MVP)
 * - Caching: KV + request-scoped
 *
 * Usage:
 * ```typescript
 * import { createReBACService, ReBACService } from '@authrim/ar-lib-core/rebac';
 *
 * const rebac = createReBACService(adapter, { cache_ttl: 60 });
 *
 * const result = await rebac.check({
 *   tenant_id: 'tenant_123',
 *   user_id: 'user_456',
 *   relation: 'viewer',
 *   object: 'document:doc_789',
 * });
 * // { allowed: true, resolved_via: 'computed' }
 * ```
 */
export type {
  CheckRequest,
  CheckResponse,
  BatchCheckRequest,
  BatchCheckResponse,
  CheckResolutionMethod,
  ListObjectsRequest,
  ListObjectsResponse,
  ListUsersRequest,
  ListUsersResponse,
  RelationExpression,
  DirectRelation,
  UnionRelation,
  TupleToUsersetRelation,
  IntersectionRelation,
  ExclusionRelation,
  RelationDefinition,
  RelationDefinitionRow,
  ClosureEntry,
  ClosureEntryRow,
  CheckCacheKey,
  CachedCheckResult,
  RelationshipTuple,
  ParsedObject,
  ReBACConfig,
} from './types';
export {
  DEFAULT_CACHE_TTL,
  DEFAULT_MAX_DEPTH,
  REBAC_CACHE_PREFIX,
  DEFAULT_CLOSURE_BATCH_SIZE,
} from './types';
export type {
  IReBACService,
  IRelationDefinitionStore,
  IClosureManager,
  IReBACCacheManager,
  IRelationParser,
  IReBACServiceFactory,
  RelationEvaluationContext,
  RelationshipWithEvidence,
  IRelationshipStoreExtended,
} from './interfaces';
export { ReBACService, createReBACService } from './rebac-service';
export { ReBACCacheManager, RequestScopedCache } from './cache-manager';
export { ClosureManager, createClosureManager } from './closure-manager';
export {
  RelationParser,
  createEvaluationContext,
  parseObjectString,
  buildObjectString,
} from './relation-parser';
//# sourceMappingURL=index.d.ts.map
