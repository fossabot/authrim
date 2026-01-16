/**
 * Intersection and Exclusion Relations Unit Tests
 *
 * Tests for Phase 4+ ReBAC features:
 * - Intersection relations (AND logic - all conditions must match)
 * - Exclusion relations (NOT logic - base must match, subtract must not)
 *
 * Key behaviors tested:
 * - Basic intersection: all children must match for access
 * - Basic exclusion: base - subtract pattern
 * - Nested combinations: union + intersection, exclusion + union
 * - Blocklist patterns: allow all except specific users
 * - Complex permission models
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RelationParser, createEvaluationContext } from '../relation-parser';
import type { IStorageAdapter } from '../../storage/interfaces';
import type {
  IntersectionRelation,
  ExclusionRelation,
  UnionRelation,
  DirectRelation,
  RelationExpression,
} from '../types';

/**
 * Create a mock storage adapter for testing
 */
/**
 * Simplified interface for defining test relationships
 * Note: user_id and object are used for clarity in tests,
 * internally mapped to subject/from_type and to_type
 */
interface TestRelation {
  user_id: string;
  object_type: string;
  object_id: string;
  relation: string;
}

function createMockAdapter(relations: TestRelation[] = []): IStorageAdapter {
  return {
    query: vi.fn().mockImplementation((sql: string, params: unknown[]) => {
      // Handle relationships queries
      // SQL params: [tenant_id, from_type(user_type), from_id(user_id), to_type, to_id, relation, timestamp]
      if (sql.includes('relationships')) {
        const [_tenantId, fromType, fromId, toType, toId, relType] = params as string[];
        // from_type is always 'subject' (default user_type in createEvaluationContext)
        const matches = relations.filter(
          (r) =>
            fromType === 'subject' &&
            r.user_id === fromId &&
            r.object_type === toType &&
            r.object_id === toId &&
            r.relation === relType
        );
        return Promise.resolve(matches.length > 0 ? [{ id: 'match' }] : []);
      }
      return Promise.resolve([]);
    }),
    queryOne: vi.fn().mockResolvedValue(null),
    execute: vi.fn().mockResolvedValue({ success: true }),
  } as unknown as IStorageAdapter;
}

describe('Intersection Relations', () => {
  let parser: RelationParser;
  let mockAdapter: IStorageAdapter;

  beforeEach(() => {
    parser = new RelationParser();
  });

  describe('Basic Intersection', () => {
    it('should allow when ALL conditions match', async () => {
      // User has both viewer AND member relations
      mockAdapter = createMockAdapter([
        { user_id: 'user_123', object_type: 'document', object_id: 'doc_456', relation: 'viewer' },
        { user_id: 'user_123', object_type: 'document', object_id: 'doc_456', relation: 'member' },
      ]);

      const expr: IntersectionRelation = {
        type: 'intersection',
        children: [
          { type: 'direct', relation: 'viewer' } as DirectRelation,
          { type: 'direct', relation: 'member' } as DirectRelation,
        ],
      };

      const context = createEvaluationContext('tenant_1', 'user_123', 'document', 'doc_456');

      const result = await parser.evaluate(expr, context, mockAdapter);
      expect(result).toBe(true);
    });

    it('should deny when ONE condition does not match', async () => {
      // User has viewer but NOT member
      mockAdapter = createMockAdapter([
        { user_id: 'user_123', object_type: 'document', object_id: 'doc_456', relation: 'viewer' },
      ]);

      const expr: IntersectionRelation = {
        type: 'intersection',
        children: [
          { type: 'direct', relation: 'viewer' } as DirectRelation,
          { type: 'direct', relation: 'member' } as DirectRelation,
        ],
      };

      const context = createEvaluationContext('tenant_1', 'user_123', 'document', 'doc_456');

      const result = await parser.evaluate(expr, context, mockAdapter);
      expect(result).toBe(false);
    });

    it('should deny when NO conditions match', async () => {
      mockAdapter = createMockAdapter([]);

      const expr: IntersectionRelation = {
        type: 'intersection',
        children: [
          { type: 'direct', relation: 'viewer' } as DirectRelation,
          { type: 'direct', relation: 'member' } as DirectRelation,
        ],
      };

      const context = createEvaluationContext('tenant_1', 'user_123', 'document', 'doc_456');

      const result = await parser.evaluate(expr, context, mockAdapter);
      expect(result).toBe(false);
    });

    it('should handle single child intersection (always true if child matches)', async () => {
      mockAdapter = createMockAdapter([
        { user_id: 'user_123', object_type: 'document', object_id: 'doc_456', relation: 'viewer' },
      ]);

      const expr: IntersectionRelation = {
        type: 'intersection',
        children: [{ type: 'direct', relation: 'viewer' } as DirectRelation],
      };

      const context = createEvaluationContext('tenant_1', 'user_123', 'document', 'doc_456');

      const result = await parser.evaluate(expr, context, mockAdapter);
      expect(result).toBe(true);
    });

    it('should handle empty children (returns true - vacuous truth)', async () => {
      mockAdapter = createMockAdapter([]);

      const expr: IntersectionRelation = {
        type: 'intersection',
        children: [],
      };

      const context = createEvaluationContext('tenant_1', 'user_123', 'document', 'doc_456');

      const result = await parser.evaluate(expr, context, mockAdapter);
      expect(result).toBe(true); // Empty AND is vacuously true
    });

    it('should handle three or more conditions', async () => {
      mockAdapter = createMockAdapter([
        { user_id: 'user_123', object_type: 'document', object_id: 'doc_456', relation: 'viewer' },
        { user_id: 'user_123', object_type: 'document', object_id: 'doc_456', relation: 'member' },
        {
          user_id: 'user_123',
          object_type: 'document',
          object_id: 'doc_456',
          relation: 'verified',
        },
      ]);

      const expr: IntersectionRelation = {
        type: 'intersection',
        children: [
          { type: 'direct', relation: 'viewer' } as DirectRelation,
          { type: 'direct', relation: 'member' } as DirectRelation,
          { type: 'direct', relation: 'verified' } as DirectRelation,
        ],
      };

      const context = createEvaluationContext('tenant_1', 'user_123', 'document', 'doc_456');

      const result = await parser.evaluate(expr, context, mockAdapter);
      expect(result).toBe(true);
    });
  });

  describe('Nested Intersection with Union', () => {
    it('should handle intersection of unions (A OR B) AND (C OR D)', async () => {
      // User has viewer (satisfies first union) and editor (satisfies second union)
      mockAdapter = createMockAdapter([
        { user_id: 'user_123', object_type: 'document', object_id: 'doc_456', relation: 'viewer' },
        { user_id: 'user_123', object_type: 'document', object_id: 'doc_456', relation: 'editor' },
      ]);

      const expr: IntersectionRelation = {
        type: 'intersection',
        children: [
          {
            type: 'union',
            children: [
              { type: 'direct', relation: 'viewer' } as DirectRelation,
              { type: 'direct', relation: 'owner' } as DirectRelation,
            ],
          } as UnionRelation,
          {
            type: 'union',
            children: [
              { type: 'direct', relation: 'editor' } as DirectRelation,
              { type: 'direct', relation: 'admin' } as DirectRelation,
            ],
          } as UnionRelation,
        ],
      };

      const context = createEvaluationContext('tenant_1', 'user_123', 'document', 'doc_456');

      const result = await parser.evaluate(expr, context, mockAdapter);
      expect(result).toBe(true);
    });

    it('should deny when one union is not satisfied', async () => {
      // User has viewer but nothing from second union
      mockAdapter = createMockAdapter([
        { user_id: 'user_123', object_type: 'document', object_id: 'doc_456', relation: 'viewer' },
      ]);

      const expr: IntersectionRelation = {
        type: 'intersection',
        children: [
          {
            type: 'union',
            children: [
              { type: 'direct', relation: 'viewer' } as DirectRelation,
              { type: 'direct', relation: 'owner' } as DirectRelation,
            ],
          } as UnionRelation,
          {
            type: 'union',
            children: [
              { type: 'direct', relation: 'editor' } as DirectRelation,
              { type: 'direct', relation: 'admin' } as DirectRelation,
            ],
          } as UnionRelation,
        ],
      };

      const context = createEvaluationContext('tenant_1', 'user_123', 'document', 'doc_456');

      const result = await parser.evaluate(expr, context, mockAdapter);
      expect(result).toBe(false);
    });
  });
});

describe('Exclusion Relations', () => {
  let parser: RelationParser;
  let mockAdapter: IStorageAdapter;

  beforeEach(() => {
    parser = new RelationParser();
  });

  describe('Basic Exclusion', () => {
    it('should allow when base matches and subtract does not', async () => {
      // User is viewer but NOT blocked
      mockAdapter = createMockAdapter([
        { user_id: 'user_123', object_type: 'document', object_id: 'doc_456', relation: 'viewer' },
      ]);

      const expr: ExclusionRelation = {
        type: 'exclusion',
        base: { type: 'direct', relation: 'viewer' } as DirectRelation,
        subtract: { type: 'direct', relation: 'blocked' } as DirectRelation,
      };

      const context = createEvaluationContext('tenant_1', 'user_123', 'document', 'doc_456');

      const result = await parser.evaluate(expr, context, mockAdapter);
      expect(result).toBe(true);
    });

    it('should deny when base matches but subtract also matches', async () => {
      // User is viewer AND blocked
      mockAdapter = createMockAdapter([
        { user_id: 'user_123', object_type: 'document', object_id: 'doc_456', relation: 'viewer' },
        { user_id: 'user_123', object_type: 'document', object_id: 'doc_456', relation: 'blocked' },
      ]);

      const expr: ExclusionRelation = {
        type: 'exclusion',
        base: { type: 'direct', relation: 'viewer' } as DirectRelation,
        subtract: { type: 'direct', relation: 'blocked' } as DirectRelation,
      };

      const context = createEvaluationContext('tenant_1', 'user_123', 'document', 'doc_456');

      const result = await parser.evaluate(expr, context, mockAdapter);
      expect(result).toBe(false);
    });

    it('should deny when base does not match', async () => {
      // User is NOT viewer
      mockAdapter = createMockAdapter([]);

      const expr: ExclusionRelation = {
        type: 'exclusion',
        base: { type: 'direct', relation: 'viewer' } as DirectRelation,
        subtract: { type: 'direct', relation: 'blocked' } as DirectRelation,
      };

      const context = createEvaluationContext('tenant_1', 'user_123', 'document', 'doc_456');

      const result = await parser.evaluate(expr, context, mockAdapter);
      expect(result).toBe(false);
    });
  });

  describe('Blocklist Pattern', () => {
    it('should implement blocklist: union(all viewers) EXCEPT blocked users', async () => {
      // User is editor (part of union) but NOT blocked
      mockAdapter = createMockAdapter([
        { user_id: 'user_123', object_type: 'document', object_id: 'doc_456', relation: 'editor' },
      ]);

      const expr: ExclusionRelation = {
        type: 'exclusion',
        base: {
          type: 'union',
          children: [
            { type: 'direct', relation: 'viewer' } as DirectRelation,
            { type: 'direct', relation: 'editor' } as DirectRelation,
            { type: 'direct', relation: 'owner' } as DirectRelation,
          ],
        } as UnionRelation,
        subtract: { type: 'direct', relation: 'blocked' } as DirectRelation,
      };

      const context = createEvaluationContext('tenant_1', 'user_123', 'document', 'doc_456');

      const result = await parser.evaluate(expr, context, mockAdapter);
      expect(result).toBe(true);
    });

    it('should block user in blocklist even if they have permission', async () => {
      // User is editor but ALSO blocked
      mockAdapter = createMockAdapter([
        { user_id: 'user_123', object_type: 'document', object_id: 'doc_456', relation: 'editor' },
        { user_id: 'user_123', object_type: 'document', object_id: 'doc_456', relation: 'blocked' },
      ]);

      const expr: ExclusionRelation = {
        type: 'exclusion',
        base: {
          type: 'union',
          children: [
            { type: 'direct', relation: 'viewer' } as DirectRelation,
            { type: 'direct', relation: 'editor' } as DirectRelation,
            { type: 'direct', relation: 'owner' } as DirectRelation,
          ],
        } as UnionRelation,
        subtract: { type: 'direct', relation: 'blocked' } as DirectRelation,
      };

      const context = createEvaluationContext('tenant_1', 'user_123', 'document', 'doc_456');

      const result = await parser.evaluate(expr, context, mockAdapter);
      expect(result).toBe(false);
    });
  });

  describe('Complex Exclusion with Intersection', () => {
    it('should handle exclusion with intersection subtract', async () => {
      // Allow viewers EXCEPT users who are both suspended AND flagged
      mockAdapter = createMockAdapter([
        { user_id: 'user_123', object_type: 'document', object_id: 'doc_456', relation: 'viewer' },
        {
          user_id: 'user_123',
          object_type: 'document',
          object_id: 'doc_456',
          relation: 'suspended',
        },
        // User is suspended but NOT flagged, so they should be allowed
      ]);

      const expr: ExclusionRelation = {
        type: 'exclusion',
        base: { type: 'direct', relation: 'viewer' } as DirectRelation,
        subtract: {
          type: 'intersection',
          children: [
            { type: 'direct', relation: 'suspended' } as DirectRelation,
            { type: 'direct', relation: 'flagged' } as DirectRelation,
          ],
        } as IntersectionRelation,
      };

      const context = createEvaluationContext('tenant_1', 'user_123', 'document', 'doc_456');

      const result = await parser.evaluate(expr, context, mockAdapter);
      expect(result).toBe(true); // Allowed because intersection (suspended AND flagged) is false
    });

    it('should deny when exclusion intersection subtract matches', async () => {
      // User is viewer, suspended, AND flagged
      mockAdapter = createMockAdapter([
        { user_id: 'user_123', object_type: 'document', object_id: 'doc_456', relation: 'viewer' },
        {
          user_id: 'user_123',
          object_type: 'document',
          object_id: 'doc_456',
          relation: 'suspended',
        },
        { user_id: 'user_123', object_type: 'document', object_id: 'doc_456', relation: 'flagged' },
      ]);

      const expr: ExclusionRelation = {
        type: 'exclusion',
        base: { type: 'direct', relation: 'viewer' } as DirectRelation,
        subtract: {
          type: 'intersection',
          children: [
            { type: 'direct', relation: 'suspended' } as DirectRelation,
            { type: 'direct', relation: 'flagged' } as DirectRelation,
          ],
        } as IntersectionRelation,
      };

      const context = createEvaluationContext('tenant_1', 'user_123', 'document', 'doc_456');

      const result = await parser.evaluate(expr, context, mockAdapter);
      expect(result).toBe(false);
    });
  });
});

describe('Combined Intersection and Exclusion', () => {
  let parser: RelationParser;
  let mockAdapter: IStorageAdapter;

  beforeEach(() => {
    parser = new RelationParser();
  });

  it('should handle intersection containing exclusion', async () => {
    // Must be (viewer NOT blocked) AND (member NOT suspended)
    mockAdapter = createMockAdapter([
      { user_id: 'user_123', object_type: 'document', object_id: 'doc_456', relation: 'viewer' },
      { user_id: 'user_123', object_type: 'document', object_id: 'doc_456', relation: 'member' },
    ]);

    const expr: IntersectionRelation = {
      type: 'intersection',
      children: [
        {
          type: 'exclusion',
          base: { type: 'direct', relation: 'viewer' } as DirectRelation,
          subtract: { type: 'direct', relation: 'blocked' } as DirectRelation,
        } as ExclusionRelation,
        {
          type: 'exclusion',
          base: { type: 'direct', relation: 'member' } as DirectRelation,
          subtract: { type: 'direct', relation: 'suspended' } as DirectRelation,
        } as ExclusionRelation,
      ],
    };

    const context = createEvaluationContext('tenant_1', 'user_123', 'document', 'doc_456');

    const result = await parser.evaluate(expr, context, mockAdapter);
    expect(result).toBe(true);
  });

  it('should deny when one exclusion in intersection fails', async () => {
    // User is viewer and member, but also blocked
    mockAdapter = createMockAdapter([
      { user_id: 'user_123', object_type: 'document', object_id: 'doc_456', relation: 'viewer' },
      { user_id: 'user_123', object_type: 'document', object_id: 'doc_456', relation: 'member' },
      { user_id: 'user_123', object_type: 'document', object_id: 'doc_456', relation: 'blocked' },
    ]);

    const expr: IntersectionRelation = {
      type: 'intersection',
      children: [
        {
          type: 'exclusion',
          base: { type: 'direct', relation: 'viewer' } as DirectRelation,
          subtract: { type: 'direct', relation: 'blocked' } as DirectRelation,
        } as ExclusionRelation,
        {
          type: 'exclusion',
          base: { type: 'direct', relation: 'member' } as DirectRelation,
          subtract: { type: 'direct', relation: 'suspended' } as DirectRelation,
        } as ExclusionRelation,
      ],
    };

    const context = createEvaluationContext('tenant_1', 'user_123', 'document', 'doc_456');

    const result = await parser.evaluate(expr, context, mockAdapter);
    expect(result).toBe(false);
  });

  describe('Real-world Scenarios', () => {
    it('should implement document access: (editor OR owner) AND department_member AND NOT suspended', async () => {
      // User is editor, department_member, and not suspended
      mockAdapter = createMockAdapter([
        { user_id: 'user_123', object_type: 'document', object_id: 'doc_456', relation: 'editor' },
        {
          user_id: 'user_123',
          object_type: 'document',
          object_id: 'doc_456',
          relation: 'department_member',
        },
      ]);

      // (editor OR owner) AND department_member AND NOT suspended
      // = intersection([union([editor, owner]), department_member, exclusion(direct(true), suspended)])
      // Simplified: intersection with exclusion
      const expr: IntersectionRelation = {
        type: 'intersection',
        children: [
          {
            type: 'union',
            children: [
              { type: 'direct', relation: 'editor' } as DirectRelation,
              { type: 'direct', relation: 'owner' } as DirectRelation,
            ],
          } as UnionRelation,
          { type: 'direct', relation: 'department_member' } as DirectRelation,
        ],
      };

      // Wrap in exclusion for "NOT suspended"
      const fullExpr: ExclusionRelation = {
        type: 'exclusion',
        base: expr,
        subtract: { type: 'direct', relation: 'suspended' } as DirectRelation,
      };

      const context = createEvaluationContext('tenant_1', 'user_123', 'document', 'doc_456');

      const result = await parser.evaluate(fullExpr, context, mockAdapter);
      expect(result).toBe(true);
    });

    it('should deny suspended user even with valid permissions', async () => {
      mockAdapter = createMockAdapter([
        { user_id: 'user_123', object_type: 'document', object_id: 'doc_456', relation: 'editor' },
        {
          user_id: 'user_123',
          object_type: 'document',
          object_id: 'doc_456',
          relation: 'department_member',
        },
        {
          user_id: 'user_123',
          object_type: 'document',
          object_id: 'doc_456',
          relation: 'suspended',
        },
      ]);

      const expr: IntersectionRelation = {
        type: 'intersection',
        children: [
          {
            type: 'union',
            children: [
              { type: 'direct', relation: 'editor' } as DirectRelation,
              { type: 'direct', relation: 'owner' } as DirectRelation,
            ],
          } as UnionRelation,
          { type: 'direct', relation: 'department_member' } as DirectRelation,
        ],
      };

      const fullExpr: ExclusionRelation = {
        type: 'exclusion',
        base: expr,
        subtract: { type: 'direct', relation: 'suspended' } as DirectRelation,
      };

      const context = createEvaluationContext('tenant_1', 'user_123', 'document', 'doc_456');

      const result = await parser.evaluate(fullExpr, context, mockAdapter);
      expect(result).toBe(false);
    });
  });
});
