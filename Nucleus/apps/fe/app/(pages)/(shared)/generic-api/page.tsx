'use client'

import { Braces, Loader2, Play, Zap } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  useGenericApiStore as useGenericApiActions,
  useGenericApiMetadata,
} from '@/app/_hooks/UseGenericApiStore'
import { buildPayloadTemplate, formatJson } from '@/app/_utils'
import {
  type GenericEndpointKeys,
  streamVorionPrediction,
  type VorionPredictionRequest,
} from '@/lib/api'
import {
  CATEGORIES,
  type EndpointCategory,
  EndpointList,
  getEndpointCategory,
} from './_components/EndpointList'
import { isValidJson, JsonEditor } from './_components/JsonEditor'
import { type HistoryItem, ResponseHistory } from './_components/ResponseHistory'
import { ResponseViewer } from './_components/ResponseViewer'
import { StringifyTool } from './_components/StringifyTool'

type DynamicActionStart = (options: {
  payload: unknown
  onAfterHandle: (data: unknown) => void
  onErrorHandle: (error: unknown, code: number | null) => void
}) => Promise<void>

export default function ApiSandbox() {
  const actions = useGenericApiActions()
  const metadata = useGenericApiMetadata()

  const endpoints = useMemo<GenericEndpointKeys[]>(
    () =>
      (Object.keys(actions) as string[])
        .filter((key) => key !== '' && actions[key as GenericEndpointKeys])
        .map((key) => key as GenericEndpointKeys),
    [actions]
  )

  const [selectedEndpoint, setSelectedEndpoint] = useState<GenericEndpointKeys | ''>('')
  const [payloadInput, setPayloadInput] = useState('')
  const [response, setResponse] = useState<unknown>(null)
  const [isSuccess, setIsSuccess] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<EndpointCategory>('all')
  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  // History & Tools
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [showStringifyTool, setShowStringifyTool] = useState(false)

  useEffect(() => {
    const firstEndpoint = endpoints[0]
    if (!selectedEndpoint && firstEndpoint) {
      setSelectedEndpoint(firstEndpoint)
    }
  }, [endpoints, selectedEndpoint])

  const selectedMeta = selectedEndpoint
    ? metadata[selectedEndpoint as GenericEndpointKeys]
    : undefined
  const endpointCategory = selectedEndpoint
    ? getEndpointCategory(selectedEndpoint, selectedMeta)
    : null
  const categoryInfo = CATEGORIES.find((c) => c.id === endpointCategory)

  const handleInvoke = useCallback(async () => {
    if (!selectedEndpoint || !isValidJson(payloadInput)) return

    let parsedPayload: unknown
    if (payloadInput.trim().length > 0) {
      try {
        parsedPayload = JSON.parse(payloadInput)
      } catch {
        return
      }
    }

    // Handle streaming endpoint separately
    if ((selectedEndpoint as string).includes('STREAMING_PREDICTION')) {
      setIsLoading(false)
      setIsStreaming(true)
      setStreamingText('')
      setResponse(null)
      setIsSuccess(null)

      try {
        const payload = parsedPayload as { data: VorionPredictionRequest }
        const request = payload?.data
        if (!request) {
          throw new Error('Missing data field in payload')
        }

        let fullText = ''
        for await (const chunk of streamVorionPrediction(request)) {
          fullText += chunk.chunk
          // flushSync forces immediate re-render for each chunk
          flushSync(() => {
            setStreamingText(fullText)
          })

          if (chunk.is_final) {
            setResponse({
              message_id: chunk.message_id,
              conversation_id: chunk.conversation_id,
              full_response: fullText,
              input_tokens: chunk.input_tokens,
              output_tokens: chunk.output_tokens,
              total_tokens: chunk.total_tokens,
              model_name: chunk.model_name,
              model_provider: chunk.model_provider,
            })
            setIsSuccess(true)
          }
        }
      } catch (error) {
        setResponse({ error: String(error) })
        setIsSuccess(false)
      } finally {
        setIsStreaming(false)
      }
      return
    }

    // Normal endpoint handling
    const key = selectedEndpoint as GenericEndpointKeys
    const action = actions[key]
    if (!action) return

    setIsLoading(true)
    setResponse(null)
    setIsSuccess(null)
    setStreamingText('')

    await (action.start as DynamicActionStart)({
      payload: parsedPayload,
      onAfterHandle: (data) => {
        setResponse(data)
        setIsSuccess(true)
        setIsLoading(false)
        // Add to history
        setHistory((prev) => [
          {
            id: crypto.randomUUID(),
            endpoint: selectedEndpoint,
            payload: parsedPayload,
            response: data,
            isSuccess: true,
            timestamp: new Date(),
          },
          ...prev.slice(0, 19), // Keep last 20
        ])
      },
      onErrorHandle: (error, code) => {
        const errorResponse = { error, code }
        setResponse(errorResponse)
        setIsSuccess(false)
        setIsLoading(false)
        // Add to history
        setHistory((prev) => [
          {
            id: crypto.randomUUID(),
            endpoint: selectedEndpoint,
            payload: parsedPayload,
            response: errorResponse,
            isSuccess: false,
            timestamp: new Date(),
          },
          ...prev.slice(0, 19),
        ])
      },
    })
  }, [payloadInput, selectedEndpoint, actions])

  const handleFillWithFaker = useCallback(() => {
    if (!selectedEndpoint || !selectedMeta) return
    const template = buildPayloadTemplate(selectedMeta)
    setPayloadInput(formatJson(template))
  }, [selectedEndpoint, selectedMeta])

  const handleSelectEndpoint = useCallback(
    (endpoint: GenericEndpointKeys) => {
      setSelectedEndpoint(endpoint)
      setResponse(null)
      setIsSuccess(null)
      // Auto fill payload when selecting endpoint
      const meta = metadata[endpoint]
      if (meta) {
        const template = buildPayloadTemplate(meta)
        setPayloadInput(formatJson(template))
      }
    },
    [metadata]
  )

  // Keyboard shortcut: Cmd+Enter or Ctrl+Enter to run
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        handleInvoke()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleInvoke])

  // History handlers
  const handleClearHistory = useCallback(() => {
    setHistory([])
  }, [])

  const handleReplayHistory = useCallback((item: HistoryItem) => {
    setSelectedEndpoint(item.endpoint as GenericEndpointKeys)
    setPayloadInput(formatJson(item.payload))
    setResponse(null)
    setIsSuccess(null)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  API Sandbox
                </h1>
                <p className="text-xs text-gray-500">Test & Debug Endpoints</p>
              </div>
            </div>
            {/* Tools */}
            <button
              type="button"
              onClick={() => setShowStringifyTool(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors shadow-sm"
            >
              <Braces className="h-4 w-4" />
              Stringify Tool
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto p-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar - Endpoints */}
          <div className="col-span-3">
            <EndpointList
              endpoints={endpoints}
              metadata={metadata}
              selectedEndpoint={selectedEndpoint}
              onSelect={handleSelectEndpoint}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />
          </div>

          {/* Main Content */}
          <div className="col-span-9 space-y-6">
            {/* Selected Endpoint Info */}
            {selectedEndpoint && (
              <div
                className={`bg-gradient-to-r ${categoryInfo?.color || 'from-gray-500 to-gray-600'} rounded-2xl p-6 text-white shadow-xl`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {categoryInfo?.icon}
                      <span className="text-white/80 text-sm font-medium">
                        {categoryInfo?.label}
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold">{selectedEndpoint}</h2>
                    <p className="text-white/70 text-sm mt-1">
                      Kind: {selectedMeta?.kind || 'unknown'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleInvoke}
                    disabled={isLoading || !isValidJson(payloadInput)}
                    className="flex flex-col items-center gap-1 px-6 py-3 bg-white/20 hover:bg-white/30 disabled:bg-white/10 disabled:cursor-not-allowed rounded-xl font-semibold transition-all backdrop-blur-sm"
                    title="⌘+Enter / Ctrl+Enter"
                  >
                    <div className="flex items-center gap-2">
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Play className="h-5 w-5" />
                      )}
                      {isLoading ? 'Çalışıyor...' : 'Çalıştır'}
                    </div>
                    <span className="text-[10px] text-white/50 font-normal">⌘+Enter</span>
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              {/* Payload Editor */}
              <JsonEditor
                value={payloadInput}
                onChange={setPayloadInput}
                onAutoFill={handleFillWithFaker}
              />

              {/* Response */}
              <ResponseViewer
                response={response}
                isSuccess={isSuccess}
                isLoading={isLoading}
                isStreaming={isStreaming}
                streamingText={streamingText}
              />
            </div>

            {/* Response History */}
            <ResponseHistory
              history={history}
              onClear={handleClearHistory}
              onReplay={handleReplayHistory}
            />
          </div>
        </div>
      </div>

      {/* Stringify Tool Modal */}
      <StringifyTool isOpen={showStringifyTool} onClose={() => setShowStringifyTool(false)} />
    </div>
  )
}
