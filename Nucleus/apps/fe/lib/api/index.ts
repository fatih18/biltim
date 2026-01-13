/**
 * API Module - Main exports
 */

// Config
export { apiConfig } from './config'
// Endpoint Keys
export type { EndpointsKeyMap, GenericEndpointKeys } from './endpointKeys'
// Factory
export { Factory, FactoryFunction } from './factory'
// Settings
export { type RouteSetting, settings } from './settings'
// Types and Endpoints
export {
  type ActionTypes,
  type ApiResponse,
  CustomEndpoints,
  Endpoints,
  type FactoryPayloadValue,
} from './types'

// Vorion exports
export {
  type RemoteCommandResult,
  type RemoteExecuteCommandResponse,
  streamVorionPrediction,
  type VorionAvailableLLMsResponse,
  type VorionConversationListResponse,
  type VorionConversationResponse,
  type VorionDocumentListItem,
  type VorionDocumentListResponse,
  type VorionDocumentResponse,
  VorionEndpoints,
  type VorionIngestionBatchResponse,
  type VorionKnowledgeBaseListResponse,
  type VorionKnowledgeBaseResponse,
  // Types
  type VorionLLMSummary,
  type VorionMessageListResponse,
  type VorionMessageResponse,
  type VorionMessageRole,
  type VorionMessageStatus,
  type VorionPredictionRequest,
  type VorionSearchResponse,
  type VorionSearchResult,
  type VorionStreamChunk,
  type VorionToolCreateResponse,
  type VorionToolExecutionDetailResponse,
  type VorionToolExecutionLogResponse,
  type VorionToolExecutionResponse,
  type VorionToolFunctionSchema,
  type VorionToolListResponse,
  type VorionToolResponse,
  type VorionToolVersionComparison,
  type VorionToolVersionDetailResponse,
  type VorionToolVersionResponse,
  vorionSettings,
} from './Vorion'
