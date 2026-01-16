/**
 * UIContractGenerator - CompiledNodeからUIContract生成
 *
 * 責務:
 * - CompiledNode + コンテキストからUIContract生成
 * - ResolvedCapability → Capability変換
 * - FeatureFlags生成
 * - ActionSet生成
 *
 * @see /private/docs/track-c-flow-engine-design.md
 */

import type { CompiledNode, RuntimeState, GraphNodeType } from './types';
import type {
  UIContract,
  Capability,
  FeatureFlags,
  FlowContext,
  ActionSet,
  ActionDefinition,
  Intent,
  ProfileId,
} from '@authrim/ar-lib-core';

// =============================================================================
// Types
// =============================================================================

/**
 * UIContract生成パラメータ
 */
export interface UIContractGeneratorParams {
  /** コンパイル済みノード */
  compiledNode: CompiledNode;
  /** FlowID（state生成用） */
  flowId: string;
  /** RuntimeState（収集済みデータ参照用） */
  runtimeState?: Partial<RuntimeState>;
  /** FlowContext（ユーザー・クライアント情報） */
  flowContext?: Partial<FlowContext>;
  /** プロファイルID */
  profileId?: ProfileId;
}

// =============================================================================
// UIContractGenerator
// =============================================================================

/**
 * UIContractGenerator - UIContract生成
 */
export class UIContractGenerator {
  /**
   * UIContractを生成
   *
   * @param params - 生成パラメータ
   * @returns UIContract
   */
  generate(params: UIContractGeneratorParams): UIContract {
    const { compiledNode, flowId, runtimeState, flowContext, profileId } = params;

    // state文字列を生成: {flowId}:{nodeId}
    const state = `${flowId}:${compiledNode.id}`;

    // FeatureFlagsを生成
    const features = this.buildFeatureFlags(profileId || 'human-basic');

    // Capabilitiesを変換
    const capabilities = this.buildCapabilities(compiledNode);

    // FlowContextを構築
    const context = this.buildFlowContext(flowContext, runtimeState);

    // ActionSetを生成
    const actions = this.buildActionSet(compiledNode.type, compiledNode.intent);

    return {
      version: '0.1',
      state,
      intent: compiledNode.intent as Intent,
      features,
      capabilities,
      context,
      actions,
    };
  }

  /**
   * FeatureFlagsを生成
   */
  private buildFeatureFlags(profileId: ProfileId): FeatureFlags {
    // プロファイル別のFeatureFlags設定
    const profileConfigs: Record<string, FeatureFlags> = {
      'human-basic': {
        policy: {
          rbac: 'simple',
          abac: false,
          rebac: false,
        },
        targets: {
          human: true,
          iot: false,
          ai_agent: false,
          ai_mcp: false,
          service: false,
        },
        authMethods: {
          passkey: true,
          email_code: true,
          password: false,
          external_idp: false,
          did: false,
        },
      },
      'human-org': {
        policy: {
          rbac: 'full',
          abac: false,
          rebac: true,
        },
        targets: {
          human: true,
          iot: false,
          ai_agent: false,
          ai_mcp: false,
          service: false,
        },
        authMethods: {
          passkey: true,
          email_code: true,
          password: false,
          external_idp: true,
          did: false,
        },
      },
      'ai-agent': {
        policy: {
          rbac: 'full',
          abac: true,
          rebac: true,
        },
        targets: {
          human: false,
          iot: false,
          ai_agent: true,
          ai_mcp: true,
          service: false,
        },
        authMethods: {
          passkey: true,
          email_code: false,
          password: false,
          external_idp: false,
          did: true,
        },
      },
      'iot-device': {
        policy: {
          rbac: 'simple',
          abac: true,
          rebac: false,
        },
        targets: {
          human: false,
          iot: true,
          ai_agent: false,
          ai_mcp: false,
          service: false,
        },
        authMethods: {
          passkey: false,
          email_code: false,
          password: false,
          external_idp: false,
          did: true,
        },
      },
    };

    // デフォルトはhuman-basic
    return profileConfigs[profileId] || profileConfigs['human-basic'];
  }

  /**
   * ResolvedCapabilityをCapabilityに変換
   */
  private buildCapabilities(compiledNode: CompiledNode): Capability[] {
    return compiledNode.capabilities.map((resolved) => ({
      type: resolved.type,
      id: resolved.id,
      stability: resolved.stability,
      required: resolved.required,
      hints: resolved.hints,
      validation: resolved.validationRules,
    }));
  }

  /**
   * FlowContextを構築
   */
  private buildFlowContext(
    flowContext?: Partial<FlowContext>,
    runtimeState?: Partial<RuntimeState>
  ): FlowContext {
    const context: FlowContext = {};

    // flowContextから情報をコピー
    if (flowContext) {
      if (flowContext.branding) context.branding = flowContext.branding;
      if (flowContext.user) context.user = flowContext.user;
      if (flowContext.organization) context.organization = flowContext.organization;
      if (flowContext.client) context.client = flowContext.client;
      if (flowContext.error) context.error = flowContext.error;
      if (flowContext.locale) context.locale = flowContext.locale;
    }

    // runtimeStateから認証済みユーザー情報を補完
    if (runtimeState?.userId && !context.user) {
      context.user = {
        id: runtimeState.userId,
      };
    }

    // runtimeStateからemail等を補完
    if (runtimeState?.collectedData) {
      const email = (runtimeState.collectedData as Record<string, unknown>)['identifier_email'];
      if (email && typeof email === 'object' && 'email' in email) {
        if (!context.user) {
          context.user = { id: 'pending' };
        }
        context.user.email = (email as { email: string }).email;
      }
    }

    return context;
  }

  /**
   * ActionSetを生成
   */
  private buildActionSet(nodeType: GraphNodeType, intent: string): ActionSet {
    const primary = this.getPrimaryAction(nodeType, intent);
    const secondary = this.getSecondaryActions(nodeType, intent);

    return {
      primary,
      secondary: secondary.length > 0 ? secondary : undefined,
    };
  }

  /**
   * プライマリアクションを取得
   */
  private getPrimaryAction(nodeType: GraphNodeType, intent: string): ActionDefinition {
    // ノードタイプ/Intent別のプライマリアクション
    switch (nodeType) {
      case 'start':
        return { type: 'CONTINUE', label: 'Get Started' };

      case 'identifier':
        return { type: 'SUBMIT', label: 'Continue' };

      case 'auth_method':
        return { type: 'SUBMIT', label: 'Sign in' };

      case 'mfa':
        return { type: 'SUBMIT', label: 'Verify' };

      case 'consent':
        return { type: 'SUBMIT', label: 'Allow' };

      case 'end':
        return { type: 'COMPLETE', label: 'Done' };

      case 'error':
        return { type: 'RETRY', label: 'Try again' };

      default:
        return { type: 'SUBMIT', label: 'Continue' };
    }
  }

  /**
   * セカンダリアクションを取得
   */
  private getSecondaryActions(nodeType: GraphNodeType, intent: string): ActionDefinition[] {
    const actions: ActionDefinition[] = [];

    // ほとんどのノードでBACKアクションを提供
    if (nodeType !== 'start' && nodeType !== 'end') {
      actions.push({
        type: 'BACK',
        label: 'Back',
        variant: 'secondary',
      });
    }

    // consentノードではDenyアクションを追加
    if (nodeType === 'consent') {
      actions.push({
        type: 'DENY',
        label: 'Deny',
        variant: 'secondary',
      });
    }

    // errorノードではCancelアクションを追加
    if (nodeType === 'error') {
      actions.push({
        type: 'CANCEL',
        label: 'Cancel',
        variant: 'secondary',
      });
    }

    return actions;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * UIContractGeneratorを作成
 *
 * @returns UIContractGenerator インスタンス
 *
 * @example
 * const generator = createUIContractGenerator();
 * const uiContract = generator.generate({
 *   compiledNode,
 *   flowId: 'human-basic-login',
 *   runtimeState,
 * });
 */
export function createUIContractGenerator(): UIContractGenerator {
  return new UIContractGenerator();
}

// =============================================================================
// Export
// =============================================================================

export default UIContractGenerator;
