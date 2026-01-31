/**
 * SCIM Filter Property-Based Tests
 *
 * Uses fast-check to verify SCIM filter parser behavior across
 * a wide range of inputs, discovering edge cases that unit tests might miss.
 *
 * RFC 7644 Section 3.4.2.2 - Filtering
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { parseScimFilter, validateScimFilter, filterToSql } from '../utils/scim-filter';
import {
  scimValidFilterArb,
  scimBasicFilterArb,
  scimAndFilterArb,
  scimOrFilterArb,
  scimNotFilterArb,
  scimGroupedFilterArb,
  scimPresentFilterArb,
  scimInvalidOperatorArb,
  scimMissingValueFilterArb,
  scimUnbalancedParenArb,
  scimAttributeArb,
  scimOperatorArb,
  scimStringValueArb,
} from './helpers/fc-generators';

// =============================================================================
// Valid Filter Parsing Properties
// =============================================================================

describe('SCIM Filter Property Tests', () => {
  describe('Valid Filter Parsing Properties', () => {
    it('∀ valid basic filter: validateScimFilter returns valid=true', () => {
      fc.assert(
        fc.property(scimBasicFilterArb, (filter) => {
          const result = validateScimFilter(filter);
          expect(result.valid).toBe(true);
          expect(result.error).toBeUndefined();
        }),
        { numRuns: 300 }
      );
    });

    it('∀ valid AND filter: parseScimFilter produces logical node with operator=and', () => {
      fc.assert(
        fc.property(scimAndFilterArb, (filter) => {
          const ast = parseScimFilter(filter);
          expect(ast.type).toBe('logical');
          expect(ast.operator).toBe('and');
          expect(ast.left).toBeDefined();
          expect(ast.right).toBeDefined();
        }),
        { numRuns: 200 }
      );
    });

    it('∀ valid OR filter: parseScimFilter produces logical node with operator=or', () => {
      fc.assert(
        fc.property(scimOrFilterArb, (filter) => {
          const ast = parseScimFilter(filter);
          expect(ast.type).toBe('logical');
          expect(ast.operator).toBe('or');
          expect(ast.left).toBeDefined();
          expect(ast.right).toBeDefined();
        }),
        { numRuns: 200 }
      );
    });

    it('∀ valid NOT filter: parseScimFilter produces logical node with operator=not', () => {
      fc.assert(
        fc.property(scimNotFilterArb, (filter) => {
          const ast = parseScimFilter(filter);
          expect(ast.type).toBe('logical');
          expect(ast.operator).toBe('not');
          expect(ast.expression).toBeDefined();
        }),
        { numRuns: 200 }
      );
    });

    it('∀ valid grouped filter: parseScimFilter produces grouping node', () => {
      fc.assert(
        fc.property(scimGroupedFilterArb, (filter) => {
          const ast = parseScimFilter(filter);
          expect(ast.type).toBe('grouping');
          expect(ast.expression).toBeDefined();
        }),
        { numRuns: 200 }
      );
    });

    it('∀ present filter: parseScimFilter produces comparison node with operator=pr', () => {
      fc.assert(
        fc.property(scimPresentFilterArb, (filter) => {
          const ast = parseScimFilter(filter);
          expect(ast.type).toBe('comparison');
          expect(ast.operator).toBe('pr');
          expect(ast.attribute).toBeDefined();
          // 'pr' operator does not have a value
          expect(ast.value).toBeUndefined();
        }),
        { numRuns: 200 }
      );
    });

    it('∀ valid filter: parseScimFilter does not throw', () => {
      fc.assert(
        fc.property(scimValidFilterArb, (filter) => {
          expect(() => parseScimFilter(filter)).not.toThrow();
        }),
        { numRuns: 500 }
      );
    });
  });

  // =============================================================================
  // Comparison Operator Properties
  // =============================================================================

  describe('Comparison Operator Properties', () => {
    it('∀ operator in [eq,ne,co,sw,ew,gt,ge,lt,le]: filter parses with correct operator', () => {
      fc.assert(
        fc.property(scimAttributeArb, scimOperatorArb, scimStringValueArb, (attr, op, value) => {
          const filter = `${attr} ${op} "${value}"`;
          const ast = parseScimFilter(filter);
          expect(ast.type).toBe('comparison');
          expect(ast.operator).toBe(op);
          expect(ast.attribute).toBe(attr);
          expect(ast.value).toBe(value);
        }),
        { numRuns: 300 }
      );
    });

    it('∀ boolean value: filter parses with correct boolean value', () => {
      fc.assert(
        fc.property(scimAttributeArb, scimOperatorArb, fc.boolean(), (attr, op, value) => {
          const filter = `${attr} ${op} ${value}`;
          const ast = parseScimFilter(filter);
          expect(ast.type).toBe('comparison');
          expect(ast.value).toBe(value);
        }),
        { numRuns: 200 }
      );
    });

    it('∀ integer value: filter parses with correct numeric value', () => {
      fc.assert(
        fc.property(
          scimAttributeArb,
          scimOperatorArb,
          fc.integer({ min: -10000, max: 10000 }),
          (attr, op, value) => {
            const filter = `${attr} ${op} ${value}`;
            const ast = parseScimFilter(filter);
            expect(ast.type).toBe('comparison');
            expect(ast.value).toBe(value);
          }
        ),
        { numRuns: 200 }
      );
    });

    it('case insensitivity: operators work in uppercase, lowercase, mixed case', () => {
      const operators = ['eq', 'ne', 'co', 'sw', 'ew', 'pr', 'gt', 'ge', 'lt', 'le'];

      for (const op of operators) {
        const variations = [op, op.toUpperCase(), op.charAt(0).toUpperCase() + op.slice(1)];

        for (const variant of variations) {
          if (op === 'pr') {
            const filter = `userName ${variant}`;
            const ast = parseScimFilter(filter);
            expect(ast.operator).toBe('pr');
          } else {
            const filter = `userName ${variant} "test"`;
            const ast = parseScimFilter(filter);
            expect(ast.operator).toBe(op);
          }
        }
      }
    });
  });

  // =============================================================================
  // Invalid Filter Properties
  // =============================================================================

  describe('Invalid Filter Properties', () => {
    it('∀ invalid operator: validateScimFilter returns valid=false', () => {
      fc.assert(
        fc.property(scimInvalidOperatorArb, (filter) => {
          const result = validateScimFilter(filter);
          expect(result.valid).toBe(false);
          expect(result.error).toBeDefined();
        }),
        { numRuns: 100 }
      );
    });

    it('∀ missing value filter: validateScimFilter returns valid=false', () => {
      fc.assert(
        fc.property(scimMissingValueFilterArb, (filter) => {
          const result = validateScimFilter(filter);
          expect(result.valid).toBe(false);
          expect(result.error).toBeDefined();
        }),
        { numRuns: 100 }
      );
    });

    it('∀ unbalanced parentheses: validateScimFilter returns valid=false', () => {
      fc.assert(
        fc.property(scimUnbalancedParenArb, (filter) => {
          const result = validateScimFilter(filter);
          expect(result.valid).toBe(false);
          expect(result.error).toBeDefined();
        }),
        { numRuns: 100 }
      );
    });

    it('empty string: validateScimFilter returns valid=false', () => {
      const result = validateScimFilter('');
      expect(result.valid).toBe(false);
    });

    it('whitespace only: validateScimFilter returns valid=false', () => {
      fc.assert(
        fc.property(
          fc.string({ unit: fc.constantFrom(' ', '\t', '\n', '\r'), minLength: 1, maxLength: 10 }),
          (whitespace) => {
            const result = validateScimFilter(whitespace);
            expect(result.valid).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  // =============================================================================
  // SQL Generation Properties
  // =============================================================================

  describe('SQL Generation Properties', () => {
    it('∀ valid basic filter: filterToSql produces valid SQL structure', () => {
      fc.assert(
        fc.property(scimBasicFilterArb, (filter) => {
          const ast = parseScimFilter(filter);
          const { sql, params } = filterToSql(ast);

          // SQL should be non-empty
          expect(sql.length).toBeGreaterThan(0);

          // SQL should contain the column name or IS NOT NULL for 'pr'
          if (ast.operator === 'pr') {
            expect(sql).toContain('IS NOT NULL');
          } else {
            expect(sql).toMatch(/\?1/);
            expect(params.length).toBe(1);
          }
        }),
        { numRuns: 200 }
      );
    });

    it('∀ AND filter: filterToSql produces SQL with AND', () => {
      fc.assert(
        fc.property(scimAndFilterArb, (filter) => {
          const ast = parseScimFilter(filter);
          const { sql } = filterToSql(ast);
          expect(sql).toContain(' AND ');
        }),
        { numRuns: 100 }
      );
    });

    it('∀ OR filter: filterToSql produces SQL with OR', () => {
      fc.assert(
        fc.property(scimOrFilterArb, (filter) => {
          const ast = parseScimFilter(filter);
          const { sql } = filterToSql(ast);
          expect(sql).toContain(' OR ');
        }),
        { numRuns: 100 }
      );
    });

    it('∀ NOT filter: filterToSql produces SQL with NOT', () => {
      fc.assert(
        fc.property(scimNotFilterArb, (filter) => {
          const ast = parseScimFilter(filter);
          const { sql } = filterToSql(ast);
          expect(sql).toContain('NOT');
        }),
        { numRuns: 100 }
      );
    });

    it('operator mapping: SCIM operators map to correct SQL operators', () => {
      const operatorMapping = {
        eq: '=',
        ne: '!=',
        co: 'LIKE',
        sw: 'LIKE',
        ew: 'LIKE',
        gt: '>',
        ge: '>=',
        lt: '<',
        le: '<=',
      };

      for (const [scimOp, sqlOp] of Object.entries(operatorMapping)) {
        const filter = `userName ${scimOp} "test"`;
        const ast = parseScimFilter(filter);
        const { sql } = filterToSql(ast);
        expect(sql).toContain(sqlOp);
      }
    });

    it('LIKE patterns: co/sw/ew produce correct wildcard patterns', () => {
      // 'co' should wrap with %
      const coAst = parseScimFilter('userName co "test"');
      const { params: coParams } = filterToSql(coAst);
      expect(coParams[0]).toBe('%test%');

      // 'sw' should have % at end
      const swAst = parseScimFilter('userName sw "test"');
      const { params: swParams } = filterToSql(swAst);
      expect(swParams[0]).toBe('test%');

      // 'ew' should have % at beginning
      const ewAst = parseScimFilter('userName ew "test"');
      const { params: ewParams } = filterToSql(ewAst);
      expect(ewParams[0]).toBe('%test');
    });

    it('attribute mapping: custom attribute map is applied', () => {
      const filter = 'userName eq "test"';
      const ast = parseScimFilter(filter);
      const attributeMap = { userName: 'user_name' };
      const { sql } = filterToSql(ast, attributeMap);
      expect(sql).toContain('user_name');
      expect(sql).not.toContain('userName');
    });
  });

  // =============================================================================
  // Logical Operator Nesting Properties
  // =============================================================================

  describe('Logical Operator Nesting Properties', () => {
    it('nested AND/OR: parses correctly with proper precedence', () => {
      // AND has higher precedence than OR
      const filter = 'a eq "1" or b eq "2" and c eq "3"';
      const ast = parseScimFilter(filter);

      // Should parse as: a eq "1" or (b eq "2" and c eq "3")
      expect(ast.type).toBe('logical');
      expect(ast.operator).toBe('or');
      expect(ast.left?.type).toBe('comparison');
      expect(ast.right?.type).toBe('logical');
      expect(ast.right?.operator).toBe('and');
    });

    it('∀ deeply nested filter: parses without stack overflow', () => {
      // Generate filters with up to 5 levels of nesting
      const nestedFilterArb = fc.integer({ min: 1, max: 5 }).chain((depth) => {
        let filter = 'userName eq "test"';
        for (let i = 0; i < depth; i++) {
          filter = `(${filter})`;
        }
        return fc.constant(filter);
      });

      fc.assert(
        fc.property(nestedFilterArb, (filter) => {
          expect(() => parseScimFilter(filter)).not.toThrow();
        }),
        { numRuns: 100 }
      );
    });

    it('mixed logical operators: complex expressions parse correctly', () => {
      const complexFilters = [
        '(userName eq "a" and active eq true) or email co "@example.com"',
        'not (userName eq "admin") and active eq true',
        '(a eq "1" or b eq "2") and (c eq "3" or d eq "4")',
      ];

      for (const filter of complexFilters) {
        expect(() => parseScimFilter(filter)).not.toThrow();
        const result = validateScimFilter(filter);
        expect(result.valid).toBe(true);
      }
    });
  });

  // =============================================================================
  // Edge Cases and Security Properties
  // =============================================================================

  describe('Edge Cases and Security Properties', () => {
    it('escaped quotes in string values: parses correctly', () => {
      const filter = 'userName eq "test\\"value"';
      const ast = parseScimFilter(filter);
      expect(ast.value).toBe('test"value');
    });

    it('special characters in attribute names: handles correctly', () => {
      // SCIM allows colon in attribute names for extensions
      const filter =
        'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User:employeeNumber eq "123"';
      const ast = parseScimFilter(filter);
      expect(ast.attribute).toBe(
        'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User:employeeNumber'
      );
    });

    it('null value: parses as null', () => {
      const filter = 'userName eq null';
      const ast = parseScimFilter(filter);
      expect(ast.value).toBeNull();
    });

    it('SQL injection attempt: filterToSql uses parameterized queries', () => {
      // Test with values that could be SQL injection attempts
      const maliciousValues = [
        'test; DROP TABLE users;',
        'test UNION SELECT * FROM passwords',
        "test' OR '1'='1",
      ];

      for (const maliciousValue of maliciousValues) {
        // Build filter with the malicious value properly escaped in quotes
        const filter = `userName eq "${maliciousValue}"`;
        const ast = parseScimFilter(filter);
        const { sql, params } = filterToSql(ast);

        // Value should be in params, not concatenated in SQL
        expect(params[0]).toBe(maliciousValue);
        // SQL should use parameter placeholder
        expect(sql).toContain('?1');
        // SQL should not contain the malicious value directly
        expect(sql).not.toContain('DROP');
        expect(sql).not.toContain('UNION');
        expect(sql).not.toContain("'1'='1");
      }
    });
  });
});
