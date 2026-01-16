/**
 * FlowExecutor - Flow Engineの中核
 *
 * 責務:
 * - Flow初期化（/init）
 * - Capability応答処理（/submit）
 * - 状態取得（/state）
 * - Flowキャンセル（/cancel）
 * - FlowStateStore DO連携
 *
 * @see /private/docs/track-c-flow-engine-design.md
 */

import { type Env, getFlowStateStoreStub } from '@authrim/ar-lib-core';
import type {
  FlowInitRequest,
  FlowInitResponse,
  FlowSubmitRequest,
  FlowSubmitResponse,
  FlowStateResponse,
  CompiledPlan,
  CompiledNode,
  RuntimeState,
  OAuthFlowParams,
} from './types';
import { DEFAULT_FLOW_TTL_MS } from './types';
import { FlowRegistry, createFlowRegistry, type FlowType } from './flow-registry';
import { createFlowCompiler, type FlowCompilerService } from './flow-compiler';
import { UIContractGenerator, createUIContractGenerator } from './ui-contract-generator';

// =============================================================================
// Types
// =============================================================================

/**
 * FlowExecutorオプション
 */
export interface FlowExecutorOptions {
  /** セッションTTL（ミリ秒） */
  ttlMs?: number;
}

/**
 * DO初期化レスポンス
 */
interface DOInitResponse {
  success: boolean;
  state?: {
    sessionId: string;
    flowId: string;
    currentNodeId: string;
    visitedNodeIds: string[];
    completedCapabilities: string[];
    expiresAt: number;
  };
  error?: string;
  code?: string;
}

/**
 * DO状態レスポンス
 */
interface DOStateResponse {
  state?: {
    sessionId: string;
    flowId: string;
    currentNodeId: string;
    visitedNodeIds: string[];
    completedCapabilities: string[];
    expiresAt: number;
    collectedData?: Record<string, unknown>;
  };
  error?: string;
  code?: string;
}

/**
 * DO冪等性チェックレスポンス
 */
interface DOCheckRequestResponse {
  found: boolean;
  result?: FlowSubmitResponse;
  state?: {
    sessionId: string;
    flowId: string;
    currentNodeId: string;
    visitedNodeIds: string[];
    completedCapabilities: string[];
    expiresAt: number;
    collectedData?: Record<string, unknown>;
  };
  error?: string;
  code?: string;
}

// =============================================================================
// FlowExecutor
// =============================================================================

/**
 * FlowExecutor - Flow Engineの中核
 */
export class FlowExecutor {
  private registry: FlowRegistry;
  private compiler: FlowCompilerService;
  private uiGenerator: UIContractGenerator;
  private compiledPlans: Map<string, CompiledPlan> = new Map();
  private ttlMs: number;

  constructor(
    private env: Env,
    options: FlowExecutorOptions = {}
  ) {
    this.registry = createFlowRegistry({ kv: env.AUTHRIM_CONFIG });
    this.compiler = createFlowCompiler() as FlowCompilerService;
    this.uiGenerator = createUIContractGenerator();
    this.ttlMs = options.ttlMs ?? DEFAULT_FLOW_TTL_MS;
  }

  /**
   * Flowを初期化しUIContractを返却
   */
  async initFlow(params: {
    flowType: FlowType;
    clientId: string;
    tenantId: string;
    oauthParams?: OAuthFlowParams;
  }): Promise<FlowInitResponse> {
    const { flowType, clientId, tenantId, oauthParams } = params;

    // 1. Flow定義を取得
    const graphDef = await this.registry.getFlow(flowType, tenantId);
    if (!graphDef) {
      throw new Error(`Flow not found: ${flowType}`);
    }

    // 2. CompiledPlanを取得またはコンパイル
    const compiledPlan = this.getOrCompilePlan(graphDef);

    // 3. セッションIDを生成
    const sessionId = `flow_${crypto.randomUUID()}`;

    // 4. エントリーノードを決定（startノードはスキップ）
    const entryNode = compiledPlan.nodes.get(compiledPlan.entryNodeId);
    if (!entryNode) {
      throw new Error(`Entry node not found: ${compiledPlan.entryNodeId}`);
    }

    // startノードの場合、次のノードを実際のエントリーとして扱う
    let actualEntryNodeId = compiledPlan.entryNodeId;
    let currentNode = entryNode;
    if (entryNode.type === 'start' && entryNode.nextOnSuccess) {
      const nextNode = compiledPlan.nodes.get(entryNode.nextOnSuccess);
      if (nextNode) {
        actualEntryNodeId = entryNode.nextOnSuccess;
        currentNode = nextNode;
      }
    }

    // 5. FlowStateStore DOを呼び出して初期化
    // DOには実際に表示するノードIDを保存（startノードはスキップ済み）
    const doResponse = await this.callDO<DOInitResponse>(sessionId, '/init', 'POST', {
      sessionId,
      flowId: graphDef.id,
      tenantId,
      clientId,
      entryNodeId: actualEntryNodeId,
      ttlMs: this.ttlMs,
      oauthParams,
    });

    if (!doResponse.success || !doResponse.state) {
      throw new Error(doResponse.error || 'Failed to initialize flow');
    }

    const uiContract = this.uiGenerator.generate({
      compiledNode: currentNode,
      flowId: graphDef.id,
      profileId: graphDef.profileId,
    });

    return {
      sessionId,
      uiContractVersion: '0.1',
      uiContract,
    };
  }

  /**
   * Capability応答を処理し次のUIContractを返却
   */
  async submitCapability(params: FlowSubmitRequest): Promise<FlowSubmitResponse> {
    const { sessionId, requestId, capabilityId, response } = params;

    // 1. 冪等性チェック（/check-request）
    // これにより同一requestIdのリクエストは処理をスキップしてキャッシュ結果を返す
    const checkResponse = await this.callDO<DOCheckRequestResponse>(
      sessionId,
      '/check-request',
      'POST',
      { requestId }
    );

    // エラーチェック
    if (checkResponse.error) {
      return {
        type: 'error',
        error: {
          code: checkResponse.code || 'check_error',
          message: checkResponse.error,
        },
      };
    }

    // 冪等性ヒット: キャッシュされた結果を返す
    if (checkResponse.found && checkResponse.result) {
      return checkResponse.result;
    }

    // 未処理: check-requestが返した状態を使用
    if (!checkResponse.state) {
      return {
        type: 'error',
        error: {
          code: 'session_not_found',
          message: 'Session not found',
        },
      };
    }

    const { flowId, currentNodeId, collectedData = {} } = checkResponse.state;

    // 2. CompiledPlanを取得
    const compiledPlan = this.compiledPlans.get(`compiled-${flowId}`);
    if (!compiledPlan) {
      // キャッシュにない場合、再コンパイル
      const graphDef = await this.registry.getFlow('login'); // TODO: flowTypeを保存
      if (!graphDef) {
        return {
          type: 'error',
          error: {
            code: 'flow_not_found',
            message: 'Flow definition not found',
          },
        };
      }
      this.getOrCompilePlan(graphDef);
    }

    const plan = this.compiledPlans.get(`compiled-${flowId}`);
    if (!plan) {
      return {
        type: 'error',
        error: {
          code: 'plan_not_found',
          message: 'Compiled plan not found',
        },
      };
    }

    // 3. 現在のノードを取得
    const currentNode = plan.nodes.get(currentNodeId);
    if (!currentNode) {
      return {
        type: 'error',
        error: {
          code: 'node_not_found',
          message: `Node not found: ${currentNodeId}`,
        },
      };
    }

    // 4. 次のノードを決定
    const nextNodeId = currentNode.nextOnSuccess;

    // 完了チェック
    if (!nextNodeId) {
      // フロー完了 → リダイレクト
      return {
        type: 'redirect',
        redirect: {
          url: '/callback', // TODO: 実際のリダイレクトURLを取得
          method: 'GET',
        },
      };
    }

    const nextNode = plan.nodes.get(nextNodeId);
    if (!nextNode) {
      return {
        type: 'error',
        error: {
          code: 'next_node_not_found',
          message: `Next node not found: ${nextNodeId}`,
        },
      };
    }

    // endノードの場合、リダイレクト
    if (nextNode.type === 'end') {
      return {
        type: 'redirect',
        redirect: {
          url: '/callback', // TODO: 実際のリダイレクトURLを取得
          method: 'GET',
        },
      };
    }

    // 5. 次のUIContractを生成
    const updatedCollectedData = {
      ...collectedData,
      [capabilityId]: response,
    };

    const uiContract = this.uiGenerator.generate({
      compiledNode: nextNode,
      flowId,
      runtimeState: {
        collectedData: updatedCollectedData,
      },
      profileId: plan.profileId,
    });

    // 6. DOに状態を保存
    const submitResult: FlowSubmitResponse = {
      type: 'continue',
      uiContract,
    };

    await this.callDO(sessionId, '/submit', 'POST', {
      requestId,
      capabilityId,
      response,
      result: submitResult,
      nextNodeId,
    });

    return submitResult;
  }

  /**
   * 現在の状態を取得
   */
  async getFlowState(sessionId: string): Promise<FlowStateResponse> {
    // 1. DOから状態を取得
    const stateResponse = await this.callDO<DOStateResponse>(sessionId, '/state', 'GET');

    if (stateResponse.error || !stateResponse.state) {
      throw new Error(stateResponse.error || 'Session not found');
    }

    const { flowId, currentNodeId, visitedNodeIds, completedCapabilities, collectedData } =
      stateResponse.state;

    // 2. CompiledPlanを取得
    let plan = this.compiledPlans.get(`compiled-${flowId}`);
    if (!plan) {
      // キャッシュにない場合、再コンパイル
      const graphDef = await this.registry.getFlow('login');
      if (graphDef) {
        plan = this.getOrCompilePlan(graphDef);
      }
    }

    if (!plan) {
      throw new Error('Compiled plan not found');
    }

    // 3. 現在のノードを取得
    const currentNode = plan.nodes.get(currentNodeId);
    if (!currentNode) {
      throw new Error(`Node not found: ${currentNodeId}`);
    }

    // 4. UIContractを生成
    const uiContract = this.uiGenerator.generate({
      compiledNode: currentNode,
      flowId,
      runtimeState: {
        collectedData,
      },
      profileId: plan.profileId,
    });

    return {
      state: {
        currentNodeId,
        visitedNodeIds,
        completedCapabilities,
      },
      uiContract,
    };
  }

  /**
   * Flowをキャンセル
   */
  async cancelFlow(sessionId: string): Promise<void> {
    await this.callDO(sessionId, '/cancel', 'DELETE');
  }

  // =============================================================================
  // Private Methods
  // =============================================================================

  /**
   * CompiledPlanを取得またはコンパイル
   */
  private getOrCompilePlan(graphDef: {
    id: string;
    flowVersion: string;
    profileId: string;
    nodes: unknown[];
    edges: unknown[];
    name: string;
    description: string;
    metadata: unknown;
  }): CompiledPlan {
    const cacheKey = `compiled-${graphDef.id}`;

    // キャッシュにあればそれを返す
    const cached = this.compiledPlans.get(cacheKey);
    if (cached && cached.sourceVersion === graphDef.flowVersion) {
      return cached;
    }

    // コンパイル
    const compiled = this.compiler.compile(graphDef as Parameters<typeof this.compiler.compile>[0]);
    this.compiledPlans.set(cacheKey, compiled);

    return compiled;
  }

  /**
   * FlowStateStore DOを呼び出す
   *
   * シャーディング戦略:
   * - sessionIdをFNV-1aハッシュでシャードインデックスに変換
   * - シャード数はKV/環境変数/デフォルト(32)の優先順で取得
   * - DOインスタンス名: flow-{shardIndex}
   */
  private async callDO<T>(
    sessionId: string,
    path: string,
    method: 'GET' | 'POST' | 'DELETE',
    body?: unknown
  ): Promise<T> {
    // シャーディングユーティリティを使用してDO stubを取得
    const { stub } = await getFlowStateStoreStub(this.env, sessionId);

    // リクエストを作成
    const requestInit: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body && method !== 'GET') {
      requestInit.body = JSON.stringify(body);
    }

    // DOを呼び出す
    const response = await stub.fetch(new Request(`http://localhost${path}`, requestInit));

    // レスポンスをパース
    return (await response.json()) as T;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * FlowExecutorを作成
 *
 * @param env - Cloudflare Worker環境
 * @param options - オプション
 * @returns FlowExecutor インスタンス
 *
 * @example
 * const executor = createFlowExecutor(c.env);
 * const response = await executor.initFlow({
 *   flowType: 'login',
 *   clientId: 'test-client',
 *   tenantId: 'default',
 * });
 */
export function createFlowExecutor(env: Env, options?: FlowExecutorOptions): FlowExecutor {
  return new FlowExecutor(env, options);
}

// =============================================================================
// Export
// =============================================================================

export default FlowExecutor;
