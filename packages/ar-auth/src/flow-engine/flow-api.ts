/**
 * Flow API - Hono APIハンドラ
 *
 * エンドポイント:
 * - POST /api/flow/init      - Flow初期化、UIContract返却
 * - POST /api/flow/submit    - Capability応答送信
 * - GET  /api/flow/state/:sessionId - 現在のUIContract取得
 * - POST /api/flow/cancel    - Flowキャンセル
 *
 * @see /private/docs/track-c-flow-engine-design.md
 */

import { Hono } from 'hono';
import type { Env } from '@authrim/ar-lib-core';
import type {
  FlowInitRequest,
  FlowInitResponse,
  FlowSubmitRequest,
  FlowSubmitResponse,
  FlowStateResponse,
} from './types';
import { createFlowExecutor } from './flow-executor';
import type { FlowType } from './flow-registry';

// =============================================================================
// Flow API Router
// =============================================================================

export const flowApi = new Hono<{ Bindings: Env }>();

/**
 * POST /api/flow/init
 * Flow初期化 - UIContractを返却
 *
 * FlowExecutorを使用して:
 * 1. FlowRegistryからFlow定義を取得
 * 2. FlowCompilerでCompiledPlanを生成
 * 3. FlowStateStore DOでRuntimeState作成
 * 4. UIContractGeneratorでUIContract生成
 */
flowApi.post('/init', async (c) => {
  try {
    const body = await c.req.json<FlowInitRequest>();

    // FlowExecutorを作成
    const executor = createFlowExecutor(c.env);

    // Flow初期化
    const response = await executor.initFlow({
      flowType: (body.flowType || 'login') as FlowType,
      clientId: body.clientId,
      tenantId: body.tenantId ?? 'default',
      oauthParams: body.oauthParams,
    });

    return c.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json(
      {
        type: 'error',
        error: {
          code: 'init_failed',
          message,
        },
      } as FlowSubmitResponse,
      500
    );
  }
});

/**
 * POST /api/flow/submit
 * Capability応答を送信
 *
 * 冪等性保証: sessionId + requestId の組み合わせで重複検知
 */
flowApi.post('/submit', async (c) => {
  try {
    const body = await c.req.json<FlowSubmitRequest>();

    // FlowExecutorを作成
    const executor = createFlowExecutor(c.env);

    // Capability応答を処理
    const response = await executor.submitCapability(body);

    return c.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json(
      {
        type: 'error',
        error: {
          code: 'submit_failed',
          message,
        },
      } as FlowSubmitResponse,
      500
    );
  }
});

/**
 * GET /api/flow/state/:sessionId
 * 現在のUIContractを取得（冪等）
 */
flowApi.get('/state/:sessionId', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');

    // FlowExecutorを作成
    const executor = createFlowExecutor(c.env);

    // 状態を取得
    const response = await executor.getFlowState(sessionId);

    return c.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json(
      {
        error: {
          code: 'state_fetch_failed',
          message,
        },
      },
      404
    );
  }
});

/**
 * POST /api/flow/cancel
 * Flowキャンセル
 */
flowApi.post('/cancel', async (c) => {
  try {
    const { sessionId } = await c.req.json<{ sessionId: string }>();

    // FlowExecutorを作成
    const executor = createFlowExecutor(c.env);

    // Flowキャンセル
    await executor.cancelFlow(sessionId);

    return c.json({ success: true, sessionId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json(
      {
        success: false,
        error: {
          code: 'cancel_failed',
          message,
        },
      },
      500
    );
  }
});

// =============================================================================
// Export
// =============================================================================

export default flowApi;
