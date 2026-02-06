/**
 * Admin Policy Evaluation Logic Tests
 *
 * Tests the evaluatePolicy function that evaluates RBAC/ABAC/ReBAC conditions.
 */

import { describe, it, expect } from 'vitest';
import { evaluatePolicy } from '../routes/admin-management/admin-policies';
import type { AdminPolicyConditions } from '@authrim/ar-lib-core';

// =============================================================================
// RBAC Tests (Role-Based Access Control)
// =============================================================================

describe('evaluatePolicy - RBAC', () => {
  it('should match when user has required role', () => {
    const policy = {
      conditions: {
        roles: ['admin', 'manager'],
      } as AdminPolicyConditions,
    };

    const context = {
      roles: ['admin'],
    };

    const result = evaluatePolicy(policy, context);

    expect(result.matched).toBe(true);
    expect(result.conditionResults.roles).toBe(true);
  });

  it('should not match when user lacks required roles', () => {
    const policy = {
      conditions: {
        roles: ['admin', 'manager'],
      } as AdminPolicyConditions,
    };

    const context = {
      roles: ['viewer'],
    };

    const result = evaluatePolicy(policy, context);

    expect(result.matched).toBe(false);
    expect(result.conditionResults.roles).toBe(false);
  });

  it('should not match when user has no roles', () => {
    const policy = {
      conditions: {
        roles: ['admin'],
      } as AdminPolicyConditions,
    };

    const context = {};

    const result = evaluatePolicy(policy, context);

    expect(result.matched).toBe(false);
    expect(result.conditionResults.roles).toBe(false);
  });

  it('should match when user has at least one required role', () => {
    const policy = {
      conditions: {
        roles: ['admin', 'manager', 'supervisor'],
      } as AdminPolicyConditions,
    };

    const context = {
      roles: ['viewer', 'manager', 'user'],
    };

    const result = evaluatePolicy(policy, context);

    expect(result.matched).toBe(true);
    expect(result.conditionResults.roles).toBe(true);
  });
});

// =============================================================================
// ABAC Tests (Attribute-Based Access Control)
// =============================================================================

describe('evaluatePolicy - ABAC', () => {
  describe('equals operator', () => {
    it('should match when attribute equals value', () => {
      const policy = {
        conditions: {
          attributes: {
            department: { equals: 'engineering' },
          },
        } as AdminPolicyConditions,
      };

      const context = {
        attributes: {
          department: 'engineering',
        },
      };

      const result = evaluatePolicy(policy, context);

      expect(result.matched).toBe(true);
      expect(result.conditionResults.attributes).toBe(true);
    });

    it('should not match when attribute does not equal value', () => {
      const policy = {
        conditions: {
          attributes: {
            department: { equals: 'engineering' },
          },
        } as AdminPolicyConditions,
      };

      const context = {
        attributes: {
          department: 'sales',
        },
      };

      const result = evaluatePolicy(policy, context);

      expect(result.matched).toBe(false);
      expect(result.conditionResults.attributes).toBe(false);
    });

    it('should handle numeric equality', () => {
      const policy = {
        conditions: {
          attributes: {
            clearance_level: { equals: 3 },
          },
        } as AdminPolicyConditions,
      };

      const context = {
        attributes: {
          clearance_level: 3,
        },
      };

      const result = evaluatePolicy(policy, context);

      expect(result.matched).toBe(true);
    });

    it('should handle boolean equality', () => {
      const policy = {
        conditions: {
          attributes: {
            is_verified: { equals: true },
          },
        } as AdminPolicyConditions,
      };

      const context = {
        attributes: {
          is_verified: true,
        },
      };

      const result = evaluatePolicy(policy, context);

      expect(result.matched).toBe(true);
    });
  });

  describe('not_equals operator', () => {
    it('should match when attribute does not equal value', () => {
      const policy = {
        conditions: {
          attributes: {
            department: { not_equals: 'sales' },
          },
        } as AdminPolicyConditions,
      };

      const context = {
        attributes: {
          department: 'engineering',
        },
      };

      const result = evaluatePolicy(policy, context);

      expect(result.matched).toBe(true);
      expect(result.conditionResults.attributes).toBe(true);
    });

    it('should not match when attribute equals value', () => {
      const policy = {
        conditions: {
          attributes: {
            department: { not_equals: 'sales' },
          },
        } as AdminPolicyConditions,
      };

      const context = {
        attributes: {
          department: 'sales',
        },
      };

      const result = evaluatePolicy(policy, context);

      expect(result.matched).toBe(false);
    });
  });

  describe('contains operator', () => {
    it('should match when string contains substring', () => {
      const policy = {
        conditions: {
          attributes: {
            email: { contains: '@example.com' },
          },
        } as AdminPolicyConditions,
      };

      const context = {
        attributes: {
          email: 'user@example.com',
        },
      };

      const result = evaluatePolicy(policy, context);

      expect(result.matched).toBe(true);
    });

    it('should not match when string does not contain substring', () => {
      const policy = {
        conditions: {
          attributes: {
            email: { contains: '@example.com' },
          },
        } as AdminPolicyConditions,
      };

      const context = {
        attributes: {
          email: 'user@other.com',
        },
      };

      const result = evaluatePolicy(policy, context);

      expect(result.matched).toBe(false);
    });
  });

  describe('in operator', () => {
    it('should match when value is in list', () => {
      const policy = {
        conditions: {
          attributes: {
            location: { in: ['US', 'CA', 'UK'] },
          },
        } as AdminPolicyConditions,
      };

      const context = {
        attributes: {
          location: 'CA',
        },
      };

      const result = evaluatePolicy(policy, context);

      expect(result.matched).toBe(true);
    });

    it('should not match when value is not in list', () => {
      const policy = {
        conditions: {
          attributes: {
            location: { in: ['US', 'CA', 'UK'] },
          },
        } as AdminPolicyConditions,
      };

      const context = {
        attributes: {
          location: 'JP',
        },
      };

      const result = evaluatePolicy(policy, context);

      expect(result.matched).toBe(false);
    });

    it('should handle numeric values in list', () => {
      const policy = {
        conditions: {
          attributes: {
            status_code: { in: [200, 201, 204] },
          },
        } as AdminPolicyConditions,
      };

      const context = {
        attributes: {
          status_code: 201,
        },
      };

      const result = evaluatePolicy(policy, context);

      expect(result.matched).toBe(true);
    });
  });

  describe('gte (greater than or equal) operator', () => {
    it('should match when value is greater than threshold', () => {
      const policy = {
        conditions: {
          attributes: {
            clearance_level: { gte: 3 },
          },
        } as AdminPolicyConditions,
      };

      const context = {
        attributes: {
          clearance_level: 5,
        },
      };

      const result = evaluatePolicy(policy, context);

      expect(result.matched).toBe(true);
    });

    it('should match when value equals threshold', () => {
      const policy = {
        conditions: {
          attributes: {
            clearance_level: { gte: 3 },
          },
        } as AdminPolicyConditions,
      };

      const context = {
        attributes: {
          clearance_level: 3,
        },
      };

      const result = evaluatePolicy(policy, context);

      expect(result.matched).toBe(true);
    });

    it('should not match when value is less than threshold', () => {
      const policy = {
        conditions: {
          attributes: {
            clearance_level: { gte: 3 },
          },
        } as AdminPolicyConditions,
      };

      const context = {
        attributes: {
          clearance_level: 2,
        },
      };

      const result = evaluatePolicy(policy, context);

      expect(result.matched).toBe(false);
    });
  });

  describe('lte (less than or equal) operator', () => {
    it('should match when value is less than threshold', () => {
      const policy = {
        conditions: {
          attributes: {
            risk_score: { lte: 50 },
          },
        } as AdminPolicyConditions,
      };

      const context = {
        attributes: {
          risk_score: 30,
        },
      };

      const result = evaluatePolicy(policy, context);

      expect(result.matched).toBe(true);
    });

    it('should match when value equals threshold', () => {
      const policy = {
        conditions: {
          attributes: {
            risk_score: { lte: 50 },
          },
        } as AdminPolicyConditions,
      };

      const context = {
        attributes: {
          risk_score: 50,
        },
      };

      const result = evaluatePolicy(policy, context);

      expect(result.matched).toBe(true);
    });

    it('should not match when value exceeds threshold', () => {
      const policy = {
        conditions: {
          attributes: {
            risk_score: { lte: 50 },
          },
        } as AdminPolicyConditions,
      };

      const context = {
        attributes: {
          risk_score: 60,
        },
      };

      const result = evaluatePolicy(policy, context);

      expect(result.matched).toBe(false);
    });
  });

  describe('gt (greater than) operator', () => {
    it('should match when value is greater than threshold', () => {
      const policy = {
        conditions: {
          attributes: {
            age: { gt: 18 },
          },
        } as AdminPolicyConditions,
      };

      const context = {
        attributes: {
          age: 25,
        },
      };

      const result = evaluatePolicy(policy, context);

      expect(result.matched).toBe(true);
    });

    it('should not match when value equals threshold', () => {
      const policy = {
        conditions: {
          attributes: {
            age: { gt: 18 },
          },
        } as AdminPolicyConditions,
      };

      const context = {
        attributes: {
          age: 18,
        },
      };

      const result = evaluatePolicy(policy, context);

      expect(result.matched).toBe(false);
    });
  });

  describe('lt (less than) operator', () => {
    it('should match when value is less than threshold', () => {
      const policy = {
        conditions: {
          attributes: {
            attempts: { lt: 5 },
          },
        } as AdminPolicyConditions,
      };

      const context = {
        attributes: {
          attempts: 3,
        },
      };

      const result = evaluatePolicy(policy, context);

      expect(result.matched).toBe(true);
    });

    it('should not match when value equals threshold', () => {
      const policy = {
        conditions: {
          attributes: {
            attempts: { lt: 5 },
          },
        } as AdminPolicyConditions,
      };

      const context = {
        attributes: {
          attempts: 5,
        },
      };

      const result = evaluatePolicy(policy, context);

      expect(result.matched).toBe(false);
    });
  });

  describe('missing attributes', () => {
    it('should not match when required attribute is missing', () => {
      const policy = {
        conditions: {
          attributes: {
            department: { equals: 'engineering' },
          },
        } as AdminPolicyConditions,
      };

      const context = {
        attributes: {},
      };

      const result = evaluatePolicy(policy, context);

      expect(result.matched).toBe(false);
    });
  });

  describe('multiple attribute conditions', () => {
    it('should match when all attribute conditions are met', () => {
      const policy = {
        conditions: {
          attributes: {
            department: { equals: 'engineering' },
            clearance_level: { gte: 3 },
          },
        } as AdminPolicyConditions,
      };

      const context = {
        attributes: {
          department: 'engineering',
          clearance_level: 5,
        },
      };

      const result = evaluatePolicy(policy, context);

      expect(result.matched).toBe(true);
    });

    it('should not match when one attribute condition fails', () => {
      const policy = {
        conditions: {
          attributes: {
            department: { equals: 'engineering' },
            clearance_level: { gte: 3 },
          },
        } as AdminPolicyConditions,
      };

      const context = {
        attributes: {
          department: 'engineering',
          clearance_level: 2,
        },
      };

      const result = evaluatePolicy(policy, context);

      expect(result.matched).toBe(false);
    });
  });
});

// =============================================================================
// ReBAC Tests (Relationship-Based Access Control)
// =============================================================================

describe('evaluatePolicy - ReBAC', () => {
  it('should match when user has required relationship', () => {
    const policy = {
      conditions: {
        relationships: {
          supervises: {},
        },
      } as AdminPolicyConditions,
    };

    const context = {
      relationships: [{ type: 'supervises', target: 'user-123' }],
    };

    const result = evaluatePolicy(policy, context);

    expect(result.matched).toBe(true);
    expect(result.conditionResults.relationships).toBe(true);
  });

  it('should not match when user lacks required relationship', () => {
    const policy = {
      conditions: {
        relationships: {
          supervises: {},
        },
      } as AdminPolicyConditions,
    };

    const context = {
      relationships: [{ type: 'team_member', target: 'team-1' }],
    };

    const result = evaluatePolicy(policy, context);

    expect(result.matched).toBe(false);
    expect(result.conditionResults.relationships).toBe(false);
  });

  it('should not match when user has no relationships', () => {
    const policy = {
      conditions: {
        relationships: {
          supervises: {},
        },
      } as AdminPolicyConditions,
    };

    const context = {};

    const result = evaluatePolicy(policy, context);

    expect(result.matched).toBe(false);
  });

  it('should match when user has at least one required relationship', () => {
    const policy = {
      conditions: {
        relationships: {
          supervises: {},
          manages: {},
        },
      } as AdminPolicyConditions,
    };

    const context = {
      relationships: [
        { type: 'team_member', target: 'team-1' },
        { type: 'supervises', target: 'user-123' },
      ],
    };

    const result = evaluatePolicy(policy, context);

    expect(result.matched).toBe(true);
  });
});

// =============================================================================
// Condition Type Tests (all vs any)
// =============================================================================

describe('evaluatePolicy - Condition Type', () => {
  describe('condition_type: all', () => {
    it('should match when all conditions are met', () => {
      const policy = {
        conditions: {
          condition_type: 'all',
          roles: ['admin'],
          attributes: {
            department: { equals: 'engineering' },
          },
        } as AdminPolicyConditions,
      };

      const context = {
        roles: ['admin'],
        attributes: {
          department: 'engineering',
        },
      };

      const result = evaluatePolicy(policy, context);

      expect(result.matched).toBe(true);
    });

    it('should not match when one condition fails', () => {
      const policy = {
        conditions: {
          condition_type: 'all',
          roles: ['admin'],
          attributes: {
            department: { equals: 'engineering' },
          },
        } as AdminPolicyConditions,
      };

      const context = {
        roles: ['viewer'],
        attributes: {
          department: 'engineering',
        },
      };

      const result = evaluatePolicy(policy, context);

      expect(result.matched).toBe(false);
    });
  });

  describe('condition_type: any', () => {
    it('should match when at least one condition is met', () => {
      const policy = {
        conditions: {
          condition_type: 'any',
          roles: ['admin'],
          attributes: {
            department: { equals: 'engineering' },
          },
        } as AdminPolicyConditions,
      };

      const context = {
        roles: ['viewer'],
        attributes: {
          department: 'engineering',
        },
      };

      const result = evaluatePolicy(policy, context);

      expect(result.matched).toBe(true);
    });

    it('should not match when all conditions fail', () => {
      const policy = {
        conditions: {
          condition_type: 'any',
          roles: ['admin'],
          attributes: {
            department: { equals: 'engineering' },
          },
        } as AdminPolicyConditions,
      };

      const context = {
        roles: ['viewer'],
        attributes: {
          department: 'sales',
        },
      };

      const result = evaluatePolicy(policy, context);

      expect(result.matched).toBe(false);
    });

    it('should match when all conditions are met', () => {
      const policy = {
        conditions: {
          condition_type: 'any',
          roles: ['admin'],
          attributes: {
            department: { equals: 'engineering' },
          },
        } as AdminPolicyConditions,
      };

      const context = {
        roles: ['admin'],
        attributes: {
          department: 'engineering',
        },
      };

      const result = evaluatePolicy(policy, context);

      expect(result.matched).toBe(true);
    });
  });

  describe('default condition_type (all)', () => {
    it('should default to "all" when condition_type is not specified', () => {
      const policy = {
        conditions: {
          roles: ['admin'],
          attributes: {
            department: { equals: 'engineering' },
          },
        } as AdminPolicyConditions,
      };

      const context = {
        roles: ['admin'],
        attributes: {
          department: 'engineering',
        },
      };

      const result = evaluatePolicy(policy, context);

      expect(result.matched).toBe(true);
    });
  });
});

// =============================================================================
// Combined Conditions Tests (RBAC + ABAC + ReBAC)
// =============================================================================

describe('evaluatePolicy - Combined Conditions', () => {
  it('should match when all RBAC, ABAC, and ReBAC conditions are met', () => {
    const policy = {
      conditions: {
        condition_type: 'all',
        roles: ['admin'],
        attributes: {
          department: { equals: 'security' },
          clearance_level: { gte: 4 },
        },
        relationships: {
          supervises: {},
        },
      } as AdminPolicyConditions,
    };

    const context = {
      roles: ['admin'],
      attributes: {
        department: 'security',
        clearance_level: 5,
      },
      relationships: [{ type: 'supervises', target: 'user-123' }],
    };

    const result = evaluatePolicy(policy, context);

    expect(result.matched).toBe(true);
    expect(result.conditionResults.roles).toBe(true);
    expect(result.conditionResults.attributes).toBe(true);
    expect(result.conditionResults.relationships).toBe(true);
  });

  it('should not match when one of the combined conditions fails', () => {
    const policy = {
      conditions: {
        condition_type: 'all',
        roles: ['admin'],
        attributes: {
          department: { equals: 'security' },
        },
        relationships: {
          supervises: {},
        },
      } as AdminPolicyConditions,
    };

    const context = {
      roles: ['admin'],
      attributes: {
        department: 'engineering', // Wrong department
      },
      relationships: [{ type: 'supervises', target: 'user-123' }],
    };

    const result = evaluatePolicy(policy, context);

    expect(result.matched).toBe(false);
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('evaluatePolicy - Edge Cases', () => {
  it('should return false when policy has no conditions', () => {
    const policy = {
      conditions: {} as AdminPolicyConditions,
    };

    const context = {
      roles: ['admin'],
    };

    const result = evaluatePolicy(policy, context);

    expect(result.matched).toBe(false);
  });

  it('should return condition results for each condition type', () => {
    const policy = {
      conditions: {
        roles: ['admin'],
        attributes: {
          department: { equals: 'engineering' },
        },
        relationships: {
          supervises: {},
        },
      } as AdminPolicyConditions,
    };

    const context = {
      roles: ['admin'],
      attributes: {
        department: 'engineering',
      },
      relationships: [{ type: 'supervises', target: 'user-1' }],
    };

    const result = evaluatePolicy(policy, context);

    expect(result.conditionResults).toHaveProperty('roles');
    expect(result.conditionResults).toHaveProperty('attributes');
    expect(result.conditionResults).toHaveProperty('relationships');
  });
});
