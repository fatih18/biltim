'use client'

import Editor from '@monaco-editor/react'
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Trash2,
  XCircle,
} from 'lucide-react'
import { useCallback, useState } from 'react'

export interface HistoryItem {
  id: string
  endpoint: string
  payload: unknown
  response: unknown
  isSuccess: boolean
  timestamp: Date
}

interface ResponseHistoryProps {
  history: HistoryItem[]
  onClear: () => void
  onReplay: (item: HistoryItem) => void
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
      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all w-full ${
        copied ? 'bg-emerald-50 border-emerald-200' : 'bg-white hover:bg-gray-50 border-gray-200'
      } border`}
    >
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-medium text-gray-500 truncate">{label}</div>
        <div className="text-xs font-mono text-gray-800 truncate">{value}</div>
      </div>
      <div
        className={`flex-shrink-0 p-1 rounded ${
          copied ? 'bg-emerald-100 text-emerald-600' : 'text-gray-400'
        }`}
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
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

function HistoryEntry({
  item,
  onReplay,
}: {
  item: HistoryItem
  onReplay: (item: HistoryItem) => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showFields, setShowFields] = useState(false)

  const responseText = JSON.stringify(item.response, null, 2)
  const fields = extractFields(item.response)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(responseText)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [responseText])

  const timeAgo = useCallback((date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }, [])

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white hover:shadow-md transition-shadow">
      {/* Header - Always visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
          <span
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
              item.isSuccess ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {item.isSuccess ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            {item.isSuccess ? 'OK' : 'ERR'}
          </span>
          <span className="font-mono text-sm text-gray-700 truncate max-w-[200px]">
            {item.endpoint}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Clock className="h-3 w-3" />
          {timeAgo(item.timestamp)}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50/50">
          {/* Actions */}
          <div className="flex items-center gap-2 p-3 border-b border-gray-100">
            <button
              type="button"
              onClick={() => onReplay(item)}
              className="px-3 py-1.5 text-xs font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors"
            >
              Replay Request
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                copied
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <span className="flex items-center gap-1">
                <Copy className="h-3 w-3" />
                {copied ? 'Copied!' : 'Copy All'}
              </span>
            </button>
          </div>

          {/* Monaco Editor */}
          <div className="h-48 border-b border-gray-100">
            <Editor
              height="100%"
              defaultLanguage="json"
              value={responseText}
              theme="vs-light"
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 12,
                lineNumbers: 'off',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                tabSize: 2,
                automaticLayout: true,
                padding: { top: 8, bottom: 8 },
                scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
                domReadOnly: true,
              }}
            />
          </div>

          {/* Quick Copy Fields */}
          {fields.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowFields(!showFields)}
                className="w-full px-3 py-2 flex items-center justify-between text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Copy className="h-3 w-3" />
                  Quick Copy ({fields.length} fields)
                </span>
                {showFields ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>
              {showFields && (
                <div className="px-3 pb-3 grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto">
                  {fields.map((field) => (
                    <FieldCopyButton key={field.key} label={field.key} value={field.value} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function ResponseHistory({ history, onClear, onReplay }: ResponseHistoryProps) {
  if (history.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-slate-50">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">Response History</span>
          <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs font-medium rounded-full">
            {history.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="h-3 w-3" />
          Clear
        </button>
      </div>
      <div className="p-4 max-h-80 overflow-y-auto space-y-2">
        {history.map((item) => (
          <HistoryEntry key={item.id} item={item} onReplay={onReplay} />
        ))}
      </div>
    </div>
  )
}
