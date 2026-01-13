// Vorion API mappings for Nextjs Actions Factory
// This module keeps Vorion-specific endpoints, types and route settings
// separate from the core Factory to avoid clutter.

// NOTE: We intentionally do NOT import from "../types" here to avoid
// circular dependencies. Root Factory types will import *from* this module.

//#region Shared Vorion response models (simplified)

export type VorionLLMStatus = 'active' | 'inactive' | 'deprecated' | 'maintenance'

export interface VorionLLMSummary {
  id: number
  provider_name: string
  model_name: string
  group_name: string | null
  display_name: string
  context_window_size: number
  status: VorionLLMStatus
  is_available: boolean
  // Allow additional fields without breaking
  [key: string]: unknown
}

export interface VorionAvailableLLMsResponse {
  providers: Record<string, VorionLLMSummary[]>
  total_count: number
}

export interface VorionLLMProviderModelsResponse {
  provider_name: string
  models: VorionLLMSummary[]
  count: number
}

export interface VorionLLMListResponse {
  items: VorionLLMSummary[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface VorionLLMResponse extends VorionLLMSummary {
  description?: string | null
  max_output_tokens?: number | null
  static_weight?: number | null
  config_json?: unknown
  cost_per_input_token?: number | null
  cost_per_output_token?: number | null
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
  deleted_by?: string | null
}

export interface VorionConversationResponse {
  id: string
  user_id: string
  app_id: number | null
  title: string | null
  system_prompt: string | null
  extra_metadata: string | null
  status: string
  current_token_count: number
  message_count: number
  last_message_at: string | null
  last_summarized_at: string | null
  summary: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  deleted_by: string | null
  [key: string]: unknown
}

export interface VorionConversationListResponse {
  items: VorionConversationResponse[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// Message types
export type VorionMessageRole = 'system' | 'human' | 'ai' | 'tool' | 'function'
export type VorionMessageStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

export interface VorionMessageResponse {
  id: string
  conversation_id: string
  role: VorionMessageRole
  status: VorionMessageStatus
  content: string | null
  image_urls: string | null
  file_urls: string | null
  content_types: string | null
  tool_calls: string | null
  tool_call_id: string | null
  tool_name: string | null
  additional_kwargs: string | null
  response_metadata: string | null
  input_tokens: number | null
  output_tokens: number | null
  total_tokens: number | null
  cache_read_tokens: number | null
  cache_creation_tokens: number | null
  model_name: string | null
  model_provider: string | null
  stop_reason: string | null
  finish_reason: string | null
  lc_message_id: string | null
  sequence_number: number
  error_message: string | null
  error_code: string | null
  processing_started_at: string | null
  processing_completed_at: string | null
  processing_duration_ms: number | null
  extra_metadata: string | null
  is_summarized: boolean
  included_in_summary: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
  deleted_by: string | null
  [key: string]: unknown
}

export interface VorionMessageListResponse {
  items: VorionMessageResponse[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// Prediction Request (sent as JSON string in `data` field of multipart/form-data)
export interface VorionPredictionRequest {
  conversation_id: string
  prompt: {
    text: string
    rag_content?: string | null
    save_prompt_with_rag_content?: boolean
    prompt_with_rag_content?: string | null
  }
  llm_name: string
  llm_group_name?: string
  load_balancer_strategy_name?: string
  system_message?: string
  persona_system_message?: string
  user_info_system_message?: string
  language?: string
  tool_ids?: string[]
  app_id?: number
  thinking?: {
    enabled?: boolean
    budget_tokens?: number | null
    effort?: 'low' | 'medium' | 'high' | null
    summary?: 'detailed' | 'auto' | null
    format?: 'parsed' | null
  }
  tag_name?: string
  conversation_type?: string
  sources?: unknown[] | null
}

export interface VorionPredictionResponse {
  conversation_id: string
  response: string
  message_id: string
  user_id: string
  app_id: number | null
  reasoning: string | null
  reasoning_tokens: number | null
  input_tokens: number
  output_tokens: number
  total_tokens: number
  cache_read_tokens: number | null
  cache_creation_tokens: number | null
  model_name: string
  model_provider: string
  [key: string]: unknown
}

export interface VorionAsyncPredictionResponse {
  task_id: string
  conversation_id: string
  message: string
  events_to_subscribe: string[]
}

// Streaming Prediction (SSE) - each event contains a StreamChunk
export interface VorionStreamChunk {
  conversation_id: string
  chunk: string
  is_final: boolean
  message_id?: string
  reasoning?: string | null
  reasoning_tokens?: number | null
  input_tokens?: number
  output_tokens?: number
  total_tokens?: number
  model_name?: string
  model_provider?: string
}

export interface VorionKnowledgeBaseResponse {
  id: string
  user_id: string
  app_id: number | null
  name: string
  slug: string
  description: string | null
  visibility: string
  status: string
  document_count: number
  chunk_count: number
  total_size_bytes: number
  default_chunk_size: number
  default_chunk_overlap: number
  tags: string[]
  created_at: string
  updated_at: string
  [key: string]: unknown
}

export interface VorionKnowledgeBaseListResponse {
  items: VorionKnowledgeBaseResponse[]
  total: number
  skip: number
  limit: number
}

export interface VorionIngestionBatchResponse {
  id: number
  data_source_id: number
  status: string
  total_documents: number
  processed_count: number
  failed_count: number
  started_at: string | null
  completed_at: string | null
  error_message: string | null
}

export interface VorionDocumentListItem {
  id: string
  knowledge_base_id: string
  ingestion_batch_id: number
  title: string
  document_type: string
  status: string
  external_id: string | null
  storage_uri: string | null
  size_bytes: number
  error_message: string | null
  [key: string]: unknown
}

export interface VorionDocumentListResponse {
  items: VorionDocumentListItem[]
  total: number
  skip: number
  limit: number
}

export interface VorionDocumentResponse {
  id: string
  knowledge_base_id: string
  ingestion_batch_id: number
  title: string
  document_type: string
  status: string
  external_id: string | null
  storage_uri: string | null
  size_bytes: number
  error_message: string | null
  created_at: string
  updated_at: string
  [key: string]: unknown
}

export interface VorionIngestionBatchListResponse {
  batches: VorionIngestionBatchResponse[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface VorionIngestionBatchDetailResponse extends VorionIngestionBatchResponse {
  documents: VorionDocumentListItem[]
}

export interface VorionBatchRetryResponse {
  message: string
  batch_id: number
  retried_count: number
  total_failed: number
}

export interface VorionSearchResult {
  chunk_id: number
  document_id: string
  document_title: string
  text: string
  score: number
  source: string
  metadata: Record<string, unknown> | null
}

export interface VorionSearchResponse {
  results: VorionSearchResult[]
  total_results: number
  query: string
  search_type: string
  latency_ms: number
}

// MCP Tool Service types
export interface VorionToolResponse {
  id: number
  user_id: string
  mcp_server_id: number | null
  name: string
  slug: string
  description: string | null
  language: string
  code: string | null
  config: string | null
  input_schema: string | null
  output_schema: string | null
  tool_type: string
  status: string
  function_name: string | null
  function_schema: string | null
  version: string
  is_public: boolean
  is_shared: boolean
  usage_count: number
  average_execution_time_ms: number | null
  last_executed_at: string | null
  published_at: string | null
  created_at: string
  updated_at: string
  [key: string]: unknown
}

export interface VorionToolListResponse {
  items: VorionToolResponse[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface VorionToolCreateResponse {
  tool: VorionToolResponse
  version?: {
    id: number
    version_number: string
    code_hash: string
  }
  message?: string
}

export interface VorionToolVersionResponse {
  id: number
  tool_id: number
  version_number: string
  code_hash: string
  is_active: boolean
  code_size_bytes: number
  baseline_execution_time_ms: number | null
  change_notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface VorionToolVersionDetailResponse extends VorionToolVersionResponse {
  code: string
  config: string | null
  input_schema: string | null
  output_schema: string | null
}

export interface VorionToolVersionComparison {
  version1: { version_number: string; code_hash: string; created_at: string }
  version2: { version_number: string; code_hash: string; created_at: string }
  code_changed: boolean
  config_changed: boolean
}

export interface VorionToolFunctionSchema {
  tool_id: number
  tool_name: string
  function_name: string
  function_schema: string
  tool_version_id?: number
}

export interface VorionToolExecutionResponse {
  id: number
  tool_version_id: number
  user_id: string
  execution_id: string
  status: string
  started_at: string | null
  completed_at: string | null
  execution_time_ms: number | null
  error_message: string | null
  error_type: string | null
  execution_environment: string
  retry_count: number
  created_at: string
  [key: string]: unknown
}

export interface VorionToolExecutionDetailResponse extends VorionToolExecutionResponse {
  input_params: string
  output_result: string | null
  stack_trace: string | null
  execution_metadata: string | null
  memory_usage_mb: number | null
  cpu_usage_percent: number | null
  runtime_version: string | null
}

export interface VorionToolExecutionLogResponse {
  id: number
  tool_execution_id: number
  log_level: string
  message: string
  timestamp: string
  source: string
  line_number: number | null
  log_metadata: string | null
}

export interface VorionMCPServerResponse {
  id: number
  user_id: string
  name: string
  slug: string
  description: string | null
  url: string | null
  config: string | null
  version: string
  is_public: boolean
  is_shared: boolean
  server_type: string
  status: string
  generated_code: string | null
  deployment_name: string | null
  k8s_yaml: string | null
  usage_count: number
  published_at: string | null
  created_at: string
  updated_at: string
  [key: string]: unknown
}

export interface VorionMCPServerListResponse {
  items: VorionMCPServerResponse[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface VorionMCPServerDeploymentStatus {
  server_id: number
  deployment_name: string | null
  status: string
  url: string | null
  is_public: boolean
  published_at: string | null
  has_generated_code: boolean
  tool_count: number
}

//#endregion

//#region Vorion Endpoints enum

export enum VorionEndpoints {
  // Remote Computer Access
  REMOTE_CREATE_COMPUTER = 'Remote: Create Computer',
  REMOTE_EXECUTE_COMMAND = 'Remote: Execute Command',

  // LLM service
  VORION_GET_AVAILABLE_LLMS = 'Vorion: Get Available LLMs',
  VORION_GET_PROVIDER_MODELS = 'Vorion: Get Provider Models',
  VORION_GET_GROUP_MODELS = 'Vorion: Get Group Models',
  VORION_LIST_LLMS = 'Vorion: List LLMs',
  VORION_GET_LLM_BY_ID = 'Vorion: Get LLM By Id',

  // Conversations
  VORION_CREATE_CONVERSATION = 'Vorion: Create Conversation',
  VORION_LIST_CONVERSATIONS = 'Vorion: List Conversations',
  VORION_SEARCH_CONVERSATIONS = 'Vorion: Search Conversations',
  VORION_GET_CONVERSATION = 'Vorion: Get Conversation',
  VORION_UPDATE_CONVERSATION = 'Vorion: Update Conversation',
  VORION_DELETE_CONVERSATION = 'Vorion: Delete Conversation',
  VORION_ARCHIVE_CONVERSATION = 'Vorion: Archive Conversation',

  // Messages
  VORION_LIST_MESSAGES = 'Vorion: List Messages',
  VORION_GET_MESSAGE = 'Vorion: Get Message',

  // Prediction
  VORION_SYNC_PREDICTION = 'Vorion: Sync Prediction',
  VORION_STREAMING_PREDICTION = 'Vorion: Streaming Prediction',
  VORION_ASYNC_PREDICTION = 'Vorion: Async Prediction',

  // RAG - Knowledge Bases
  VORION_CREATE_KNOWLEDGE_BASE = 'Vorion: Create Knowledge Base',
  VORION_LIST_KNOWLEDGE_BASES = 'Vorion: List Knowledge Bases',
  VORION_GET_KNOWLEDGE_BASE = 'Vorion: Get Knowledge Base',
  VORION_UPDATE_KNOWLEDGE_BASE = 'Vorion: Update Knowledge Base',
  VORION_DELETE_KNOWLEDGE_BASE = 'Vorion: Delete Knowledge Base',
  VORION_SEARCH_KNOWLEDGE_BASES = 'Vorion: Search Knowledge Bases',

  // RAG - Documents
  VORION_UPLOAD_DOCUMENTS = 'Vorion: Upload Documents',
  VORION_LIST_DOCUMENTS = 'Vorion: List Documents',
  VORION_GET_DOCUMENT = 'Vorion: Get Document',
  VORION_DELETE_DOCUMENT = 'Vorion: Delete Document',
  VORION_RETRY_DOCUMENT = 'Vorion: Retry Document',

  // RAG - Batches
  VORION_LIST_BATCHES = 'Vorion: List Batches',
  VORION_GET_BATCH = 'Vorion: Get Batch',
  VORION_RETRY_BATCH_FAILED = 'Vorion: Retry Batch Failed',

  // RAG - Search
  VORION_SEARCH_KB = 'Vorion: Search Knowledge Base',

  // MCP Tools
  VORION_CREATE_TOOL = 'Vorion: Create Tool',
  VORION_LIST_TOOLS = 'Vorion: List Tools',
  VORION_LIST_PUBLIC_TOOLS = 'Vorion: List Public Tools',
  VORION_GET_TOOL = 'Vorion: Get Tool',
  VORION_GET_TOOL_BY_NAME = 'Vorion: Get Tool By Name',
  VORION_UPDATE_TOOL = 'Vorion: Update Tool',
  VORION_DELETE_TOOL = 'Vorion: Delete Tool',
  VORION_RESTORE_TOOL = 'Vorion: Restore Tool',
  VORION_PUBLISH_TOOL = 'Vorion: Publish Tool',
  VORION_LIST_TOOL_FUNCTIONS = 'Vorion: List Tool Functions',
  VORION_GET_TOOL_FUNCTIONS_BATCH = 'Vorion: Get Tool Functions Batch',
  VORION_GET_LLM_TOOL_SCHEMAS = 'Vorion: Get LLM Tool Schemas',

  // MCP Tool Versions
  VORION_CREATE_TOOL_VERSION = 'Vorion: Create Tool Version',
  VORION_GET_ACTIVE_TOOL_VERSION = 'Vorion: Get Active Tool Version',
  VORION_GET_TOOL_VERSION = 'Vorion: Get Tool Version',
  VORION_LIST_TOOL_VERSIONS = 'Vorion: List Tool Versions',
  VORION_ACTIVATE_TOOL_VERSION = 'Vorion: Activate Tool Version',
  VORION_ROLLBACK_TOOL_VERSION = 'Vorion: Rollback Tool Version',
  VORION_COMPARE_TOOL_VERSIONS = 'Vorion: Compare Tool Versions',

  // MCP Tool Executions
  VORION_EXECUTE_TOOL_SYNC = 'Vorion: Execute Tool Sync',
  VORION_EXECUTE_TOOL_ASYNC = 'Vorion: Execute Tool Async',
  VORION_GET_EXECUTION = 'Vorion: Get Execution',
  VORION_GET_EXECUTION_LOGS = 'Vorion: Get Execution Logs',
  VORION_LIST_EXECUTIONS = 'Vorion: List Executions',
  VORION_RETRY_EXECUTION = 'Vorion: Retry Execution',
  VORION_CANCEL_EXECUTION = 'Vorion: Cancel Execution',

  // MCP Servers
  VORION_CREATE_MCP_SERVER = 'Vorion: Create MCP Server',
  VORION_LIST_MCP_SERVERS = 'Vorion: List MCP Servers',
  VORION_LIST_PUBLIC_MCP_SERVERS = 'Vorion: List Public MCP Servers',
  VORION_GET_MCP_SERVER = 'Vorion: Get MCP Server',
  VORION_UPDATE_MCP_SERVER = 'Vorion: Update MCP Server',
  VORION_DELETE_MCP_SERVER = 'Vorion: Delete MCP Server',
  VORION_RESTORE_MCP_SERVER = 'Vorion: Restore MCP Server',
  VORION_ADD_TOOL_TO_SERVER = 'Vorion: Add Tool To Server',
  VORION_REMOVE_TOOL_FROM_SERVER = 'Vorion: Remove Tool From Server',
  VORION_GET_SERVER_TOOLS = 'Vorion: Get Server Tools',
  VORION_GENERATE_SERVER_CODE = 'Vorion: Generate Server Code',
  VORION_PUBLISH_MCP_SERVER = 'Vorion: Publish MCP Server',
  VORION_UNDEPLOY_MCP_SERVER = 'Vorion: Undeploy MCP Server',
  VORION_GET_DEPLOYMENT_STATUS = 'Vorion: Get Deployment Status',
}

//#endregion

// Remote Computer types
export interface RemoteCommandResult {
  command: string
  args: string[]
  exitCode: number | null
  stdout: string
  stderr: string
  timedOut: boolean
  startedAt: string
  finishedAt: string
  durationMs: number
}

export interface RemoteExecuteCommandResponse {
  agentId: string
  commandId: string
  result: RemoteCommandResult
}

//#region Vorion ActionTypes mapping

export type VorionActionTypes = {
  // Remote Computer Access
  [VorionEndpoints.REMOTE_CREATE_COMPUTER]: {
    payload: {
      name: string
    }
    success: {
      id: string
      name: string
      computer_identifier: string
      api_key: string // Only returned on creation
    }
    error: { message?: string } | string
  }
  [VorionEndpoints.REMOTE_EXECUTE_COMMAND]: {
    payload: {
      _agentId: string
      command: string
      args?: string[]
      cwd?: string
      timeoutMs?: number
    }
    success: RemoteExecuteCommandResponse
    error: { message?: string } | string
  }

  // LLMs
  [VorionEndpoints.VORION_GET_AVAILABLE_LLMS]: {
    payload: { status?: VorionLLMStatus } | undefined
    success: VorionAvailableLLMsResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_GET_PROVIDER_MODELS]: {
    payload:
      | {
          _provider_name: string
          status?: VorionLLMStatus
          available_only?: boolean
        }
      | undefined
    success: VorionLLMProviderModelsResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_GET_GROUP_MODELS]: {
    payload:
      | {
          _group_name: string
          status?: VorionLLMStatus
          available_only?: boolean
        }
      | undefined
    success: VorionLLMSummary[]
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_LIST_LLMS]: {
    payload?: {
      provider_name?: string
      status?: VorionLLMStatus
      available_only?: boolean
      search?: string
      page?: number
      page_size?: number
    }
    success: VorionLLMListResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_GET_LLM_BY_ID]: {
    payload: { _llm_id: number } | undefined
    success: VorionLLMResponse
    error: { message?: string } | string
  }

  // Conversations
  [VorionEndpoints.VORION_CREATE_CONVERSATION]: {
    payload:
      | {
          title?: string
          system_prompt?: string
          extra_metadata?: string
          app_id?: number
          status?: string
        }
      | undefined
    success: VorionConversationResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_LIST_CONVERSATIONS]: {
    payload?: {
      app_id?: number
      status?: string
      page?: number
      page_size?: number
    }
    success: VorionConversationListResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_SEARCH_CONVERSATIONS]: {
    payload?: {
      q?: string
      app_id?: number
      status?: string
      page?: number
      page_size?: number
    }
    success: VorionConversationListResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_GET_CONVERSATION]: {
    payload: { _conversation_id: string } | undefined
    success: VorionConversationResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_UPDATE_CONVERSATION]: {
    payload:
      | {
          _conversation_id: string
          title?: string
          status?: string
          system_prompt?: string
          extra_metadata?: string
        }
      | undefined
    success: VorionConversationResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_DELETE_CONVERSATION]: {
    payload: { _conversation_id: string; hard_delete?: boolean } | undefined
    success: undefined
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_ARCHIVE_CONVERSATION]: {
    payload: { _conversation_id: string } | undefined
    success: VorionConversationResponse
    error: { message?: string } | string
  }

  // Messages
  [VorionEndpoints.VORION_LIST_MESSAGES]: {
    payload: {
      conversation_id: string
      role?: VorionMessageRole
      page?: number
      page_size?: number
    }
    success: VorionMessageListResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_GET_MESSAGE]: {
    payload: { _message_id: string } | undefined
    success: VorionMessageResponse
    error: { message?: string } | string
  }

  // Prediction (multipart/form-data: `data` field = JSON.stringify(VorionPredictionRequest))
  [VorionEndpoints.VORION_SYNC_PREDICTION]: {
    payload:
      | FormData
      | {
          data: VorionPredictionRequest | string // VorionPredictionRequest or pre-stringified JSON
          files?: File[]
        }
    success: VorionPredictionResponse
    error: { message?: string } | string
  }
  // Streaming Prediction (SSE) - returns ReadableStream, use streamVorionPrediction() helper
  [VorionEndpoints.VORION_STREAMING_PREDICTION]: {
    payload:
      | FormData
      | {
          data: VorionPredictionRequest | string
          files?: File[]
        }
    success: ReadableStream<VorionStreamChunk>
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_ASYNC_PREDICTION]: {
    payload:
      | FormData
      | {
          data: VorionPredictionRequest | string
          files?: File[]
        }
    success: VorionAsyncPredictionResponse
    error: { message?: string } | string
  }

  // Knowledge Bases
  [VorionEndpoints.VORION_CREATE_KNOWLEDGE_BASE]: {
    payload:
      | {
          name: string
          slug: string
          description?: string
          visibility?: string
          tags?: string[]
          default_chunk_size?: number
          default_chunk_overlap?: number
        }
      | undefined
    success: VorionKnowledgeBaseResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_LIST_KNOWLEDGE_BASES]: {
    payload?: {
      status?: string
      skip?: number
      limit?: number
    }
    success: VorionKnowledgeBaseListResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_GET_KNOWLEDGE_BASE]: {
    payload: { _kb_id: string } | undefined
    success: VorionKnowledgeBaseResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_UPDATE_KNOWLEDGE_BASE]: {
    payload:
      | {
          _kb_id: string
          name?: string
          description?: string
          visibility?: string
          tags?: string[]
          default_chunk_size?: number
          default_chunk_overlap?: number
        }
      | undefined
    success: VorionKnowledgeBaseResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_DELETE_KNOWLEDGE_BASE]: {
    payload: { _kb_id: string } | undefined
    success: undefined
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_SEARCH_KNOWLEDGE_BASES]: {
    payload: { q: string; skip?: number; limit?: number } | undefined
    success: VorionKnowledgeBaseListResponse
    error: { message?: string } | string
  }

  // Documents
  [VorionEndpoints.VORION_UPLOAD_DOCUMENTS]: {
    payload:
      | FormData
      | {
          _kb_id: string
          data: string // JSON-stringified data field
          files?: File[]
        }
    success: VorionIngestionBatchResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_LIST_DOCUMENTS]: {
    payload:
      | {
          _kb_id: string
          status?: string
          skip?: number
          limit?: number
        }
      | undefined
    success: VorionDocumentListResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_GET_DOCUMENT]: {
    payload: { _doc_id: string } | undefined
    success: VorionDocumentResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_DELETE_DOCUMENT]: {
    payload: { _doc_id: string; hard?: boolean } | undefined
    success: undefined
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_RETRY_DOCUMENT]: {
    payload: { _doc_id: string } | undefined
    success: VorionDocumentResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_LIST_BATCHES]: {
    payload: { _kb_id: string; page?: number; page_size?: number } | undefined
    success: VorionIngestionBatchListResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_GET_BATCH]: {
    payload: { _batch_id: number } | undefined
    success: VorionIngestionBatchDetailResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_RETRY_BATCH_FAILED]: {
    payload: { _batch_id: number } | undefined
    success: VorionBatchRetryResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_SEARCH_KB]: {
    payload: {
      _kb_id: string
      query: string
      search_type?: 'semantic' | 'keyword' | 'hybrid'
      top_k?: number
      score_threshold?: number
      filters?: Record<string, unknown>
      rerank?: boolean
      rerank_top_k?: number
    }
    success: VorionSearchResponse
    error: { message?: string } | string
  }
  // MCP Tools - ActionTypes defined below in separate block
}

// MCP Tool ActionTypes (separate block to avoid token limits)
export type VorionMCPActionTypes = {
  [VorionEndpoints.VORION_CREATE_TOOL]: {
    payload: {
      name: string
      description?: string
      language?: string
      code?: string
      config?: string
      input_schema?: string
      output_schema?: string
      version?: string
      is_public?: boolean
      is_shared?: boolean
      mcp_server_id?: number
      tool_type?: string
      status?: string
      auto_version?: boolean
    }
    success: VorionToolCreateResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_LIST_TOOLS]: {
    payload?: { page?: number; page_size?: number; status_filter?: string }
    success: VorionToolListResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_LIST_PUBLIC_TOOLS]: {
    payload?: { page?: number; page_size?: number; search?: string }
    success: VorionToolListResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_GET_TOOL]: {
    payload: { _tool_id: number } | undefined
    success: VorionToolResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_GET_TOOL_BY_NAME]: {
    payload: { _tool_name: string } | undefined
    success: VorionToolResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_UPDATE_TOOL]: {
    payload: {
      _tool_id: number
      name?: string
      description?: string
      code?: string
      config?: string
      status?: string
      auto_version?: boolean
    }
    success: VorionToolCreateResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_DELETE_TOOL]: {
    payload: { _tool_id: number; hard_delete?: boolean } | undefined
    success: undefined
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_RESTORE_TOOL]: {
    payload: { _tool_id: number } | undefined
    success: VorionToolResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_PUBLISH_TOOL]: {
    payload: { _tool_id: number; is_public?: boolean; is_shared?: boolean }
    success: VorionToolResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_LIST_TOOL_FUNCTIONS]: {
    payload?: undefined
    success: VorionToolFunctionSchema[]
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_GET_TOOL_FUNCTIONS_BATCH]: {
    payload: number[]
    success: VorionToolFunctionSchema[]
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_GET_LLM_TOOL_SCHEMAS]: {
    payload?: undefined
    success: unknown[]
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_CREATE_TOOL_VERSION]: {
    payload: {
      _tool_id: number
      code: string
      config?: string
      input_schema?: string
      output_schema?: string
      change_notes?: string
      explicit_version?: string
    }
    success: VorionToolVersionResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_GET_ACTIVE_TOOL_VERSION]: {
    payload: { _tool_id: number } | undefined
    success: VorionToolVersionDetailResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_GET_TOOL_VERSION]: {
    payload: { _tool_id: number; _version_number: string } | undefined
    success: VorionToolVersionDetailResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_LIST_TOOL_VERSIONS]: {
    payload: { _tool_id: number; limit?: number; offset?: number } | undefined
    success: VorionToolVersionResponse[]
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_ACTIVATE_TOOL_VERSION]: {
    payload: { _tool_id: number; _version_number: string } | undefined
    success: VorionToolVersionResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_ROLLBACK_TOOL_VERSION]: {
    payload: { _tool_id: number; _version_number: string } | undefined
    success: VorionToolVersionResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_COMPARE_TOOL_VERSIONS]: {
    payload: { _tool_id: number; version1: string; version2: string }
    success: VorionToolVersionComparison
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_EXECUTE_TOOL_SYNC]: {
    payload: {
      tool_version_id: number
      input_params: Record<string, unknown>
      execution_environment?: string
      timeout?: number
    }
    success: VorionToolExecutionDetailResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_EXECUTE_TOOL_ASYNC]: {
    payload: {
      tool_version_id: number
      input_params: Record<string, unknown>
      execution_environment?: string
      callback_url?: string
    }
    success: VorionToolExecutionResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_GET_EXECUTION]: {
    payload: { _execution_id: string } | undefined
    success: VorionToolExecutionDetailResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_GET_EXECUTION_LOGS]: {
    payload: { _execution_id: string; level?: string; limit?: number } | undefined
    success: VorionToolExecutionLogResponse[]
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_LIST_EXECUTIONS]: {
    payload?: {
      tool_version_id?: number
      user_id?: string
      status?: string
      limit?: number
      offset?: number
    }
    success: VorionToolExecutionResponse[]
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_RETRY_EXECUTION]: {
    payload: { execution_id: string }
    success: VorionToolExecutionDetailResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_CANCEL_EXECUTION]: {
    payload: { _execution_id: string } | undefined
    success: VorionToolExecutionResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_CREATE_MCP_SERVER]: {
    payload: {
      name: string
      description?: string
      url?: string
      config?: string
      version?: string
      is_public?: boolean
      is_shared?: boolean
      server_type?: string
      status?: string
    }
    success: VorionMCPServerResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_LIST_MCP_SERVERS]: {
    payload?: { page?: number; page_size?: number; status_filter?: string }
    success: VorionMCPServerListResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_LIST_PUBLIC_MCP_SERVERS]: {
    payload?: { page?: number; page_size?: number; search?: string }
    success: VorionMCPServerListResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_GET_MCP_SERVER]: {
    payload: { _server_id: number } | undefined
    success: VorionMCPServerResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_UPDATE_MCP_SERVER]: {
    payload: {
      _server_id: number
      name?: string
      description?: string
      url?: string
      config?: string
      version?: string
      is_public?: boolean
      is_shared?: boolean
      status?: string
    }
    success: VorionMCPServerResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_DELETE_MCP_SERVER]: {
    payload: { _server_id: number; hard_delete?: boolean } | undefined
    success: undefined
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_RESTORE_MCP_SERVER]: {
    payload: { _server_id: number } | undefined
    success: VorionMCPServerResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_ADD_TOOL_TO_SERVER]: {
    payload: { _server_id: number; _tool_id: number } | undefined
    success: undefined
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_REMOVE_TOOL_FROM_SERVER]: {
    payload: { _server_id: number; _tool_id: number } | undefined
    success: undefined
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_GET_SERVER_TOOLS]: {
    payload: { _server_id: number } | undefined
    success: VorionToolResponse[]
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_GENERATE_SERVER_CODE]: {
    payload: { _server_id: number } | undefined
    success: VorionMCPServerResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_PUBLISH_MCP_SERVER]: {
    payload: { _server_id: number } | undefined
    success: VorionMCPServerResponse
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_UNDEPLOY_MCP_SERVER]: {
    payload: { _server_id: number } | undefined
    success: undefined
    error: { message?: string } | string
  }
  [VorionEndpoints.VORION_GET_DEPLOYMENT_STATUS]: {
    payload: { _server_id: number } | undefined
    success: VorionMCPServerDeploymentStatus
    error: { message?: string } | string
  }
}

//#endregion

//#region Vorion route settings

// We keep settings value-only here; RouteSetting type is defined in parent settings.ts.

const VORION_BASE_PATH = '' // Factory will prepend process.env.AUTH_API_URL
// NOTE: If you ever need a different base URL than AUTH_API_URL for Vorion,
// you can change VORION_BASE_PATH to include the host, or extend RouteSetting
// with a baseUrl field and wire it in the FactoryFunction.

export const vorionSettings = {
  // Remote Computer Access
  [VorionEndpoints.REMOTE_CREATE_COMPUTER]: {
    method: 'POST',
    checkAuthCookie: true,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'body',
    path: '/api/remote/computers/create',
  },
  [VorionEndpoints.REMOTE_EXECUTE_COMMAND]: {
    method: 'POST',
    checkAuthCookie: true,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'body',
    path: '/api/remote/computers/:agentId/commands/execute',
  },

  // LLMs
  [VorionEndpoints.VORION_GET_AVAILABLE_LLMS]: {
    method: 'GET',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'query',
    path: `${VORION_BASE_PATH}/llm/api/v1/llms/available`,
  },
  [VorionEndpoints.VORION_GET_PROVIDER_MODELS]: {
    method: 'GET',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'query',
    path: `${VORION_BASE_PATH}/llm/api/v1/llms/provider/:provider_name`,
  },
  [VorionEndpoints.VORION_GET_GROUP_MODELS]: {
    method: 'GET',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'query',
    path: `${VORION_BASE_PATH}/llm/api/v1/llms/group/:group_name`,
  },
  [VorionEndpoints.VORION_LIST_LLMS]: {
    method: 'GET',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'query',
    path: `${VORION_BASE_PATH}/llm/api/v1/llms`,
  },
  [VorionEndpoints.VORION_GET_LLM_BY_ID]: {
    method: 'GET',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'none',
    path: `${VORION_BASE_PATH}/llm/api/v1/llms/:llm_id`,
  },

  // Conversations
  [VorionEndpoints.VORION_CREATE_CONVERSATION]: {
    method: 'POST',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'body',
    path: `${VORION_BASE_PATH}/llm/api/v1/conversations`,
  },
  [VorionEndpoints.VORION_LIST_CONVERSATIONS]: {
    method: 'GET',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'query',
    path: `${VORION_BASE_PATH}/llm/api/v1/conversations`,
  },
  [VorionEndpoints.VORION_SEARCH_CONVERSATIONS]: {
    method: 'GET',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'query',
    path: `${VORION_BASE_PATH}/llm/api/v1/conversations/search`,
  },
  [VorionEndpoints.VORION_GET_CONVERSATION]: {
    method: 'GET',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'none',
    path: `${VORION_BASE_PATH}/llm/api/v1/conversations/:conversation_id`,
  },
  [VorionEndpoints.VORION_UPDATE_CONVERSATION]: {
    method: 'PATCH',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'body',
    path: `${VORION_BASE_PATH}/llm/api/v1/conversations/:conversation_id`,
  },
  [VorionEndpoints.VORION_DELETE_CONVERSATION]: {
    method: 'DELETE',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'query',
    path: `${VORION_BASE_PATH}/llm/api/v1/conversations/:conversation_id`,
  },
  [VorionEndpoints.VORION_ARCHIVE_CONVERSATION]: {
    method: 'POST',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'none',
    path: `${VORION_BASE_PATH}/llm/api/v1/conversations/:conversation_id/archive`,
  },

  // Messages
  [VorionEndpoints.VORION_LIST_MESSAGES]: {
    method: 'GET',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'query',
    path: `${VORION_BASE_PATH}/llm/api/v1/messages`,
  },
  [VorionEndpoints.VORION_GET_MESSAGE]: {
    method: 'GET',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'none',
    path: `${VORION_BASE_PATH}/llm/api/v1/messages/:message_id`,
  },

  // Prediction
  [VorionEndpoints.VORION_SYNC_PREDICTION]: {
    method: 'POST',
    checkAuthCookie: false,
    headers: {}, // multipart/form-data handled by browser/CustomFetch
    payload_mode: 'form-data',
    path: `${VORION_BASE_PATH}/llm/api/v1/prediction/predict`,
  },
  // Streaming Prediction (SSE) - Response: text/event-stream
  [VorionEndpoints.VORION_STREAMING_PREDICTION]: {
    method: 'POST',
    checkAuthCookie: false,
    headers: { Accept: 'text/event-stream' },
    payload_mode: 'form-data',
    path: `${VORION_BASE_PATH}/llm/api/v1/prediction/predict/stream`,
  },
  [VorionEndpoints.VORION_ASYNC_PREDICTION]: {
    method: 'POST',
    checkAuthCookie: false,
    headers: {},
    payload_mode: 'form-data',
    path: `${VORION_BASE_PATH}/llm/api/v1/prediction/predict/async`,
  },

  // Knowledge Bases
  [VorionEndpoints.VORION_CREATE_KNOWLEDGE_BASE]: {
    method: 'POST',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'body',
    path: `${VORION_BASE_PATH}/rag/api/v1/knowledge-bases`,
  },
  [VorionEndpoints.VORION_LIST_KNOWLEDGE_BASES]: {
    method: 'GET',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'query',
    path: `${VORION_BASE_PATH}/rag/api/v1/knowledge-bases`,
  },
  [VorionEndpoints.VORION_GET_KNOWLEDGE_BASE]: {
    method: 'GET',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'none',
    path: `${VORION_BASE_PATH}/rag/api/v1/knowledge-bases/:kb_id`,
  },
  [VorionEndpoints.VORION_UPDATE_KNOWLEDGE_BASE]: {
    method: 'PATCH',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'body',
    path: `${VORION_BASE_PATH}/rag/api/v1/knowledge-bases/:kb_id`,
  },
  [VorionEndpoints.VORION_DELETE_KNOWLEDGE_BASE]: {
    method: 'DELETE',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'none',
    path: `${VORION_BASE_PATH}/rag/api/v1/knowledge-bases/:kb_id`,
  },
  [VorionEndpoints.VORION_SEARCH_KNOWLEDGE_BASES]: {
    method: 'GET',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'query',
    path: `${VORION_BASE_PATH}/rag/api/v1/knowledge-bases/search`,
  },

  // Documents
  [VorionEndpoints.VORION_UPLOAD_DOCUMENTS]: {
    method: 'POST',
    checkAuthCookie: false,
    headers: {}, // multipart/form-data
    payload_mode: 'form-data',
    path: `${VORION_BASE_PATH}/rag/api/v1/knowledge-bases/:kb_id/documents`,
  },
  [VorionEndpoints.VORION_LIST_DOCUMENTS]: {
    method: 'GET',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'query',
    path: `${VORION_BASE_PATH}/rag/api/v1/knowledge-bases/:kb_id/documents`,
  },
  [VorionEndpoints.VORION_GET_DOCUMENT]: {
    method: 'GET',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'none',
    path: `${VORION_BASE_PATH}/rag/api/v1/documents/:doc_id`,
  },
  [VorionEndpoints.VORION_DELETE_DOCUMENT]: {
    method: 'DELETE',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'query',
    path: `${VORION_BASE_PATH}/rag/api/v1/documents/:doc_id`,
  },
  [VorionEndpoints.VORION_RETRY_DOCUMENT]: {
    method: 'POST',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'none',
    path: `${VORION_BASE_PATH}/rag/api/v1/documents/:doc_id/retry`,
  },
  [VorionEndpoints.VORION_LIST_BATCHES]: {
    method: 'GET',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'query',
    path: `${VORION_BASE_PATH}/rag/api/v1/knowledge-bases/:kb_id/batches`,
  },
  [VorionEndpoints.VORION_GET_BATCH]: {
    method: 'GET',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'none',
    path: `${VORION_BASE_PATH}/rag/api/v1/batches/:batch_id`,
  },
  [VorionEndpoints.VORION_RETRY_BATCH_FAILED]: {
    method: 'POST',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'none',
    path: `${VORION_BASE_PATH}/rag/api/v1/batches/:batch_id/retry-failed`,
  },
  [VorionEndpoints.VORION_SEARCH_KB]: {
    method: 'POST',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'body',
    path: `${VORION_BASE_PATH}/rag/api/v1/knowledge-bases/:kb_id/search`,
  },

  // MCP Tools
  [VorionEndpoints.VORION_CREATE_TOOL]: {
    method: 'POST',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'body',
    path: `${VORION_BASE_PATH}/mcptool/api/v1/tools`,
  },
  [VorionEndpoints.VORION_LIST_TOOLS]: {
    method: 'GET',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'query',
    path: `${VORION_BASE_PATH}/mcptool/api/v1/tools`,
  },
  [VorionEndpoints.VORION_LIST_PUBLIC_TOOLS]: {
    method: 'GET',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'query',
    path: `${VORION_BASE_PATH}/mcptool/api/v1/tools/public`,
  },
  [VorionEndpoints.VORION_GET_TOOL]: {
    method: 'GET',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'none',
    path: `${VORION_BASE_PATH}/mcptool/api/v1/tools/:tool_id`,
  },
  [VorionEndpoints.VORION_GET_TOOL_BY_NAME]: {
    method: 'GET',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'none',
    path: `${VORION_BASE_PATH}/mcptool/api/v1/tools/by-name/:tool_name`,
  },
  [VorionEndpoints.VORION_UPDATE_TOOL]: {
    method: 'PATCH',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'body',
    path: `${VORION_BASE_PATH}/mcptool/api/v1/tools/:tool_id`,
  },
  [VorionEndpoints.VORION_DELETE_TOOL]: {
    method: 'DELETE',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'query',
    path: `${VORION_BASE_PATH}/mcptool/api/v1/tools/:tool_id`,
  },
  [VorionEndpoints.VORION_RESTORE_TOOL]: {
    method: 'POST',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'none',
    path: `${VORION_BASE_PATH}/mcptool/api/v1/tools/:tool_id/restore`,
  },
  [VorionEndpoints.VORION_PUBLISH_TOOL]: {
    method: 'POST',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'body',
    path: `${VORION_BASE_PATH}/mcptool/api/v1/tools/:tool_id/publish`,
  },
  [VorionEndpoints.VORION_LIST_TOOL_FUNCTIONS]: {
    method: 'GET',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'none',
    path: `${VORION_BASE_PATH}/mcptool/api/v1/tools/functions`,
  },
  [VorionEndpoints.VORION_GET_TOOL_FUNCTIONS_BATCH]: {
    method: 'POST',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'body',
    path: `${VORION_BASE_PATH}/mcptool/api/v1/tools/functions/batch`,
  },
  [VorionEndpoints.VORION_GET_LLM_TOOL_SCHEMAS]: {
    method: 'GET',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'none',
    path: `${VORION_BASE_PATH}/mcptool/api/v1/tools/llm-schemas`,
  },

  // Tool Versions
  [VorionEndpoints.VORION_CREATE_TOOL_VERSION]: {
    method: 'POST',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'body',
    path: `${VORION_BASE_PATH}/mcptool/api/v1/tools/:tool_id/versions`,
  },
  [VorionEndpoints.VORION_GET_ACTIVE_TOOL_VERSION]: {
    method: 'GET',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'none',
    path: `${VORION_BASE_PATH}/mcptool/api/v1/tools/:tool_id/versions/active`,
  },
  [VorionEndpoints.VORION_GET_TOOL_VERSION]: {
    method: 'GET',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'none',
    path: `${VORION_BASE_PATH}/mcptool/api/v1/tools/:tool_id/versions/:version_number`,
  },
  [VorionEndpoints.VORION_LIST_TOOL_VERSIONS]: {
    method: 'GET',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'query',
    path: `${VORION_BASE_PATH}/mcptool/api/v1/tools/:tool_id/versions`,
  },
  [VorionEndpoints.VORION_ACTIVATE_TOOL_VERSION]: {
    method: 'POST',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'none',
    path: `${VORION_BASE_PATH}/mcptool/api/v1/tools/:tool_id/versions/:version_number/activate`,
  },
  [VorionEndpoints.VORION_ROLLBACK_TOOL_VERSION]: {
    method: 'POST',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'none',
    path: `${VORION_BASE_PATH}/mcptool/api/v1/tools/:tool_id/versions/rollback/:version_number`,
  },
  [VorionEndpoints.VORION_COMPARE_TOOL_VERSIONS]: {
    method: 'GET',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'query',
    path: `${VORION_BASE_PATH}/mcptool/api/v1/tools/:tool_id/versions/compare`,
  },

  // Tool Executions
  [VorionEndpoints.VORION_EXECUTE_TOOL_SYNC]: {
    method: 'POST',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'body',
    path: `${VORION_BASE_PATH}/mcptool/api/v1/executions`,
  },
  [VorionEndpoints.VORION_EXECUTE_TOOL_ASYNC]: {
    method: 'POST',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'body',
    path: `${VORION_BASE_PATH}/mcptool/api/v1/executions/async`,
  },
  [VorionEndpoints.VORION_GET_EXECUTION]: {
    method: 'GET',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'none',
    path: `${VORION_BASE_PATH}/mcptool/api/v1/executions/:execution_id`,
  },
  [VorionEndpoints.VORION_GET_EXECUTION_LOGS]: {
    method: 'GET',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'query',
    path: `${VORION_BASE_PATH}/mcptool/api/v1/executions/:execution_id/logs`,
  },
  [VorionEndpoints.VORION_LIST_EXECUTIONS]: {
    method: 'GET',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'query',
    path: `${VORION_BASE_PATH}/mcptool/api/v1/executions`,
  },
  [VorionEndpoints.VORION_RETRY_EXECUTION]: {
    method: 'POST',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'body',
    path: `${VORION_BASE_PATH}/mcptool/api/v1/executions/retry`,
  },
  [VorionEndpoints.VORION_CANCEL_EXECUTION]: {
    method: 'POST',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'none',
    path: `${VORION_BASE_PATH}/mcptool/api/v1/executions/:execution_id/cancel`,
  },

  // MCP Servers
  [VorionEndpoints.VORION_CREATE_MCP_SERVER]: {
    method: 'POST',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'body',
    path: `${VORION_BASE_PATH}/mcptool/api/v1/mcp-servers`,
  },
  [VorionEndpoints.VORION_LIST_MCP_SERVERS]: {
    method: 'GET',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'query',
    path: `${VORION_BASE_PATH}/mcptool/api/v1/mcp-servers`,
  },
  [VorionEndpoints.VORION_LIST_PUBLIC_MCP_SERVERS]: {
    method: 'GET',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'query',
    path: `${VORION_BASE_PATH}/mcptool/api/v1/mcp-servers/public`,
  },
  [VorionEndpoints.VORION_GET_MCP_SERVER]: {
    method: 'GET',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'none',
    path: `${VORION_BASE_PATH}/mcptool/api/v1/mcp-servers/:server_id`,
  },
  [VorionEndpoints.VORION_UPDATE_MCP_SERVER]: {
    method: 'PATCH',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'body',
    path: `${VORION_BASE_PATH}/mcptool/api/v1/mcp-servers/:server_id`,
  },
  [VorionEndpoints.VORION_DELETE_MCP_SERVER]: {
    method: 'DELETE',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'query',
    path: `${VORION_BASE_PATH}/mcptool/api/v1/mcp-servers/:server_id`,
  },
  [VorionEndpoints.VORION_RESTORE_MCP_SERVER]: {
    method: 'POST',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'none',
    path: `${VORION_BASE_PATH}/mcptool/api/v1/mcp-servers/:server_id/restore`,
  },
  [VorionEndpoints.VORION_ADD_TOOL_TO_SERVER]: {
    method: 'POST',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'none',
    path: `${VORION_BASE_PATH}/mcptool/api/v1/mcp-servers/:server_id/tools/:tool_id`,
  },
  [VorionEndpoints.VORION_REMOVE_TOOL_FROM_SERVER]: {
    method: 'DELETE',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'none',
    path: `${VORION_BASE_PATH}/mcptool/api/v1/mcp-servers/:server_id/tools/:tool_id`,
  },
  [VorionEndpoints.VORION_GET_SERVER_TOOLS]: {
    method: 'GET',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'none',
    path: `${VORION_BASE_PATH}/mcptool/api/v1/mcp-servers/:server_id/tools`,
  },
  [VorionEndpoints.VORION_GENERATE_SERVER_CODE]: {
    method: 'POST',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'none',
    path: `${VORION_BASE_PATH}/mcptool/api/v1/mcp-servers/:server_id/generate-code`,
  },
  [VorionEndpoints.VORION_PUBLISH_MCP_SERVER]: {
    method: 'POST',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'none',
    path: `${VORION_BASE_PATH}/mcptool/api/v1/mcp-servers/:server_id/publish`,
  },
  [VorionEndpoints.VORION_UNDEPLOY_MCP_SERVER]: {
    method: 'DELETE',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'none',
    path: `${VORION_BASE_PATH}/mcptool/api/v1/mcp-servers/:server_id/undeploy`,
  },
  [VorionEndpoints.VORION_GET_DEPLOYMENT_STATUS]: {
    method: 'GET',
    checkAuthCookie: false,
    headers: { 'Content-Type': 'application/json' },
    payload_mode: 'none',
    path: `${VORION_BASE_PATH}/mcptool/api/v1/mcp-servers/:server_id/deployment-status`,
  },
} as const

//#endregion

//#region SSE Streaming Helper

/**
 * Helper function to stream Vorion predictions using Server-Sent Events (SSE).
 * This bypasses the standard Factory pattern since SSE requires special handling.
 *
 * @example
 * ```typescript
 * const stream = await streamVorionPrediction({
 *   conversation_id: "...",
 *   prompt: { text: "Hello" },
 *   llm_name: "openai",
 * });
 *
 * for await (const chunk of stream) {
 *   console.log(chunk.chunk); // streamed text
 *   if (chunk.is_final) {
 *     console.log("Done!", chunk.message_id);
 *   }
 * }
 * ```
 */
export async function* streamVorionPrediction(
  request: VorionPredictionRequest,
  files?: File[],
  options?: { baseUrl?: string }
): AsyncGenerator<VorionStreamChunk, void, unknown> {
  const baseUrl =
    options?.baseUrl || process.env.VORION_API_URL || 'https://api.48-195-173-46.nip.io'
  const url = `${baseUrl}/llm/api/v1/prediction/predict/stream`

  const formData = new FormData()
  formData.append('data', JSON.stringify(request))

  if (files) {
    for (const file of files) {
      formData.append('files', file)
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
    headers: {
      Accept: 'text/event-stream',
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Streaming request failed: ${response.status} - ${error}`)
  }

  if (!response.body) {
    throw new Error('No response body for streaming')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim()
          if (jsonStr) {
            try {
              const chunk = JSON.parse(jsonStr) as VorionStreamChunk
              yield chunk
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    }

    // Process remaining buffer
    if (buffer.startsWith('data: ')) {
      const jsonStr = buffer.slice(6).trim()
      if (jsonStr) {
        try {
          const chunk = JSON.parse(jsonStr) as VorionStreamChunk
          yield chunk
        } catch {
          // Skip malformed JSON
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

//#endregion
