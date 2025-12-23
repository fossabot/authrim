/**
 * Relationship Store Implementation
 *
 * Manages subject-subject (and future org-org) relationships in D1.
 * Part of RBAC Phase 1 implementation.
 *
 * Phase 1 focuses on subject-subject relationships (parent_child, guardian, delegate, manager).
 * The from_type/to_type fields are prepared for future org-org relationships (reseller_of).
 */
import type { IStorageAdapter } from '../interfaces';
import type { Relationship, IRelationshipStore } from '../interfaces';
/**
 * RelationshipStore implementation (D1-based)
 */
export declare class RelationshipStore implements IRelationshipStore {
  private adapter;
  constructor(adapter: IStorageAdapter);
  getRelationship(relationshipId: string): Promise<Relationship | null>;
  createRelationship(
    relationship: Omit<Relationship, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Relationship>;
  updateRelationship(relationshipId: string, updates: Partial<Relationship>): Promise<Relationship>;
  deleteRelationship(relationshipId: string): Promise<void>;
  listRelationshipsFrom(
    fromType: string,
    fromId: string,
    options?: {
      relationshipType?: string;
      includeExpired?: boolean;
    }
  ): Promise<Relationship[]>;
  listRelationshipsTo(
    toType: string,
    toId: string,
    options?: {
      relationshipType?: string;
      includeExpired?: boolean;
    }
  ): Promise<Relationship[]>;
  findRelationship(
    fromType: string,
    fromId: string,
    toType: string,
    toId: string,
    relationshipType: string
  ): Promise<Relationship | null>;
  getParentSubjects(childSubjectId: string): Promise<Relationship[]>;
  getChildSubjects(parentSubjectId: string): Promise<Relationship[]>;
}
//# sourceMappingURL=relationship-store.d.ts.map
