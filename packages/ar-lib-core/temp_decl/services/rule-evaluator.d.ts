/**
 * Rule Evaluator Service
 *
 * Evaluates role assignment rules against user context to determine:
 * - Roles to assign
 * - Organizations to join
 * - Attributes to set
 * - Access denial decisions
 *
 * Evaluation order:
 * 1. Filter by tenant_id and is_active=1
 * 2. Filter by valid_from <= now <= valid_until
 * 3. Sort by priority DESC
 * 4. Evaluate conditions in order
 * 5. Apply matching rules' actions
 * 6. Stop if stop_processing=true rule matches
 * 7. Stop immediately if deny action is encountered
 */
import type {
  RoleAssignmentRule,
  RuleAction,
  RuleEvaluationContext,
  RuleEvaluationResult,
  ConditionOperator,
} from '../types/policy-rules';
/** Default cache TTL for rules (5 minutes) */
declare const DEFAULT_CACHE_TTL_SECONDS = 300;
/** Cache key prefix for rules */
declare const RULES_CACHE_PREFIX = 'role_assignment_rules_cache:';
/**
 * Rule Evaluator
 *
 * Evaluates role assignment rules against a given context.
 * Supports caching via KV for performance.
 */
export declare class RuleEvaluator {
  private db;
  private cache?;
  private cacheTtl;
  constructor(db: D1Database, cache?: KVNamespace, cacheTtlSeconds?: number);
  /**
   * Evaluate all active rules against the given context
   *
   * @param context - Evaluation context with user attributes
   * @returns Evaluation result with roles, orgs, and deny status
   */
  evaluate(context: RuleEvaluationContext): Promise<RuleEvaluationResult>;
  /**
   * Load rules from cache or database
   */
  private loadRules;
  /**
   * Load rules from D1 database
   */
  private loadRulesFromDb;
  /**
   * Convert database row to RoleAssignmentRule
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
   * Apply rule actions to result
   *
   * @returns true if processing should stop
   */
  private applyActions;
  /**
   * Apply assign_role action
   */
  private applyAssignRoleAction;
  /**
   * Apply join_org action
   */
  private applyJoinOrgAction;
  /**
   * Apply set_attribute action
   */
  private applySetAttributeAction;
  /**
   * Invalidate cache for a tenant
   */
  invalidateCache(tenantId: string): Promise<void>;
}
/**
 * Create a RuleEvaluator instance
 */
export declare function createRuleEvaluator(
  db: D1Database,
  cache?: KVNamespace,
  cacheTtlSeconds?: number
): RuleEvaluator;
/**
 * Evaluate a single rule against a context (for testing)
 *
 * @param rule - Rule to evaluate
 * @param context - Evaluation context
 * @returns Whether the rule matches
 */
export declare function evaluateRuleCondition(
  rule: RoleAssignmentRule,
  context: RuleEvaluationContext
): boolean;
/**
 * Test a rule against provided context (for Admin API testing)
 *
 * @param rule - Rule to test
 * @param context - Test context
 * @returns Detailed test result
 */
export declare function testRuleAgainstContext(
  rule: RoleAssignmentRule,
  context: RuleEvaluationContext
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
  would_apply_actions: RuleAction[];
};
export { DEFAULT_CACHE_TTL_SECONDS, RULES_CACHE_PREFIX };
//# sourceMappingURL=rule-evaluator.d.ts.map
