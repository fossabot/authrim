/**
 * Flow Engine - 3層IR型定義
 *
 * アーキテクチャ原則:
 * - GraphDefinition（編集用）: Admin UI / Flow Designerで使用
 * - CompiledPlan（実行用）: Flow Engineが実行時に参照
 * - RuntimeState（DO保存用）: Durable Objectに永続化
 *
 * @see /private/docs/track-c-flow-engine-design.md
 */

import type {
  ProfileId,
  Intent,
  CapabilityType,
  CapabilityHints,
  ValidationRule,
  UIContract,
  StabilityLevel,
} from '@authrim/ar-lib-core';

// =============================================================================
// Layer 1: GraphDefinition（編集用）
// Admin UI / Flow Designerで使用。ビジュアル編集に最適化。
// =============================================================================

/**
 * GraphDefinition - Admin UI / Flow Designer用
 * ビジュアル編集に最適化された形式
 */
export interface GraphDefinition {
  /** 一意識別子 */
  id: string;

  /** フロー定義のバージョン（セマンティックバージョン e.g., "1.0.0"） */
  flowVersion: string;

  /** フロー名称 */
  name: string;

  /** フロー説明 */
  description: string;

  /** 対象プロファイル */
  profileId: ProfileId;

  /** ノード定義 */
  nodes: GraphNode[];

  /** エッジ定義 */
  edges: GraphEdge[];

  /** メタデータ */
  metadata: GraphMetadata;
}

/**
 * グラフノード - フローの各ステップ
 */
export interface GraphNode {
  /** ノード一意識別子 */
  id: string;

  /** ノードタイプ */
  type: GraphNodeType;

  /** UI配置位置（Flow Designer用） */
  position: { x: number; y: number };

  /** ノードデータ */
  data: GraphNodeData;
}

/**
 * ノードデータ
 */
export interface GraphNodeData {
  /** 表示ラベル */
  label: string;

  /** Intent（意図/目的） */
  intent: Intent;

  /** Capabilityテンプレート */
  capabilities: CapabilityTemplate[];

  /** ノード固有設定 */
  config: Record<string, unknown>;
}

/**
 * ノードタイプ
 */
export type GraphNodeType =
  | 'start' // 開始ノード
  | 'identifier' // ID入力（email, phone等）
  | 'auth_method' // 認証方法選択
  | 'mfa' // 多要素認証
  | 'consent' // 同意画面
  | 'condition' // 条件分岐
  | 'end' // 完了ノード
  | 'error'; // エラーノード

/**
 * グラフエッジ - ノード間の遷移
 */
export interface GraphEdge {
  /** エッジ一意識別子 */
  id: string;

  /** 始点ノードID */
  source: string;

  /** 終点ノードID */
  target: string;

  /** 始点ハンドル（複数出力用） */
  sourceHandle?: string;

  /** 終点ハンドル（複数入力用） */
  targetHandle?: string;

  /** エッジタイプ */
  type: GraphEdgeType;

  /** エッジデータ */
  data?: GraphEdgeData;
}

/**
 * エッジデータ
 */
export interface GraphEdgeData {
  /** 表示ラベル */
  label?: string;

  /** 遷移条件（conditionalタイプ用） */
  condition?: EdgeCondition;
}

/**
 * エッジタイプ
 */
export type GraphEdgeType = 'success' | 'error' | 'conditional';

/**
 * エッジ条件
 */
export interface EdgeCondition {
  /** 条件タイプ */
  type: 'capability_result' | 'policy_check' | 'feature_flag' | 'custom';

  /** 評価式（JSONPath風またはJavaScript式） */
  expression: string;
}

/**
 * グラフメタデータ
 */
export interface GraphMetadata {
  /** 作成日時（ISO 8601） */
  createdAt: string;

  /** 更新日時（ISO 8601） */
  updatedAt: string;

  /** 作成者（user_id） */
  createdBy?: string;
}

/**
 * Capabilityテンプレート - UIContract生成時に解決される
 */
export interface CapabilityTemplate {
  /** Capabilityタイプ */
  type: CapabilityType;

  /** ID接尾辞（完全IDは `${nodeId}_${idSuffix}`） */
  idSuffix: string;

  /** 必須フラグ */
  required: boolean;

  /** ヒントテンプレート */
  hintsTemplate?: Partial<CapabilityHints>;

  /** バリデーションルール */
  validationRules?: ValidationRule[];
}

// =============================================================================
// Layer 2: CompiledPlan（実行用）
// Flow Engineが実行時に参照。最適化された形式。
// =============================================================================

/**
 * CompiledPlan - Flow Engine実行用
 * GraphDefinitionをコンパイルした最適化形式
 */
export interface CompiledPlan {
  /** コンパイル済みプランID */
  id: string;

  /** CompiledPlan自体のバージョン */
  version: string;

  /** 元のGraphDefinitionのflowVersion */
  sourceVersion: string;

  /** 対象プロファイル */
  profileId: ProfileId;

  /** エントリーポイントノードID */
  entryNodeId: string;

  /** ノードマップ（id -> CompiledNode） */
  nodes: Map<string, CompiledNode>;

  /** 遷移マップ（sourceNodeId -> CompiledTransition[]） */
  transitions: Map<string, CompiledTransition[]>;

  /** コンパイル日時（ISO 8601） */
  compiledAt: string;
}

/**
 * コンパイル済みノード
 */
export interface CompiledNode {
  /** ノードID */
  id: string;

  /** ノードタイプ */
  type: GraphNodeType;

  /** Intent */
  intent: Intent;

  /** 解決済みCapability */
  capabilities: ResolvedCapability[];

  /** 成功時の次ノードID（nullは終端） */
  nextOnSuccess: string | null;

  /** エラー時の次ノードID（nullはデフォルトエラーハンドリング） */
  nextOnError: string | null;
}

/**
 * コンパイル済み遷移
 */
export interface CompiledTransition {
  /** 遷移先ノードID */
  targetNodeId: string;

  /** 遷移タイプ */
  type: 'success' | 'error' | 'conditional';

  /** コンパイル済み条件（conditionalタイプ用） */
  condition?: CompiledCondition;
}

/**
 * コンパイル済み条件
 */
export interface CompiledCondition {
  /** 条件タイプ */
  type: 'capability_result' | 'policy_check' | 'feature_flag' | 'custom';

  /** 元の式 */
  expression: string;

  /** 評価関数（コンパイル時に生成） */
  evaluate: (context: EvaluationContext) => boolean;
}

/**
 * 条件評価コンテキスト
 */
export interface EvaluationContext {
  /** 収集済みデータ */
  collectedData: Record<string, unknown>;

  /** 完了済みCapability ID */
  completedCapabilities: string[];

  /** ユーザークレーム */
  claims?: Record<string, unknown>;

  /** 機能フラグ */
  featureFlags?: Record<string, boolean>;
}

/**
 * 解決済みCapability
 */
export interface ResolvedCapability {
  /** Capabilityタイプ */
  type: CapabilityType;

  /** 完全ID（`${nodeId}_${idSuffix}`） */
  id: string;

  /** 必須フラグ */
  required: boolean;

  /** 解決済みヒント */
  hints: CapabilityHints;

  /** バリデーションルール */
  validationRules: ValidationRule[];

  /** 安定性レベル */
  stability: StabilityLevel;
}

// =============================================================================
// Layer 3: RuntimeState（DO保存用）
// Durable Objectに永続化。最小限のデータ。
// =============================================================================

/**
 * RuntimeState - Durable Object保存用
 * 実行時の状態を最小限に保持
 */
export interface RuntimeState {
  // === セッション識別 ===

  /** セッションID */
  sessionId: string;

  /** フローID */
  flowId: string;

  /** テナントID */
  tenantId: string;

  /** クライアントID */
  clientId: string;

  // === 現在位置 ===

  /** 現在のノードID */
  currentNodeId: string;

  /** 訪問済みノードID */
  visitedNodeIds: string[];

  // === 収集済みデータ ===

  /** 収集したデータ（capabilityId -> response） */
  collectedData: Record<string, unknown>;

  /** 完了済みCapability ID */
  completedCapabilities: string[];

  // === 認証コンテキスト ===

  /** 認証済みユーザーID */
  userId?: string;

  /** ユーザークレーム */
  claims?: Record<string, unknown>;

  // === OAuth パラメータ（認可フロー用） ===
  oauthParams?: OAuthFlowParams;

  // === タイムスタンプ ===

  /** フロー開始時刻（UNIX ms） */
  startedAt: number;

  /** 有効期限（UNIX ms） */
  expiresAt: number;

  /** 最終アクティビティ時刻（UNIX ms） */
  lastActivityAt: number;

  // === 冪等性管理 ===

  /** 処理済みrequestId -> スナップショット */
  processedRequestIds: Record<string, RuntimeStateSnapshot>;
}

/**
 * OAuthフローパラメータ
 */
export interface OAuthFlowParams {
  responseType?: string;
  redirectUri?: string;
  scope?: string;
  state?: string;
  nonce?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  acrValues?: string;
  loginHint?: string;
  prompt?: string;
  maxAge?: number;
}

/**
 * 冪等性のためのスナップショット
 * 同一requestIdの再送時にこの結果を返す
 */
export interface RuntimeStateSnapshot {
  /** リクエストID */
  requestId: string;

  /** 処理時刻（UNIX ms） */
  processedAt: number;

  /** 結果のノードID */
  resultNodeId: string;

  /** 結果データ（UIContractまたはリダイレクト情報） */
  resultData: FlowSubmitResult;
}

// =============================================================================
// API Request/Response Types
// =============================================================================

/**
 * POST /api/flow/init リクエスト
 */
export interface FlowInitRequest {
  /** フロータイプ */
  flowType: 'login' | 'authorization' | 'consent' | 'logout';

  /** クライアントID */
  clientId: string;

  /** テナントID（マルチテナント用） */
  tenantId?: string;

  /** OAuthパラメータ（認可フロー用） */
  oauthParams?: OAuthFlowParams;
}

/**
 * POST /api/flow/init レスポンス
 */
export interface FlowInitResponse {
  /** セッションID */
  sessionId: string;

  /** UIContractバージョン */
  uiContractVersion: '0.1';

  /** 初期UIContract */
  uiContract: UIContract;
}

/**
 * POST /api/flow/submit リクエスト
 */
export interface FlowSubmitRequest {
  /** セッションID */
  sessionId: string;

  /** リクエストID（クライアント生成UUID、冪等性用） */
  requestId: string;

  /** Capability ID */
  capabilityId: string;

  /** Capability応答 */
  response: unknown;
}

/**
 * POST /api/flow/submit レスポンス
 */
export type FlowSubmitResponse = FlowSubmitResult;

/**
 * フロー送信結果
 */
export type FlowSubmitResult =
  | { type: 'continue'; uiContract: UIContract }
  | { type: 'redirect'; redirect: FlowRedirect }
  | { type: 'error'; error: FlowError };

/**
 * リダイレクト情報
 */
export interface FlowRedirect {
  /** リダイレクトURL */
  url: string;

  /** HTTPメソッド */
  method: 'GET' | 'POST';

  /** 追加パラメータ */
  params?: Record<string, string>;
}

/**
 * フローエラー
 */
export interface FlowError {
  /** エラーコード */
  code: string;

  /** エラーメッセージ */
  message: string;

  /** 追加詳細 */
  details?: Record<string, unknown>;
}

/**
 * GET /api/flow/state/:sessionId レスポンス
 */
export interface FlowStateResponse {
  /** 現在の状態（公開用サブセット） */
  state: {
    currentNodeId: string;
    visitedNodeIds: string[];
    completedCapabilities: string[];
  };

  /** 現在のUIContract */
  uiContract: UIContract;
}

// =============================================================================
// Flow Migrator Types
// =============================================================================

/**
 * マイグレーション関数
 */
export type MigrationFn = (flow: GraphDefinition) => GraphDefinition;

/**
 * マイグレーション定義
 */
export interface MigrationDefinition {
  /** 移行元バージョン */
  fromVersion: string;

  /** 移行先バージョン */
  toVersion: string;

  /** マイグレーション関数 */
  migrate: MigrationFn;
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * GraphDefinitionをCompiledPlanに変換するコンパイラ
 */
export interface FlowCompiler {
  compile(graph: GraphDefinition): CompiledPlan;
}

/**
 * RuntimeStateの作成パラメータ
 */
export interface CreateRuntimeStateParams {
  sessionId: string;
  flowId: string;
  tenantId: string;
  clientId: string;
  entryNodeId: string;
  ttlMs: number;
  oauthParams?: OAuthFlowParams;
}

/**
 * セッション有効期限のデフォルト値（10分）
 */
export const DEFAULT_FLOW_TTL_MS = 10 * 60 * 1000;

/**
 * 冪等性スナップショットの最大保持数
 */
export const MAX_PROCESSED_REQUEST_IDS = 100;
