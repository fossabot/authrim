/**
 * Relation Parser Implementation
 *
 * Parses and evaluates Zanzibar-style relation expressions.
 *
 * Phase 3 MVP supports:
 * - direct: Direct relation tuple match
 * - union: OR of multiple expressions
 * - tuple_to_userset: Inherit from related object
 *
 * Phase 4+ will add:
 * - intersection: AND of multiple expressions
 * - exclusion: NOT expression
 */
import type { RelationExpression } from './types';
import type { IRelationParser, RelationEvaluationContext } from './interfaces';
import type { IStorageAdapter } from '../storage/interfaces';
/**
 * RelationParser - Parses and evaluates relation expressions
 */
export declare class RelationParser implements IRelationParser {
  /**
   * Parse a JSON relation expression
   */
  parse(json: string | object): RelationExpression;
  /**
   * Recursively parse an expression object
   */
  private parseExpression;
  private parseDirectRelation;
  private parseUnionRelation;
  private parseTupleToUsersetRelation;
  private parseIntersectionRelation;
  private parseExclusionRelation;
  /**
   * Validate a relation expression
   */
  validate(expression: RelationExpression): string[];
  private validateExpression;
  /**
   * Evaluate a relation expression
   */
  evaluate(
    expression: RelationExpression,
    context: RelationEvaluationContext,
    adapter: IStorageAdapter
  ): Promise<boolean>;
  /**
   * Evaluate a direct relation - check for a direct tuple
   */
  private evaluateDirectRelation;
  /**
   * Evaluate a union relation - any child must match
   */
  private evaluateUnionRelation;
  /**
   * Evaluate a tuple-to-userset relation
   *
   * Example: document#parent.viewer
   * 1. Find the parent of the document (via tupleset relation)
   * 2. Check if the user has viewer relation on the parent (computed_userset)
   */
  private evaluateTupleToUsersetRelation;
  /**
   * Evaluate an intersection relation - all children must match
   * Phase 4+ feature
   */
  private evaluateIntersectionRelation;
  /**
   * Evaluate an exclusion relation - base must match, subtract must not
   * Phase 4+ feature
   */
  private evaluateExclusionRelation;
}
/**
 * Create a fresh evaluation context
 */
export declare function createEvaluationContext(
  tenantId: string,
  userId: string,
  objectType: string,
  objectId: string,
  maxDepth?: number
): RelationEvaluationContext;
/**
 * Parse object string into type and ID
 * "document:doc_123" → { type: "document", id: "doc_123" }
 */
export declare function parseObjectString(object: string): {
  type: string;
  id: string;
};
/**
 * Build object string from type and ID
 */
export declare function buildObjectString(type: string, id: string): string;
//# sourceMappingURL=relation-parser.d.ts.map
