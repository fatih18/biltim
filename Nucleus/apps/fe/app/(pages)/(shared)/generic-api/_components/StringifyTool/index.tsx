'use client'

import { Braces, Check, Copy, X } from 'lucide-react'
import { useCallback, useState } from 'react'

interface StringifyToolProps {
  isOpen: boolean
  onClose: () => void
}

export function StringifyTool({ isOpen, onClose }: StringifyToolProps) {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStringify = useCallback(() => {
    if (!input.trim()) {
      setOutput('')
      setError(null)
      return
    }
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(input)
      // Then stringify with escaping
      setOutput(JSON.stringify(JSON.stringify(parsed)))
      setError(null)
    } catch {
      // If not valid JSON, just stringify the raw string
      setOutput(JSON.stringify(input))
      setError(null)
    }
  }, [input])

  const handleParse = useCallback(() => {
    if (!input.trim()) {
      setOutput('')
      setError(null)
      return
    }
    try {
      // Parse the stringified JSON
      const parsed = JSON.parse(input)
      if (typeof parsed === 'string') {
        // If result is a string, try to parse it again (double-encoded)
        try {
          const doubleParsed = JSON.parse(parsed)
          setOutput(JSON.stringify(doubleParsed, null, 2))
        } catch {
          setOutput(parsed)
        }
      } else {
        setOutput(JSON.stringify(parsed, null, 2))
      }
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [input])

  const handleCopy = useCallback(() => {
    if (!output) return
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [output])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-purple-50">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Braces className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-gray-700">JSON Stringify Tool</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Input */}
          <div>
            <span className="block text-xs font-medium text-gray-500 mb-1.5">Input</span>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste JSON or text here..."
              className="w-full h-28 p-3 text-sm font-mono border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleStringify}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 rounded-xl transition-all shadow-md shadow-violet-500/20"
            >
              Stringify →
            </button>
            <button
              type="button"
              onClick={handleParse}
              className="flex-1 px-4 py-2 text-sm font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-xl transition-colors"
            >
              ← Parse
            </button>
          </div>

          {/* Output */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-500">Output</span>
              {output && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg transition-colors ${
                    copied ? 'bg-emerald-100 text-emerald-700' : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              )}
            </div>
            <div
              className={`w-full h-28 p-3 text-sm font-mono border rounded-xl overflow-auto ${
                error ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
              }`}
            >
              {error ? (
                <span className="text-red-600">{error}</span>
              ) : (
                <pre className="whitespace-pre-wrap break-all text-gray-700">{output}</pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
