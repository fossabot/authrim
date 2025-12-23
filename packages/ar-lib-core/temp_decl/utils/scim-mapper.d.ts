/**
 * SCIM 2.0 Resource Mapping Utilities
 *
 * Maps between internal database models and SCIM resource formats
 */
import type { ScimUser, ScimGroup, UserToScimContext, GroupToScimContext } from '../types/scim';
/**
 * Internal User model (from database)
 */
export interface InternalUser {
  id: string;
  email: string;
  email_verified: number;
  name?: string | null;
  given_name?: string | null;
  family_name?: string | null;
  middle_name?: string | null;
  nickname?: string | null;
  preferred_username?: string | null;
  profile?: string | null;
  picture?: string | null;
  website?: string | null;
  gender?: string | null;
  birthdate?: string | null;
  zoneinfo?: string | null;
  locale?: string | null;
  phone_number?: string | null;
  phone_number_verified?: number;
  address_json?: string | null;
  updated_at: string;
  created_at: string;
  custom_attributes_json?: string | null;
  password_hash?: string | null;
  external_id?: string | null;
  active?: number;
}
/**
 * Internal Group/Role model (from database)
 */
export interface InternalGroup {
  id: string;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at?: string;
  external_id?: string | null;
}
/**
 * Convert internal user to SCIM User resource
 */
export declare function userToScim(user: InternalUser, context: UserToScimContext): ScimUser;
/**
 * Convert SCIM User to internal user model
 */
export declare function scimToUser(scimUser: Partial<ScimUser>): Partial<InternalUser>;
/**
 * Convert internal group/role to SCIM Group resource
 */
export declare function groupToScim(
  group: InternalGroup,
  context: GroupToScimContext,
  members?: Array<{
    user_id: string;
    email: string;
  }>
): ScimGroup;
/**
 * Convert SCIM Group to internal group model
 */
export declare function scimToGroup(scimGroup: Partial<ScimGroup>): Partial<InternalGroup>;
/**
 * Generate ETag for versioning
 */
export declare function generateEtag(resource: any): string;
/**
 * Parse ETag from If-Match header
 */
export declare function parseEtag(etag: string): string;
/**
 * Apply SCIM Patch operations to a resource
 */
export declare function applyPatchOperations(
  resource: any,
  operations: Array<{
    op: 'add' | 'remove' | 'replace';
    path?: string;
    value?: any;
  }>
): any;
/**
 * Validate required SCIM User fields
 */
export declare function validateScimUser(user: Partial<ScimUser>): {
  valid: boolean;
  errors: string[];
};
/**
 * Validate required SCIM Group fields
 */
export declare function validateScimGroup(group: Partial<ScimGroup>): {
  valid: boolean;
  errors: string[];
};
//# sourceMappingURL=scim-mapper.d.ts.map
