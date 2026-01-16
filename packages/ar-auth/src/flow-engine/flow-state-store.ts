/**
 * FlowStateStore - Re-export from ar-lib-core
 *
 * FlowStateStore DOは ar-lib-core に定義されています。
 * このファイルは後方互換性のための再エクスポートです。
 *
 * @see /private/docs/track-c-flow-engine-design.md
 */

// Re-export FlowStateStore and types from ar-lib-core
export {
  FlowStateStore,
  DEFAULT_FLOW_TTL_MS,
  MAX_PROCESSED_REQUEST_IDS,
} from '@authrim/ar-lib-core';

export type {
  RuntimeState,
  RuntimeStateSnapshot,
  FlowSubmitResult,
  CreateRuntimeStateParams,
  FlowOAuthParams as OAuthFlowParams,
} from '@authrim/ar-lib-core';
