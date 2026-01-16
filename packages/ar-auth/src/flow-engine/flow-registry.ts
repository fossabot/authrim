/**
 * FlowRegistry - Flow定義の取得・管理
 *
 * 責務:
 * - ビルトインFlowの取得
 * - カスタムFlow（KV）の取得（将来対応）
 *
 * 優先順位: ビルトイン → KV → null
 *
 * @see /private/docs/track-c-flow-engine-design.md
 */

import type { GraphDefinition } from './types';
import { BUILTIN_FLOWS, getBuiltinFlow } from './flows/login-flow';

// =============================================================================
// Types
// =============================================================================

/**
 * FlowType - サポートするフロータイプ
 */
export type FlowType = 'login' | 'authorization' | 'consent' | 'logout';

/**
 * FlowRegistryOptions
 */
export interface FlowRegistryOptions {
  /** KVNamespace（カスタムFlow用、将来対応） */
  kv?: KVNamespace;
}

// =============================================================================
// FlowRegistry
// =============================================================================

/**
 * FlowRegistry - Flow定義の取得・管理
 *
 * ヘッドレス運用対応:
 * - ビルトインFlowのみでも動作
 * - KVが設定されていればカスタムFlowも取得可能
 */
export class FlowRegistry {
  private kv?: KVNamespace;

  constructor(options: FlowRegistryOptions = {}) {
    this.kv = options.kv;
  }

  /**
   * FlowTypeからGraphDefinitionを取得
   *
   * @param flowType - フロータイプ
   * @param tenantId - テナントID（カスタムFlow用、将来対応）
   * @returns GraphDefinition または null
   */
  async getFlow(flowType: FlowType, tenantId?: string): Promise<GraphDefinition | null> {
    // 1. ビルトインFlowを検索
    const builtinFlowId = this.getBuiltinFlowId(flowType);
    const builtinFlow = getBuiltinFlow(builtinFlowId);

    if (builtinFlow) {
      return builtinFlow;
    }

    // 2. カスタムFlow（KV）を検索（将来対応）
    if (this.kv && tenantId) {
      const customFlow = await this.getCustomFlow(tenantId, flowType);
      if (customFlow) {
        return customFlow;
      }
    }

    // 3. 見つからない場合はnull
    return null;
  }

  /**
   * すべてのビルトインFlowIDを取得
   */
  getBuiltinFlowIds(): string[] {
    return Object.keys(BUILTIN_FLOWS);
  }

  /**
   * FlowTypeからビルトインFlowIDを解決
   */
  private getBuiltinFlowId(flowType: FlowType): string {
    // FlowType → ビルトインFlowIDのマッピング
    const flowTypeToId: Record<FlowType, string> = {
      login: 'human-basic-login',
      authorization: 'human-basic-authorization', // 将来追加
      consent: 'human-basic-consent', // 将来追加
      logout: 'human-basic-logout', // 将来追加
    };

    return flowTypeToId[flowType];
  }

  /**
   * KVからカスタムFlow定義を取得（将来対応）
   *
   * キー形式: flow:{tenantId}:{flowType}
   */
  private async getCustomFlow(tenantId: string, flowType: string): Promise<GraphDefinition | null> {
    if (!this.kv) {
      return null;
    }

    const key = `flow:${tenantId}:${flowType}`;
    const stored = await this.kv.get(key, 'json');

    if (stored && this.isValidGraphDefinition(stored)) {
      return stored as GraphDefinition;
    }

    return null;
  }

  /**
   * GraphDefinitionの簡易バリデーション
   */
  private isValidGraphDefinition(obj: unknown): obj is GraphDefinition {
    if (!obj || typeof obj !== 'object') {
      return false;
    }

    const graph = obj as Partial<GraphDefinition>;

    return (
      typeof graph.id === 'string' &&
      typeof graph.flowVersion === 'string' &&
      typeof graph.name === 'string' &&
      Array.isArray(graph.nodes) &&
      Array.isArray(graph.edges)
    );
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * FlowRegistryを作成
 *
 * @param options - オプション
 * @returns FlowRegistry インスタンス
 *
 * @example
 * // ビルトインFlowのみ
 * const registry = createFlowRegistry();
 *
 * // KV対応
 * const registry = createFlowRegistry({ kv: env.AUTHRIM_CONFIG });
 */
export function createFlowRegistry(options: FlowRegistryOptions = {}): FlowRegistry {
  return new FlowRegistry(options);
}

// =============================================================================
// Export
// =============================================================================

export default FlowRegistry;
