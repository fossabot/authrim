/**
 * Flow Engine - エクスポート
 *
 * Track C: Flow Engine / UIContract の統一エントリーポイント
 *
 * @see /private/docs/track-c-flow-engine-design.md
 */

// =============================================================================
// Types
// =============================================================================

export type {
  // Layer 1: GraphDefinition (編集用)
  GraphDefinition,
  GraphNode,
  GraphNodeData,
  GraphNodeType,
  GraphEdge,
  GraphEdgeData,
  GraphEdgeType,
  EdgeCondition,
  GraphMetadata,
  CapabilityTemplate,
  // Layer 2: CompiledPlan (実行用)
  CompiledPlan,
  CompiledNode,
  CompiledTransition,
  CompiledCondition,
  EvaluationContext,
  ResolvedCapability,
  // Layer 3: RuntimeState (DO保存用)
  RuntimeState,
  OAuthFlowParams,
  RuntimeStateSnapshot,
  // API Types
  FlowInitRequest,
  FlowInitResponse,
  FlowSubmitRequest,
  FlowSubmitResponse,
  FlowSubmitResult,
  FlowRedirect,
  FlowError,
  FlowStateResponse,
  // Migration Types
  MigrationFn,
  MigrationDefinition,
  // Utility Types
  FlowCompiler,
  CreateRuntimeStateParams,
} from './types';

export { DEFAULT_FLOW_TTL_MS, MAX_PROCESSED_REQUEST_IDS } from './types';

// =============================================================================
// Flow API
// =============================================================================

export { flowApi } from './flow-api';

// =============================================================================
// Durable Object
// =============================================================================

export { FlowStateStore } from './flow-state-store';

// =============================================================================
// Flow Registry
// =============================================================================

export { FlowRegistry, createFlowRegistry } from './flow-registry';
export type { FlowType, FlowRegistryOptions } from './flow-registry';

// =============================================================================
// Flow Compiler
// =============================================================================

export { FlowCompilerService, createFlowCompiler } from './flow-compiler';

// =============================================================================
// UI Contract Generator
// =============================================================================

export { UIContractGenerator, createUIContractGenerator } from './ui-contract-generator';
export type { UIContractGeneratorParams } from './ui-contract-generator';

// =============================================================================
// Flow Executor
// =============================================================================

export { FlowExecutor, createFlowExecutor } from './flow-executor';
export type { FlowExecutorOptions } from './flow-executor';

// =============================================================================
// Builtin Flows
// =============================================================================

export {
  HUMAN_BASIC_LOGIN_FLOW,
  BUILTIN_FLOWS,
  getBuiltinFlow,
  getBuiltinFlowIds,
} from './flows/login-flow';
