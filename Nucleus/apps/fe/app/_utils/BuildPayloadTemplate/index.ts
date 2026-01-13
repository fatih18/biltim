import { faker } from '@faker-js/faker'
import { GenericMethods } from '@monorepo/db-entities/types/shared'
import type { GenericActionMeta } from '@/app/_hooks/UseGenericApiStore'

export function buildPayloadTemplate(meta: GenericActionMeta | undefined) {
  if (!meta) {
    return {}
  }

  // Vorion endpoint'leri için özel payload template
  if (meta.kind === 'vorion') {
    return buildVorionPayloadTemplate(meta.endpointKey)
  }

  // Custom endpoint'ler için payload template yok
  if (meta.kind === 'custom') {
    return {}
  }

  switch (meta.method) {
    case GenericMethods.GET:
      return getDefaultReadPayload(meta.schema)
    case GenericMethods.CREATE:
      return buildCreatePayload(meta.schema)
    case GenericMethods.UPDATE:
      return {
        _id: faker.string.uuid(),
        ...buildCreatePayload(meta.schema, { partial: true }),
      }
    case GenericMethods.DELETE:
    case GenericMethods.TOGGLE:
    case GenericMethods.VERIFICATION:
      return { _id: faker.string.uuid() }
    default:
      return {}
  }
}

function getDefaultReadPayload(schema: Extract<GenericActionMeta, { kind: 'generic' }>['schema']) {
  const filters: Record<string, unknown> = {}
  const filterCandidates = Object.keys(schema.columns ?? {}).filter(
    (column) =>
      column.endsWith('_id') ||
      column === 'is_active' ||
      column.includes('name') ||
      column.includes('email')
  )

  for (const column of filterCandidates.slice(0, 2)) {
    filters[column] = generateFieldValue(column)
  }

  return {
    page: 1,
    limit: 20,
    search: '',
    orderBy: undefined,
    orderDirection: undefined,
    filters,
  }
}

function buildCreatePayload(
  schema: Extract<GenericActionMeta, { kind: 'generic' }>['schema'],
  options: { partial?: boolean } = {}
) {
  const payload: Record<string, unknown> = {}
  const skipFields = new Set(['id', 'created_at', 'updated_at', 'is_active', 'version'])

  for (const column of Object.keys(schema.columns ?? {})) {
    if (skipFields.has(column)) {
      continue
    }

    if (options.partial && faker.datatype.boolean()) {
      continue
    }

    payload[column] = generateFieldValue(column)
  }

  return payload
}

export function generateFieldValue(columnName: string): unknown {
  const name = columnName.toLowerCase()

  if (name === 'id' || name.endsWith('_id') || name.endsWith('id')) {
    return faker.string.uuid()
  }

  if (name.includes('email')) {
    return faker.internet.email().toLowerCase()
  }

  if (name.includes('phone')) {
    return faker.phone.number()
  }

  if (name.includes('first_name')) {
    return faker.person.firstName()
  }

  if (name.includes('last_name')) {
    return faker.person.lastName()
  }

  if (name.includes('name')) {
    return faker.company.name()
  }

  if (name.includes('street')) {
    return faker.location.streetAddress()
  }

  if (name.includes('city')) {
    return faker.location.city()
  }

  if (name.includes('state')) {
    return faker.location.state()
  }

  if (name.includes('country')) {
    return faker.location.countryCode('alpha-2')
  }

  if (name.includes('zip') || name.includes('postal')) {
    return faker.location.zipCode()
  }

  if (name.includes('latitude')) {
    return Number(faker.location.latitude())
  }

  if (name.includes('longitude')) {
    return Number(faker.location.longitude())
  }

  if (name.includes('tax')) {
    return faker.finance.routingNumber()
  }

  if (name.includes('owner_type')) {
    return 'user'
  }

  if (name.includes('w9')) {
    return faker.string.uuid()
  }

  if (name.includes('is_') || name.startsWith('has_') || name.startsWith('can_')) {
    return faker.datatype.boolean()
  }

  if (name.endsWith('_at') || name.includes('date')) {
    return faker.date.recent().toISOString()
  }

  if (name.includes('count')) {
    return faker.number.int({ min: 0, max: 100 })
  }

  if (name.includes('version')) {
    return faker.number.int({ min: 1, max: 10 })
  }

  if (name.includes('notes') || name.includes('description') || name.includes('summary')) {
    return faker.lorem.sentence()
  }

  return faker.string.alphanumeric({ length: 12 })
}

// Vorion endpoint payload templates based on API documentation
function buildVorionPayloadTemplate(endpointKey: string): Record<string, unknown> {
  const templates: Record<string, Record<string, unknown>> = {
    // LLMs - mostly GET with query params
    VORION_GET_AVAILABLE_LLMS: { status: 'active' },
    VORION_GET_PROVIDER_MODELS: {
      _provider_name: 'openai',
      status: 'active',
      available_only: true,
    },
    VORION_GET_GROUP_MODELS: {
      _group_name: 'gpt-4o-group',
      status: 'active',
      available_only: true,
    },
    VORION_LIST_LLMS: {
      provider_name: 'openai',
      status: 'active',
      available_only: true,
      search: '',
      page: 1,
      page_size: 50,
    },
    VORION_GET_LLM_BY_ID: { _llm_id: 1 },

    // Conversations
    VORION_CREATE_CONVERSATION: {
      title: faker.lorem.sentence(),
      system_prompt: 'You are a helpful assistant.',
      llm_id: 1,
      metadata: { source: 'nucleus' },
    },
    VORION_LIST_CONVERSATIONS: { page: 1, page_size: 20, is_archived: false },
    VORION_SEARCH_CONVERSATIONS: { query: faker.lorem.word(), page: 1, page_size: 20 },
    VORION_GET_CONVERSATION: { _conversation_id: faker.string.uuid() },
    VORION_UPDATE_CONVERSATION: {
      _conversation_id: faker.string.uuid(),
      title: faker.lorem.sentence(),
      system_prompt: 'Updated system prompt',
    },
    VORION_DELETE_CONVERSATION: { _conversation_id: faker.string.uuid(), hard_delete: false },
    VORION_ARCHIVE_CONVERSATION: { _conversation_id: faker.string.uuid() },

    // Messages
    VORION_LIST_MESSAGES: {
      conversation_id: faker.string.uuid(),
      role: undefined,
      page: 1,
      page_size: 50,
    },
    VORION_GET_MESSAGE: { _message_id: faker.string.uuid() },

    // Prediction (multipart/form-data: `data` field = JSON string of this object)
    VORION_SYNC_PREDICTION: {
      data: {
        conversation_id: faker.string.uuid(),
        prompt: {
          text: faker.lorem.paragraph(),
          rag_content: null,
          save_prompt_with_rag_content: false,
          prompt_with_rag_content: null,
        },
        llm_name: 'openai',
        llm_group_name: 'gpt-4o-group',
        load_balancer_strategy_name: 'round_robin',
        system_message: 'You are a helpful assistant.',
        language: 'English',
        tool_ids: [],
        app_id: 1,
        thinking: {
          enabled: false,
          budget_tokens: null,
          effort: null,
          summary: null,
          format: null,
        },
      },
    },
    // Streaming Prediction (SSE) - use streamVorionPrediction() helper instead of Factory
    VORION_STREAMING_PREDICTION: {
      data: {
        conversation_id: faker.string.uuid(),
        prompt: {
          text: faker.lorem.paragraph(),
          save_prompt_with_rag_content: false,
        },
        llm_name: 'openai',
        llm_group_name: 'gpt-4o-group',
        system_message: 'You are a helpful assistant.',
        thinking: {
          enabled: false,
        },
      },
    },
    VORION_ASYNC_PREDICTION: {
      data: {
        conversation_id: faker.string.uuid(),
        prompt: {
          text: faker.lorem.paragraph(),
          rag_content: null,
          save_prompt_with_rag_content: false,
        },
        llm_name: 'openai',
        llm_group_name: 'gpt-4o-group',
        system_message: 'You are a helpful assistant.',
        thinking: {
          enabled: false,
        },
      },
    },

    // Knowledge Bases
    VORION_CREATE_KNOWLEDGE_BASE: {
      name: `${faker.company.name()} KB`,
      description: faker.lorem.sentence(),
      embedding_model_id: 1,
      chunk_size: 512,
      chunk_overlap: 50,
    },
    VORION_LIST_KNOWLEDGE_BASES: { page: 1, page_size: 20, search: '' },
    VORION_GET_KNOWLEDGE_BASE: { _kb_id: faker.string.uuid() },
    VORION_UPDATE_KNOWLEDGE_BASE: {
      _kb_id: faker.string.uuid(),
      name: `${faker.company.name()} KB Updated`,
      description: faker.lorem.sentence(),
    },
    VORION_DELETE_KNOWLEDGE_BASE: { _kb_id: faker.string.uuid() },
    VORION_SEARCH_KNOWLEDGE_BASES: { query: faker.lorem.word(), page: 1, page_size: 20 },

    // Documents (UPLOAD_DOCUMENTS requires FormData with files - use manually)
    VORION_UPLOAD_DOCUMENTS: { _kb_id: faker.string.uuid() },
    VORION_LIST_DOCUMENTS: {
      _kb_id: faker.string.uuid(),
      page: 1,
      page_size: 20,
      status: 'completed',
    },
    VORION_GET_DOCUMENT: { _doc_id: faker.string.uuid() },
    VORION_DELETE_DOCUMENT: { _doc_id: faker.string.uuid(), hard_delete: false },
    VORION_RETRY_DOCUMENT: { _doc_id: faker.string.uuid() },
    VORION_LIST_BATCHES: { _kb_id: faker.string.uuid(), page: 1, page_size: 20 },
    VORION_GET_BATCH: { _batch_id: faker.string.uuid() },
    VORION_RETRY_BATCH_FAILED: { _batch_id: faker.string.uuid() },
    VORION_SEARCH_KB: {
      _kb_id: faker.string.uuid(),
      query: faker.lorem.sentence(),
      top_k: 5,
      score_threshold: 0.7,
    },

    // MCP Tools
    VORION_CREATE_TOOL: {
      name: `${faker.hacker.noun()}_tool`,
      description: faker.lorem.sentence(),
      code: 'async def main(input: str) -> str:\n    return f"Processed: {input}"',
      config: '{}',
      auto_version: true,
    },
    VORION_LIST_TOOLS: { page: 1, page_size: 20, status: 'active' },
    VORION_LIST_PUBLIC_TOOLS: { page: 1, page_size: 20 },
    VORION_GET_TOOL: { _tool_id: 1 },
    VORION_GET_TOOL_BY_NAME: { _tool_name: 'my_tool' },
    VORION_UPDATE_TOOL: {
      _tool_id: 1,
      name: `${faker.hacker.noun()}_tool_updated`,
      description: faker.lorem.sentence(),
    },
    VORION_DELETE_TOOL: { _tool_id: 1, hard_delete: false },
    VORION_RESTORE_TOOL: { _tool_id: 1 },
    VORION_PUBLISH_TOOL: { _tool_id: 1, is_public: true, is_shared: false },
    VORION_LIST_TOOL_FUNCTIONS: {},
    VORION_GET_TOOL_FUNCTIONS_BATCH: { tool_ids: [1, 2, 3] },
    VORION_GET_LLM_TOOL_SCHEMAS: {},

    // Tool Versions
    VORION_CREATE_TOOL_VERSION: {
      _tool_id: 1,
      code: 'async def main(input: str) -> str:\n    return f"v2: {input}"',
      config: '{}',
      change_notes: 'Version 2 with improvements',
    },
    VORION_GET_ACTIVE_TOOL_VERSION: { _tool_id: 1 },
    VORION_GET_TOOL_VERSION: { _tool_id: 1, _version_number: '1.0.0' },
    VORION_LIST_TOOL_VERSIONS: { _tool_id: 1, limit: 20, offset: 0 },
    VORION_ACTIVATE_TOOL_VERSION: { _tool_id: 1, _version_number: '1.0.0' },
    VORION_ROLLBACK_TOOL_VERSION: { _tool_id: 1, _version_number: '1.0.0' },
    VORION_COMPARE_TOOL_VERSIONS: { _tool_id: 1, version1: '1.0.0', version2: '2.0.0' },

    // Tool Executions
    VORION_EXECUTE_TOOL_SYNC: {
      tool_version_id: 1,
      input_params: { input: faker.lorem.sentence() },
      timeout: 30,
    },
    VORION_EXECUTE_TOOL_ASYNC: {
      tool_version_id: 1,
      input_params: { input: faker.lorem.sentence() },
      callback_url: 'https://example.com/callback',
    },
    VORION_GET_EXECUTION: { _execution_id: faker.string.uuid() },
    VORION_GET_EXECUTION_LOGS: { _execution_id: faker.string.uuid(), level: 'INFO', limit: 100 },
    VORION_LIST_EXECUTIONS: { tool_version_id: 1, status: 'completed', limit: 20, offset: 0 },
    VORION_RETRY_EXECUTION: { execution_id: faker.string.uuid() },
    VORION_CANCEL_EXECUTION: { _execution_id: faker.string.uuid() },

    // MCP Servers
    VORION_CREATE_MCP_SERVER: {
      name: `${faker.company.name()} MCP Server`,
      description: faker.lorem.sentence(),
      version: '1.0.0',
      is_public: false,
      is_shared: false,
    },
    VORION_LIST_MCP_SERVERS: { page: 1, page_size: 20, status: 'active' },
    VORION_LIST_PUBLIC_MCP_SERVERS: { page: 1, page_size: 20 },
    VORION_GET_MCP_SERVER: { _server_id: 1 },
    VORION_UPDATE_MCP_SERVER: {
      _server_id: 1,
      name: `${faker.company.name()} MCP Server Updated`,
      description: faker.lorem.sentence(),
    },
    VORION_DELETE_MCP_SERVER: { _server_id: 1, hard_delete: false },
    VORION_RESTORE_MCP_SERVER: { _server_id: 1 },
    VORION_ADD_TOOL_TO_SERVER: { _server_id: 1, _tool_id: 1 },
    VORION_REMOVE_TOOL_FROM_SERVER: { _server_id: 1, _tool_id: 1 },
    VORION_GET_SERVER_TOOLS: { _server_id: 1 },
    VORION_GENERATE_SERVER_CODE: { _server_id: 1 },
    VORION_PUBLISH_MCP_SERVER: { _server_id: 1 },
    VORION_UNDEPLOY_MCP_SERVER: { _server_id: 1 },
    VORION_GET_DEPLOYMENT_STATUS: { _server_id: 1 },
  }

  return templates[endpointKey] ?? {}
}
