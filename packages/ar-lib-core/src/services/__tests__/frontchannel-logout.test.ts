/**
 * Front-Channel Logout Service Tests
 *
 * Tests for the frontchannel logout HTML generation and helper functions.
 *
 * @packageDocumentation
 */

import { describe, it, expect } from 'vitest';
import {
  buildFrontchannelLogoutUri,
  buildFrontchannelLogoutIframes,
  generateFrontchannelLogoutHtml,
  shouldUseFrontchannelLogout,
} from '../frontchannel-logout';
import type { FrontchannelLogoutConfig } from '../../types/logout';
import type { SessionClientWithDetails } from '../../repositories/core/session-client';

describe('buildFrontchannelLogoutUri', () => {
  it('should include iss parameter', () => {
    const uri = buildFrontchannelLogoutUri(
      'https://rp.example.com/logout',
      'https://op.example.com',
      undefined,
      false
    );

    const url = new URL(uri);
    expect(url.searchParams.get('iss')).toBe('https://op.example.com');
  });

  it('should include sid parameter when session required', () => {
    const uri = buildFrontchannelLogoutUri(
      'https://rp.example.com/logout',
      'https://op.example.com',
      'session-123',
      true
    );

    const url = new URL(uri);
    expect(url.searchParams.get('iss')).toBe('https://op.example.com');
    expect(url.searchParams.get('sid')).toBe('session-123');
  });

  it('should not include sid when session not required', () => {
    const uri = buildFrontchannelLogoutUri(
      'https://rp.example.com/logout',
      'https://op.example.com',
      'session-123',
      false
    );

    const url = new URL(uri);
    expect(url.searchParams.get('iss')).toBe('https://op.example.com');
    expect(url.searchParams.get('sid')).toBeNull();
  });

  it('should preserve existing query parameters', () => {
    const uri = buildFrontchannelLogoutUri(
      'https://rp.example.com/logout?existing=param',
      'https://op.example.com',
      'session-123',
      true
    );

    const url = new URL(uri);
    expect(url.searchParams.get('existing')).toBe('param');
    expect(url.searchParams.get('iss')).toBe('https://op.example.com');
    expect(url.searchParams.get('sid')).toBe('session-123');
  });
});

describe('buildFrontchannelLogoutIframes', () => {
  const mockClients: SessionClientWithDetails[] = [
    {
      id: 'sc-1',
      session_id: 'session-1',
      client_id: 'client-1',
      first_token_at: Date.now(),
      last_token_at: Date.now(),
      last_seen_at: null,
      client_name: 'Test Client 1',
      backchannel_logout_uri: null,
      backchannel_logout_session_required: false,
      frontchannel_logout_uri: 'https://client1.example.com/logout',
      frontchannel_logout_session_required: true,
    },
    {
      id: 'sc-2',
      session_id: 'session-1',
      client_id: 'client-2',
      first_token_at: Date.now(),
      last_token_at: Date.now(),
      last_seen_at: null,
      client_name: 'Test Client 2',
      backchannel_logout_uri: null,
      backchannel_logout_session_required: false,
      frontchannel_logout_uri: 'https://client2.example.com/logout',
      frontchannel_logout_session_required: false,
    },
    {
      id: 'sc-3',
      session_id: 'session-1',
      client_id: 'client-3',
      first_token_at: Date.now(),
      last_token_at: Date.now(),
      last_seen_at: null,
      client_name: 'Test Client 3',
      backchannel_logout_uri: null,
      backchannel_logout_session_required: false,
      frontchannel_logout_uri: null, // No frontchannel logout
      frontchannel_logout_session_required: false,
    },
  ];

  it('should build iframes for clients with frontchannel_logout_uri', () => {
    const iframes = buildFrontchannelLogoutIframes(
      mockClients,
      'https://op.example.com',
      'session-1'
    );

    expect(iframes).toHaveLength(2);
    expect(iframes[0].clientId).toBe('client-1');
    expect(iframes[1].clientId).toBe('client-2');
  });

  it('should include sid for clients that require it', () => {
    const iframes = buildFrontchannelLogoutIframes(
      mockClients,
      'https://op.example.com',
      'session-1'
    );

    // Client 1 requires session
    const url1 = new URL(iframes[0].logoutUri);
    expect(url1.searchParams.get('sid')).toBe('session-1');

    // Client 2 does not require session
    const url2 = new URL(iframes[1].logoutUri);
    expect(url2.searchParams.get('sid')).toBeNull();
  });

  it('should skip clients without frontchannel_logout_uri', () => {
    const iframes = buildFrontchannelLogoutIframes(
      mockClients,
      'https://op.example.com',
      'session-1'
    );

    const clientIds = iframes.map((i) => i.clientId);
    expect(clientIds).not.toContain('client-3');
  });
});

describe('generateFrontchannelLogoutHtml', () => {
  const mockConfig: FrontchannelLogoutConfig = {
    enabled: true,
    iframe_timeout_ms: 3000,
    max_concurrent_iframes: 10,
  };

  const mockIframes = [
    {
      clientId: 'client-1',
      logoutUri: 'https://client1.example.com/logout?iss=https://op.example.com&sid=session-1',
      sessionRequired: true,
    },
    {
      clientId: 'client-2',
      logoutUri: 'https://client2.example.com/logout?iss=https://op.example.com',
      sessionRequired: false,
    },
  ];

  it('should generate valid HTML', () => {
    const html = generateFrontchannelLogoutHtml(
      mockIframes,
      mockConfig,
      'https://rp.example.com/callback'
    );

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html');
    expect(html).toContain('</html>');
  });

  it('should include iframes for each client', () => {
    const html = generateFrontchannelLogoutHtml(
      mockIframes,
      mockConfig,
      'https://rp.example.com/callback'
    );

    expect(html).toContain('logout-frame-0');
    expect(html).toContain('logout-frame-1');
    expect(html).toContain('client1.example.com');
    expect(html).toContain('client2.example.com');
  });

  it('should include redirect URL', () => {
    const html = generateFrontchannelLogoutHtml(
      mockIframes,
      mockConfig,
      'https://rp.example.com/callback'
    );

    expect(html).toContain('https://rp.example.com/callback');
  });

  it('should include state in redirect URL', () => {
    const html = generateFrontchannelLogoutHtml(
      mockIframes,
      mockConfig,
      'https://rp.example.com/callback',
      'mystate123'
    );

    expect(html).toContain('state=mystate123');
  });

  it('should include timeout value', () => {
    const html = generateFrontchannelLogoutHtml(
      mockIframes,
      mockConfig,
      'https://rp.example.com/callback'
    );

    expect(html).toContain('3000');
  });

  it('should limit iframes to max_concurrent_iframes', () => {
    const manyIframes = Array.from({ length: 20 }, (_, i) => ({
      clientId: `client-${i}`,
      logoutUri: `https://client${i}.example.com/logout`,
      sessionRequired: false,
    }));

    const html = generateFrontchannelLogoutHtml(
      manyIframes,
      { ...mockConfig, max_concurrent_iframes: 5 },
      'https://rp.example.com/callback'
    );

    // Should only have 5 iframes
    const iframeCount = (html.match(/logout-frame-/g) || []).length;
    expect(iframeCount).toBe(5);
  });

  it('should escape HTML in URLs', () => {
    const iframesWithSpecialChars = [
      {
        clientId: 'client-1',
        logoutUri: 'https://example.com/logout?param=<script>alert(1)</script>',
        sessionRequired: false,
      },
    ];

    const html = generateFrontchannelLogoutHtml(
      iframesWithSpecialChars,
      mockConfig,
      'https://rp.example.com/callback'
    );

    // The malicious script in the URL should be escaped
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    // The escaped version should be in the iframe src attribute
    expect(html).toContain(
      'src="https://example.com/logout?param=&lt;script&gt;alert(1)&lt;/script&gt;"'
    );
  });
});

describe('shouldUseFrontchannelLogout', () => {
  const mockConfig: FrontchannelLogoutConfig = {
    enabled: true,
    iframe_timeout_ms: 3000,
    max_concurrent_iframes: 10,
  };

  it('should return false when disabled', () => {
    const clients: SessionClientWithDetails[] = [
      {
        id: 'sc-1',
        session_id: 'session-1',
        client_id: 'client-1',
        first_token_at: Date.now(),
        last_token_at: Date.now(),
        last_seen_at: null,
        client_name: 'Test Client',
        backchannel_logout_uri: null,
        backchannel_logout_session_required: false,
        frontchannel_logout_uri: 'https://example.com/logout',
        frontchannel_logout_session_required: false,
      },
    ];

    expect(shouldUseFrontchannelLogout(clients, { ...mockConfig, enabled: false })).toBe(false);
  });

  it('should return false when no clients have frontchannel_logout_uri', () => {
    const clients: SessionClientWithDetails[] = [
      {
        id: 'sc-1',
        session_id: 'session-1',
        client_id: 'client-1',
        first_token_at: Date.now(),
        last_token_at: Date.now(),
        last_seen_at: null,
        client_name: 'Test Client',
        backchannel_logout_uri: null,
        backchannel_logout_session_required: false,
        frontchannel_logout_uri: null,
        frontchannel_logout_session_required: false,
      },
    ];

    expect(shouldUseFrontchannelLogout(clients, mockConfig)).toBe(false);
  });

  it('should return true when clients have frontchannel_logout_uri', () => {
    const clients: SessionClientWithDetails[] = [
      {
        id: 'sc-1',
        session_id: 'session-1',
        client_id: 'client-1',
        first_token_at: Date.now(),
        last_token_at: Date.now(),
        last_seen_at: null,
        client_name: 'Test Client',
        backchannel_logout_uri: null,
        backchannel_logout_session_required: false,
        frontchannel_logout_uri: 'https://example.com/logout',
        frontchannel_logout_session_required: false,
      },
    ];

    expect(shouldUseFrontchannelLogout(clients, mockConfig)).toBe(true);
  });
});
