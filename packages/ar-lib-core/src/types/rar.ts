/**
 * Rich Authorization Requests (RAR) Types
 *
 * RFC 9396: OAuth 2.0 Rich Authorization Requests
 * https://datatracker.ietf.org/doc/html/rfc9396
 *
 * RAR allows clients to convey fine-grained authorization requirements
 * using the `authorization_details` parameter, which is a JSON array
 * of authorization detail objects.
 *
 * Authrim implements RAR in phases:
 * - Phase 1: opaque JSON passthrough with type-based validation
 * - Phase 2: type interpretation + consent UI + Plugin integration
 * - Phase 3: ABAC integration + AI capability contracts
 *
 * @see §16.8 in architecture-decisions.md for RAR design rationale
 */

// =============================================================================
// Base Types (RFC 9396)
// =============================================================================

/**
 * Base authorization detail object (RFC 9396 §2)
 *
 * Every authorization_details entry MUST have a `type` field.
 * Other fields are type-specific.
 */
export interface AuthorizationDetailsBase {
  /**
   * REQUIRED: Type of authorization
   *
   * This is a unique identifier for the authorization detail type.
   * Well-known types include:
   * - 'payment_initiation' (banking)
   * - 'account_information' (banking)
   * - 'ai_agent_action' (Authrim-specific)
   */
  type: string;

  /**
   * OPTIONAL: Array of URIs indicating a specific resource
   *
   * The locations can be absolute URIs or paths relative to the
   * resource server.
   */
  locations?: string[];

  /**
   * OPTIONAL: Array of strings representing the types of actions
   *
   * Common values: 'read', 'write', 'delete', 'execute'
   */
  actions?: string[];

  /**
   * OPTIONAL: Array of strings representing the types of data
   *
   * E.g., 'account_balance', 'transaction_history'
   */
  datatypes?: string[];

  /**
   * OPTIONAL: Specific identifier for the authorization
   *
   * E.g., account ID, resource ID
   */
  identifier?: string;

  /**
   * OPTIONAL: Array of strings representing privileges
   *
   * E.g., 'admin', 'owner', 'viewer'
   */
  privileges?: string[];

  /**
   * Additional type-specific properties
   *
   * Allows extension while maintaining type safety
   */
  [key: string]: unknown;
}

// =============================================================================
// AI Agent Action Type (Authrim-specific)
// =============================================================================

/**
 * AI Agent Action authorization detail
 *
 * Authrim-specific type for AI agent capability authorization.
 * Used for:
 * - Granting specific capabilities to AI agents
 * - Limiting tool/action access
 * - Session context preservation
 */
export interface AIAgentActionDetail extends AuthorizationDetailsBase {
  type: 'ai_agent_action';

  /**
   * REQUIRED: Agent identifier
   *
   * Unique identifier for the AI agent requesting authorization.
   * This should be registered with the authorization server.
   */
  agent_id: string;

  /**
   * REQUIRED: Capabilities requested
   *
   * Array of capability identifiers the agent is requesting.
   * Examples: 'read_profile', 'issue_token', 'execute_tool'
   */
  capabilities: string[];

  /**
   * OPTIONAL: Session context for delegation chains
   *
   * Allows linking to parent sessions or conversations
   * for audit trail and delegation tracking.
   */
  session_context?: {
    /** Parent session ID (for Token Exchange chains) */
    parent_session_id?: string;
    /** Conversation/thread ID (for audit) */
    conversation_id?: string;
  };

  /**
   * OPTIONAL: Tool restrictions
   *
   * Fine-grained control over which tools the agent can invoke.
   */
  tools?: {
    /** Allowed tool identifiers (whitelist) */
    allowed?: string[];
    /** Denied tool identifiers (blacklist, takes precedence) */
    denied?: string[];
  };

  /**
   * OPTIONAL: Expiration timestamp (ISO 8601)
   *
   * Hard expiration for this capability grant.
   * Token TTL should not exceed this.
   */
  expires_at?: string;

  /**
   * OPTIONAL: Scope restrictions
   *
   * Additional scope constraints for this specific grant.
   */
  scope_restrictions?: string[];
}

// =============================================================================
// Payment Initiation Type (RFC 9396 Example)
// =============================================================================

/**
 * Payment Initiation authorization detail (RFC 9396 §3)
 *
 * Standard type from RFC 9396 examples, commonly used in
 * PSD2/Open Banking implementations.
 */
export interface PaymentInitiationDetail extends AuthorizationDetailsBase {
  type: 'payment_initiation';

  /**
   * REQUIRED: Instructed amount
   */
  instructedAmount: {
    /** ISO 4217 currency code */
    currency: string;
    /** Amount as string (for precision) */
    amount: string;
  };

  /**
   * REQUIRED: Creditor account
   */
  creditorAccount: {
    /** IBAN if available */
    iban?: string;
    /** BBAN if IBAN not available */
    bban?: string;
  };

  /**
   * OPTIONAL: Creditor name */
  creditorName?: string;

  /**
   * OPTIONAL: Remittance information (unstructured) */
  remittanceInformationUnstructured?: string;
}

// =============================================================================
// Account Information Type (RFC 9396 Example)
// =============================================================================

/**
 * Account Information authorization detail (RFC 9396 §3)
 *
 * Standard type for requesting access to account information.
 */
export interface AccountInformationDetail extends AuthorizationDetailsBase {
  type: 'account_information';

  /**
   * Actions (read, write) */
  actions: ('read' | 'write')[];

  /**
   * Account data types to access */
  datatypes?: (
    | 'accounts'
    | 'balances'
    | 'transactions'
    | 'beneficiaries'
    | 'direct-debits'
    | 'standing-orders'
  )[];
}

// =============================================================================
// Union Type
// =============================================================================

/**
 * Known authorization detail types
 *
 * Union of all well-known types for type-safe handling.
 * Unknown types are handled as AuthorizationDetailsBase.
 */
export type KnownAuthorizationDetails =
  | AIAgentActionDetail
  | PaymentInitiationDetail
  | AccountInformationDetail;

/**
 * Authorization Details
 *
 * Can be a known type or base type (for unknown/custom types).
 */
export type AuthorizationDetails = KnownAuthorizationDetails | AuthorizationDetailsBase;

// =============================================================================
// Validation Types
// =============================================================================

/**
 * Validation error for a single authorization detail
 */
export interface RARValidationError {
  /** Index in the authorization_details array */
  index: number;
  /** Type of the detail (if parseable) */
  type?: string;
  /** Error code */
  code: RARErrorCode;
  /** Human-readable error message */
  message: string;
  /** Field path if applicable (e.g., 'agent_id') */
  field?: string;
}

/**
 * RAR validation error codes
 */
export type RARErrorCode =
  | 'missing_type' // type field is required
  | 'invalid_type' // type is not a string
  | 'invalid_json' // not valid JSON
  | 'not_array' // authorization_details must be array
  | 'empty_array' // array must not be empty
  | 'size_exceeded' // exceeds max size
  | 'type_not_allowed' // type is not in allowed list
  | 'missing_required_field' // required field missing
  | 'invalid_field_type' // field has wrong type
  | 'invalid_field_value' // field has invalid value
  | 'validation_error'; // general validation error

/**
 * RAR validation result
 */
export interface RARValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Validation errors */
  errors: RARValidationError[];
  /** Validation warnings (non-fatal) */
  warnings?: RARValidationError[];
  /** Sanitized authorization_details for storage (only if valid) */
  sanitized?: AuthorizationDetails[];
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard for AIAgentActionDetail
 */
export function isAIAgentActionDetail(detail: unknown): detail is AIAgentActionDetail {
  if (!detail || typeof detail !== 'object') return false;
  const d = detail as Record<string, unknown>;
  return (
    d.type === 'ai_agent_action' && typeof d.agent_id === 'string' && Array.isArray(d.capabilities)
  );
}

/**
 * Type guard for PaymentInitiationDetail
 */
export function isPaymentInitiationDetail(detail: unknown): detail is PaymentInitiationDetail {
  if (!detail || typeof detail !== 'object') return false;
  const d = detail as Record<string, unknown>;
  return (
    d.type === 'payment_initiation' &&
    typeof d.instructedAmount === 'object' &&
    typeof d.creditorAccount === 'object'
  );
}

/**
 * Type guard for AccountInformationDetail
 */
export function isAccountInformationDetail(detail: unknown): detail is AccountInformationDetail {
  if (!detail || typeof detail !== 'object') return false;
  const d = detail as Record<string, unknown>;
  return d.type === 'account_information' && Array.isArray(d.actions);
}

/**
 * Type guard for any valid AuthorizationDetailsBase
 */
export function isAuthorizationDetailsBase(detail: unknown): detail is AuthorizationDetailsBase {
  if (!detail || typeof detail !== 'object') return false;
  const d = detail as Record<string, unknown>;
  return typeof d.type === 'string' && d.type.length > 0;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Well-known authorization detail types
 */
export const KNOWN_RAR_TYPES = [
  'ai_agent_action',
  'payment_initiation',
  'account_information',
] as const;

/**
 * Default maximum size for authorization_details JSON (16KB)
 */
export const DEFAULT_RAR_MAX_SIZE = 16384;

/**
 * Default maximum number of entries in authorization_details array
 */
export const DEFAULT_RAR_MAX_ENTRIES = 10;
