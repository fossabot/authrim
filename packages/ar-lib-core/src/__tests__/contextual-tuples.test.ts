/**
 * Contextual Tuples Unit Tests
 *
 * Tests for temporary relationships passed in check requests.
 * Contextual tuples are evaluated BEFORE cache lookup and allow
 * request-specific permission grants without persisting to the database.
 *
 * Key behaviors tested:
 * - Direct match on user_id, relation, object_type, object_id
 * - User ID with/without type prefix (e.g., "user:user_123" vs "user_123")
 * - Object notation: colon-separated (e.g., "document:doc_123") vs explicit type
 * - Multiple tuples evaluation (first match wins)
 * - Non-matching tuples fall through to regular check
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReBACService } from '../rebac/rebac-service';
import type { IStorageAdapter } from '../storage/interfaces';

/**
 * Create a mock storage adapter
 */
function createMockAdapter(
  relationships: Array<{
    from_type: string;
    from_id: string;
    to_type: string;
    to_id: string;
    relationship_type: string;
  }> = []
): IStorageAdapter {
  return {
    query: vi.fn().mockImplementation((sql: string, params: unknown[]) => {
      // Handle relation definition queries
      if (sql.includes('relation_definitions')) {
        return Promise.resolve([]);
      }
      // Handle relationships queries
      if (sql.includes('relationships')) {
        const [tenantId, fromType, fromId, toType, toId, relType] = params as string[];
        const matches = relationships.filter(
          (r) =>
            r.from_type === fromType &&
            r.from_id === fromId &&
            r.to_type === toType &&
            r.to_id === toId &&
            r.relationship_type === relType
        );
        return Promise.resolve(matches.length > 0 ? [{ id: 'match' }] : []);
      }
      return Promise.resolve([]);
    }),
    queryOne: vi.fn().mockResolvedValue(null),
    execute: vi.fn().mockResolvedValue({ success: true }),
  } as unknown as IStorageAdapter;
}

describe('Contextual Tuples', () => {
  let service: ReBACService;
  let mockAdapter: IStorageAdapter;

  beforeEach(() => {
    mockAdapter = createMockAdapter();
    service = new ReBACService(mockAdapter);
  });

  describe('Basic Matching', () => {
    it('should allow when contextual tuple matches exactly', async () => {
      const result = await service.check({
        tenant_id: 'tenant_1',
        user_id: 'user_123',
        relation: 'viewer',
        object: 'document:doc_456',
        context: {
          contextual_tuples: [
            {
              user_id: 'user_123',
              relation: 'viewer',
              object: 'document:doc_456',
            },
          ],
        },
      });

      expect(result.allowed).toBe(true);
      expect(result.resolved_via).toBe('context');
      expect(result.path).toContain('contextual_tuple');
    });

    it('should deny when contextual tuple does not match user_id', async () => {
      const result = await service.check({
        tenant_id: 'tenant_1',
        user_id: 'user_123',
        relation: 'viewer',
        object: 'document:doc_456',
        context: {
          contextual_tuples: [
            {
              user_id: 'user_999', // Different user
              relation: 'viewer',
              object: 'document:doc_456',
            },
          ],
        },
      });

      // Context check doesn't match, falls through to DB check (which returns false)
      expect(result.allowed).toBe(false);
    });

    it('should deny when contextual tuple does not match relation', async () => {
      const result = await service.check({
        tenant_id: 'tenant_1',
        user_id: 'user_123',
        relation: 'viewer',
        object: 'document:doc_456',
        context: {
          contextual_tuples: [
            {
              user_id: 'user_123',
              relation: 'editor', // Different relation
              object: 'document:doc_456',
            },
          ],
        },
      });

      expect(result.allowed).toBe(false);
    });

    it('should deny when contextual tuple does not match object', async () => {
      const result = await service.check({
        tenant_id: 'tenant_1',
        user_id: 'user_123',
        relation: 'viewer',
        object: 'document:doc_456',
        context: {
          contextual_tuples: [
            {
              user_id: 'user_123',
              relation: 'viewer',
              object: 'document:doc_789', // Different object
            },
          ],
        },
      });

      expect(result.allowed).toBe(false);
    });
  });

  describe('User ID Formats', () => {
    it('should match user_id with type prefix in request', async () => {
      const result = await service.check({
        tenant_id: 'tenant_1',
        user_id: 'user:user_123', // With prefix
        relation: 'viewer',
        object: 'document:doc_456',
        context: {
          contextual_tuples: [
            {
              user_id: 'user_123', // Without prefix
              relation: 'viewer',
              object: 'document:doc_456',
            },
          ],
        },
      });

      expect(result.allowed).toBe(true);
      expect(result.resolved_via).toBe('context');
    });

    it('should match user_id with type prefix in tuple', async () => {
      const result = await service.check({
        tenant_id: 'tenant_1',
        user_id: 'user_123', // Without prefix
        relation: 'viewer',
        object: 'document:doc_456',
        context: {
          contextual_tuples: [
            {
              user_id: 'user:user_123', // With prefix
              relation: 'viewer',
              object: 'document:doc_456',
            },
          ],
        },
      });

      expect(result.allowed).toBe(true);
      expect(result.resolved_via).toBe('context');
    });

    it('should match when both have type prefix', async () => {
      const result = await service.check({
        tenant_id: 'tenant_1',
        user_id: 'user:user_123',
        relation: 'viewer',
        object: 'document:doc_456',
        context: {
          contextual_tuples: [
            {
              user_id: 'user:user_123',
              relation: 'viewer',
              object: 'document:doc_456',
            },
          ],
        },
      });

      expect(result.allowed).toBe(true);
      expect(result.resolved_via).toBe('context');
    });
  });

  describe('Object Formats', () => {
    it('should match object with explicit object_type', async () => {
      const result = await service.check({
        tenant_id: 'tenant_1',
        user_id: 'user_123',
        relation: 'viewer',
        object: 'doc_456',
        object_type: 'document',
        context: {
          contextual_tuples: [
            {
              user_id: 'user_123',
              relation: 'viewer',
              object: 'document:doc_456',
            },
          ],
        },
      });

      expect(result.allowed).toBe(true);
      expect(result.resolved_via).toBe('context');
    });

    it('should match tuple with explicit object_type', async () => {
      const result = await service.check({
        tenant_id: 'tenant_1',
        user_id: 'user_123',
        relation: 'viewer',
        object: 'document:doc_456',
        context: {
          contextual_tuples: [
            {
              user_id: 'user_123',
              relation: 'viewer',
              object: 'doc_456',
              object_type: 'document',
            },
          ],
        },
      });

      expect(result.allowed).toBe(true);
      expect(result.resolved_via).toBe('context');
    });

    it('should not match different object types', async () => {
      const result = await service.check({
        tenant_id: 'tenant_1',
        user_id: 'user_123',
        relation: 'viewer',
        object: 'document:doc_456',
        context: {
          contextual_tuples: [
            {
              user_id: 'user_123',
              relation: 'viewer',
              object: 'folder:doc_456', // Different type
            },
          ],
        },
      });

      expect(result.allowed).toBe(false);
    });
  });

  describe('Multiple Tuples', () => {
    it('should find match among multiple tuples', async () => {
      const result = await service.check({
        tenant_id: 'tenant_1',
        user_id: 'user_123',
        relation: 'viewer',
        object: 'document:doc_456',
        context: {
          contextual_tuples: [
            {
              user_id: 'user_999',
              relation: 'viewer',
              object: 'document:doc_456',
            },
            {
              user_id: 'user_123',
              relation: 'editor', // Different relation
              object: 'document:doc_456',
            },
            {
              user_id: 'user_123',
              relation: 'viewer', // This one matches
              object: 'document:doc_456',
            },
          ],
        },
      });

      expect(result.allowed).toBe(true);
      expect(result.resolved_via).toBe('context');
    });

    it('should deny when no tuple matches', async () => {
      const result = await service.check({
        tenant_id: 'tenant_1',
        user_id: 'user_123',
        relation: 'owner',
        object: 'document:doc_456',
        context: {
          contextual_tuples: [
            {
              user_id: 'user_123',
              relation: 'viewer',
              object: 'document:doc_456',
            },
            {
              user_id: 'user_123',
              relation: 'editor',
              object: 'document:doc_456',
            },
          ],
        },
      });

      // Looking for 'owner' but only 'viewer' and 'editor' in tuples
      expect(result.allowed).toBe(false);
    });
  });

  describe('Integration with Database Check', () => {
    it('should fall through to database when no contextual tuple matches', async () => {
      // When contextual tuples don't match, check continues to DB
      const result = await service.check({
        tenant_id: 'tenant_1',
        user_id: 'user_123',
        relation: 'viewer',
        object: 'document:doc_456',
        context: {
          contextual_tuples: [
            {
              user_id: 'user_999', // Different user, won't match
              relation: 'viewer',
              object: 'document:doc_456',
            },
          ],
        },
      });

      // resolved_via should NOT be 'context' since contextual tuples didn't match
      // It falls through to DB check (which returns false since mock has no data)
      expect(result.resolved_via).not.toBe('context');
    });

    it('should skip database check when contextual tuple matches', async () => {
      // Even though DB has relationship, contextual should win
      mockAdapter = createMockAdapter([
        {
          from_type: 'subject',
          from_id: 'user_123',
          to_type: 'document',
          to_id: 'doc_456',
          relationship_type: 'viewer',
        },
      ]);
      service = new ReBACService(mockAdapter);

      const result = await service.check({
        tenant_id: 'tenant_1',
        user_id: 'user_123',
        relation: 'viewer',
        object: 'document:doc_456',
        context: {
          contextual_tuples: [
            {
              user_id: 'user_123',
              relation: 'viewer',
              object: 'document:doc_456',
            },
          ],
        },
      });

      // Should return from contextual check
      expect(result.allowed).toBe(true);
      expect(result.resolved_via).toBe('context');

      // Database should not have been queried for relationships
      // (May have been queried for relation_definitions, but not for actual check)
    });
  });

  describe('Empty Contextual Tuples', () => {
    it('should skip contextual check when tuples array is empty', async () => {
      const result = await service.check({
        tenant_id: 'tenant_1',
        user_id: 'user_123',
        relation: 'viewer',
        object: 'document:doc_456',
        context: {
          contextual_tuples: [],
        },
      });

      // Falls through to DB check
      expect(result.allowed).toBe(false);
      expect(result.resolved_via).not.toBe('context');
    });

    it('should skip contextual check when context is undefined', async () => {
      const result = await service.check({
        tenant_id: 'tenant_1',
        user_id: 'user_123',
        relation: 'viewer',
        object: 'document:doc_456',
      });

      // Falls through to DB check
      expect(result.allowed).toBe(false);
      expect(result.resolved_via).not.toBe('context');
    });
  });

  describe('Edge Cases', () => {
    it('should handle tuple with special characters in IDs', async () => {
      const result = await service.check({
        tenant_id: 'tenant_1',
        user_id: 'user_123',
        relation: 'viewer',
        object: 'document:doc-with-dashes_and_underscores',
        context: {
          contextual_tuples: [
            {
              user_id: 'user_123',
              relation: 'viewer',
              object: 'document:doc-with-dashes_and_underscores',
            },
          ],
        },
      });

      expect(result.allowed).toBe(true);
      expect(result.resolved_via).toBe('context');
    });

    it('should handle various relation names', async () => {
      const relations = ['viewer', 'editor', 'owner', 'admin', 'can_read', 'parent'];

      for (const relation of relations) {
        const result = await service.check({
          tenant_id: 'tenant_1',
          user_id: 'user_123',
          relation: relation,
          object: 'document:doc_456',
          context: {
            contextual_tuples: [
              {
                user_id: 'user_123',
                relation: relation,
                object: 'document:doc_456',
              },
            ],
          },
        });

        expect(result.allowed).toBe(true);
        expect(result.resolved_via).toBe('context');
      }
    });

    it('should handle different object types', async () => {
      const objectTypes = ['document', 'folder', 'project', 'organization', 'team'];

      for (const objType of objectTypes) {
        const result = await service.check({
          tenant_id: 'tenant_1',
          user_id: 'user_123',
          relation: 'viewer',
          object: `${objType}:obj_123`,
          context: {
            contextual_tuples: [
              {
                user_id: 'user_123',
                relation: 'viewer',
                object: `${objType}:obj_123`,
              },
            ],
          },
        });

        expect(result.allowed).toBe(true);
        expect(result.resolved_via).toBe('context');
      }
    });
  });
});
