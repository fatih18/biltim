'use client'

import Editor from '@monaco-editor/react'
import { Check, CheckCircle2, ChevronDown, ChevronUp, Copy, Radio, XCircle } from 'lucide-react'
import { useCallback, useState } from 'react'

interface ResponseViewerProps {
  response: unknown
  isSuccess: boolean | null
  isLoading?: boolean
  // Streaming support
  isStreaming?: boolean
  streamingText?: string
}

// Field copy button
function FieldCopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [value])

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all w-full ${
        copied ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
      } border`}
    >
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-gray-500 truncate">{label}</div>
        <div className="text-sm font-mono text-gray-800 truncate">{value}</div>
      </div>
      <div
        className={`flex-shrink-0 p-1.5 rounded ${
          copied ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-gray-400'
        }`}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </div>
    </button>
  )
}

// Extract fields from object for quick copy
function extractFields(obj: unknown, prefix = ''): Array<{ key: string; value: string }> {
  const fields: Array<{ key: string; value: string }> = []

  if (obj === null || obj === undefined) return fields

  if (typeof obj !== 'object') {
    return [{ key: prefix || 'value', value: String(obj) }]
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      const itemPrefix = prefix ? `${prefix}[${index}]` : `[${index}]`
      if (typeof item === 'object' && item !== null) {
        fields.push(...extractFields(item, itemPrefix))
      } else {
        fields.push({ key: itemPrefix, value: String(item) })
      }
    })
  } else {
    for (const [key, value] of Object.entries(obj)) {
      const fieldKey = prefix ? `${prefix}.${key}` : key
      if (typeof value === 'object' && value !== null) {
        fields.push(...extractFields(value, fieldKey))
      } else {
        fields.push({ key: fieldKey, value: String(value) })
      }
    }
  }

  return fields
}

export function ResponseViewer({
  response,
  isSuccess,
  isLoading,
  isStreaming,
  streamingText,
}: ResponseViewerProps) {
  const [copied, setCopied] = useState(false)
  const [showFields, setShowFields] = useState(false)

  const displayText = streamingText || (response ? JSON.stringify(response, null, 2) : '')
  const fields = response ? extractFields(response) : []

  const handleCopy = useCallback(() => {
    if (!displayText) return
    navigator.clipboard.writeText(displayText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [displayText])

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-slate-50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">Response</span>
          {isStreaming && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-violet-100 to-purple-100 text-violet-700 animate-pulse">
              <Radio className="h-3.5 w-3.5" />
              Streaming...
            </span>
          )}
          {!isStreaming && isSuccess !== null && (
            <span
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                isSuccess
                  ? 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700'
                  : 'bg-gradient-to-r from-red-100 to-rose-100 text-red-700'
              }`}
            >
              {isSuccess ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              {isSuccess ? 'Success' : 'Error'}
            </span>
          )}
        </div>
        {displayText && (
          <button
            type="button"
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              copied ? 'bg-emerald-100 text-emerald-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? 'Copied!' : 'Copy'}
          </button>
        )}
      </div>
      <div className="h-96 relative">
        {isLoading && !isStreaming ? (
          <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-50/50 to-gray-50/50">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="h-12 w-12 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" />
              </div>
              <span className="text-sm text-gray-500 font-medium">Processing...</span>
            </div>
          </div>
        ) : isStreaming && streamingText ? (
          <div className="h-full p-4 overflow-auto bg-gradient-to-br from-slate-50/50 to-gray-50/50">
            <pre className="text-sm font-mono whitespace-pre-wrap break-words leading-relaxed text-gray-800">
              {streamingText}
              <span className="inline-block w-2 h-4 bg-violet-500 animate-pulse ml-0.5" />
            </pre>
          </div>
        ) : displayText ? (
          <Editor
            height="100%"
            defaultLanguage="json"
            value={displayText}
            theme="vs-light"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              tabSize: 2,
              automaticLayout: true,
              bracketPairColorization: { enabled: true },
              padding: { top: 12, bottom: 12 },
              scrollbar: {
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 8,
              },
              domReadOnly: true,
            }}
            loading={
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Loading...</span>
                </div>
              </div>
            }
          />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400 bg-gradient-to-br from-slate-50/50 to-gray-50/50">
            <div className="text-center">
              <div className="h-16 w-16 mx-auto mb-3 rounded-2xl bg-gray-100 flex items-center justify-center">
                <span className="text-2xl">📭</span>
              </div>
              <p className="text-sm font-medium">No response yet</p>
              <p className="text-xs mt-1">Run a request to see results</p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Copy Fields Panel */}
      {fields.length > 0 && (
        <div className="border-t border-gray-100">
          <button
            type="button"
            onClick={() => setShowFields(!showFields)}
            className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Copy className="h-3.5 w-3.5" />
              Quick Copy Fields ({fields.length})
            </span>
            {showFields ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showFields && (
            <div className="px-4 pb-4 grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {fields.map((field) => (
                <FieldCopyButton key={field.key} label={field.key} value={field.value} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
