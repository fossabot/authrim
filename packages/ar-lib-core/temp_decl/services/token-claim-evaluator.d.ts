/**
 * Token Claim Evaluator Service
 *
 * Evaluates token claim rules against evaluation context to determine
 * custom claims to embed in access/ID tokens.
 *
 * Evaluation order:
 * 1. Filter by tenant_id, token_type, is_active=1
 * 2. Filter by valid_from <= now <= valid_until
 * 3. Sort by priority DESC, created_at ASC
 * 4. Evaluate conditions in order
 * 5. Apply matching rules' actions (Last-Write-Wins for collision)
 * 6. Stop if stop_processing=true rule matches
 *
 * Design Principles:
 * - Token Embedding is Authorization Result Cache, NOT Source of Truth
 * - Determinism: Same context -> Same token (no time-dependent or external I/O)
 * - PII Separation: Only Non-PII data is embedded (roles, permissions, metadata)
 */
import type { D1Database, KVNamespace } from '@cloudflare/workers-types';
import type {
  TokenClaimRule,
  TokenClaimEvaluationContext,
  TokenClaimEvaluationResult,
} from '../types/token-claim-rules';
import type { ConditionOperator } from '../types/policy-rules';
/** Default cache TTL for token claim rules (5 minutes) */
declare const DEFAULT_CACHE_TTL_SECONDS = 300;
/** Cache key prefix for token claim rules */
declare const TOKEN_CLAIM_RULES_CACHE_PREFIX = 'token_claim_rules_cache:';
/** Reserved claims that cannot be overwritten */
declare const RESERVED_CLAIM_NAMES: Set<string>;
/**
 * Token Claim Evaluator
 *
 * Evaluates token claim rules to determine custom claims to embed in tokens.
 * Supports caching via KV for performance.
 */
export declare class TokenClaimEvaluator {
  private db;
  private cache?;
  private cacheTtl;
  private maxCustomClaims;
  constructor(
    db: D1Database,
    cache?: KVNamespace,
    options?: {
      cacheTtlSeconds?: number;
      maxCustomClaims?: number;
    }
  );
  /**
   * Evaluate all active rules against the given context
   *
   * @param context - Evaluation context with user/client attributes
   * @param tokenType - Target token type ('access' | 'id')
   * @returns Evaluation result with claims to add
   */
  evaluate(
    context: TokenClaimEvaluationContext,
    tokenType: 'access' | 'id'
  ): Promise<TokenClaimEvaluationResult>;
  /**
   * Load rules from cache or database
   */
  private loadRules;
  /**
   * Load rules from D1 database
   */
  private loadRulesFromDb;
  /**
   * Convert database row to TokenClaimRule
   */
  private rowToRule;
  /**
   * Evaluate a condition (single or compound)
   */
  private evaluateCondition;
  /**
   * Evaluate a compound condition (AND/OR)
   */
  private evaluateCompoundCondition;
  /**
   * Evaluate a single condition
   */
  private evaluateSingleCondition;
  /**
   * Get field value from context
   */
  private getFieldValue;
  /**
   * Apply rule actions and return new claims and overrides
   */
  private applyActions;
  /**
   * Check if claim name matches PII patterns
   */
  private isPiiClaimName;
  /**
   * Substitute template variables
   *
   * Available variables: user_type, org_id, org_type, client_id, subject_id
   */
  private substituteTemplate;
  /**
   * Transform IdP claim value
   */
  private transformIdpClaim;
  /**
   * Copy value from context
   */
  private copyFromContext;
  /**
   * Evaluate conditional value action
   */
  private evaluateConditionalValue;
  /**
   * Invalidate cache for a tenant
   */
  invalidateCache(tenantId: string, tokenType?: 'access' | 'id'): Promise<void>;
}
/**
 * Create a TokenClaimEvaluator instance
 */
export declare function createTokenClaimEvaluator(
  db: D1Database,
  cache?: KVNamespace,
  options?: {
    cacheTtlSeconds?: number;
    maxCustomClaims?: number;
  }
): TokenClaimEvaluator;
/**
 * Test a token claim rule against provided context (for Admin API testing)
 *
 * @param rule - Rule to test
 * @param context - Test context
 * @returns Detailed test result
 */
export declare function testTokenClaimRule(
  rule: TokenClaimRule,
  context: TokenClaimEvaluationContext
): {
  matched: boolean;
  condition_results: Array<{
    field: string;
    claim_path?: string;
    operator: ConditionOperator;
    expected: unknown;
    actual: unknown;
    matched: boolean;
  }>;
  would_add_claims: Record<string, unknown>;
};
export {
  DEFAULT_CACHE_TTL_SECONDS as TOKEN_CLAIM_DEFAULT_CACHE_TTL,
  TOKEN_CLAIM_RULES_CACHE_PREFIX,
  RESERVED_CLAIM_NAMES,
};
//# sourceMappingURL=token-claim-evaluator.d.ts.map
