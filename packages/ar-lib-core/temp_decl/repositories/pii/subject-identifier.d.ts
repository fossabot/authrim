/**
 * Subject Identifier Repository
 *
 * Repository for OIDC Pairwise Subject Identifiers stored in D1_PII.
 *
 * Purpose:
 * - Privacy protection: Generates different `sub` claim per client/sector
 * - OIDC compliance: RFC 8693 pairwise identifier support
 * - Prevents client-side user correlation
 *
 * Fields:
 * - id: Record ID (UUID)
 * - user_id: Reference to users_core.id (logical FK)
 * - client_id: Client that requested this subject
 * - sector_identifier: Domain for pairwise calculation
 * - subject: The pairwise subject value
 * - created_at: Creation timestamp
 */
import type { DatabaseAdapter } from '../../db/adapter';
import { BaseRepository, type BaseEntity } from '../base';
/**
 * Subject Identifier entity
 */
export interface SubjectIdentifier extends BaseEntity {
  user_id: string;
  client_id: string;
  sector_identifier: string;
  subject: string;
}
/**
 * Subject Identifier create input
 */
export interface CreateSubjectIdentifierInput {
  id?: string;
  user_id: string;
  client_id: string;
  sector_identifier: string;
  subject: string;
}
/**
 * Subject Identifier Repository
 */
export declare class SubjectIdentifierRepository extends BaseRepository<SubjectIdentifier> {
  constructor(adapter: DatabaseAdapter);
  /**
   * Create a new subject identifier
   *
   * @param input - Subject identifier data
   * @param adapter - Optional partition-specific adapter
   * @returns Created subject identifier
   */
  createSubjectIdentifier(
    input: CreateSubjectIdentifierInput,
    adapter?: DatabaseAdapter
  ): Promise<SubjectIdentifier>;
  /**
   * Find subject identifier by user and sector
   *
   * Returns the pairwise subject for a user in a specific sector.
   *
   * @param userId - User ID
   * @param sectorIdentifier - Sector identifier (domain)
   * @param adapter - Optional partition-specific adapter
   * @returns Subject identifier or null
   */
  findByUserAndSector(
    userId: string,
    sectorIdentifier: string,
    adapter?: DatabaseAdapter
  ): Promise<SubjectIdentifier | null>;
  /**
   * Find subject identifier by subject value
   *
   * Reverse lookup: find user by their pairwise subject.
   *
   * @param subject - Pairwise subject value
   * @param adapter - Optional partition-specific adapter
   * @returns Subject identifier or null
   */
  findBySubject(subject: string, adapter?: DatabaseAdapter): Promise<SubjectIdentifier | null>;
  /**
   * Find all subject identifiers for a user
   *
   * @param userId - User ID
   * @param adapter - Optional partition-specific adapter
   * @returns All subject identifiers for the user
   */
  findByUserId(userId: string, adapter?: DatabaseAdapter): Promise<SubjectIdentifier[]>;
  /**
   * Find all subject identifiers for a client
   *
   * @param clientId - Client ID
   * @param adapter - Optional partition-specific adapter
   * @returns All subject identifiers for the client
   */
  findByClientId(clientId: string, adapter?: DatabaseAdapter): Promise<SubjectIdentifier[]>;
  /**
   * Get or create subject identifier
   *
   * Returns existing identifier if found, creates new one if not.
   * Handles race conditions where concurrent requests may try to create
   * the same identifier simultaneously.
   *
   * @param userId - User ID
   * @param clientId - Client ID
   * @param sectorIdentifier - Sector identifier
   * @param generateSubject - Function to generate pairwise subject
   * @param adapter - Optional partition-specific adapter
   * @returns Existing or newly created subject identifier
   */
  getOrCreate(
    userId: string,
    clientId: string,
    sectorIdentifier: string,
    generateSubject: () => string,
    adapter?: DatabaseAdapter
  ): Promise<SubjectIdentifier>;
  /**
   * Delete all subject identifiers for a user
   *
   * Used during GDPR user deletion.
   *
   * @param userId - User ID
   * @param adapter - Optional partition-specific adapter
   * @returns Number of deleted records
   */
  deleteByUserId(userId: string, adapter?: DatabaseAdapter): Promise<number>;
  /**
   * Delete all subject identifiers for a client
   *
   * Used during client deletion.
   *
   * @param clientId - Client ID
   * @param adapter - Optional partition-specific adapter
   * @returns Number of deleted records
   */
  deleteByClientId(clientId: string, adapter?: DatabaseAdapter): Promise<number>;
}
//# sourceMappingURL=subject-identifier.d.ts.map
