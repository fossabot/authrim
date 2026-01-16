/**
 * human-basic Login Flow - ビルトイン定義
 *
 * Admin UIなしでも動作するビルトインFlow。
 * Start → Identifier → AuthMethod → Complete の最小構成。
 *
 * @see /private/docs/track-c-flow-engine-design.md
 */

import type { GraphDefinition } from '../types';

// =============================================================================
// human-basic Login Flow
// =============================================================================

/**
 * human-basic Login Flow
 *
 * 基本的なログインフロー（Passkey / Email Code）
 * ヘッドレス運用（Admin UIなし）でも動作する。
 */
export const HUMAN_BASIC_LOGIN_FLOW: GraphDefinition = {
  id: 'human-basic-login',
  flowVersion: '1.0.0',
  name: 'Human Basic Login',
  description: '基本的なログインフロー（Passkey / Email Code）',
  profileId: 'human-basic',

  nodes: [
    // Start Node
    {
      id: 'start',
      type: 'start',
      position: { x: 250, y: 50 },
      data: {
        label: 'Start',
        intent: 'identify_user',
        capabilities: [],
        config: {},
      },
    },

    // Identifier Node (Email入力)
    {
      id: 'identifier',
      type: 'identifier',
      position: { x: 250, y: 150 },
      data: {
        label: 'Enter Email',
        intent: 'identify_user',
        capabilities: [
          {
            type: 'collect_identifier',
            idSuffix: 'email',
            required: true,
            hintsTemplate: {
              inputType: 'email',
              label: 'Email address',
              autoComplete: 'email',
              autoFocus: true,
            },
            validationRules: [
              { type: 'required', message: 'Email is required' },
              { type: 'email', message: 'Please enter a valid email' },
            ],
          },
        ],
        config: {},
      },
    },

    // Auth Method Node (認証方法選択)
    {
      id: 'auth_method',
      type: 'auth_method',
      position: { x: 250, y: 250 },
      data: {
        label: 'Authenticate',
        intent: 'authenticate_user',
        capabilities: [
          // Passkey認証（優先）
          {
            type: 'verify_possession',
            idSuffix: 'passkey',
            required: false,
            hintsTemplate: {
              webauthn: {
                mode: 'authenticate',
                discoverable: true,
                userVerification: 'preferred',
              },
            },
          },
          // Email Code認証（フォールバック）
          {
            type: 'collect_secret',
            idSuffix: 'email_code',
            required: false,
            hintsTemplate: {
              inputType: 'otp',
              maxLength: 6,
              label: 'Verification code',
              helpText: 'Enter the 6-digit code sent to your email',
            },
          },
        ],
        config: {
          preferredMethod: 'passkey',
          fallbackMethod: 'email_code',
        },
      },
    },

    // Complete Node (フロー完了)
    {
      id: 'complete',
      type: 'end',
      position: { x: 250, y: 350 },
      data: {
        label: 'Complete',
        intent: 'complete_flow',
        capabilities: [
          {
            type: 'redirect',
            idSuffix: 'callback',
            required: true,
          },
        ],
        config: {},
      },
    },

    // Error Node (エラー処理)
    {
      id: 'error',
      type: 'error',
      position: { x: 450, y: 250 },
      data: {
        label: 'Error',
        intent: 'handle_error',
        capabilities: [
          {
            type: 'display_info',
            idSuffix: 'error',
            required: true,
            hintsTemplate: {
              variant: 'error',
            },
          },
        ],
        config: {
          allowRetry: true,
        },
      },
    },
  ],

  edges: [
    // Start → Identifier
    {
      id: 'e_start_identifier',
      source: 'start',
      target: 'identifier',
      type: 'success',
    },

    // Identifier → AuthMethod (成功時)
    {
      id: 'e_identifier_auth',
      source: 'identifier',
      target: 'auth_method',
      type: 'success',
    },

    // Identifier → Error (エラー時)
    {
      id: 'e_identifier_error',
      source: 'identifier',
      target: 'error',
      type: 'error',
    },

    // AuthMethod → Complete (成功時)
    {
      id: 'e_auth_complete',
      source: 'auth_method',
      target: 'complete',
      type: 'success',
    },

    // AuthMethod → Error (エラー時)
    {
      id: 'e_auth_error',
      source: 'auth_method',
      target: 'error',
      type: 'error',
    },

    // Error → Identifier (リトライ)
    {
      id: 'e_error_retry',
      source: 'error',
      target: 'identifier',
      type: 'conditional',
      data: {
        label: 'Retry',
        condition: {
          type: 'custom',
          expression: 'allowRetry === true',
        },
      },
    },
  ],

  metadata: {
    createdAt: '2026-01-16T00:00:00Z',
    updatedAt: '2026-01-16T00:00:00Z',
    createdBy: 'system',
  },
};

// =============================================================================
// Builtin Flow Registry
// =============================================================================

/**
 * ビルトインFlowのマップ
 * Admin UIなしでも使用可能
 */
export const BUILTIN_FLOWS: Record<string, GraphDefinition> = {
  'human-basic-login': HUMAN_BASIC_LOGIN_FLOW,
};

/**
 * ビルトインFlowを取得
 */
export function getBuiltinFlow(flowId: string): GraphDefinition | undefined {
  return BUILTIN_FLOWS[flowId];
}

/**
 * すべてのビルトインFlow IDを取得
 */
export function getBuiltinFlowIds(): string[] {
  return Object.keys(BUILTIN_FLOWS);
}

// =============================================================================
// Export
// =============================================================================

export default HUMAN_BASIC_LOGIN_FLOW;
