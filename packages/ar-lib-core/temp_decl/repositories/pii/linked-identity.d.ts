/**
 * Linked Identity Repository
 *
 * Repository for External IdP linking stored in D1_PII.
 *
 * Purpose:
 * - Account linking: Multiple IdPs per user (Google, Microsoft, SAML, etc.)
 * - Session management: Track last used IdP
 * - Attribute synchronization: Store IdP-provided claims
 *
 * Fields:
 * - id: Record ID (UUID)
 * - user_id: Reference to users_core.id (logical FK)
 * - provider_id: External IdP identifier
 * - provider_user_id: User ID from the external IdP
 * - provider_email: Email from external IdP
 * - provider_name: Name from external IdP
 * - raw_attributes: Raw attributes from IdP (JSON)
 * - linked_at: When the link was established
 * - last_used_at: Last authentication via this IdP
 */
import type { DatabaseAdapter } from '../../db/adapter';
import { BaseRepository, type BaseEntity } from '../base';
/**
 * Linked Identity entity
 */
export interface LinkedIdentity extends BaseEntity {
  user_id: string;
  provider_id: string;
  provider_user_id: string;
  provider_email: string | null;
  provider_name: string | null;
  raw_attributes: string | null;
  linked_at: number;
  last_used_at: number | null;
}
/**
 * Linked Identity create input
 */
export interface CreateLinkedIdentityInput {
  id?: string;
  user_id: string;
  provider_id: string;
  provider_user_id: string;
  provider_email?: string | null;
  provider_name?: string | null;
  raw_attributes?: Record<string, unknown> | null;
}
/**
 * Linked Identity update input
 */
export interface UpdateLinkedIdentityInput {
  provider_email?: string | null;
  provider_name?: string | null;
  raw_attributes?: Record<string, unknown> | null;
  last_used_at?: number | null;
}
/**
 * Linked Identity Repository
 */
export declare class LinkedIdentityRepository extends BaseRepository<LinkedIdentity> {
  constructor(adapter: DatabaseAdapter);
  /**
   * Create a new linked identity
   *
   * @param input - Linked identity data
   * @param adapter - Optional partition-specific adapter
   * @returns Created linked identity
   */
  createLinkedIdentity(
    input: CreateLinkedIdentityInput,
    adapter?: DatabaseAdapter
  ): Promise<LinkedIdentity>;
  /**
   * Find linked identity by provider and provider user ID
   *
   * Used for finding local user during IdP callback.
   *
   * @param providerId - External IdP identifier
   * @param providerUserId - User ID from external IdP
   * @param adapter - Optional partition-specific adapter
   * @returns Linked identity or null
   */
  findByProviderUser(
    providerId: string,
    providerUserId: string,
    adapter?: DatabaseAdapter
  ): Promise<LinkedIdentity | null>;
  /**
   * Find all linked identities for a user
   *
   * @param userId - User ID
   * @param adapter - Optional partition-specific adapter
   * @returns All linked identities for the user
   */
  findByUserId(userId: string, adapter?: DatabaseAdapter): Promise<LinkedIdentity[]>;
  /**
   * Find linked identity by user and provider
   *
   * @param userId - User ID
   * @param providerId - Provider ID
   * @param adapter - Optional partition-specific adapter
   * @returns Linked identity or null
   */
  findByUserAndProvider(
    userId: string,
    providerId: string,
    adapter?: DatabaseAdapter
  ): Promise<LinkedIdentity | null>;
  /**
   * Find linked identities by provider email
   *
   * Used for account matching during registration/linking.
   *
   * @param email - Provider email address
   * @param adapter - Optional partition-specific adapter
   * @returns Matching linked identities
   */
  findByProviderEmail(email: string, adapter?: DatabaseAdapter): Promise<LinkedIdentity[]>;
  /**
   * Update linked identity
   *
   * @param id - Linked identity ID
   * @param data - Fields to update
   * @param adapter - Optional partition-specific adapter
   * @returns Updated linked identity or null
   */
  updateLinkedIdentity(
    id: string,
    data: UpdateLinkedIdentityInput,
    adapter?: DatabaseAdapter
  ): Promise<LinkedIdentity | null>;
  /**
   * Update last used timestamp
   *
   * Called after successful authentication via IdP.
   *
   * @param id - Linked identity ID
   * @param adapter - Optional partition-specific adapter
   * @returns True if updated
   */
  updateLastUsed(id: string, adapter?: DatabaseAdapter): Promise<boolean>;
  /**
   * Delete linked identity
   *
   * @param id - Linked identity ID
   * @param adapter - Optional partition-specific adapter
   * @returns True if deleted
   */
  deleteLinkedIdentity(id: string, adapter?: DatabaseAdapter): Promise<boolean>;
  /**
   * Delete all linked identities for a user
   *
   * Used during GDPR user deletion.
   *
   * @param userId - User ID
   * @param adapter - Optional partition-specific adapter
   * @returns Number of deleted records
   */
  deleteByUserId(userId: string, adapter?: DatabaseAdapter): Promise<number>;
  /**
   * Unlink a provider from a user
   *
   * @param userId - User ID
   * @param providerId - Provider ID
   * @param adapter - Optional partition-specific adapter
   * @returns True if unlinked
   */
  unlink(userId: string, providerId: string, adapter?: DatabaseAdapter): Promise<boolean>;
  /**
   * Count linked identities per provider
   *
   * @param adapter - Optional partition-specific adapter
   * @returns Map of provider → count
   */
  getProviderStats(adapter?: DatabaseAdapter): Promise<Map<string, number>>;
  /**
   * Get parsed raw attributes
   *
   * @param linkedIdentity - Linked identity with raw_attributes
   * @returns Parsed attributes or null
   */
  getRawAttributes(linkedIdentity: LinkedIdentity): Record<string, unknown> | null;
}
//# sourceMappingURL=linked-identity.d.ts.map
