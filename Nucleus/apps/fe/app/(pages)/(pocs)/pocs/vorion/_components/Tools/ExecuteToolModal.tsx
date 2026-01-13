'use client'

import { useCallback, useState } from 'react'
import {
  LuCheck,
  LuCircleAlert,
  LuCircleCheck,
  LuCircleX,
  LuClock,
  LuCode,
  LuCopy,
  LuLoader,
  LuPlay,
  LuX,
  LuZap,
} from 'react-icons/lu'
import { cn } from '@/app/_utils'
import type { VorionToolExecutionDetailResponse, VorionToolResponse } from '@/lib/api'

// ============================================================================
// Types
// ============================================================================

interface ExecuteToolModalProps {
  isOpen: boolean
  onClose: () => void
  tool: VorionToolResponse
  onExecuteSync: (params: Record<string, unknown>) => void
  onExecuteAsync: (params: Record<string, unknown>) => void
  isExecuting?: boolean
  executionResult?: VorionToolExecutionDetailResponse | null
}

// ============================================================================
// Component
// ============================================================================

export function ExecuteToolModal({
  isOpen,
  onClose,
  tool,
  onExecuteSync,
  onExecuteAsync,
  isExecuting,
  executionResult,
}: ExecuteToolModalProps) {
  const [paramsJson, setParamsJson] = useState('{\n  \n}')
  const [parseError, setParseError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const parseParams = useCallback((): Record<string, unknown> | null => {
    try {
      const parsed = JSON.parse(paramsJson)
      setParseError(null)
      return parsed
    } catch {
      setParseError('Invalid JSON')
      return null
    }
  }, [paramsJson])

  const handleExecuteSync = useCallback(() => {
    const params = parseParams()
    if (params) onExecuteSync(params)
  }, [parseParams, onExecuteSync])

  const handleExecuteAsync = useCallback(() => {
    const params = parseParams()
    if (params) onExecuteAsync(params)
  }, [parseParams, onExecuteAsync])

  const handleCopyResult = useCallback(() => {
    if (!executionResult?.output_result) return
    navigator.clipboard.writeText(executionResult.output_result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [executionResult])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <LuCircleCheck className="text-emerald-500" />
      case 'failed':
        return <LuCircleX className="text-red-500" />
      case 'running':
        return <LuLoader className="text-blue-500 animate-spin" />
      default:
        return <LuCircleAlert className="text-amber-500" />
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-default"
        onClick={onClose}
        aria-label="Close modal"
      />

      {/* Modal */}
      <div
        className={cn(
          'relative w-full max-w-2xl max-h-[90vh] overflow-auto',
          'bg-white dark:bg-zinc-900 rounded-2xl',
          'border border-zinc-200 dark:border-white/10',
          'shadow-2xl',
          'animate-in fade-in zoom-in-95 duration-200'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20">
              <LuPlay size={20} className="text-emerald-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Execute: {tool.name}
              </h2>
              <p className="text-sm text-zinc-500">
                v{tool.version} • {tool.language}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
          >
            <LuX size={20} className="text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Input Schema Info */}
          {tool.input_schema && (
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <LuCode size={14} className="text-zinc-400" />
                <span className="text-xs font-medium text-zinc-500">Input Schema</span>
              </div>
              <pre className="text-xs text-zinc-600 dark:text-zinc-400 font-mono overflow-auto max-h-24">
                {tool.input_schema}
              </pre>
            </div>
          )}

          {/* Parameters Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Input Parameters (JSON)
              </span>
              {parseError && <span className="text-xs text-red-500">{parseError}</span>}
            </div>
            <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-white/10">
              <textarea
                value={paramsJson}
                onChange={(e) => setParamsJson(e.target.value)}
                rows={6}
                spellCheck={false}
                className={cn(
                  'w-full px-4 py-3 font-mono text-sm',
                  'bg-zinc-50 dark:bg-zinc-950',
                  'text-zinc-900 dark:text-zinc-100',
                  'focus:outline-none resize-none',
                  parseError && 'border-red-500'
                )}
              />
            </div>
          </div>

          {/* Execution Result */}
          {executionResult && (
            <div
              className={cn(
                'p-4 rounded-xl border',
                executionResult.status === 'completed'
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'
                  : executionResult.status === 'failed'
                    ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20'
                    : 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20'
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(executionResult.status)}
                  <span className="text-sm font-medium capitalize">{executionResult.status}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  <div className="flex items-center gap-1">
                    <LuClock size={12} />
                    {executionResult.execution_time_ms}ms
                  </div>
                  {executionResult.output_result && (
                    <button
                      type="button"
                      onClick={handleCopyResult}
                      className="flex items-center gap-1 hover:text-zinc-700"
                    >
                      {copied ? <LuCheck size={12} /> : <LuCopy size={12} />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  )}
                </div>
              </div>

              {executionResult.output_result && (
                <div className="rounded-lg bg-white dark:bg-zinc-900 p-3 max-h-48 overflow-auto">
                  <pre className="text-xs font-mono text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                    {executionResult.output_result}
                  </pre>
                </div>
              )}

              {executionResult.error_message && (
                <div className="mt-3 rounded-lg bg-red-100 dark:bg-red-500/20 p-3">
                  <pre className="text-xs font-mono text-red-700 dark:text-red-300 whitespace-pre-wrap">
                    {executionResult.error_message}
                  </pre>
                </div>
              )}

              {executionResult.stack_trace && (
                <details className="mt-3">
                  <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-700">
                    Stack Trace
                  </summary>
                  <pre className="mt-2 text-xs font-mono text-red-600 dark:text-red-400 whitespace-pre-wrap max-h-32 overflow-auto">
                    {executionResult.stack_trace}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-zinc-200 dark:border-white/10">
          <div className="text-xs text-zinc-400">
            <LuZap size={12} className="inline mr-1" />
            Avg execution: {tool.average_execution_time_ms || '-'}ms
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExecuteAsync}
              disabled={isExecuting}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium',
                'border border-zinc-200 dark:border-white/10',
                'hover:bg-zinc-50 dark:hover:bg-white/5',
                'transition-colors',
                isExecuting && 'opacity-50'
              )}
            >
              <LuClock size={14} />
              Async
            </button>
            <button
              type="button"
              onClick={handleExecuteSync}
              disabled={isExecuting}
              className={cn(
                'flex items-center gap-2 px-5 py-2 rounded-xl',
                'bg-gradient-to-r from-emerald-500 to-emerald-600',
                'hover:from-emerald-600 hover:to-emerald-700',
                'text-white font-medium text-sm',
                'transition-all',
                isExecuting && 'opacity-50'
              )}
            >
              {isExecuting ? <LuLoader size={14} className="animate-spin" /> : <LuPlay size={14} />}
              Execute
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
