/**
 * Tests for escapeLikePattern utility function
 */

import { describe, it, expect } from 'vitest';
import { escapeLikePattern } from '../adapter';

describe('escapeLikePattern', () => {
  it('should escape percent sign', () => {
    expect(escapeLikePattern('test%user')).toBe('test\\%user');
  });

  it('should escape underscore', () => {
    expect(escapeLikePattern('test_user')).toBe('test\\_user');
  });

  it('should escape backslash', () => {
    expect(escapeLikePattern('test\\user')).toBe('test\\\\user');
  });

  it('should escape multiple special characters', () => {
    expect(escapeLikePattern('%test_user%')).toBe('\\%test\\_user\\%');
  });

  it('should handle combined backslash and special characters', () => {
    // Input: test\%_name
    // Expected: test\\\_name (backslash escaped first, then % and _)
    expect(escapeLikePattern('test\\%_name')).toBe('test\\\\\\%\\_name');
  });

  it('should return empty string for empty input', () => {
    expect(escapeLikePattern('')).toBe('');
  });

  it('should not modify normal text', () => {
    expect(escapeLikePattern('normal text 123')).toBe('normal text 123');
  });

  it('should handle unicode characters', () => {
    expect(escapeLikePattern('ユーザー%名前')).toBe('ユーザー\\%名前');
  });

  it('should handle email-like patterns', () => {
    // Realistic use case: searching for email with % in it
    expect(escapeLikePattern('user+tag@example.com')).toBe('user+tag@example.com');
    expect(escapeLikePattern('user%tag@example.com')).toBe('user\\%tag@example.com');
  });
});
