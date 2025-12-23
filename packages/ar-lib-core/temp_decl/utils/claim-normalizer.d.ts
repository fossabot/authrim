/**
 * IdP Claim Normalizer
 *
 * Normalizes claims from different IdPs into consistent types
 * for rule evaluation.
 *
 * Handles:
 * - Single value vs array conversion
 * - Type coercion (number/string)
 * - Null/undefined handling
 * - Nested object access via dot notation
 */
import type { ConditionOperator } from '../types/policy-rules';
/**
 * Normalized claim value types
 * All claim values are normalized to one of these types
 */
export type NormalizedClaimValue =
  | {
      type: 'string';
      value: string;
    }
  | {
      type: 'number';
      value: number;
    }
  | {
      type: 'boolean';
      value: boolean;
    }
  | {
      type: 'array';
      value: string[];
    }
  | {
      type: 'null';
    };
/**
 * Get nested value from object using dot notation
 *
 * @param obj - Source object
 * @param path - Dot-separated path (e.g., "address.country", "groups")
 * @returns Value at path or undefined
 *
 * @example
 * getNestedValue({ address: { country: "US" } }, "address.country") // "US"
 * getNestedValue({ groups: ["admin"] }, "groups") // ["admin"]
 */
export declare function getNestedValue(obj: unknown, path: string): unknown;
/**
 * Normalize a claim value to a consistent type
 *
 * Normalization rules:
 * - null/undefined → { type: 'null' }
 * - string → { type: 'string', value: string }
 * - number → { type: 'number', value: number }
 * - boolean → { type: 'boolean', value: boolean }
 * - array of strings → { type: 'array', value: string[] }
 * - array of mixed → { type: 'array', value: string[] } (stringified)
 * - object → { type: 'string', value: JSON.stringify }
 *
 * @param value - Raw claim value
 * @returns Normalized value
 */
export declare function normalizeClaimValue(value: unknown): NormalizedClaimValue;
/**
 * Compare normalized values using specified operator
 *
 * @param actual - Normalized actual value
 * @param operator - Comparison operator
 * @param expected - Expected value from rule condition
 * @returns True if comparison matches
 */
export declare function compareNormalized(
  actual: NormalizedClaimValue,
  operator: ConditionOperator,
  expected: string | string[] | boolean | number
): boolean;
/**
 * Extract and normalize claim from IdP claims object
 *
 * @param claims - Raw IdP claims object
 * @param path - Dot-separated path to claim
 * @returns Normalized claim value
 */
export declare function extractAndNormalizeClaim(
  claims: Record<string, unknown>,
  path: string
): NormalizedClaimValue;
/**
 * Compare claim value against expected value
 * Convenience function combining extraction and comparison
 *
 * @param claims - Raw IdP claims object
 * @param path - Dot-separated path to claim
 * @param operator - Comparison operator
 * @param expected - Expected value
 * @returns True if comparison matches
 */
export declare function compareClaimValue(
  claims: Record<string, unknown>,
  path: string,
  operator: ConditionOperator,
  expected: string | string[] | boolean | number
): boolean;
/**
 * Check if claim exists (is not null/undefined)
 */
export declare function claimExists(claims: Record<string, unknown>, path: string): boolean;
/**
 * Safely get string array from claim
 * Useful for group memberships
 *
 * @param claims - Raw IdP claims object
 * @param path - Dot-separated path to claim
 * @returns Array of strings (empty if claim doesn't exist or isn't array)
 */
export declare function getClaimAsStringArray(
  claims: Record<string, unknown>,
  path: string
): string[];
//# sourceMappingURL=claim-normalizer.d.ts.map
