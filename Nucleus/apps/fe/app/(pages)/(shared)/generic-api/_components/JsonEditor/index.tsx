'use client'

import Editor from '@monaco-editor/react'
import { Code2, Trash2, Wand2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface JsonEditorProps {
  value: string
  onChange: (value: string) => void
  onAutoFill?: () => void
}

export function JsonEditor({ value, onChange, onAutoFill }: JsonEditorProps) {
  const [jsonError, setJsonError] = useState<string | null>(null)

  // JSON validation
  useEffect(() => {
    if (!value.trim()) {
      setJsonError(null)
      return
    }
    try {
      JSON.parse(value)
      setJsonError(null)
    } catch (e) {
      setJsonError((e as Error).message)
    }
  }, [value])

  const handleFormat = useCallback(() => {
    if (!value.trim()) return
    try {
      const parsed = JSON.parse(value)
      onChange(JSON.stringify(parsed, null, 2))
    } catch {
      // ignore
    }
  }, [value, onChange])

  const handleEditorChange = useCallback(
    (newValue: string | undefined) => {
      onChange(newValue || '')
    },
    [onChange]
  )

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-slate-50">
        <span className="text-sm font-semibold text-gray-700">Request Payload</span>
        <div className="flex items-center gap-1">
          {onAutoFill && (
            <button
              type="button"
              onClick={onAutoFill}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-600 hover:bg-violet-50 rounded-lg transition-all"
            >
              <Wand2 className="h-3.5 w-3.5" />
              Auto Fill
            </button>
          )}
          <button
            type="button"
            onClick={handleFormat}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
          >
            <Code2 className="h-3.5 w-3.5" />
            Format
          </button>
          <button
            type="button"
            onClick={() => onChange('')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>
        </div>
      </div>
      <div className="relative h-96">
        <Editor
          height="100%"
          defaultLanguage="json"
          value={value}
          onChange={handleEditorChange}
          theme="vs-light"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 2,
            automaticLayout: true,
            formatOnPaste: true,
            bracketPairColorization: { enabled: true },
            padding: { top: 12, bottom: 12 },
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
          }}
          loading={
            <div className="h-full flex items-center justify-center text-gray-400">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Loading editor...</span>
              </div>
            </div>
          }
        />
        {jsonError && (
          <div className="absolute bottom-0 left-0 right-0 px-4 py-2 bg-gradient-to-r from-red-100 to-rose-100 border-t border-red-200 text-red-600 text-xs font-medium z-10">
            ⚠️ {jsonError}
          </div>
        )}
      </div>
    </div>
  )
}

export function isValidJson(value: string): boolean {
  if (!value.trim()) return true
  try {
    JSON.parse(value)
    return true
  } catch {
    return false
  }
}
