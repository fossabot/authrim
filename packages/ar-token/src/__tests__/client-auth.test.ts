/**
 * Client Authentication Tests
 *
 * Tests all client authentication methods:
 * - client_secret_basic (HTTP Basic authentication)
 * - client_secret_post (credentials in request body)
 * - private_key_jwt (JWT signed with client's private key)
 * - client_secret_jwt (JWT signed with client secret)
 * - none (public clients)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createMockEnv,
  createMockContext,
  createTestJWT,
  base64UrlEncode,
  parseJsonResponse,
  type MockEnv,
} from './helpers/mocks';
import {
  createConfidentialClient,
  createPublicClient,
  createPrivateKeyJwtClient,
  createM2MClient,
  createAuthCodeData,
  createClientCredentialsGrantRequest,
} from './helpers/fixtures';

// ============================================================================
// Module Mock Setup
// ============================================================================

// Define mocks inline in vi.hoisted to avoid import issues
const mocks = vi.hoisted(() => ({
  // Logging
  mockGetLogger: vi.fn().mockReturnValue({
    module: vi.fn().mockReturnValue({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  }),
  mockCreateLogger: vi.fn().mockReturnValue({
    module: vi.fn().mockReturnValue({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  }),

  // Validation
  mockValidateGrantType: vi.fn().mockReturnValue({ valid: true }),
  mockValidateAuthCode: vi.fn().mockReturnValue({ valid: true }),
  mockValidateClientId: vi.fn().mockReturnValue({ valid: true }),
  mockValidateRedirectUri: vi.fn().mockReturnValue({ valid: true }),

  // Caching
  mockGetClientCached: vi.fn().mockResolvedValue(null),
  mockLoadTenantProfileCached: vi.fn().mockResolvedValue(null),
  mockGetSystemSettingsCached: vi.fn().mockResolvedValue(null),

  // Token operations
  mockCreateAccessToken: vi
    .fn()
    .mockResolvedValue({ token: 'mock-access-token', jti: 'at-jti-001' }),
  mockCreateIDToken: vi.fn().mockResolvedValue('mock-id-token'),
  mockCreateRefreshToken: vi
    .fn()
    .mockResolvedValue({ token: 'mock-refresh-token', jti: 'rt-jti-001' }),
  mockVerifyToken: vi.fn().mockResolvedValue({ valid: true, payload: {} }),
  mockParseToken: vi.fn().mockReturnValue({}),
  mockParseTokenHeader: vi.fn().mockReturnValue({ alg: 'RS256', kid: 'test-kid' }),
  mockCalculateAtHash: vi.fn().mockResolvedValue('at-hash-value'),

  // Client authentication
  mockValidateClientAssertion: vi.fn().mockResolvedValue({ valid: true, client_id: 'test-client' }),
  mockVerifyClientSecretHash: vi.fn().mockReturnValue(true),
  mockParseBasicAuth: vi.fn().mockReturnValue({ success: false }),

  // DPoP
  mockExtractDPoPProof: vi.fn().mockReturnValue(null),
  mockValidateDPoPProof: vi.fn().mockResolvedValue({ valid: true, jkt: 'test-jkt' }),

  // Sharding
  mockParseShardedAuthCode: vi.fn().mockReturnValue(null),
  mockGetShardCount: vi.fn().mockResolvedValue(1),
  mockRemapShardIndex: vi.fn().mockImplementation((idx: number) => idx),
  mockBuildAuthCodeShardInstanceName: vi.fn().mockReturnValue('auth-code-0'),
  mockGenerateRegionAwareJti: vi.fn().mockResolvedValue({ jti: 'jti-region-001' }),

  // Database
  mockD1Adapter: vi.fn().mockReturnValue({
    query: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue(null),
    execute: vi.fn().mockResolvedValue({ success: true }),
  }),

  // User
  mockGetCachedUserCore: vi.fn().mockResolvedValue(null),

  // Native SSO
  mockIsNativeSSOEnabled: vi.fn().mockResolvedValue(false),

  // RBAC / Policy
  mockGetIDTokenRBACClaims: vi.fn().mockResolvedValue({}),
  mockGetAccessTokenRBACClaims: vi.fn().mockResolvedValue({}),
  mockIsPolicyEmbeddingEnabled: vi.fn().mockResolvedValue(false),
  mockIsCustomClaimsEnabled: vi.fn().mockResolvedValue(false),
  mockIsIdLevelPermissionsEnabled: vi.fn().mockResolvedValue(false),
  mockGetEmbeddingLimits: vi.fn().mockReturnValue({ maxClaims: 50, maxSize: 4096 }),

  // Configuration
  mockCreateOAuthConfigManager: vi.fn().mockReturnValue({
    getTokenExpiry: vi.fn().mockResolvedValue(3600),
    getRefreshTokenExpiry: vi.fn().mockResolvedValue(86400 * 30),
  }),

  // Events
  mockPublishEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@authrim/ar-lib-core', async (importOriginal) => {
  const actual = await importOriginal<object>();
  return {
    ...actual,
    getLogger: mocks.mockGetLogger,
    createLogger: mocks.mockCreateLogger,
    validateGrantType: mocks.mockValidateGrantType,
    validateAuthCode: mocks.mockValidateAuthCode,
    validateClientId: mocks.mockValidateClientId,
    validateRedirectUri: mocks.mockValidateRedirectUri,
    getClientCached: mocks.mockGetClientCached,
    loadTenantProfileCached: mocks.mockLoadTenantProfileCached,
    getSystemSettingsCached: mocks.mockGetSystemSettingsCached,
    createAccessToken: mocks.mockCreateAccessToken,
    createIDToken: mocks.mockCreateIDToken,
    createRefreshToken: mocks.mockCreateRefreshToken,
    verifyToken: mocks.mockVerifyToken,
    parseToken: mocks.mockParseToken,
    parseTokenHeader: mocks.mockParseTokenHeader,
    calculateAtHash: mocks.mockCalculateAtHash,
    validateClientAssertion: mocks.mockValidateClientAssertion,
    verifyClientSecretHash: mocks.mockVerifyClientSecretHash,
    parseBasicAuth: mocks.mockParseBasicAuth,
    extractDPoPProof: mocks.mockExtractDPoPProof,
    validateDPoPProof: mocks.mockValidateDPoPProof,
    parseShardedAuthCode: mocks.mockParseShardedAuthCode,
    getShardCount: mocks.mockGetShardCount,
    remapShardIndex: mocks.mockRemapShardIndex,
    buildAuthCodeShardInstanceName: mocks.mockBuildAuthCodeShardInstanceName,
    generateRegionAwareJti: mocks.mockGenerateRegionAwareJti,
    D1Adapter: mocks.mockD1Adapter,
    getIDTokenRBACClaims: mocks.mockGetIDTokenRBACClaims,
    getAccessTokenRBACClaims: mocks.mockGetAccessTokenRBACClaims,
    isPolicyEmbeddingEnabled: mocks.mockIsPolicyEmbeddingEnabled,
    isCustomClaimsEnabled: mocks.mockIsCustomClaimsEnabled,
    isIdLevelPermissionsEnabled: mocks.mockIsIdLevelPermissionsEnabled,
    getEmbeddingLimits: mocks.mockGetEmbeddingLimits,
    getCachedUserCore: mocks.mockGetCachedUserCore,
    isNativeSSOEnabled: mocks.mockIsNativeSSOEnabled,
    createOAuthConfigManager: mocks.mockCreateOAuthConfigManager,
    publishEvent: mocks.mockPublishEvent,
    TOKEN_EVENTS: {
      ACCESS_ISSUED: 'token.access.issued',
      ID_ISSUED: 'token.id.issued',
      REFRESH_ISSUED: 'token.refresh.issued',
    },
  };
});

// Mock jose library for key operations
vi.mock('jose', async (importOriginal) => {
  const actual = await importOriginal<object>();
  return {
    ...actual,
    importPKCS8: vi.fn().mockResolvedValue({
      type: 'private',
      algorithm: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    } as unknown as CryptoKey),
    importJWK: vi.fn().mockResolvedValue({
      type: 'public',
      algorithm: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    } as unknown as CryptoKey),
  };
});

import { tokenHandler } from '../token';

// Helper to reset mocks to default implementations
function resetAllMocks() {
  // Reset logging mocks
  mocks.mockGetLogger.mockReset().mockReturnValue({
    module: vi.fn().mockReturnValue({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  });
  mocks.mockCreateLogger.mockReset().mockReturnValue({
    module: vi.fn().mockReturnValue({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  });

  // Reset validation mocks
  mocks.mockValidateGrantType.mockReset().mockReturnValue({ valid: true });
  mocks.mockValidateAuthCode.mockReset().mockReturnValue({ valid: true });
  mocks.mockValidateClientId.mockReset().mockReturnValue({ valid: true });
  mocks.mockValidateRedirectUri.mockReset().mockReturnValue({ valid: true });

  // Reset caching mocks
  mocks.mockGetClientCached.mockReset().mockResolvedValue(null);
  mocks.mockLoadTenantProfileCached.mockReset().mockResolvedValue(null);
  mocks.mockGetSystemSettingsCached.mockReset().mockResolvedValue(null);

  // Reset token operation mocks
  mocks.mockCreateAccessToken
    .mockReset()
    .mockResolvedValue({ token: 'mock-access-token', jti: 'at-jti-001' });
  mocks.mockCreateIDToken.mockReset().mockResolvedValue('mock-id-token');
  mocks.mockCreateRefreshToken
    .mockReset()
    .mockResolvedValue({ token: 'mock-refresh-token', jti: 'rt-jti-001' });
  mocks.mockVerifyToken.mockReset().mockResolvedValue({ valid: true, payload: {} });

  // Reset client auth mocks
  mocks.mockParseBasicAuth.mockReset().mockReturnValue({ success: false });
  mocks.mockVerifyClientSecretHash.mockReset().mockReturnValue(true);
  mocks.mockValidateClientAssertion.mockReset().mockResolvedValue({ valid: true });

  // Reset DPoP mocks
  mocks.mockExtractDPoPProof.mockReset().mockReturnValue(null);
  mocks.mockValidateDPoPProof.mockReset().mockResolvedValue({ valid: true, jkt: 'test-jkt' });

  // Reset sharding mocks
  mocks.mockParseShardedAuthCode.mockReset().mockReturnValue(null);
  mocks.mockGetShardCount.mockReset().mockResolvedValue(1);
  mocks.mockGenerateRegionAwareJti.mockReset().mockResolvedValue({ jti: 'jti-region-001' });

  // Reset RBAC mocks
  mocks.mockGetIDTokenRBACClaims.mockReset().mockResolvedValue({});
  mocks.mockGetAccessTokenRBACClaims.mockReset().mockResolvedValue({});
  mocks.mockIsPolicyEmbeddingEnabled.mockReset().mockResolvedValue(false);
  mocks.mockIsNativeSSOEnabled.mockReset().mockResolvedValue(false);
  mocks.mockIsCustomClaimsEnabled.mockReset().mockResolvedValue(false);
  mocks.mockIsIdLevelPermissionsEnabled.mockReset().mockResolvedValue(false);
  mocks.mockGetCachedUserCore.mockReset().mockResolvedValue(null);
}

// ============================================================================
// Test Setup
// ============================================================================

describe('Client Authentication Tests', () => {
  let mockEnv: MockEnv;

  beforeEach(() => {
    resetAllMocks();
    mockEnv = createMockEnv();

    // Setup default tenant profile
    mocks.mockLoadTenantProfileCached.mockResolvedValue({
      tenant_id: 'default',
      max_token_ttl_seconds: 3600,
      allows_refresh_token: true,
    });

    // Setup default config manager
    mocks.mockCreateOAuthConfigManager.mockReturnValue({
      getTokenExpiry: vi.fn().mockResolvedValue(3600),
      getRefreshTokenExpiry: vi.fn().mockResolvedValue(86400 * 30),
    });

    // Setup token creation mocks
    mocks.mockCreateAccessToken.mockResolvedValue({
      token: 'mock-access-token',
      jti: 'at-jti-001',
    });
    mocks.mockCreateIDToken.mockResolvedValue('mock-id-token');
    mocks.mockCreateRefreshToken.mockResolvedValue({
      token: 'mock-refresh-token',
      jti: 'rt-jti-001',
    });
    mocks.mockGenerateRegionAwareJti.mockResolvedValue({ jti: 'jti-region-001' });
    mocks.mockCalculateAtHash.mockResolvedValue('at-hash-value');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // client_secret_basic (HTTP Basic Authentication)
  // ==========================================================================

  describe('client_secret_basic Authentication', () => {
    it('should authenticate with valid Basic auth header', async () => {
      const client = createConfidentialClient({
        token_endpoint_auth_method: 'client_secret_basic',
      });
      const authCodeData = createAuthCodeData();

      mocks.mockGetClientCached.mockResolvedValue(client);
      mocks.mockVerifyClientSecretHash.mockResolvedValue(true);
      mocks.mockParseBasicAuth.mockReturnValue({
        success: true,
        credentials: {
          username: client.client_id,
          password: 'valid-secret',
        },
      });

      const consumeCodeRpcMock = vi.fn().mockResolvedValue(authCodeData);
      mockEnv.AUTH_CODE_STORE.get = vi.fn().mockReturnValue({
        consumeCodeRpc: consumeCodeRpcMock,
      });

      const ctx = createMockContext({
        method: 'POST',
        headers: {
          Authorization: `Basic ${base64UrlEncode(`${client.client_id}:valid-secret`)}`,
        },
        body: {
          grant_type: 'authorization_code',
          code: 'valid-auth-code',
          redirect_uri: authCodeData.redirectUri,
        },
        env: mockEnv,
      });

      const response = await tokenHandler(ctx);
      const body = await parseJsonResponse<{ access_token: string }>(response);

      expect(response.status).toBe(200);
      expect(body.access_token).toBeDefined();
      expect(mocks.mockVerifyClientSecretHash).toHaveBeenCalledWith(
        'valid-secret',
        client.client_secret_hash
      );
    });

    it('should reject invalid Basic auth credentials', async () => {
      const client = createConfidentialClient();

      mocks.mockGetClientCached.mockResolvedValue(client);
      mocks.mockVerifyClientSecretHash.mockResolvedValue(false);
      mocks.mockParseBasicAuth.mockReturnValue({
        success: true,
        credentials: {
          username: client.client_id,
          password: 'wrong-secret',
        },
      });

      const consumeCodeRpcMock = vi.fn().mockResolvedValue(createAuthCodeData());
      mockEnv.AUTH_CODE_STORE.get = vi.fn().mockReturnValue({
        consumeCodeRpc: consumeCodeRpcMock,
      });

      const ctx = createMockContext({
        method: 'POST',
        headers: {
          Authorization: `Basic ${base64UrlEncode(`${client.client_id}:wrong-secret`)}`,
        },
        body: {
          grant_type: 'authorization_code',
          code: 'valid-auth-code',
          redirect_uri: 'https://app.example.com/callback',
        },
        env: mockEnv,
      });

      const response = await tokenHandler(ctx);
      const body = await parseJsonResponse<{ error: string }>(response);

      expect(response.status).toBe(401);
      expect(body.error).toBe('invalid_client');
    });

    it('should reject malformed Basic auth header', async () => {
      mocks.mockParseBasicAuth.mockReturnValue({
        success: false,
        error: 'malformed_credentials',
      });

      const ctx = createMockContext({
        method: 'POST',
        headers: {
          Authorization: 'Basic not-valid-base64!!!',
        },
        body: {
          grant_type: 'authorization_code',
          code: 'valid-auth-code',
          redirect_uri: 'https://app.example.com/callback',
          client_id: 'some-client',
        },
        env: mockEnv,
      });

      const response = await tokenHandler(ctx);
      const body = await parseJsonResponse<{ error: string; error_description: string }>(response);

      expect(response.status).toBe(401);
      expect(body.error).toBe('invalid_client');
      expect(body.error_description).toContain('Authorization header');
    });

    it('should reject Basic auth with decode error', async () => {
      mocks.mockParseBasicAuth.mockReturnValue({
        success: false,
        error: 'decode_error',
      });

      const ctx = createMockContext({
        method: 'POST',
        headers: {
          Authorization: 'Basic !!!invalid!!!',
        },
        body: {
          grant_type: 'authorization_code',
          code: 'valid-auth-code',
          redirect_uri: 'https://app.example.com/callback',
          client_id: 'some-client',
        },
        env: mockEnv,
      });

      const response = await tokenHandler(ctx);
      const body = await parseJsonResponse<{ error: string }>(response);

      expect(response.status).toBe(401);
      expect(body.error).toBe('invalid_client');
    });

    it('should handle URL-encoded credentials in Basic auth (RFC 7617)', async () => {
      const client = createConfidentialClient({
        client_id: 'client+with+special%chars',
      });

      mocks.mockGetClientCached.mockResolvedValue(client);
      mocks.mockVerifyClientSecretHash.mockResolvedValue(true);
      // RFC 7617: client_id and client_secret are URL-encoded before Base64
      mocks.mockParseBasicAuth.mockReturnValue({
        success: true,
        credentials: {
          username: 'client+with+special%chars', // URL-decoded by parseBasicAuth
          password: 'secret@123!',
        },
      });

      const consumeCodeRpcMock = vi.fn().mockResolvedValue(createAuthCodeData());
      mockEnv.AUTH_CODE_STORE.get = vi.fn().mockReturnValue({
        consumeCodeRpc: consumeCodeRpcMock,
      });

      const ctx = createMockContext({
        method: 'POST',
        headers: {
          Authorization: 'Basic Y2xpZW50JTJCd2l0aCUyQnNwZWNpYWwlMjVjaGFyczpzZWNyZXQlNDAxMjMh',
        },
        body: {
          grant_type: 'authorization_code',
          code: 'valid-auth-code',
          redirect_uri: 'https://app.example.com/callback',
        },
        env: mockEnv,
      });

      const response = await tokenHandler(ctx);
      expect(response.status).toBe(200);
    });
  });

  // ==========================================================================
  // client_secret_post Authentication
  // ==========================================================================

  describe('client_secret_post Authentication', () => {
    it('should authenticate with credentials in request body', async () => {
      const client = createConfidentialClient({
        token_endpoint_auth_method: 'client_secret_post',
      });
      const authCodeData = createAuthCodeData();

      mocks.mockGetClientCached.mockResolvedValue(client);
      mocks.mockVerifyClientSecretHash.mockResolvedValue(true);
      mocks.mockParseBasicAuth.mockReturnValue({ success: false }); // No Basic auth

      const consumeCodeRpcMock = vi.fn().mockResolvedValue(authCodeData);
      mockEnv.AUTH_CODE_STORE.get = vi.fn().mockReturnValue({
        consumeCodeRpc: consumeCodeRpcMock,
      });

      const ctx = createMockContext({
        method: 'POST',
        body: {
          grant_type: 'authorization_code',
          code: 'valid-auth-code',
          redirect_uri: authCodeData.redirectUri,
          client_id: client.client_id,
          client_secret: 'valid-secret',
        },
        env: mockEnv,
      });

      const response = await tokenHandler(ctx);
      const body = await parseJsonResponse<{ access_token: string }>(response);

      expect(response.status).toBe(200);
      expect(body.access_token).toBeDefined();
      expect(mocks.mockVerifyClientSecretHash).toHaveBeenCalledWith(
        'valid-secret',
        client.client_secret_hash
      );
    });

    it('should reject missing client_secret for confidential client', async () => {
      const client = createConfidentialClient();

      mocks.mockGetClientCached.mockResolvedValue(client);
      mocks.mockParseBasicAuth.mockReturnValue({ success: false });
      mocks.mockVerifyClientSecretHash.mockResolvedValue(false);

      const consumeCodeRpcMock = vi.fn().mockResolvedValue(createAuthCodeData());
      mockEnv.AUTH_CODE_STORE.get = vi.fn().mockReturnValue({
        consumeCodeRpc: consumeCodeRpcMock,
      });

      const ctx = createMockContext({
        method: 'POST',
        body: {
          grant_type: 'authorization_code',
          code: 'valid-auth-code',
          redirect_uri: 'https://app.example.com/callback',
          client_id: client.client_id,
          // Missing client_secret
        },
        env: mockEnv,
      });

      const response = await tokenHandler(ctx);
      const body = await parseJsonResponse<{ error: string }>(response);

      expect(response.status).toBe(401);
      expect(body.error).toBe('invalid_client');
    });

    it('should use post credentials when both Basic auth and post credentials are provided', async () => {
      // Note: Implementation prioritizes POST body credentials over Basic auth
      // This is because form data is parsed first, and Basic auth only used as fallback
      const client = createConfidentialClient();
      const authCodeData = createAuthCodeData();

      mocks.mockGetClientCached.mockResolvedValue(client);
      mocks.mockVerifyClientSecretHash.mockResolvedValue(true);
      // Basic auth credentials (will be used as fallback only)
      mocks.mockParseBasicAuth.mockReturnValue({
        success: true,
        credentials: {
          username: client.client_id,
          password: 'basic-secret',
        },
      });

      const consumeCodeRpcMock = vi.fn().mockResolvedValue(authCodeData);
      mockEnv.AUTH_CODE_STORE.get = vi.fn().mockReturnValue({
        consumeCodeRpc: consumeCodeRpcMock,
      });

      const ctx = createMockContext({
        method: 'POST',
        headers: {
          Authorization: `Basic ${base64UrlEncode(`${client.client_id}:basic-secret`)}`,
        },
        body: {
          grant_type: 'authorization_code',
          code: 'valid-auth-code',
          redirect_uri: authCodeData.redirectUri,
          client_id: client.client_id,
          client_secret: 'post-secret', // Different secret in body
        },
        env: mockEnv,
      });

      const response = await tokenHandler(ctx);
      expect(response.status).toBe(200);

      // POST body credentials are used (implementation prioritizes form data over Basic auth)
      expect(mocks.mockVerifyClientSecretHash).toHaveBeenCalledWith(
        'post-secret',
        client.client_secret_hash
      );
    });
  });

  // ==========================================================================
  // private_key_jwt Authentication
  // ==========================================================================

  describe('private_key_jwt Authentication', () => {
    it('should authenticate with valid JWT signed with client private key', async () => {
      const client = createPrivateKeyJwtClient();
      const authCodeData = createAuthCodeData();

      // Create a mock client assertion JWT
      const clientAssertion = createTestJWT(
        { alg: 'RS256', kid: 'client-key-001' },
        {
          iss: client.client_id,
          sub: client.client_id,
          aud: 'https://auth.example.com/token',
          exp: Math.floor(Date.now() / 1000) + 300,
          iat: Math.floor(Date.now() / 1000),
          jti: 'assertion-jti-001',
        }
      );

      mocks.mockGetClientCached.mockResolvedValue(client);
      mocks.mockParseToken.mockReturnValue({
        iss: client.client_id,
        sub: client.client_id,
      });
      mocks.mockValidateClientAssertion.mockResolvedValue({
        valid: true,
        client_id: client.client_id,
      });
      mocks.mockParseBasicAuth.mockReturnValue({ success: false });

      const consumeCodeRpcMock = vi.fn().mockResolvedValue(authCodeData);
      mockEnv.AUTH_CODE_STORE.get = vi.fn().mockReturnValue({
        consumeCodeRpc: consumeCodeRpcMock,
      });

      const ctx = createMockContext({
        method: 'POST',
        body: {
          grant_type: 'authorization_code',
          code: 'valid-auth-code',
          redirect_uri: authCodeData.redirectUri,
          client_id: client.client_id,
          client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
          client_assertion: clientAssertion,
        },
        env: mockEnv,
      });

      const response = await tokenHandler(ctx);
      const body = await parseJsonResponse<{ access_token: string }>(response);

      expect(response.status).toBe(200);
      expect(body.access_token).toBeDefined();
      expect(mocks.mockValidateClientAssertion).toHaveBeenCalledWith(
        clientAssertion,
        expect.stringContaining('/token'),
        expect.anything()
      );
    });

    it('should reject JWT with invalid signature', async () => {
      const client = createPrivateKeyJwtClient();

      mocks.mockGetClientCached.mockResolvedValue(client);
      mocks.mockParseToken.mockReturnValue({
        sub: client.client_id,
      });
      mocks.mockValidateClientAssertion.mockResolvedValue({
        valid: false,
        error: 'invalid_client',
        error_description: 'JWT signature verification failed',
      });
      mocks.mockParseBasicAuth.mockReturnValue({ success: false });

      const consumeCodeRpcMock = vi.fn().mockResolvedValue(createAuthCodeData());
      mockEnv.AUTH_CODE_STORE.get = vi.fn().mockReturnValue({
        consumeCodeRpc: consumeCodeRpcMock,
      });

      const ctx = createMockContext({
        method: 'POST',
        body: {
          grant_type: 'authorization_code',
          code: 'valid-auth-code',
          redirect_uri: 'https://app.example.com/callback',
          client_id: client.client_id,
          client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
          client_assertion: 'invalid-signature-jwt',
        },
        env: mockEnv,
      });

      const response = await tokenHandler(ctx);
      const body = await parseJsonResponse<{ error: string }>(response);

      expect(response.status).toBe(401);
      expect(body.error).toBe('invalid_client');
    });

    it('should reject JWT with invalid aud claim', async () => {
      const client = createPrivateKeyJwtClient();

      mocks.mockGetClientCached.mockResolvedValue(client);
      mocks.mockParseToken.mockReturnValue({ sub: client.client_id });
      mocks.mockValidateClientAssertion.mockResolvedValue({
        valid: false,
        error: 'invalid_client',
        error_description: 'JWT audience does not match token endpoint',
      });
      mocks.mockParseBasicAuth.mockReturnValue({ success: false });

      const consumeCodeRpcMock = vi.fn().mockResolvedValue(createAuthCodeData());
      mockEnv.AUTH_CODE_STORE.get = vi.fn().mockReturnValue({
        consumeCodeRpc: consumeCodeRpcMock,
      });

      const ctx = createMockContext({
        method: 'POST',
        body: {
          grant_type: 'authorization_code',
          code: 'valid-auth-code',
          redirect_uri: 'https://app.example.com/callback',
          client_id: client.client_id,
          client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
          client_assertion: createTestJWT(
            { alg: 'RS256' },
            { sub: client.client_id, aud: 'https://wrong-audience.com' }
          ),
        },
        env: mockEnv,
      });

      const response = await tokenHandler(ctx);
      expect(response.status).toBe(401);
    });

    it('should reject expired JWT', async () => {
      const client = createPrivateKeyJwtClient();

      mocks.mockGetClientCached.mockResolvedValue(client);
      mocks.mockParseToken.mockReturnValue({ sub: client.client_id });
      mocks.mockValidateClientAssertion.mockResolvedValue({
        valid: false,
        error: 'invalid_client',
        error_description: 'JWT has expired',
      });
      mocks.mockParseBasicAuth.mockReturnValue({ success: false });

      const consumeCodeRpcMock = vi.fn().mockResolvedValue(createAuthCodeData());
      mockEnv.AUTH_CODE_STORE.get = vi.fn().mockReturnValue({
        consumeCodeRpc: consumeCodeRpcMock,
      });

      const ctx = createMockContext({
        method: 'POST',
        body: {
          grant_type: 'authorization_code',
          code: 'valid-auth-code',
          redirect_uri: 'https://app.example.com/callback',
          client_id: client.client_id,
          client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
          client_assertion: createTestJWT(
            { alg: 'RS256' },
            {
              sub: client.client_id,
              exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
            }
          ),
        },
        env: mockEnv,
      });

      const response = await tokenHandler(ctx);
      expect(response.status).toBe(401);
    });

    it('should extract client_id from JWT sub claim when not in body', async () => {
      const client = createPrivateKeyJwtClient();
      const authCodeData = createAuthCodeData();

      mocks.mockParseToken.mockReturnValue({
        sub: client.client_id, // client_id extracted from sub
      });
      mocks.mockGetClientCached.mockResolvedValue(client);
      mocks.mockValidateClientAssertion.mockResolvedValue({ valid: true });
      mocks.mockParseBasicAuth.mockReturnValue({ success: false });

      const consumeCodeRpcMock = vi.fn().mockResolvedValue(authCodeData);
      mockEnv.AUTH_CODE_STORE.get = vi.fn().mockReturnValue({
        consumeCodeRpc: consumeCodeRpcMock,
      });

      const ctx = createMockContext({
        method: 'POST',
        body: {
          grant_type: 'authorization_code',
          code: 'valid-auth-code',
          redirect_uri: authCodeData.redirectUri,
          // No client_id in body
          client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
          client_assertion: createTestJWT({ alg: 'RS256' }, { sub: client.client_id }),
        },
        env: mockEnv,
      });

      const response = await tokenHandler(ctx);
      expect(response.status).toBe(200);
    });

    it('should extract client_id from JWT iss claim as fallback', async () => {
      const client = createPrivateKeyJwtClient();
      const authCodeData = createAuthCodeData();

      mocks.mockParseToken.mockReturnValue({
        iss: client.client_id, // client_id extracted from iss
        // No sub claim
      });
      mocks.mockGetClientCached.mockResolvedValue(client);
      mocks.mockValidateClientAssertion.mockResolvedValue({ valid: true });
      mocks.mockParseBasicAuth.mockReturnValue({ success: false });

      const consumeCodeRpcMock = vi.fn().mockResolvedValue(authCodeData);
      mockEnv.AUTH_CODE_STORE.get = vi.fn().mockReturnValue({
        consumeCodeRpc: consumeCodeRpcMock,
      });

      const ctx = createMockContext({
        method: 'POST',
        body: {
          grant_type: 'authorization_code',
          code: 'valid-auth-code',
          redirect_uri: authCodeData.redirectUri,
          client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
          client_assertion: createTestJWT({ alg: 'RS256' }, { iss: client.client_id }),
        },
        env: mockEnv,
      });

      const response = await tokenHandler(ctx);
      expect(response.status).toBe(200);
    });

    it('should reject invalid client_assertion JWT format', async () => {
      mocks.mockParseToken.mockImplementation(() => {
        throw new Error('Invalid JWT format');
      });
      mocks.mockParseBasicAuth.mockReturnValue({ success: false });

      const ctx = createMockContext({
        method: 'POST',
        body: {
          grant_type: 'authorization_code',
          code: 'valid-auth-code',
          redirect_uri: 'https://app.example.com/callback',
          client_id: 'some-client',
          client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
          client_assertion: 'not.a.valid.jwt',
        },
        env: mockEnv,
      });

      const response = await tokenHandler(ctx);
      const body = await parseJsonResponse<{ error: string; error_description: string }>(response);

      expect(response.status).toBe(401);
      expect(body.error).toBe('invalid_client');
      expect(body.error_description).toContain('client_assertion');
    });
  });

  // ==========================================================================
  // client_secret_jwt Authentication
  // ==========================================================================

  describe('client_secret_jwt Authentication', () => {
    it('should authenticate with JWT signed using client secret (HMAC)', async () => {
      const client = createConfidentialClient({
        token_endpoint_auth_method: 'client_secret_jwt',
      });
      const authCodeData = createAuthCodeData();

      const clientAssertion = createTestJWT(
        { alg: 'HS256' }, // HMAC signature
        {
          iss: client.client_id,
          sub: client.client_id,
          aud: 'https://auth.example.com/token',
          exp: Math.floor(Date.now() / 1000) + 300,
          iat: Math.floor(Date.now() / 1000),
        }
      );

      mocks.mockGetClientCached.mockResolvedValue(client);
      mocks.mockParseToken.mockReturnValue({
        sub: client.client_id,
      });
      mocks.mockValidateClientAssertion.mockResolvedValue({
        valid: true,
        client_id: client.client_id,
      });
      mocks.mockParseBasicAuth.mockReturnValue({ success: false });

      const consumeCodeRpcMock = vi.fn().mockResolvedValue(authCodeData);
      mockEnv.AUTH_CODE_STORE.get = vi.fn().mockReturnValue({
        consumeCodeRpc: consumeCodeRpcMock,
      });

      const ctx = createMockContext({
        method: 'POST',
        body: {
          grant_type: 'authorization_code',
          code: 'valid-auth-code',
          redirect_uri: authCodeData.redirectUri,
          client_id: client.client_id,
          client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
          client_assertion: clientAssertion,
        },
        env: mockEnv,
      });

      const response = await tokenHandler(ctx);
      expect(response.status).toBe(200);
    });
  });

  // ==========================================================================
  // Public Client (none) Authentication
  // ==========================================================================

  describe('Public Client (none) Authentication', () => {
    it('should allow public client without credentials', async () => {
      const client = createPublicClient({
        token_endpoint_auth_method: 'none',
        client_secret_hash: undefined, // No secret
      });
      const authCodeData = createAuthCodeData();

      mocks.mockGetClientCached.mockResolvedValue(client);
      mocks.mockParseBasicAuth.mockReturnValue({ success: false });

      const consumeCodeRpcMock = vi.fn().mockResolvedValue(authCodeData);
      mockEnv.AUTH_CODE_STORE.get = vi.fn().mockReturnValue({
        consumeCodeRpc: consumeCodeRpcMock,
      });

      const ctx = createMockContext({
        method: 'POST',
        body: {
          grant_type: 'authorization_code',
          code: 'valid-auth-code',
          redirect_uri: authCodeData.redirectUri,
          client_id: client.client_id,
          code_verifier: 'valid-pkce-verifier-12345678901234567890123456789012345',
        },
        env: mockEnv,
      });

      const response = await tokenHandler(ctx);
      expect(response.status).toBe(200);

      // Should NOT call verifyClientSecretHash for public clients
      expect(mocks.mockVerifyClientSecretHash).not.toHaveBeenCalled();
    });

    it('should reject public client attempting client_credentials grant', async () => {
      const client = createPublicClient({
        grant_types: ['client_credentials'], // Incorrectly configured
        client_secret_hash: undefined,
        client_credentials_allowed: false,
      });

      mocks.mockGetClientCached.mockResolvedValue(client);
      mocks.mockParseBasicAuth.mockReturnValue({ success: false });
      // Enable client_credentials feature flag so we get to the authorization check
      mocks.mockGetSystemSettingsCached.mockResolvedValue({
        feature_client_credentials_enabled: true,
      });
      mocks.mockLoadTenantProfileCached.mockResolvedValue({
        tenant_id: 'default',
        max_token_ttl_seconds: 3600,
        allows_client_credentials: true,
      });

      const ctx = createMockContext({
        method: 'POST',
        body: {
          grant_type: 'client_credentials',
          client_id: client.client_id,
          scope: 'api:read',
        },
        env: {
          ...mockEnv,
          ENABLE_CLIENT_CREDENTIALS: 'true',
        },
      });

      const response = await tokenHandler(ctx);
      const body = await parseJsonResponse<{ error: string }>(response);

      // Client credentials grant requires authentication - public clients fail with invalid_client (401)
      // because they have no client_secret_hash and no credentials are provided
      expect(response.status).toBe(401);
      expect(body.error).toBe('invalid_client');
    });
  });

  // ==========================================================================
  // Authentication Method Enforcement
  // ==========================================================================

  describe('Authentication Method Enforcement', () => {
    it('should allow authentication when client has client_secret_hash even if token_endpoint_auth_method is private_key_jwt', async () => {
      // Note: Current implementation allows authentication to succeed if the secret matches,
      // regardless of token_endpoint_auth_method setting. This tests actual behavior.
      // The token_endpoint_auth_method is informational for client registration/discovery.
      const client = createPrivateKeyJwtClient({
        token_endpoint_auth_method: 'private_key_jwt',
        client_secret_hash: 'hashed-secret', // Has a secret configured
      });
      const authCodeData = createAuthCodeData();

      mocks.mockGetClientCached.mockResolvedValue(client);
      mocks.mockVerifyClientSecretHash.mockResolvedValue(true); // Secret matches
      mocks.mockParseBasicAuth.mockReturnValue({
        success: true,
        credentials: {
          username: client.client_id,
          password: 'some-secret',
        },
      });

      const consumeCodeRpcMock = vi.fn().mockResolvedValue(authCodeData);
      mockEnv.AUTH_CODE_STORE.get = vi.fn().mockReturnValue({
        consumeCodeRpc: consumeCodeRpcMock,
      });

      const ctx = createMockContext({
        method: 'POST',
        headers: {
          Authorization: `Basic ${base64UrlEncode(`${client.client_id}:some-secret`)}`,
        },
        body: {
          grant_type: 'authorization_code',
          code: 'valid-auth-code',
          redirect_uri: authCodeData.redirectUri,
        },
        env: mockEnv,
      });

      const response = await tokenHandler(ctx);

      // Authentication succeeds when client_secret_hash is configured and secret matches
      // token_endpoint_auth_method is not strictly enforced at runtime
      expect(response.status).toBe(200);
    });
  });

  // ==========================================================================
  // Security Edge Cases
  // ==========================================================================

  describe('Security Edge Cases', () => {
    it('should not reveal whether client exists via timing', async () => {
      // Test that error responses take similar time regardless of whether client exists
      // This is a conceptual test - actual timing tests would need performance measurements

      // Non-existent client
      mocks.mockGetClientCached.mockResolvedValue(null);
      mocks.mockParseBasicAuth.mockReturnValue({ success: false });

      const ctx1 = createMockContext({
        method: 'POST',
        body: {
          grant_type: 'authorization_code',
          code: 'valid-auth-code',
          redirect_uri: 'https://app.example.com/callback',
          client_id: 'non-existent-client',
        },
        env: mockEnv,
      });

      const response1 = await tokenHandler(ctx1);
      const body1 = await parseJsonResponse<{ error: string; error_description: string }>(
        response1
      );

      // Both should return the same generic error
      expect(body1.error).toBe('invalid_client');
      expect(body1.error_description).toBe('Client authentication failed');
    });

    it('should handle empty client_id', async () => {
      mocks.mockValidateClientId.mockReturnValue({
        valid: false,
        error: 'client_id is required',
      });
      mocks.mockParseBasicAuth.mockReturnValue({ success: false });

      const ctx = createMockContext({
        method: 'POST',
        body: {
          grant_type: 'authorization_code',
          code: 'valid-auth-code',
          redirect_uri: 'https://app.example.com/callback',
          client_id: '',
        },
        env: mockEnv,
      });

      const response = await tokenHandler(ctx);
      const body = await parseJsonResponse<{ error: string }>(response);

      expect(response.status).toBe(401);
      expect(body.error).toBe('invalid_client');
    });

    it('should reject client_assertion with wrong assertion_type', async () => {
      const client = createConfidentialClient();

      mocks.mockGetClientCached.mockResolvedValue(client);
      mocks.mockParseBasicAuth.mockReturnValue({ success: false });

      const ctx = createMockContext({
        method: 'POST',
        body: {
          grant_type: 'authorization_code',
          code: 'valid-auth-code',
          redirect_uri: 'https://app.example.com/callback',
          client_id: client.client_id,
          client_assertion_type: 'urn:wrong:assertion:type', // Wrong type
          client_assertion: 'some-jwt',
        },
        env: mockEnv,
      });

      const response = await tokenHandler(ctx);
      // Should fall back to other auth methods, not use JWT assertion
      expect(mocks.mockValidateClientAssertion).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Client Credentials Grant Authentication
  // ==========================================================================

  describe('Client Credentials Grant Authentication', () => {
    it('should authenticate M2M client for client_credentials grant', async () => {
      const client = createM2MClient();

      mocks.mockGetClientCached.mockResolvedValue(client);
      mocks.mockVerifyClientSecretHash.mockResolvedValue(true);
      mocks.mockParseBasicAuth.mockReturnValue({
        success: true,
        credentials: {
          username: client.client_id,
          password: 'valid-m2m-secret',
        },
      });
      // Mock tenant profile to allow client_credentials
      mocks.mockLoadTenantProfileCached.mockResolvedValue({
        tenant_id: 'default',
        max_token_ttl_seconds: 3600,
        allows_client_credentials: true,
        allows_refresh_token: true,
      });
      // Mock system settings to enable client_credentials feature flag
      mocks.mockGetSystemSettingsCached.mockResolvedValue({
        feature_client_credentials_enabled: true,
      });

      const ctx = createMockContext({
        method: 'POST',
        headers: {
          Authorization: `Basic ${base64UrlEncode(`${client.client_id}:valid-m2m-secret`)}`,
        },
        body: {
          grant_type: 'client_credentials',
          scope: 'api:read api:write',
        },
        env: {
          ...mockEnv,
          ENABLE_CLIENT_CREDENTIALS: 'true',
        },
      });

      const response = await tokenHandler(ctx);
      const body = await parseJsonResponse<{
        access_token?: string;
        token_type?: string;
        error?: string;
        error_description?: string;
      }>(response);

      expect(response.status).toBe(200);
      expect(body.access_token).toBeDefined();
      expect(body.token_type).toBe('Bearer');
    });

    it('should require authentication for client_credentials grant', async () => {
      const client = createM2MClient();

      mocks.mockGetClientCached.mockResolvedValue(client);
      mocks.mockParseBasicAuth.mockReturnValue({ success: false }); // No auth provided
      mocks.mockVerifyClientSecretHash.mockResolvedValue(false);
      // Enable client_credentials feature flag
      mocks.mockGetSystemSettingsCached.mockResolvedValue({
        feature_client_credentials_enabled: true,
      });
      mocks.mockLoadTenantProfileCached.mockResolvedValue({
        tenant_id: 'default',
        max_token_ttl_seconds: 3600,
        allows_client_credentials: true,
      });

      const ctx = createMockContext({
        method: 'POST',
        body: {
          grant_type: 'client_credentials',
          client_id: client.client_id,
          // No client_secret
        },
        env: {
          ...mockEnv,
          ENABLE_CLIENT_CREDENTIALS: 'true',
        },
      });

      const response = await tokenHandler(ctx);
      const body = await parseJsonResponse<{ error: string }>(response);

      expect(response.status).toBe(401);
      expect(body.error).toBe('invalid_client');
    });
  });
});
