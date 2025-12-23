/**
 * Consent RBAC Utilities
 *
 * Phase 2-B: Consent Screen Enhancement
 * Utilities for retrieving RBAC information for consent screen display.
 *
 * These functions extend the base rbac-claims.ts with consent-specific logic:
 * - Organization membership validation
 * - Acting-as relationship validation
 * - Full consent screen data aggregation
 */
import type { D1Database } from '@cloudflare/workers-types';
import type {
  ConsentOrgInfo,
  ConsentActingAsInfo,
  ConsentUserInfo,
  ConsentFeatureFlags,
} from '../types/consent';
import type { RelationshipType, PermissionLevel } from '../types/rbac';
/**
 * Result of getConsentRBACData
 */
export interface ConsentRBACData {
  /** All organizations the user belongs to */
  organizations: ConsentOrgInfo[];
  /** User's primary organization (null if no membership) */
  primary_org: ConsentOrgInfo | null;
  /** User's role names (from all assignments) */
  roles: string[];
}
/**
 * Get comprehensive RBAC data for consent screen
 *
 * Fetches all organization memberships, primary org, and role assignments
 * for displaying on the consent screen.
 *
 * @param db - D1 database
 * @param subjectId - User ID
 * @returns Consent RBAC data
 */
export declare function getConsentRBACData(
  db: D1Database,
  subjectId: string
): Promise<ConsentRBACData>;
/**
 * Result of validateConsentOrgAccess
 */
export interface OrgAccessValidationResult {
  /** Whether access is valid */
  valid: boolean;
  /** Error message if invalid */
  error?: string;
  /** Organization info if valid */
  organization?: ConsentOrgInfo;
}
/**
 * Validate that a user has access to a specific organization
 *
 * Checks that:
 * 1. The organization exists and is active
 * 2. The user is a member of the organization
 *
 * @param db - D1 database
 * @param subjectId - User ID
 * @param orgId - Target organization ID
 * @returns Validation result
 */
export declare function validateConsentOrgAccess(
  db: D1Database,
  subjectId: string,
  orgId: string
): Promise<OrgAccessValidationResult>;
/**
 * Result of validateActingAsRelationship
 */
export interface ActingAsValidationResult {
  /** Whether the acting-as relationship is valid */
  valid: boolean;
  /** Error message if invalid */
  error?: string;
  /** Relationship type if valid */
  relationship_type?: RelationshipType;
  /** Permission level granted if valid */
  permission_level?: PermissionLevel;
}
/**
 * Validate that a user can act on behalf of another user
 *
 * Checks that:
 * 1. A valid relationship exists between the two users
 * 2. The relationship type allows acting-as (parent_child, guardian, delegate)
 * 3. The relationship has not expired
 *
 * @param db - D1 database
 * @param actorId - User who wants to act on behalf
 * @param targetId - User being acted on behalf of
 * @returns Validation result
 */
export declare function validateActingAsRelationship(
  db: D1Database,
  actorId: string,
  targetId: string
): Promise<ActingAsValidationResult>;
/**
 * Get information about the target user for acting-as display
 *
 * @param db - D1 database
 * @param actorId - User who is acting
 * @param targetId - User being acted on behalf of
 * @returns Acting-as info or null if relationship is invalid
 */
export declare function getActingAsUserInfo(
  db: D1Database,
  actorId: string,
  targetId: string,
  dbPII?: D1Database
): Promise<ConsentActingAsInfo | null>;
/**
 * Get user info for consent screen display
 * PII/Non-PII DB分離対応: Core DBとPII DBを分離
 *
 * @param db - D1 database (Core)
 * @param subjectId - User ID
 * @param dbPII - D1 database (PII) - optional
 * @returns User info or null if not found
 */
export declare function getConsentUserInfo(
  db: D1Database,
  subjectId: string,
  dbPII?: D1Database
): Promise<ConsentUserInfo | null>;
/**
 * Parse consent feature flags from environment variables
 *
 * @param orgSelectorEnabled - RBAC_CONSENT_ORG_SELECTOR env var
 * @param actingAsEnabled - RBAC_CONSENT_ACTING_AS env var
 * @param showRoles - RBAC_CONSENT_SHOW_ROLES env var
 * @returns Feature flags for consent screen
 */
export declare function parseConsentFeatureFlags(
  orgSelectorEnabled?: string,
  actingAsEnabled?: string,
  showRoles?: string
): ConsentFeatureFlags;
/**
 * Get user's roles within a specific organization
 *
 * Returns roles that are either:
 * 1. Global scope (apply to all orgs)
 * 2. Org-scoped with the target organization
 *
 * @param db - D1 database
 * @param subjectId - User ID
 * @param orgId - Target organization ID
 * @returns Array of role names
 */
export declare function getRolesInOrganization(
  db: D1Database,
  subjectId: string,
  orgId: string
): Promise<string[]>;
//# sourceMappingURL=consent-rbac.d.ts.map
