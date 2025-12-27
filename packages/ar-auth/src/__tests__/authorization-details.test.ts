/**
 * RFC 9396 Rich Authorization Requests (RAR) Integration Tests
 *
 * Tests for authorization_details parameter handling in authorize endpoint
 */

import { describe, it, expect } from 'vitest';
import { validateAuthorizationDetails } from '@authrim/ar-lib-core';

describe('Authorization Details Integration', () => {
  describe('Parameter Reception', () => {
    it('should accept valid authorization_details array', () => {
      const authorizationDetails = JSON.stringify([{ type: 'payment_initiation' }]);

      // Simulates parameter reception in authorize endpoint
      const parsed = JSON.parse(authorizationDetails);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].type).toBe('payment_initiation');
    });

    it('should accept authorization_details as URL-encoded JSON', () => {
      const rawDetails = [{ type: 'payment_initiation' }];
      const encoded = encodeURIComponent(JSON.stringify(rawDetails));

      // Simulates URL decoding in query parameter
      const decoded = decodeURIComponent(encoded);
      const parsed = JSON.parse(decoded);

      expect(parsed[0].type).toBe('payment_initiation');
    });

    it('should handle authorization_details with multiple entries', () => {
      const authorizationDetails = JSON.stringify([
        { type: 'payment_initiation' },
        { type: 'account_information', actions: ['read'] },
      ]);

      const parsed = JSON.parse(authorizationDetails);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].type).toBe('payment_initiation');
      expect(parsed[1].type).toBe('account_information');
    });
  });

  describe('Validation Flow', () => {
    it('should validate and sanitize authorization_details before storage', () => {
      const rawDetails = [
        {
          type: 'payment_initiation',
          instructedAmount: { amount: '100.00', currency: 'USD' },
          creditorAccount: { iban: 'DE89370400440532013000' },
        },
      ];

      const result = validateAuthorizationDetails(rawDetails, {
        allowedTypes: ['payment_initiation'],
      });

      expect(result.valid).toBe(true);
      expect(result.sanitized).toBeDefined();
      expect(result.sanitized![0].type).toBe('payment_initiation');
    });

    it('should reject invalid JSON and return appropriate error', () => {
      const invalidJson = 'not valid json {';

      const result = validateAuthorizationDetails(invalidJson);

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('invalid_json');
    });

    it('should reject when type is not allowed', () => {
      const details = [{ type: 'forbidden_type' }];

      const result = validateAuthorizationDetails(details, {
        allowedTypes: ['payment_initiation', 'account_information'],
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('type_not_allowed');
    });
  });

  describe('AI Agent Action Type', () => {
    it('should validate ai_agent_action with required fields', () => {
      const details = [
        {
          type: 'ai_agent_action',
          agent_id: 'agent-123',
          capabilities: ['read', 'write'],
        },
      ];

      const result = validateAuthorizationDetails(details);

      expect(result.valid).toBe(true);
      expect(result.sanitized![0].type).toBe('ai_agent_action');
    });

    it('should reject ai_agent_action without agent_id', () => {
      const details = [
        {
          type: 'ai_agent_action',
          capabilities: ['read'],
        },
      ];

      const result = validateAuthorizationDetails(details, {
        allowedTypes: ['ai_agent_action'],
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('missing_required_field');
      expect(result.errors[0].field).toBe('agent_id');
    });

    it('should accept ai_agent_action with session_context', () => {
      const details = [
        {
          type: 'ai_agent_action',
          agent_id: 'agent-123',
          capabilities: ['read'],
          session_context: {
            parent_session_id: 'session-456',
            conversation_id: 'conv-789',
          },
        },
      ];

      const result = validateAuthorizationDetails(details);

      expect(result.valid).toBe(true);
    });

    it('should accept ai_agent_action with tools restrictions', () => {
      const details = [
        {
          type: 'ai_agent_action',
          agent_id: 'agent-123',
          capabilities: ['execute'],
          tools: {
            allowed: ['tool1', 'tool2'],
            denied: ['dangerous_tool'],
          },
        },
      ];

      const result = validateAuthorizationDetails(details);

      expect(result.valid).toBe(true);
    });
  });

  describe('Payment Initiation Type', () => {
    it('should validate payment_initiation with required fields', () => {
      const details = [
        {
          type: 'payment_initiation',
          instructedAmount: { amount: '100.00', currency: 'EUR' },
          creditorAccount: { iban: 'DE89370400440532013000' },
        },
      ];

      const result = validateAuthorizationDetails(details, {
        allowedTypes: ['payment_initiation'],
      });

      expect(result.valid).toBe(true);
    });

    it('should reject payment_initiation without instructedAmount', () => {
      const details = [
        {
          type: 'payment_initiation',
          creditorAccount: { iban: 'DE89370400440532013000' },
        },
      ];

      const result = validateAuthorizationDetails(details, {
        allowedTypes: ['payment_initiation'],
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'instructedAmount')).toBe(true);
    });
  });

  describe('Account Information Type', () => {
    it('should validate account_information with actions', () => {
      const details = [
        {
          type: 'account_information',
          actions: ['read'],
        },
      ];

      const result = validateAuthorizationDetails(details, {
        allowedTypes: ['account_information'],
      });

      expect(result.valid).toBe(true);
    });

    it('should reject account_information with invalid action values', () => {
      const details = [
        {
          type: 'account_information',
          actions: ['invalid_action'],
        },
      ];

      const result = validateAuthorizationDetails(details, {
        allowedTypes: ['account_information'],
      });

      expect(result.valid).toBe(false);
    });
  });

  describe('Size Limits', () => {
    it('should reject authorization_details exceeding max size', () => {
      const largeDetails = JSON.stringify([{ type: 'a'.repeat(20000) }]);

      const result = validateAuthorizationDetails(largeDetails);

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('size_exceeded');
    });

    it('should reject too many entries in authorization_details', () => {
      const manyEntries = Array(20)
        .fill(null)
        .map((_, i) => ({ type: `type_${i}` }));

      const result = validateAuthorizationDetails(manyEntries);

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('size_exceeded');
    });
  });

  describe('Feature Flag Behavior', () => {
    it('should validate authorization_details format regardless of feature flag', () => {
      // Feature flag check happens at endpoint level, not in validation
      // Validation should work the same way regardless of feature flag
      const details = [{ type: 'custom_type' }];

      const result = validateAuthorizationDetails(details);

      expect(result.valid).toBe(true);
    });
  });

  describe('Error Response Format', () => {
    it('should return detailed error information for validation failures', () => {
      const details = [
        { type: 'ai_agent_action' }, // Missing required fields
      ];

      const result = validateAuthorizationDetails(details, {
        allowedTypes: ['ai_agent_action'],
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toHaveProperty('index');
      expect(result.errors[0]).toHaveProperty('code');
      expect(result.errors[0]).toHaveProperty('message');
    });

    it('should collect errors from multiple invalid entries', () => {
      const details = [{ type: 123 }, { noType: true }];

      const result = validateAuthorizationDetails(details);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Passthrough to Token Response', () => {
    it('should preserve authorization_details structure for token response', () => {
      const originalDetails = [
        {
          type: 'payment_initiation',
          instructedAmount: { amount: '100.00', currency: 'EUR' },
          creditorAccount: { iban: 'DE89370400440532013000' },
          creditorName: 'Test Merchant',
        },
      ];

      const result = validateAuthorizationDetails(originalDetails, {
        allowedTypes: ['payment_initiation'],
      });

      expect(result.valid).toBe(true);
      // Sanitized output should preserve structure for token response
      expect(result.sanitized![0]).toHaveProperty('type', 'payment_initiation');
      expect(result.sanitized![0]).toHaveProperty('instructedAmount');
      expect(result.sanitized![0]).toHaveProperty('creditorAccount');
      expect(result.sanitized![0]).toHaveProperty('creditorName');
    });
  });
});
