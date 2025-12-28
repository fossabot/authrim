/**
 * Event Types
 *
 * Unified event system for Authrim.
 * Provides types for event publishing, webhook delivery, and hook processing.
 *
 * @packageDocumentation
 */

// =============================================================================
// Unified Event
// =============================================================================

export type {
  ActorType,
  EventActor,
  EventMetadata,
  UnifiedEvent,
  EventSeverity,
  EventCategory,
} from './unified-event';

export {
  createUnifiedEvent,
  getEventCategory,
  getEventAction,
  matchEventPattern,
} from './unified-event';

// =============================================================================
// Dispatcher
// =============================================================================

export type {
  EventPublishPayload,
  EventPublishOptions,
  WebhookDeliverySummary,
  HandlerExecutionSummary,
  DeliverySummary,
  DeliveryTarget,
  EventDeliveryError,
  EventPublishResult,
  EventDispatcher,
  EventDispatcherConfig,
  EventDispatcherFactory,
  TypedEventPayload,
  TypedUnifiedEvent,
} from './dispatcher';

// =============================================================================
// Webhook
// =============================================================================

export type {
  WebhookRetryPolicy,
  WebhookConfig,
  SecretDecryptor,
  CreateWebhookInput,
  UpdateWebhookInput,
  WebhookRegistry,
  WebhookDeliveryStatus,
  WebhookDeliveryAttempt,
  WebhookStats,
  WebhookSignature,
  WebhookSendResult,
  WebhookSender,
} from './webhook';

export { DEFAULT_WEBHOOK_RETRY_POLICY } from './webhook';

// =============================================================================
// Webhook Payload (External Delivery Format)
// =============================================================================

export type {
  WebhookContext,
  WebhookActor,
  WebhookTarget,
  WebhookPayload,
  ExtractTargetOptions,
} from './webhook-payload';

export { toWebhookPayload, fromWebhookPayload } from './webhook-payload';

// =============================================================================
// Handler
// =============================================================================

export type {
  EventHandlerContext,
  HandlerErrorStrategy,
  EventHandlerConfig,
  EventAsyncHandler,
  HandlerExecutionResult,
  EventHandlerRegistry,
  HandlerExecutor,
  HandlerExecutorOptions,
  HandlerRegistryConfig,
  HandlerExecutorConfig,
} from './handler';

// =============================================================================
// Hooks
// =============================================================================

export type {
  BeforeHookResult,
  BeforeHookHandler,
  BeforeHookConfig,
  AfterHookHandler,
  AfterHookConfig,
  EventHookRegistry,
  BeforeHookExecutionResult,
  AfterHookExecutionResult,
  BeforeHooksResult,
  FlowEventEdgeMeta,
  IntentEventMapping,
} from './hooks';
