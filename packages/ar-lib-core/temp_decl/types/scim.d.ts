/**
 * SCIM 2.0 Type Definitions
 *
 * Implements RFC 7643 (SCIM Core Schema) and RFC 7644 (SCIM Protocol)
 *
 * @see https://datatracker.ietf.org/doc/html/rfc7643
 * @see https://datatracker.ietf.org/doc/html/rfc7644
 */
/**
 * SCIM Schema URNs
 */
export declare const SCIM_SCHEMAS: {
  readonly USER: 'urn:ietf:params:scim:schemas:core:2.0:User';
  readonly GROUP: 'urn:ietf:params:scim:schemas:core:2.0:Group';
  readonly ENTERPRISE_USER: 'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User';
  readonly LIST_RESPONSE: 'urn:ietf:params:scim:api:messages:2.0:ListResponse';
  readonly ERROR: 'urn:ietf:params:scim:api:messages:2.0:Error';
  readonly PATCH_OP: 'urn:ietf:params:scim:api:messages:2.0:PatchOp';
  readonly RESOURCE_TYPE: 'urn:ietf:params:scim:schemas:core:2.0:ResourceType';
  readonly SCHEMA: 'urn:ietf:params:scim:schemas:core:2.0:Schema';
  readonly SERVICE_PROVIDER_CONFIG: 'urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig';
};
/**
 * SCIM Resource Meta Information
 */
export interface ScimMeta {
  resourceType: 'User' | 'Group';
  created: string;
  lastModified: string;
  location: string;
  version?: string;
}
/**
 * SCIM Name Structure
 */
export interface ScimName {
  formatted?: string;
  familyName?: string;
  givenName?: string;
  middleName?: string;
  honorificPrefix?: string;
  honorificSuffix?: string;
}
/**
 * SCIM Email Address
 */
export interface ScimEmail {
  value: string;
  type?: string;
  primary?: boolean;
  display?: string;
}
/**
 * SCIM Phone Number
 */
export interface ScimPhoneNumber {
  value: string;
  type?: string;
  primary?: boolean;
}
/**
 * SCIM Address
 */
export interface ScimAddress {
  formatted?: string;
  streetAddress?: string;
  locality?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  type?: string;
  primary?: boolean;
}
/**
 * SCIM Group Member Reference
 */
export interface ScimGroupMember {
  value: string;
  $ref?: string;
  type?: 'User' | 'Group';
  display?: string;
}
/**
 * SCIM User Resource (RFC 7643 Section 4.1)
 */
export interface ScimUser {
  schemas: string[];
  id: string;
  externalId?: string;
  userName: string;
  name?: ScimName;
  displayName?: string;
  nickName?: string;
  profileUrl?: string;
  title?: string;
  userType?: string;
  preferredLanguage?: string;
  locale?: string;
  timezone?: string;
  active?: boolean;
  password?: string;
  emails?: ScimEmail[];
  phoneNumbers?: ScimPhoneNumber[];
  addresses?: ScimAddress[];
  groups?: Array<{
    value: string;
    $ref?: string;
    display?: string;
    type?: string;
  }>;
  meta: ScimMeta;
  'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User'?: {
    employeeNumber?: string;
    costCenter?: string;
    organization?: string;
    division?: string;
    department?: string;
    manager?: {
      value?: string;
      $ref?: string;
      displayName?: string;
    };
  };
}
/**
 * SCIM Group Resource (RFC 7643 Section 4.2)
 */
export interface ScimGroup {
  schemas: string[];
  id: string;
  externalId?: string;
  displayName: string;
  members?: ScimGroupMember[];
  meta: ScimMeta;
}
/**
 * SCIM List Response (RFC 7644 Section 3.4.2)
 */
export interface ScimListResponse<T = ScimUser | ScimGroup> {
  schemas: string[];
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
  Resources: T[];
}
/**
 * SCIM Error Response (RFC 7644 Section 3.12)
 */
export interface ScimError {
  schemas: string[];
  status: string | number;
  scimType?: ScimErrorType;
  detail?: string;
}
/**
 * SCIM Error Types
 */
export type ScimErrorType =
  | 'invalidFilter'
  | 'tooMany'
  | 'uniqueness'
  | 'mutability'
  | 'invalidSyntax'
  | 'invalidPath'
  | 'noTarget'
  | 'invalidValue'
  | 'invalidVers'
  | 'sensitive';
/**
 * SCIM Patch Operation (RFC 7644 Section 3.5.2)
 */
export interface ScimPatchOp {
  schemas: string[];
  Operations: Array<{
    op: 'add' | 'remove' | 'replace';
    path?: string;
    value?: any;
  }>;
}
/**
 * SCIM Filter Operators
 */
export type ScimFilterOperator =
  | 'eq'
  | 'ne'
  | 'co'
  | 'sw'
  | 'ew'
  | 'pr'
  | 'gt'
  | 'ge'
  | 'lt'
  | 'le';
/**
 * SCIM Filter AST Node
 */
export interface ScimFilterNode {
  type: 'comparison' | 'logical' | 'grouping' | 'valuePath';
  operator?: ScimFilterOperator | 'and' | 'or' | 'not';
  attribute?: string;
  value?: any;
  left?: ScimFilterNode;
  right?: ScimFilterNode;
  expression?: ScimFilterNode;
}
/**
 * SCIM Resource Type Definition
 */
export interface ScimResourceType {
  schemas: string[];
  id: string;
  name: string;
  endpoint: string;
  description?: string;
  schema: string;
  schemaExtensions?: Array<{
    schema: string;
    required: boolean;
  }>;
  meta: {
    location: string;
    resourceType: 'ResourceType';
  };
}
/**
 * SCIM Schema Definition
 */
export interface ScimSchemaDefinition {
  id: string;
  name: string;
  description?: string;
  attributes: ScimAttributeDefinition[];
  meta: {
    resourceType: 'Schema';
    location: string;
  };
}
/**
 * SCIM Attribute Definition
 */
export interface ScimAttributeDefinition {
  name: string;
  type: 'string' | 'boolean' | 'decimal' | 'integer' | 'dateTime' | 'reference' | 'complex';
  multiValued: boolean;
  description?: string;
  required: boolean;
  caseExact?: boolean;
  mutability?: 'readOnly' | 'readWrite' | 'immutable' | 'writeOnly';
  returned?: 'always' | 'never' | 'default' | 'request';
  uniqueness?: 'none' | 'server' | 'global';
  subAttributes?: ScimAttributeDefinition[];
  referenceTypes?: string[];
}
/**
 * SCIM Service Provider Configuration
 */
export interface ScimServiceProviderConfig {
  schemas: string[];
  documentationUri?: string;
  patch: {
    supported: boolean;
  };
  bulk?: {
    supported: boolean;
    maxOperations?: number;
    maxPayloadSize?: number;
  };
  filter: {
    supported: boolean;
    maxResults?: number;
  };
  changePassword?: {
    supported: boolean;
  };
  sort?: {
    supported: boolean;
  };
  etag?: {
    supported: boolean;
  };
  authenticationSchemes: Array<{
    type: string;
    name: string;
    description: string;
    specUri?: string;
    documentationUri?: string;
    primary?: boolean;
  }>;
  meta: {
    location: string;
    resourceType: 'ServiceProviderConfig';
  };
}
/**
 * SCIM Query Parameters
 */
export interface ScimQueryParams {
  filter?: string;
  sortBy?: string;
  sortOrder?: 'ascending' | 'descending';
  startIndex?: number;
  count?: number;
  attributes?: string[];
  excludedAttributes?: string[];
}
/**
 * Internal User to SCIM User Mapping Context
 */
export interface UserToScimContext {
  baseUrl: string;
  includeGroups?: boolean;
}
/**
 * Internal Group to SCIM Group Mapping Context
 */
export interface GroupToScimContext {
  baseUrl: string;
  includeMembers?: boolean;
}
//# sourceMappingURL=scim.d.ts.map
