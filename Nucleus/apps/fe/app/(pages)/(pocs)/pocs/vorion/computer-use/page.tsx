'use client'

import type { RemoteCommandLogJSON } from '@monorepo/db-entities/schemas/default/remote_command_log'
import type { RemoteComputerJSON } from '@monorepo/db-entities/schemas/default/remote_computer'
import { useCallback, useEffect, useRef, useState } from 'react'
import { FaApple, FaLinux, FaWindows } from 'react-icons/fa'
import {
  LuArrowRight,
  LuBot,
  LuChevronDown,
  LuCircleCheck,
  LuClock,
  LuCopy,
  LuDownload,
  LuExternalLink,
  LuHistory,
  LuInfo,
  LuKey,
  LuLoader,
  LuMonitor,
  LuPlus,
  LuRefreshCw,
  LuSend,
  LuSettings,
  LuTerminal,
  LuTrash2,
  LuX,
} from 'react-icons/lu'
import { toast } from 'sonner'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'
import { cn } from '@/app/_utils'
import type { RemoteCommandResult, VorionPredictionRequest } from '@/lib/api'
import { streamVorionPrediction } from '@/lib/api'

// ============================================================================
// Types
// ============================================================================

type CommandHistoryEntry = {
  id: string
  command: string
  args: string[]
  result: RemoteCommandResult | null
  status: 'pending' | 'success' | 'error'
  timestamp: Date
  source: 'manual' | 'ai'
}

type TerminalMode = 'manual' | 'ai'

type LLMModel = {
  model_name: string
  display_name: string
  provider_name: string
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function RemoteTerminalPage() {
  const actions = useGenericApiActions()
  const terminalRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // State
  const [computers, setComputers] = useState<RemoteComputerJSON[]>([])
  const [selectedComputer, setSelectedComputer] = useState<RemoteComputerJSON | null>(null)
  const [commandInput, setCommandInput] = useState('')
  const [commandHistory, setCommandHistory] = useState<CommandHistoryEntry[]>([])
  const [isExecuting, setIsExecuting] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  // Terminal mode state
  const [terminalMode, setTerminalMode] = useState<TerminalMode>('manual')
  const [aiPrompt, setAiPrompt] = useState('')
  const [isAiThinking, setIsAiThinking] = useState(false)

  // LLM state
  const [availableLLMs, setAvailableLLMs] = useState<Record<string, LLMModel[]>>({})
  const [selectedProvider, setSelectedProvider] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [showModelSelector, setShowModelSelector] = useState(false)

  // Details & Logs state
  const [showDetails, setShowDetails] = useState(false)
  const [commandLogs, setCommandLogs] = useState<RemoteCommandLogJSON[]>([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)

  // Load computers on mount
  useEffect(() => {
    loadComputers()
    loadLLMs()
  }, [])

  // Load command logs when computer selected
  useEffect(() => {
    if (selectedComputer) {
      loadCommandLogs(selectedComputer.id)
    } else {
      setCommandLogs([])
    }
  }, [selectedComputer])

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [commandHistory])

  const loadComputers = useCallback(() => {
    actions.GET_REMOTE_COMPUTERS?.start({
      payload: { limit: 100 },
      onAfterHandle: (data) => {
        if (data?.data) {
          setComputers(data.data)
        }
      },
      onErrorHandle: (error) => {
        console.error('Failed to load computers:', error)
        toast.error('Failed to load computers')
      },
    })
  }, [])

  const loadLLMs = useCallback(() => {
    actions.VORION_LIST_LLMS?.start({
      payload: { page_size: 100, available_only: true },
      onAfterHandle: (data) => {
        if (data?.items) {
          const providers: Record<string, LLMModel[]> = {}
          for (const model of data.items) {
            const providerName = model.provider_name
            const list = providers[providerName] ?? []
            list.push(model)
            providers[providerName] = list
          }
          setAvailableLLMs(providers)

          // Set default
          const firstProvider = Object.keys(providers)[0]
          if (firstProvider && !selectedProvider) {
            setSelectedProvider(firstProvider)
            const firstModel = providers[firstProvider]?.[0]
            if (firstModel) {
              setSelectedModel(firstModel.model_name)
            }
          }
        }
      },
      onErrorHandle: (error) => {
        console.error('Failed to load LLMs:', error)
      },
    })
  }, [selectedProvider])

  const handleSelectComputer = useCallback((computer: RemoteComputerJSON) => {
    setSelectedComputer(computer)
    setCommandHistory([])
    setShowDetails(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  const loadCommandLogs = useCallback((computerId: string) => {
    setIsLoadingLogs(true)
    actions.GET_REMOTE_COMMAND_LOGS?.start({
      payload: {
        limit: 50,
        orderBy: 'executed_at',
        orderDirection: 'desc',
        filters: { remote_computer_id: computerId },
      },
      onAfterHandle: (data) => {
        if (data?.data) {
          setCommandLogs(data.data)
        }
        setIsLoadingLogs(false)
      },
      onErrorHandle: (error) => {
        console.error('Failed to load command logs:', error)
        setIsLoadingLogs(false)
      },
    })
  }, [])

  const executeCommand = useCallback(
    async (command: string, args: string[] = [], source: 'manual' | 'ai' = 'manual') => {
      if (!selectedComputer || !command.trim() || isExecuting) return

      const entryId = crypto.randomUUID()
      const entry: CommandHistoryEntry = {
        id: entryId,
        command: command.trim(),
        args,
        result: null,
        status: 'pending',
        timestamp: new Date(),
        source,
      }

      setCommandHistory((prev) => [...prev, entry])
      setIsExecuting(true)

      actions.REMOTE_EXECUTE_COMMAND?.start({
        payload: {
          _agentId: selectedComputer.computer_identifier,
          command: command.trim(),
          args: args.length > 0 ? args : undefined,
          timeoutMs: 30000,
        },
        onAfterHandle: (data) => {
          setCommandHistory((prev) =>
            prev.map((e) =>
              e.id === entryId
                ? {
                    ...e,
                    result: data?.result || null,
                    status: data?.result?.exitCode === 0 ? 'success' : 'error',
                  }
                : e
            )
          )
          setIsExecuting(false)
        },
        onErrorHandle: (error) => {
          console.error('Command execution failed:', error)
          setCommandHistory((prev) =>
            prev.map((e) =>
              e.id === entryId
                ? {
                    ...e,
                    status: 'error' as const,
                  }
                : e
            )
          )
          setIsExecuting(false)
          toast.error('Command failed', {
            description: typeof error === 'string' ? error : 'Execution failed',
          })
        },
      })
    },
    [selectedComputer, isExecuting]
  )

  const handleManualCommand = useCallback(() => {
    if (!commandInput.trim()) return
    const parts = commandInput.trim().split(' ')
    const cmd = parts[0] || ''
    const args = parts.slice(1)
    executeCommand(cmd, args, 'manual')
    setCommandInput('')
  }, [commandInput, executeCommand])

  const handleAiPrompt = useCallback(async () => {
    if (!aiPrompt.trim() || !selectedComputer || isAiThinking) return

    setIsAiThinking(true)

    // Build system prompt for terminal control
    const systemContext = `You are an AI assistant that helps users execute commands on a remote ${selectedComputer.platform || 'unknown'} computer.
The user will describe what they want to do, and you should respond with the exact terminal command(s) to execute.

IMPORTANT RULES:
1. Respond ONLY with the command(s) to execute, one per line
2. Do NOT include any explanation or commentary
3. Do NOT use markdown code blocks
4. If multiple commands are needed, put each on a separate line
5. Use the appropriate syntax for ${selectedComputer.platform || 'the target platform'}

Example user request: "list all files in the current directory"
Your response: ls -la

Example user request: "show disk usage"  
Your response: df -h`

    // Use a stub conversation_id for one-off terminal commands
    // This keeps the request simple without managing conversation state
    const request: VorionPredictionRequest = {
      conversation_id: `terminal-${selectedComputer.computer_identifier}`,
      prompt: { text: `${systemContext}\n\nUser request: ${aiPrompt}` },
      llm_name: selectedProvider || 'openai',
      llm_group_name: selectedModel || 'gpt-4o',
      thinking: { enabled: false },
    }

    try {
      let fullResponse = ''

      for await (const chunk of streamVorionPrediction(request)) {
        if (chunk.chunk) {
          fullResponse += chunk.chunk
        }
      }

      // Parse commands from response
      const commands = fullResponse
        .trim()
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('#'))

      // Execute each command
      for (const cmdLine of commands) {
        const parts = cmdLine.split(' ')
        const cmd = parts[0] || ''
        const args = parts.slice(1)
        await new Promise<void>((resolve) => {
          executeCommand(cmd, args, 'ai')
          // Wait a bit for execution to complete
          setTimeout(resolve, 500)
        })
      }
    } catch (error) {
      console.error('AI error:', error)
      toast.error('AI processing failed')
    } finally {
      setIsAiThinking(false)
      setAiPrompt('')
    }
  }, [aiPrompt, selectedComputer, selectedProvider, selectedModel, isAiThinking, executeCommand])

  const handleDeleteComputer = useCallback(
    (computer: RemoteComputerJSON) => {
      if (!confirm(`Are you sure you want to delete "${computer.name}"?`)) return

      actions.DELETE_REMOTE_COMPUTER?.start({
        payload: { _id: computer.id },
        onAfterHandle: () => {
          setComputers((prev) => prev.filter((c) => c.id !== computer.id))
          if (selectedComputer?.id === computer.id) {
            setSelectedComputer(null)
          }
          toast.success('Computer deleted')
        },
        onErrorHandle: (error) => {
          console.error('Failed to delete computer:', error)
          toast.error('Failed to delete computer')
        },
      })
    },
    [selectedComputer]
  )

  const isLoadingComputers = actions.GET_REMOTE_COMPUTERS?.state?.isPending ?? false

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour12: false })
  }

  return (
    <main className="h-[100svh] flex w-full bg-white dark:bg-zinc-950">
      {/* Sidebar - Computer List */}
      <aside
        className={cn(
          'w-72 flex-shrink-0 border-r',
          'border-zinc-200 dark:border-zinc-800',
          'bg-zinc-50 dark:bg-zinc-900 flex flex-col'
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
              <LuTerminal className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
              Remote Terminal
            </h1>
            <button
              type="button"
              onClick={loadComputers}
              disabled={isLoadingComputers}
              className={cn(
                'p-2 rounded-lg transition-colors',
                'hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400',
                isLoadingComputers && 'animate-spin'
              )}
            >
              <LuRefreshCw className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
            {computers.length} computer{computers.length !== 1 ? 's' : ''} connected
          </p>
        </div>

        {/* Computer List */}
        <div className="flex-1 overflow-y-auto p-2">
          {isLoadingComputers ? (
            <div className="flex items-center justify-center py-8">
              <LuLoader className="w-5 h-5 animate-spin text-zinc-400 dark:text-zinc-500" />
            </div>
          ) : computers.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 dark:text-zinc-500">
              <LuMonitor className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No computers yet</p>
              <p className="text-xs mt-1">Add one below</p>
            </div>
          ) : (
            <div className="space-y-1">
              {computers.map((computer) => (
                <ComputerListItem
                  key={computer.id}
                  computer={computer}
                  isSelected={selectedComputer?.id === computer.id}
                  onSelect={() => handleSelectComputer(computer)}
                  onDelete={() => handleDeleteComputer(computer)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Add Computer Button */}
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg',
              'bg-emerald-600 hover:bg-emerald-700 text-white',
              'font-medium text-sm transition-colors'
            )}
          >
            <LuPlus className="w-4 h-4" />
            Add Computer
          </button>
        </div>
      </aside>

      {/* Add Computer Modal */}
      {showAddModal && (
        <AddComputerModal onClose={() => setShowAddModal(false)} onSuccess={loadComputers} />
      )}

      {/* Main Terminal Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-zinc-100 dark:bg-black">
        {selectedComputer ? (
          <>
            {/* Terminal Header */}
            <header className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full',
                      selectedComputer.is_online ? 'bg-emerald-500' : 'bg-zinc-400 dark:bg-zinc-500'
                    )}
                  />
                  <span className="text-sm font-medium text-zinc-900 dark:text-white">
                    {selectedComputer.name}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-500">
                    {selectedComputer.platform || 'Unknown'} •{' '}
                    {selectedComputer.computer_identifier.slice(0, 8)}...
                  </span>
                </div>
              </div>

              {/* Mode Switcher & Actions */}
              <div className="flex items-center gap-2">
                {/* Info/Logs toggle */}
                <button
                  type="button"
                  onClick={() => setShowDetails(!showDetails)}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    showDetails
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                  )}
                  title="Computer details & logs"
                >
                  <LuInfo className="w-4 h-4" />
                </button>

                <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setTerminalMode('manual')}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                      terminalMode === 'manual'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                    )}
                  >
                    <LuTerminal className="w-3.5 h-3.5 inline mr-1.5" />
                    Manual
                  </button>
                  <button
                    type="button"
                    onClick={() => setTerminalMode('ai')}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                      terminalMode === 'ai'
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                    )}
                  >
                    <LuBot className="w-3.5 h-3.5 inline mr-1.5" />
                    AI Assistant
                  </button>
                </div>

                {/* Model Selector (AI Mode) */}
                {terminalMode === 'ai' && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowModelSelector(!showModelSelector)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 text-xs',
                        'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg',
                        'text-zinc-700 dark:text-zinc-300 transition-colors'
                      )}
                    >
                      <LuSettings className="w-3.5 h-3.5" />
                      {selectedProvider}/{selectedModel || 'Select Model'}
                      <LuChevronDown className="w-3 h-3" />
                    </button>

                    {showModelSelector && (
                      <ModelSelector
                        providers={availableLLMs}
                        selectedProvider={selectedProvider}
                        selectedModel={selectedModel}
                        onSelect={(provider, model) => {
                          setSelectedProvider(provider)
                          setSelectedModel(model)
                          setShowModelSelector(false)
                        }}
                        onClose={() => setShowModelSelector(false)}
                      />
                    )}
                  </div>
                )}
              </div>
            </header>

            {/* Main Content Area - Terminal or Details */}
            <div className="flex-1 flex overflow-hidden">
              {/* Terminal Output */}
              <div
                ref={terminalRef}
                className={cn(
                  'flex-1 overflow-y-auto p-4 font-mono text-sm',
                  'bg-zinc-50 dark:bg-black',
                  showDetails && 'hidden lg:block'
                )}
              >
                {/* Welcome message */}
                <div className="text-zinc-500 dark:text-zinc-500 mb-4">
                  <p>
                    Connected to {selectedComputer.name} ({selectedComputer.platform})
                  </p>
                  <p>Type commands below or switch to AI mode for natural language control.</p>
                  <p className="text-zinc-400 dark:text-zinc-600">---</p>
                </div>

                {/* Command history */}
                {commandHistory.map((entry) => (
                  <div key={entry.id} className="mb-3">
                    {/* Prompt line */}
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-500">
                        {entry.source === 'ai' ? '🤖' : '$'}
                      </span>
                      <span className="text-zinc-800 dark:text-zinc-300">
                        {entry.command} {entry.args.join(' ')}
                      </span>
                      <span className="text-zinc-400 dark:text-zinc-600 text-xs ml-auto">
                        {formatTime(entry.timestamp)}
                      </span>
                    </div>

                    {/* Output */}
                    {entry.status === 'pending' ? (
                      <div className="ml-5 text-zinc-500 dark:text-zinc-500 flex items-center gap-2">
                        <LuLoader className="w-3 h-3 animate-spin" />
                        Executing...
                      </div>
                    ) : entry.result ? (
                      <div className="ml-5 mt-1">
                        {entry.result.stdout && (
                          <pre className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap break-all">
                            {entry.result.stdout}
                          </pre>
                        )}
                        {entry.result.stderr && (
                          <pre className="text-red-600 dark:text-red-400 whitespace-pre-wrap break-all">
                            {entry.result.stderr}
                          </pre>
                        )}
                        {!entry.result.stdout && !entry.result.stderr && (
                          <span className="text-zinc-400 dark:text-zinc-600 italic">No output</span>
                        )}
                        <div className="text-zinc-400 dark:text-zinc-600 text-xs mt-1">
                          exit: {entry.result.exitCode ?? 'N/A'}
                          {entry.result.durationMs ? ` • ${entry.result.durationMs}ms` : ''}
                          {entry.result.timedOut && (
                            <span className="text-yellow-600 dark:text-yellow-500 ml-2">
                              ⏱ Timed out
                            </span>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}

                {/* Current prompt line (typing indicator) */}
                {!isExecuting && commandHistory.length === 0 && (
                  <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-500">
                    <span className="text-emerald-600 dark:text-emerald-500">$</span>
                    <span className="animate-pulse">_</span>
                  </div>
                )}
              </div>

              {/* Details & Logs Panel */}
              {showDetails && (
                <div
                  className={cn(
                    'w-full lg:w-96 border-l overflow-y-auto',
                    'border-zinc-200 dark:border-zinc-800',
                    'bg-white dark:bg-zinc-900'
                  )}
                >
                  {/* Computer Info */}
                  <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2 mb-3">
                      <LuMonitor className="w-4 h-4" />
                      Computer Details
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-zinc-500 dark:text-zinc-400">Name</span>
                        <span className="text-zinc-900 dark:text-white font-medium">
                          {selectedComputer.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500 dark:text-zinc-400">Platform</span>
                        <span className="text-zinc-900 dark:text-white">
                          {selectedComputer.platform || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500 dark:text-zinc-400">Status</span>
                        <span
                          className={cn(
                            'flex items-center gap-1.5',
                            selectedComputer.is_online
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-zinc-500'
                          )}
                        >
                          <span
                            className={cn(
                              'w-2 h-2 rounded-full',
                              selectedComputer.is_online ? 'bg-emerald-500' : 'bg-zinc-400'
                            )}
                          />
                          {selectedComputer.is_online ? 'Online' : 'Offline'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500 dark:text-zinc-400">Agent ID</span>
                        <span className="text-zinc-700 dark:text-zinc-300 font-mono text-xs">
                          {selectedComputer.computer_identifier.slice(0, 12)}...
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500 dark:text-zinc-400">Last Seen</span>
                        <span className="text-zinc-700 dark:text-zinc-300 text-xs">
                          {selectedComputer.last_seen
                            ? new Date(selectedComputer.last_seen).toLocaleString()
                            : 'Never'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500 dark:text-zinc-400">Created</span>
                        <span className="text-zinc-700 dark:text-zinc-300 text-xs">
                          {selectedComputer.created_at
                            ? new Date(selectedComputer.created_at).toLocaleDateString()
                            : 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Command Logs */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                        <LuHistory className="w-4 h-4" />
                        Command History
                      </h3>
                      <button
                        type="button"
                        onClick={() => loadCommandLogs(selectedComputer.id)}
                        disabled={isLoadingLogs}
                        className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
                      >
                        <LuRefreshCw
                          className={cn('w-3.5 h-3.5', isLoadingLogs && 'animate-spin')}
                        />
                      </button>
                    </div>

                    {isLoadingLogs ? (
                      <div className="flex items-center justify-center py-8">
                        <LuLoader className="w-5 h-5 animate-spin text-zinc-400" />
                      </div>
                    ) : commandLogs.length === 0 ? (
                      <div className="text-center py-8 text-zinc-500 dark:text-zinc-500">
                        <LuClock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No command history yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {commandLogs.map((log) => (
                          <div
                            key={log.id}
                            className={cn(
                              'p-3 rounded-lg text-xs',
                              'bg-zinc-50 dark:bg-zinc-800/50',
                              'border border-zinc-200 dark:border-zinc-700'
                            )}
                          >
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <code className="font-mono text-zinc-900 dark:text-zinc-100 break-all">
                                {log.command} {log.args || ''}
                              </code>
                              <span
                                className={cn(
                                  'flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium',
                                  log.exit_code === 0
                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                    : log.exit_code === null
                                      ? 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                )}
                              >
                                {log.exit_code ?? 'N/A'}
                              </span>
                            </div>
                            {log.output && (
                              <pre className="text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap break-all mt-1 max-h-20 overflow-y-auto">
                                {log.output.slice(0, 200)}
                                {log.output.length > 200 ? '...' : ''}
                              </pre>
                            )}
                            {log.stderr && (
                              <pre className="text-red-600 dark:text-red-400 whitespace-pre-wrap break-all mt-1 max-h-20 overflow-y-auto">
                                {log.stderr.slice(0, 200)}
                                {log.stderr.length > 200 ? '...' : ''}
                              </pre>
                            )}
                            <div className="flex items-center gap-2 mt-2 text-zinc-400 dark:text-zinc-500">
                              <LuClock className="w-3 h-3" />
                              {log.executed_at
                                ? new Date(log.executed_at).toLocaleString()
                                : 'Unknown'}
                              {log.execution_time_ms && <span>• {log.execution_time_ms}ms</span>}
                              {log.timed_out && (
                                <span className="text-yellow-600 dark:text-yellow-500">
                                  • Timed out
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3">
              {terminalMode === 'manual' ? (
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 dark:text-emerald-500 font-mono">$</span>
                  <input
                    ref={inputRef}
                    type="text"
                    value={commandInput}
                    onChange={(e) => setCommandInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleManualCommand()
                      }
                    }}
                    placeholder="Type a command..."
                    disabled={isExecuting}
                    className={cn(
                      'flex-1 bg-transparent border-none outline-none',
                      'text-zinc-900 dark:text-zinc-100 font-mono text-sm',
                      'placeholder:text-zinc-400 dark:placeholder:text-zinc-600',
                      'disabled:opacity-50'
                    )}
                  />
                  <button
                    type="button"
                    onClick={handleManualCommand}
                    disabled={!commandInput.trim() || isExecuting}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      'bg-emerald-600 hover:bg-emerald-700 text-white',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    {isExecuting ? (
                      <LuLoader className="w-4 h-4 animate-spin" />
                    ) : (
                      <LuSend className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <LuBot className="w-4 h-4 text-violet-500 dark:text-violet-400 mt-2" />
                    <textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleAiPrompt()
                        }
                      }}
                      placeholder="Describe what you want to do... (e.g., 'Show me disk usage' or 'List all running processes')"
                      disabled={isAiThinking}
                      rows={2}
                      className={cn(
                        'flex-1 w-full rounded-lg',
                        'bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700',
                        'px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100',
                        'placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
                        'focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent',
                        'disabled:opacity-50 resize-none'
                      )}
                    />
                    <button
                      type="button"
                      onClick={handleAiPrompt}
                      disabled={!aiPrompt.trim() || isAiThinking}
                      className={cn(
                        'p-2 rounded-lg transition-colors mt-1',
                        'bg-violet-600 hover:bg-violet-700 text-white',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                    >
                      {isAiThinking ? (
                        <LuLoader className="w-4 h-4 animate-spin" />
                      ) : (
                        <LuSend className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500 ml-6">
                    Using {selectedProvider}/{selectedModel} to generate commands
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-zinc-500 dark:text-zinc-500">
              <LuTerminal className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg text-zinc-600 dark:text-zinc-400">Select a Computer</p>
              <p className="text-sm mt-1">
                Choose a computer from the sidebar to start a remote terminal session
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

// ============================================================================
// Computer List Item
// ============================================================================

function ComputerListItem({
  computer,
  isSelected,
  onSelect,
  onDelete,
}: {
  computer: RemoteComputerJSON
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  const lastSeen = computer.last_seen ? new Date(computer.last_seen) : null
  const lastSeenText = lastSeen
    ? `${Math.floor((Date.now() - lastSeen.getTime()) / 60000)}m ago`
    : 'Never seen'

  return (
    <button
      type="button"
      className={cn(
        'group flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors w-full text-left',
        isSelected
          ? 'bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 shadow-sm'
          : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/50 border border-transparent'
      )}
      onClick={onSelect}
    >
      <div
        className={cn(
          'w-2 h-2 rounded-full flex-shrink-0',
          computer.is_online ? 'bg-emerald-500' : 'bg-zinc-400 dark:bg-zinc-600'
        )}
      />
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'font-medium text-sm truncate',
            isSelected ? 'text-zinc-900 dark:text-white' : 'text-zinc-700 dark:text-zinc-300'
          )}
        >
          {computer.name}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-500 truncate">
          {computer.platform || 'Unknown'} • {lastSeenText}
        </p>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        className={cn(
          'p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity',
          'hover:bg-red-100 dark:hover:bg-red-500/20 text-red-500 dark:text-red-400'
        )}
        aria-label="Delete computer"
      >
        <LuTrash2 className="w-3.5 h-3.5" />
      </button>
    </button>
  )
}

// ============================================================================
// Model Selector Dropdown
// ============================================================================

function ModelSelector({
  providers,
  selectedProvider,
  selectedModel,
  onSelect,
  onClose,
}: {
  providers: Record<string, LLMModel[]>
  selectedProvider: string
  selectedModel: string
  onSelect: (provider: string, model: string) => void
  onClose: () => void
}) {
  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 cursor-default"
        onClick={onClose}
        aria-label="Close dropdown"
      />
      <div
        className={cn(
          'absolute right-0 top-full mt-2 z-50',
          'w-64 max-h-80 overflow-y-auto',
          'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl'
        )}
      >
        {Object.entries(providers).map(([provider, models]) => (
          <div key={provider}>
            <div className="px-3 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide bg-zinc-50 dark:bg-zinc-900/50">
              {provider}
            </div>
            {models.map((model) => (
              <button
                key={model.model_name}
                type="button"
                onClick={() => onSelect(provider, model.model_name)}
                className={cn(
                  'w-full px-3 py-2 text-left text-sm transition-colors',
                  selectedProvider === provider && selectedModel === model.model_name
                    ? 'bg-violet-600 text-white'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                )}
              >
                {model.display_name || model.model_name}
              </button>
            ))}
          </div>
        ))}
      </div>
    </>
  )
}

// ============================================================================
// Add Computer Modal
// ============================================================================

type Platform = 'macos' | 'windows' | 'linux'

const DOWNLOAD_BASE_URL = '/downloads/desktop-agent'

const platformConfig: Record<
  Platform,
  {
    name: string
    icon: React.ReactNode
    filename: string
    instructions: string[]
    securityNote: string
  }
> = {
  macos: {
    name: 'macOS',
    icon: <FaApple className="w-8 h-8" />,
    filename: 'desktop-agent-macos.zip',
    instructions: [
      'Download the ZIP file using the button below',
      'Extract the ZIP by double-clicking it',
      'Double-click "desktop-agent-macos.command" to run',
      'If you see a security warning, go to System Settings → Privacy & Security → click "Open Anyway"',
      'The agent will download and run automatically',
    ],
    securityNote:
      'macOS may show a warning because the app is not code-signed. This is safe to run - go to System Settings → Privacy & Security and click "Open Anyway".',
  },
  windows: {
    name: 'Windows',
    icon: <FaWindows className="w-8 h-8" />,
    filename: 'desktop-agent-windows.bat',
    instructions: [
      'Download the .bat file using the button below',
      'Double-click the downloaded file to run',
      'If Windows Defender shows a warning, click "More info" → "Run anyway"',
      'The agent will download the latest version and start automatically',
    ],
    securityNote:
      'Windows SmartScreen may show a warning for unsigned apps. Click "More info" then "Run anyway" to proceed.',
  },
  linux: {
    name: 'Linux',
    icon: <FaLinux className="w-8 h-8" />,
    filename: 'desktop-agent-linux.sh',
    instructions: [
      'Download the shell script using the button below',
      'Open a terminal and navigate to the download folder',
      'Run: chmod +x desktop-agent-linux.sh && ./desktop-agent-linux.sh',
      'The agent will start and appear on this page automatically',
    ],
    securityNote: 'You may need to grant execute permissions using chmod +x before running.',
  },
}

function AddComputerModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const actions = useGenericApiActions()

  const [step, setStep] = useState<1 | 2>(1)
  const [computerName, setComputerName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createdData, setCreatedData] = useState<{
    id: string
    name: string
    computer_identifier: string
    api_key: string
  } | null>(null)

  const [selectedPlatform, setSelectedPlatform] = useState<Platform>(() => {
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase()
      if (ua.includes('mac')) return 'macos'
      if (ua.includes('win')) return 'windows'
      if (ua.includes('linux')) return 'linux'
    }
    return 'macos'
  })

  const config = platformConfig[selectedPlatform]

  const handleCreateComputer = useCallback(() => {
    if (!computerName.trim() || isCreating) return

    setIsCreating(true)
    actions.REMOTE_CREATE_COMPUTER?.start({
      payload: { name: computerName.trim() },
      onAfterHandle: (response) => {
        setIsCreating(false)
        if (response) {
          setCreatedData(response)
          setStep(2)
          toast.success('Computer created!')
        }
      },
      onErrorHandle: (error) => {
        setIsCreating(false)
        console.error('Failed to create computer:', error)
        toast.error('Failed to create computer')
      },
    })
  }, [computerName, isCreating, actions])

  const handleCopyApiKey = useCallback(() => {
    if (createdData?.api_key) {
      navigator.clipboard.writeText(createdData.api_key)
      toast.success('API key copied!')
    }
  }, [createdData])

  const handleDownload = useCallback(() => {
    const url = `${DOWNLOAD_BASE_URL}/${config.filename}`
    window.open(url, '_blank')
    toast.success('Download started!')
  }, [config.filename])

  const handleOpenAgentUI = useCallback(() => {
    window.open('http://127.0.0.1:5050/setup', '_blank')
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-default"
        onClick={onClose}
        aria-label="Close modal"
      />

      <div
        className={cn(
          'relative w-full max-w-2xl max-h-[90vh] overflow-auto',
          'bg-zinc-900 rounded-2xl shadow-2xl',
          'border border-zinc-800'
        )}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <LuMonitor className="w-5 h-5 text-emerald-500" />
            Add Computer
            <span className="text-sm font-normal text-zinc-500">- Step {step}/2</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400"
          >
            <LuX className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="computerName"
                  className="block text-sm font-medium text-zinc-300 mb-2"
                >
                  Computer Name
                </label>
                <input
                  id="computerName"
                  type="text"
                  value={computerName}
                  onChange={(e) => setComputerName(e.target.value)}
                  placeholder="e.g., Work Laptop"
                  className={cn(
                    'w-full px-4 py-3 rounded-xl',
                    'bg-zinc-800 border border-zinc-700',
                    'text-white placeholder-zinc-500',
                    'focus:outline-none focus:ring-2 focus:ring-emerald-500'
                  )}
                />
                <p className="mt-2 text-xs text-zinc-500">
                  Choose a name to easily identify this computer.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCreateComputer}
                disabled={!computerName.trim() || isCreating}
                className={cn(
                  'w-full flex items-center justify-center gap-3 px-4 py-4 rounded-xl',
                  'bg-emerald-600 hover:bg-emerald-700',
                  'text-white font-semibold text-lg shadow-lg',
                  'transition-all hover:shadow-xl',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {isCreating ? (
                  <>
                    <LuLoader className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <LuArrowRight className="w-5 h-5" />
                    Continue
                  </>
                )}
              </button>
            </div>
          )}

          {step === 2 && createdData && (
            <div className="space-y-6">
              {/* API Key */}
              <div className="p-4 rounded-xl bg-amber-900/20 border border-amber-800">
                <div className="flex items-center gap-2 mb-3">
                  <LuKey className="w-5 h-5 text-amber-400" />
                  <h3 className="font-semibold text-amber-300">API Key (shown only once!)</h3>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-3 bg-zinc-900 rounded-lg text-sm font-mono text-zinc-200 break-all border border-amber-800">
                    {createdData.api_key}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyApiKey}
                    className="p-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white"
                    title="Copy"
                  >
                    <LuCopy className="w-5 h-5" />
                  </button>
                </div>
                <p className="mt-2 text-xs text-amber-400">
                  Save this key securely. You won't be able to see it again.
                </p>
              </div>

              {/* Platform Selection */}
              <div>
                <p className="block text-sm font-medium text-zinc-300 mb-3">
                  Select Your Operating System
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {(Object.keys(platformConfig) as Platform[]).map((platform) => {
                    const cfg = platformConfig[platform]
                    const isSelected = selectedPlatform === platform
                    return (
                      <button
                        key={platform}
                        type="button"
                        onClick={() => setSelectedPlatform(platform)}
                        className={cn(
                          'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                          isSelected
                            ? 'border-emerald-500 bg-emerald-900/20 text-emerald-300'
                            : 'border-zinc-700 hover:border-zinc-600 text-zinc-400'
                        )}
                      >
                        {cfg.icon}
                        <span className="font-medium text-sm">{cfg.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Download Button */}
              <button
                type="button"
                onClick={handleDownload}
                className={cn(
                  'w-full flex items-center justify-center gap-3 px-4 py-4 rounded-xl',
                  'bg-emerald-600 hover:bg-emerald-700',
                  'text-white font-semibold text-lg shadow-lg',
                  'transition-all hover:shadow-xl hover:scale-[1.02]'
                )}
              >
                <LuDownload className="w-6 h-6" />
                Download for {config.name}
              </button>

              {/* Security Note */}
              <div className="p-4 rounded-lg bg-yellow-900/20 border border-yellow-800/50">
                <h4 className="font-medium text-yellow-300 text-sm mb-1">⚠️ Security Notice</h4>
                <p className="text-xs text-yellow-400/80">{config.securityNote}</p>
              </div>

              {/* Instructions */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-zinc-300">Setup Instructions</h3>
                <ol className="space-y-2">
                  {config.instructions.map((instruction, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700"
                    >
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-900/50 text-emerald-300 flex items-center justify-center text-sm font-semibold">
                        {index + 1}
                      </span>
                      <span className="text-sm text-zinc-300">{instruction}</span>
                    </li>
                  ))}
                  <li className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-900/50 text-emerald-300 flex items-center justify-center text-sm font-semibold">
                      {config.instructions.length + 1}
                    </span>
                    <div className="flex-1">
                      <span className="text-sm text-zinc-300">
                        Open the agent's local UI and enter your API key:
                      </span>
                      <button
                        type="button"
                        onClick={handleOpenAgentUI}
                        className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-700 text-zinc-200 hover:bg-zinc-600 text-sm font-medium"
                      >
                        <LuExternalLink className="w-4 h-4" />
                        http://127.0.0.1:5050/setup
                      </button>
                    </div>
                  </li>
                </ol>
              </div>

              {/* Success Note */}
              <div className="p-4 rounded-lg bg-emerald-900/20 border border-emerald-800">
                <h4 className="font-medium text-emerald-300 text-sm mb-1 flex items-center gap-2">
                  <LuCircleCheck className="w-4 h-4" />
                  Security Note
                </h4>
                <p className="text-xs text-emerald-400">
                  Each computer gets a unique API key. This key only works for your computer and
                  cannot be used by anyone else.
                </p>
              </div>

              {/* Footer */}
              <div className="text-center text-xs text-zinc-500">
                After completing the agent setup,
                <button
                  type="button"
                  onClick={() => {
                    onSuccess()
                    toast.success('List refreshed')
                  }}
                  className="ml-2 text-emerald-400 hover:underline"
                >
                  Refresh the List
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
