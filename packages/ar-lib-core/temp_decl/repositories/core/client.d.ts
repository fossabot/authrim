/**
 * Client Repository
 *
 * Repository for OAuth 2.0 client data stored in D1_CORE.
 * Contains all client configuration and metadata.
 *
 * Note: Does not extend BaseRepository because oauth_clients table
 * uses client_id as primary key instead of id.
 *
 * OAuth 2.0 / OIDC client fields:
 * - client_id, client_secret: Client credentials
 * - client_name, logo_uri, etc.: Client metadata
 * - redirect_uris, grant_types, response_types: OAuth configuration
 * - token_endpoint_auth_method: Authentication method
 * - Token Exchange settings (RFC 8693)
 * - Client Credentials settings (RFC 6749 Section 4.4)
 * - CIBA settings (OpenID Connect CIBA)
 */
import type { DatabaseAdapter } from '../../db/adapter';
import { type PaginationOptions, type PaginationResult } from '../base';
/**
 * Token endpoint authentication methods
 */
export type TokenEndpointAuthMethod =
  | 'none'
  | 'client_secret_basic'
  | 'client_secret_post'
  | 'client_secret_jwt'
  | 'private_key_jwt';
/**
 * Subject type for OIDC
 */
export type SubjectType = 'public' | 'pairwise';
/**
 * Token exchange delegation mode
 */
export type DelegationMode = 'none' | 'delegation' | 'impersonation';
/**
 * CIBA token delivery mode
 */
export type CIBADeliveryMode = 'poll' | 'ping' | 'push';
/**
 * OAuth Client entity
 */
export interface OAuthClient {
  /** Client ID (primary key) */
  client_id: string;
  client_secret: string | null;
  client_name: string;
  tenant_id: string;
  redirect_uris: string;
  grant_types: string;
  response_types: string;
  scope: string | null;
  logo_uri: string | null;
  client_uri: string | null;
  policy_uri: string | null;
  tos_uri: string | null;
  contacts: string | null;
  post_logout_redirect_uris: string | null;
  subject_type: SubjectType;
  sector_identifier_uri: string | null;
  token_endpoint_auth_method: TokenEndpointAuthMethod;
  jwks: string | null;
  jwks_uri: string | null;
  is_trusted: boolean;
  skip_consent: boolean;
  allow_claims_without_scope: boolean;
  token_exchange_allowed: boolean;
  allowed_subject_token_clients: string | null;
  allowed_token_exchange_resources: string | null;
  delegation_mode: DelegationMode;
  client_credentials_allowed: boolean;
  allowed_scopes: string | null;
  default_scope: string | null;
  default_audience: string | null;
  backchannel_token_delivery_mode: CIBADeliveryMode | null;
  backchannel_client_notification_endpoint: string | null;
  backchannel_authentication_request_signing_alg: string | null;
  backchannel_user_code_parameter: boolean;
  userinfo_signed_response_alg: string | null;
  created_at: number;
  updated_at: number;
}
/**
 * Client create input
 */
export interface CreateClientInput {
  client_id?: string;
  client_secret?: string | null;
  client_name: string;
  tenant_id?: string;
  redirect_uris: string[];
  grant_types?: string[];
  response_types?: string[];
  scope?: string | null;
  logo_uri?: string | null;
  client_uri?: string | null;
  policy_uri?: string | null;
  tos_uri?: string | null;
  contacts?: string[] | null;
  post_logout_redirect_uris?: string[] | null;
  subject_type?: SubjectType;
  sector_identifier_uri?: string | null;
  token_endpoint_auth_method?: TokenEndpointAuthMethod;
  jwks?: Record<string, unknown> | null;
  jwks_uri?: string | null;
  is_trusted?: boolean;
  skip_consent?: boolean;
  allow_claims_without_scope?: boolean;
  token_exchange_allowed?: boolean;
  allowed_subject_token_clients?: string[] | null;
  allowed_token_exchange_resources?: string[] | null;
  delegation_mode?: DelegationMode;
  client_credentials_allowed?: boolean;
  allowed_scopes?: string[] | null;
  default_scope?: string | null;
  default_audience?: string | null;
  backchannel_token_delivery_mode?: CIBADeliveryMode | null;
  backchannel_client_notification_endpoint?: string | null;
  backchannel_authentication_request_signing_alg?: string | null;
  backchannel_user_code_parameter?: boolean;
  userinfo_signed_response_alg?: string | null;
}
/**
 * Client update input
 */
export interface UpdateClientInput {
  client_name?: string;
  client_secret?: string | null;
  redirect_uris?: string[];
  grant_types?: string[];
  response_types?: string[];
  scope?: string | null;
  logo_uri?: string | null;
  client_uri?: string | null;
  policy_uri?: string | null;
  tos_uri?: string | null;
  contacts?: string[] | null;
  post_logout_redirect_uris?: string[] | null;
  subject_type?: SubjectType;
  sector_identifier_uri?: string | null;
  token_endpoint_auth_method?: TokenEndpointAuthMethod;
  jwks?: Record<string, unknown> | null;
  jwks_uri?: string | null;
  is_trusted?: boolean;
  skip_consent?: boolean;
  allow_claims_without_scope?: boolean;
  token_exchange_allowed?: boolean;
  allowed_subject_token_clients?: string[] | null;
  allowed_token_exchange_resources?: string[] | null;
  delegation_mode?: DelegationMode;
  client_credentials_allowed?: boolean;
  allowed_scopes?: string[] | null;
  default_scope?: string | null;
  default_audience?: string | null;
  backchannel_token_delivery_mode?: CIBADeliveryMode | null;
  backchannel_client_notification_endpoint?: string | null;
  backchannel_authentication_request_signing_alg?: string | null;
  backchannel_user_code_parameter?: boolean;
  userinfo_signed_response_alg?: string | null;
}
/**
 * Client filter options
 */
export interface ClientFilterOptions {
  tenant_id?: string;
  client_name?: string;
  is_trusted?: boolean;
  token_exchange_allowed?: boolean;
  client_credentials_allowed?: boolean;
}
/**
 * Client search options (for LIKE queries)
 */
export interface ClientSearchOptions extends PaginationOptions {
  search?: string;
}
/**
 * OAuth Client Repository
 */
export declare class ClientRepository {
  protected readonly adapter: DatabaseAdapter;
  constructor(adapter: DatabaseAdapter);
  /**
   * Create a new client
   */
  create(input: CreateClientInput): Promise<OAuthClient>;
  /**
   * Find client by client_id
   */
  findByClientId(clientId: string): Promise<OAuthClient | null>;
  /**
   * Update a client
   */
  update(clientId: string, input: UpdateClientInput): Promise<OAuthClient | null>;
  /**
   * Delete a client
   */
  delete(clientId: string): Promise<boolean>;
  /**
   * Allowed sort fields for client queries (prevents SQL injection)
   */
  private static readonly ALLOWED_SORT_FIELDS;
  /**
   * Escape LIKE wildcards to prevent unintended pattern matching
   */
  private escapeLikePattern;
  /**
   * Validate and sanitize sort field to prevent SQL injection
   */
  private validateSortField;
  /**
   * Validate sort order to prevent SQL injection
   */
  private validateSortOrder;
  /** Maximum allowed limit per page */
  private static readonly MAX_LIMIT;
  /** Minimum allowed limit per page */
  private static readonly MIN_LIMIT;
  /**
   * Validate and normalize pagination parameters
   * @param page - Page number (must be >= 1)
   * @param limit - Items per page (must be 1-100)
   * @returns Validated and normalized values
   */
  private validatePagination;
  /**
   * List clients with pagination and search
   */
  listByTenant(
    tenantId: string,
    options?: ClientSearchOptions
  ): Promise<PaginationResult<OAuthClient>>;
  /**
   * Count clients by tenant
   */
  countByTenant(tenantId: string): Promise<number>;
  /**
   * Check if client exists
   */
  exists(clientId: string): Promise<boolean>;
  /**
   * Bulk delete clients
   */
  bulkDelete(clientIds: string[]): Promise<{
    deleted: number;
    failed: string[];
  }>;
  /**
   * Map database row to entity (handle boolean conversions)
   */
  private mapFromDb;
}
//# sourceMappingURL=client.d.ts.map
