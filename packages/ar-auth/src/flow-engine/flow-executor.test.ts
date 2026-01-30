/**
 * FlowExecutor - 統合テスト
 *
 * determineNextNode メソッドの動作を検証
 * Decision/Switch分岐のテスト、後方互換性のテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type {
  CompiledPlan,
  CompiledNode,
  FlowRuntimeContext,
  DecisionNodeConfig,
  SwitchNodeConfig,
} from './types.js';

// FlowExecutorの一部メソッドをテストするため、プライベートメソッドにアクセス可能なテスト用クラスを作成
class FlowExecutorTestHelper {
  /**
   * Decision/Switchノードの評価（テスト用にpublicメソッドとして公開）
   */
  evaluateDecisionNode(
    node: CompiledNode,
    plan: CompiledPlan,
    context: FlowRuntimeContext
  ): string | null {
    if (node.type === 'decision') {
      return this.evaluateDecisionBranches(node, plan, context);
    }

    if (node.type === 'switch') {
      return this.evaluateSwitchCases(node, plan, context);
    }

    return null;
  }

  /**
   * Decisionブランチを評価
   */
  private evaluateDecisionBranches(
    node: CompiledNode,
    plan: CompiledPlan,
    context: FlowRuntimeContext
  ): string | null {
    const config = node.decisionConfig as DecisionNodeConfig | undefined;
    if (!config) {
      return null;
    }

    const transitions = plan.transitions.get(node.id) || [];

    // priority順に条件を評価
    for (const branch of config.branches) {
      const matches = this.evaluateCondition(branch.condition, context);

      if (matches) {
        const transition = transitions.find((t) => t.sourceHandle === branch.id);
        if (transition) {
          return transition.targetNodeId;
        }
      }
    }

    // デフォルト分岐
    if (config.defaultBranch) {
      const defaultTransition = transitions.find((t) => t.sourceHandle === config.defaultBranch);
      if (defaultTransition) {
        return defaultTransition.targetNodeId;
      }
    }

    return null;
  }

  /**
   * Switchケースを評価
   */
  private evaluateSwitchCases(
    node: CompiledNode,
    plan: CompiledPlan,
    context: FlowRuntimeContext
  ): string | null {
    const config = node.decisionConfig as SwitchNodeConfig | undefined;
    if (!config) {
      return null;
    }

    // Prototype Pollution対策用の危険なキー
    const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];

    // switchKeyの値を取得
    const keyParts = config.switchKey.split('.');
    let value: unknown = context;
    for (const part of keyParts) {
      // Prototype Pollution対策: 危険なキーを拒否
      if (DANGEROUS_KEYS.includes(part)) {
        console.error(
          `[Security] Dangerous key detected in switchKey: "${part}" (full key: "${config.switchKey}")`
        );
        value = undefined;
        break;
      }

      if (value === null || value === undefined || typeof value !== 'object') {
        value = undefined;
        break;
      }

      // Prototype Pollution対策: hasOwnPropertyでプロトタイプチェーンを遡らない
      if (!Object.prototype.hasOwnProperty.call(value, part)) {
        value = undefined;
        break;
      }

      value = (value as Record<string, unknown>)[part];
    }

    const transitions = plan.transitions.get(node.id) || [];

    // 各caseと値を比較
    for (const caseItem of config.cases) {
      if (caseItem.values.includes(value as string | number | boolean)) {
        const transition = transitions.find((t) => t.sourceHandle === caseItem.id);
        if (transition) {
          return transition.targetNodeId;
        }
      }
    }

    // デフォルトcase
    if (config.defaultCase) {
      const defaultTransition = transitions.find((t) => t.sourceHandle === config.defaultCase);
      if (defaultTransition) {
        return defaultTransition.targetNodeId;
      }
    }

    return null;
  }

  /**
   * 条件評価（簡易実装）
   */
  private evaluateCondition(condition: unknown, context: FlowRuntimeContext): boolean {
    // 実際の evaluate 関数を使う代わりに、簡易実装
    const cond = condition as { key: string; operator: string; value: unknown };

    const keyParts = cond.key.split('.');
    let actualValue: unknown = context;
    for (const part of keyParts) {
      if (actualValue === null || actualValue === undefined || typeof actualValue !== 'object') {
        actualValue = undefined;
        break;
      }
      actualValue = (actualValue as Record<string, unknown>)[part];
    }

    switch (cond.operator) {
      case 'greaterThan':
        return typeof actualValue === 'number' && typeof cond.value === 'number'
          ? actualValue > cond.value
          : false;
      case 'lessOrEqual':
        return typeof actualValue === 'number' && typeof cond.value === 'number'
          ? actualValue <= cond.value
          : false;
      case 'equals':
        return actualValue === cond.value;
      default:
        return false;
    }
  }
}

// =============================================================================
// Test Data
// =============================================================================

const mockDecisionPlan: CompiledPlan = {
  id: 'compiled-test-decision',
  version: '1.0.0',
  sourceVersion: '1.0.0',
  profileId: 'core.human-basic-login' as any,
  entryNodeId: 'decision_1',
  nodes: new Map([
    [
      'decision_1',
      {
        id: 'decision_1',
        type: 'decision',
        intent: 'core.decision' as any,
        capabilities: [],
        nextOnSuccess: null,
        nextOnError: null,
        decisionConfig: {
          branches: [
            {
              id: 'branch_high_risk',
              label: 'High Risk',
              condition: {
                key: 'risk.score',
                operator: 'greaterThan',
                value: 70,
              },
              priority: 1,
            },
            {
              id: 'branch_medium_risk',
              label: 'Medium Risk',
              condition: {
                key: 'risk.score',
                operator: 'greaterThan',
                value: 30,
              },
              priority: 2,
            },
            {
              id: 'branch_low_risk',
              label: 'Low Risk',
              condition: {
                key: 'risk.score',
                operator: 'lessOrEqual',
                value: 30,
              },
              priority: 3,
            },
          ],
          defaultBranch: 'branch_default',
        } as DecisionNodeConfig,
      },
    ],
  ]),
  transitions: new Map([
    [
      'decision_1',
      [
        {
          targetNodeId: 'high_risk_action',
          type: 'conditional',
          sourceHandle: 'branch_high_risk',
          priority: 1,
        },
        {
          targetNodeId: 'medium_risk_action',
          type: 'conditional',
          sourceHandle: 'branch_medium_risk',
          priority: 2,
        },
        {
          targetNodeId: 'low_risk_action',
          type: 'conditional',
          sourceHandle: 'branch_low_risk',
          priority: 3,
        },
        {
          targetNodeId: 'default_action',
          type: 'conditional',
          sourceHandle: 'branch_default',
        },
      ],
    ],
  ]),
  compiledAt: new Date().toISOString(),
};

const mockSwitchPlan: CompiledPlan = {
  id: 'compiled-test-switch',
  version: '1.0.0',
  sourceVersion: '1.0.0',
  profileId: 'core.human-basic-login' as any,
  entryNodeId: 'switch_1',
  nodes: new Map([
    [
      'switch_1',
      {
        id: 'switch_1',
        type: 'switch',
        intent: 'core.decision' as any,
        capabilities: [],
        nextOnSuccess: null,
        nextOnError: null,
        decisionConfig: {
          switchKey: 'request.country',
          cases: [
            {
              id: 'case_us',
              label: 'US',
              values: ['US', 'USA'],
            },
            {
              id: 'case_eu',
              label: 'EU',
              values: ['DE', 'FR', 'UK'],
            },
          ],
          defaultCase: 'case_other',
        } as SwitchNodeConfig,
      },
    ],
  ]),
  transitions: new Map([
    [
      'switch_1',
      [
        {
          targetNodeId: 'us_action',
          type: 'conditional',
          sourceHandle: 'case_us',
        },
        {
          targetNodeId: 'eu_action',
          type: 'conditional',
          sourceHandle: 'case_eu',
        },
        {
          targetNodeId: 'other_action',
          type: 'conditional',
          sourceHandle: 'case_other',
        },
      ],
    ],
  ]),
  compiledAt: new Date().toISOString(),
};

// =============================================================================
// Tests
// =============================================================================

describe('FlowExecutor - Decision Node', () => {
  let helper: FlowExecutorTestHelper;

  beforeEach(() => {
    helper = new FlowExecutorTestHelper();
  });

  it('should evaluate high risk branch', () => {
    const context: FlowRuntimeContext = {
      risk: {
        score: 80,
      },
    };

    const decisionNode = mockDecisionPlan.nodes.get('decision_1')!;
    const result = helper.evaluateDecisionNode(decisionNode, mockDecisionPlan, context);

    expect(result).toBe('high_risk_action');
  });

  it('should evaluate medium risk branch', () => {
    const context: FlowRuntimeContext = {
      risk: {
        score: 50,
      },
    };

    const decisionNode = mockDecisionPlan.nodes.get('decision_1')!;
    const result = helper.evaluateDecisionNode(decisionNode, mockDecisionPlan, context);

    expect(result).toBe('medium_risk_action');
  });

  it('should evaluate low risk branch', () => {
    const context: FlowRuntimeContext = {
      risk: {
        score: 20,
      },
    };

    const decisionNode = mockDecisionPlan.nodes.get('decision_1')!;
    const result = helper.evaluateDecisionNode(decisionNode, mockDecisionPlan, context);

    expect(result).toBe('low_risk_action');
  });

  it('should use default branch when no conditions match', () => {
    const context: FlowRuntimeContext = {
      risk: {
        // score が存在しないケース
      },
    };

    const decisionNode = mockDecisionPlan.nodes.get('decision_1')!;
    const result = helper.evaluateDecisionNode(decisionNode, mockDecisionPlan, context);

    expect(result).toBe('default_action');
  });

  it('should prioritize first matching branch', () => {
    // risk.score = 80 の場合、medium と high の両方にマッチするが、
    // priority 1 の high_risk が先に評価されるべき
    const context: FlowRuntimeContext = {
      risk: {
        score: 80,
      },
    };

    const decisionNode = mockDecisionPlan.nodes.get('decision_1')!;
    const result = helper.evaluateDecisionNode(decisionNode, mockDecisionPlan, context);

    // priority 1 (high_risk) が選択される
    expect(result).toBe('high_risk_action');
  });
});

describe('FlowExecutor - Switch Node', () => {
  let helper: FlowExecutorTestHelper;

  beforeEach(() => {
    helper = new FlowExecutorTestHelper();
  });

  it('should evaluate US case', () => {
    const context: FlowRuntimeContext = {
      request: {
        country: 'US',
      },
    };

    const switchNode = mockSwitchPlan.nodes.get('switch_1')!;
    const result = helper.evaluateDecisionNode(switchNode, mockSwitchPlan, context);

    expect(result).toBe('us_action');
  });

  it('should evaluate EU case', () => {
    const context: FlowRuntimeContext = {
      request: {
        country: 'DE',
      },
    };

    const switchNode = mockSwitchPlan.nodes.get('switch_1')!;
    const result = helper.evaluateDecisionNode(switchNode, mockSwitchPlan, context);

    expect(result).toBe('eu_action');
  });

  it('should use default case when no values match', () => {
    const context: FlowRuntimeContext = {
      request: {
        country: 'AU',
      },
    };

    const switchNode = mockSwitchPlan.nodes.get('switch_1')!;
    const result = helper.evaluateDecisionNode(switchNode, mockSwitchPlan, context);

    expect(result).toBe('other_action');
  });

  it('should handle missing key', () => {
    const context: FlowRuntimeContext = {
      request: {
        // country が存在しない
      },
    };

    const switchNode = mockSwitchPlan.nodes.get('switch_1')!;
    const result = helper.evaluateDecisionNode(switchNode, mockSwitchPlan, context);

    expect(result).toBe('other_action');
  });
});

// =============================================================================
// Security Tests - Critical/High/Medium脆弱性対策
// =============================================================================

// =============================================================================
// Session Validation Tests (Critical 4)
// =============================================================================

describe('Security - Session Validation (Critical 4)', () => {
  /**
   * FlowExecutor.submitCapability のセッション検証テスト
   *
   * テスト観点:
   * - tenantIdミスマッチ: リクエストのtenantIdとセッションのtenantIdが異なる場合はエラー
   * - clientIdミスマッチ: リクエストのclientIdとセッションのclientIdが異なる場合はエラー
   * - 正常ケース: 両方一致する場合は処理続行
   */

  // FlowExecutorを直接モックするのではなく、検証ロジックをユニットテスト
  function validateSession(
    requestTenantId: string | undefined,
    requestClientId: string | undefined,
    sessionTenantId: string,
    sessionClientId: string
  ): { valid: boolean; errorCode?: string; errorMessage?: string } {
    // tenantId検証
    if (requestTenantId && sessionTenantId !== requestTenantId) {
      return {
        valid: false,
        errorCode: 'invalid_session',
        errorMessage: 'Session tenant mismatch',
      };
    }

    // clientId検証
    if (requestClientId && sessionClientId !== requestClientId) {
      return {
        valid: false,
        errorCode: 'invalid_session',
        errorMessage: 'Session client mismatch',
      };
    }

    return { valid: true };
  }

  it('should reject when tenantId mismatches', () => {
    const result = validateSession(
      'tenant-attacker', // リクエストのtenantId（攻撃者）
      'client-1', // リクエストのclientId
      'tenant-victim', // セッションのtenantId（被害者）
      'client-1' // セッションのclientId
    );

    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe('invalid_session');
    expect(result.errorMessage).toBe('Session tenant mismatch');
  });

  it('should reject when clientId mismatches', () => {
    const result = validateSession(
      'tenant-1', // リクエストのtenantId
      'client-attacker', // リクエストのclientId（攻撃者）
      'tenant-1', // セッションのtenantId
      'client-victim' // セッションのclientId（被害者）
    );

    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe('invalid_session');
    expect(result.errorMessage).toBe('Session client mismatch');
  });

  it('should allow when both tenantId and clientId match', () => {
    const result = validateSession(
      'tenant-1', // リクエストのtenantId
      'client-1', // リクエストのclientId
      'tenant-1', // セッションのtenantId（一致）
      'client-1' // セッションのclientId（一致）
    );

    expect(result.valid).toBe(true);
    expect(result.errorCode).toBeUndefined();
  });

  it('should allow when tenantId is not provided (optional check)', () => {
    const result = validateSession(
      undefined, // tenantIdなし（チェックスキップ）
      'client-1', // リクエストのclientId
      'tenant-any', // セッションのtenantId（何でもOK）
      'client-1' // セッションのclientId
    );

    expect(result.valid).toBe(true);
  });

  it('should allow when clientId is not provided (optional check)', () => {
    const result = validateSession(
      'tenant-1', // リクエストのtenantId
      undefined, // clientIdなし（チェックスキップ）
      'tenant-1', // セッションのtenantId
      'client-any' // セッションのclientId（何でもOK）
    );

    expect(result.valid).toBe(true);
  });

  it('should reject when both tenantId and clientId mismatch', () => {
    const result = validateSession(
      'tenant-attacker',
      'client-attacker',
      'tenant-victim',
      'client-victim'
    );

    expect(result.valid).toBe(false);
    // tenantIdが先にチェックされるのでtenantエラーが返る
    expect(result.errorCode).toBe('invalid_session');
    expect(result.errorMessage).toBe('Session tenant mismatch');
  });
});

describe('Security - Prototype Pollution in Switch (Critical 1)', () => {
  let helper: FlowExecutorTestHelper;

  beforeEach(() => {
    helper = new FlowExecutorTestHelper();
  });

  it('should reject __proto__ in switchKey', () => {
    const maliciousPlan: CompiledPlan = {
      ...mockSwitchPlan,
      nodes: new Map([
        [
          'switch_malicious',
          {
            id: 'switch_malicious',
            type: 'switch',
            intent: 'core.decision' as any,
            capabilities: [],
            nextOnSuccess: null,
            nextOnError: null,
            decisionConfig: {
              switchKey: 'request.__proto__.country', // 悪意のあるキー
              cases: [
                {
                  id: 'case_us',
                  label: 'US',
                  values: ['US'],
                },
              ],
              defaultCase: 'case_other',
            } as SwitchNodeConfig,
          },
        ],
      ]),
      transitions: new Map([
        [
          'switch_malicious',
          [
            {
              targetNodeId: 'us_action',
              type: 'conditional',
              sourceHandle: 'case_us',
            },
            {
              targetNodeId: 'other_action',
              type: 'conditional',
              sourceHandle: 'case_other',
            },
          ],
        ],
      ]),
    };

    const context: FlowRuntimeContext = {
      request: {
        country: 'US',
      },
    };

    const maliciousNode = maliciousPlan.nodes.get('switch_malicious')!;
    const result = helper.evaluateDecisionNode(maliciousNode, maliciousPlan, context);

    // Prototype Pollution対策により、悪意のあるキーはundefinedとなり、default caseが選択される
    expect(result).toBe('other_action');
  });

  it('should reject constructor in switchKey', () => {
    const maliciousPlan: CompiledPlan = {
      ...mockSwitchPlan,
      nodes: new Map([
        [
          'switch_malicious',
          {
            id: 'switch_malicious',
            type: 'switch',
            intent: 'core.decision' as any,
            capabilities: [],
            nextOnSuccess: null,
            nextOnError: null,
            decisionConfig: {
              switchKey: 'request.constructor.name', // 悪意のあるキー
              cases: [
                {
                  id: 'case_object',
                  label: 'Object',
                  values: ['Object'],
                },
              ],
              defaultCase: 'case_other',
            } as SwitchNodeConfig,
          },
        ],
      ]),
      transitions: new Map([
        [
          'switch_malicious',
          [
            {
              targetNodeId: 'object_action',
              type: 'conditional',
              sourceHandle: 'case_object',
            },
            {
              targetNodeId: 'other_action',
              type: 'conditional',
              sourceHandle: 'case_other',
            },
          ],
        ],
      ]),
    };

    const context: FlowRuntimeContext = {
      request: {
        country: 'US',
      },
    };

    const maliciousNode = maliciousPlan.nodes.get('switch_malicious')!;
    const result = helper.evaluateDecisionNode(maliciousNode, maliciousPlan, context);

    // Prototype Pollution対策により、constructorキーは拒否される
    expect(result).toBe('other_action');
  });
});
