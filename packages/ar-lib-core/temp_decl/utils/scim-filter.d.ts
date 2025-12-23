/**
 * SCIM 2.0 Filter Query Parser
 *
 * Implements RFC 7644 Section 3.4.2.2 - Filtering
 *
 * Supports:
 * - Comparison operators: eq, ne, co, sw, ew, pr, gt, ge, lt, le
 * - Logical operators: and, or, not
 * - Grouping with parentheses
 * - Attribute paths (e.g., emails[type eq "work"].value)
 *
 * @see https://datatracker.ietf.org/doc/html/rfc7644#section-3.4.2.2
 */
import type { ScimFilterNode } from '../types/scim';
/**
 * Parser for SCIM filter expressions
 */
export declare class ScimFilterParser {
  private tokenizer;
  private currentToken;
  constructor(filter: string);
  private advance;
  private expect;
  /**
   * Parse the filter expression
   */
  parse(): ScimFilterNode;
  private parseLogicalOr;
  private parseLogicalAnd;
  private parseLogicalNot;
  private parsePrimary;
  private parseComparison;
  private parseValuePath;
}
/**
 * Parse a SCIM filter string into an AST
 */
export declare function parseScimFilter(filter: string): ScimFilterNode;
/**
 * Convert SCIM filter AST to SQL WHERE clause
 *
 * This is a basic implementation that maps SCIM attributes to database columns.
 * You may need to customize this based on your database schema.
 */
export declare function filterToSql(
  node: ScimFilterNode,
  attributeMap?: Record<string, string>
): {
  sql: string;
  params: any[];
};
/**
 * Validate SCIM filter syntax
 */
export declare function validateScimFilter(filter: string): {
  valid: boolean;
  error?: string;
};
//# sourceMappingURL=scim-filter.d.ts.map
