'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LuCheck,
  LuChevronDown,
  LuChevronUp,
  LuClock,
  LuLoader,
  LuSparkles,
  LuUser,
  LuZap,
} from 'react-icons/lu'
import { toast } from 'sonner'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'
import { useMeetingAnalyzerStore } from '@/app/_store'
import type { ActionItem } from '@/app/_store/meetingAnalyzerStore/types'
import { cn } from '@/app/_utils'
import {
  streamVorionPrediction,
  type VorionConversationResponse,
  type VorionPredictionRequest,
} from '@/lib/api'
import {
  generateInternalConversationTitle,
  type InternalConversationMetadata,
} from '../../constants'

const ACTION_ITEM_SYSTEM_PROMPT = `You are a JSON-only action item extractor for live meeting transcripts.

The transcript will be sent to you INCREMENTALLY in chunks of text (e.g. every ~1000 characters).
You will also receive the list of PREVIOUSLY EXTRACTED ACTION ITEMS for context.

Your goals:
1. Detect NEW action items mentioned in the latest transcript chunk.
2. Optionally refine or update existing items if the new chunk adds clarification.
3. Avoid duplicates: do not recreate items that already exist with the same meaning.

For each action item:
- owner: Person responsible (use "Unassigned" if unclear)
- action: What needs to be done
- due_date: ISO format YYYY-MM-DD or null
- priority: "high", "medium", or "low"
- source_snippet: Short quote from the transcript that justifies the action

CRITICAL RULES:
1. Output ONLY valid JSON - no markdown headers, no bullet points, no explanations
2. Only extract ACTIONABLE items (tasks someone needs to do)
3. If no new or updated action items are found, return: {"action_items": []}
4. Never wrap JSON in code blocks or add any text before/after

Required JSON format:
{
  "action_items": [
    {
      "owner": "Person Name",
      "action": "Description of the task",
      "due_date": "2024-01-15" or null,
      "priority": "high" | "medium" | "low",
      "source_snippet": "Relevant transcript quote"
    }
  ]
}`

function parseActionItems(response: string, timestamp: number): ActionItem[] {
  // 1) Try strict JSON parsing first
  try {
    // Try to find JSON in the response (may be wrapped in markdown code blocks)
    let jsonStr = response

    // Remove markdown code blocks if present
    const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch?.[1]) {
      jsonStr = codeBlockMatch[1].trim()
    }

    // Find JSON object
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      const items = parsed.action_items || []

      console.log('[parseActionItems] Parsed JSON items:', items.length)

      return items.map((item: Record<string, unknown>, index: number) => ({
        id: `action-${timestamp}-${index}`,
        owner: String(item.owner || 'Unassigned'),
        action: String(item.action || ''),
        dueDate: item.due_date ? String(item.due_date) : null,
        priority: (['high', 'medium', 'low'].includes(String(item.priority))
          ? item.priority
          : 'medium') as 'high' | 'medium' | 'low',
        sourceSnippet: String(item.source_snippet || ''),
        extractedAt: timestamp,
        status: 'pending' as const,
      }))
    }
    console.log('[parseActionItems] No JSON found in response, trying markdown fallback')
  } catch (e) {
    console.warn('[parseActionItems] JSON parse failed, trying markdown fallback:', e)
  }

  // 2) Fallback: try to parse markdown tables (e.g. Turkish "İşlem Maddeleri" tablosu)
  const markdownItems = parseMarkdownActionItems(response, timestamp)
  if (markdownItems.length > 0) {
    console.log('[parseActionItems] Parsed markdown table items:', markdownItems.length)
    return markdownItems
  }

  console.log('[parseActionItems] No action items parsed from response')
  return []
}

function parseMarkdownActionItems(response: string, timestamp: number): ActionItem[] {
  const lines = response.split('\n').map((line) => line.trim())

  // Find first markdown table header line
  const tableStart = lines.findIndex((line) => line.startsWith('|') && line.includes('|'))
  if (tableStart === -1) {
    return parseMarkdownListActionItems(lines, timestamp)
  }

  const headerLine = lines[tableStart] ?? ''
  if (!headerLine) return []
  const headerCells = headerLine
    .split('|')
    .map((c) => c.trim())
    .filter((c) => c.length > 0)

  if (headerCells.length === 0) return []

  // Find separator row (---) and move to first data row
  let rowIndex = tableStart + 1
  while (rowIndex < lines.length) {
    const sepLine = lines[rowIndex] ?? ''
    if (/^\s*\|?[-\s|]+\|?\s*$/.test(sepLine)) {
      rowIndex++
      break
    }
    rowIndex++
  }

  // Map header names to columns (supports TR + EN variants)
  const headerMap: { owner: number; action: number; due: number; detail: number } = {
    owner: -1,
    action: -1,
    due: -1,
    detail: -1,
  }

  headerCells.forEach((raw, index) => {
    const h = raw.toLowerCase()
    if (/(owner|sahip|sorumlu)/.test(h)) headerMap.owner = index
    else if (/(action|işlem|aksiyon|görev|task)/.test(h)) headerMap.action = index
    else if (/(due|deadline|tarih)/.test(h)) headerMap.due = index
    else if (/(detail|detay|açıklama|description)/.test(h)) headerMap.detail = index
  })

  const items: ActionItem[] = []

  for (; rowIndex < lines.length; rowIndex++) {
    const line = lines[rowIndex] ?? ''
    if (!line.startsWith('|')) break
    if (/^\s*\|?[-\s|]+\|?\s*$/.test(line)) continue

    const cells = line
      .split('|')
      .map((c) => c.trim())
      .filter((c) => c.length > 0)

    if (cells.length < 2) continue

    const getCell = (idx: number | undefined, fallbackIndex: number) => {
      if (idx !== undefined && idx >= 0 && idx < cells.length) return cells[idx]
      if (fallbackIndex >= 0 && fallbackIndex < cells.length) return cells[fallbackIndex]
      return ''
    }

    const actionText = getCell(headerMap.action, 1)
    if (!actionText) continue

    const ownerText = getCell(headerMap.owner, -1) || 'Unassigned'
    const dueRaw = getCell(headerMap.due, -1)
    const detailText = getCell(headerMap.detail, -1)

    const cleanedDue = dueRaw && !/^[-–—]$/.test(dueRaw.trim()) ? dueRaw.trim() : ''

    items.push({
      id: `action-${timestamp}-${items.length}`,
      owner: ownerText || 'Unassigned',
      action: actionText,
      dueDate: cleanedDue || null,
      priority: 'medium',
      sourceSnippet: detailText || actionText,
      extractedAt: timestamp,
      status: 'pending',
    })
  }

  return items
}

function parseMarkdownListActionItems(lines: string[], timestamp: number): ActionItem[] {
  const items: ActionItem[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue

    // Match patterns like:
    // 1. **Title**
    // 1) Title
    const match = line.match(/^(\d+)[).]\s+(?:\*\*(.+?)\*\*|(.+))$/)
    if (!match) continue

    const title = (match[2] || match[3] || '').trim()
    if (!title) continue

    const detailLines: string[] = []
    let j = i + 1

    while (j < lines.length) {
      const next = lines[j]
      if (!next) {
        j++
        break
      }

      // Stop at next numbered item or new heading
      if (/^(\d+)[).]\s+/.test(next) || next.startsWith('#')) {
        break
      }

      if (next.startsWith('-') || next.startsWith('•')) {
        detailLines.push(next.replace(/^[-•]\s*/, '').trim())
      } else {
        detailLines.push(next.trim())
      }

      j++
    }

    const detail = detailLines.join(' ')

    items.push({
      id: `action-${timestamp}-${items.length}`,
      owner: 'Unassigned',
      action: title,
      dueDate: null,
      priority: 'medium',
      sourceSnippet: detail || title,
      extractedAt: timestamp,
      status: 'pending',
    })

    i = j - 1
  }

  return items
}

function getPriorityColor(priority: ActionItem['priority']) {
  switch (priority) {
    case 'high':
      return 'text-red-500 bg-red-500/10 border-red-500/20'
    case 'medium':
      return 'text-amber-500 bg-amber-500/10 border-amber-500/20'
    case 'low':
      return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
  }
}

interface ActionItemExtractorProps {
  defaultExpanded?: boolean
}

export function ActionItemExtractor({ defaultExpanded = true }: ActionItemExtractorProps) {
  const actions = useGenericApiActions()
  const store = useMeetingAnalyzerStore()

  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const processingRef = useRef(false)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const MIN_CHARS_PER_CALL = 800

  useEffect(() => {
    console.log('[ActionExtractor] Conv check:', {
      convId: store.conversationId,
      creating: store.isCreatingConversation,
    })

    if (store.conversationId || store.isCreatingConversation) return

    console.log('[ActionExtractor] Creating new conversation...')
    store.setCreatingConversation(true)

    const title = generateInternalConversationTitle('MEETING_ACTION_ITEMS')
    const metadata: InternalConversationMetadata = {
      internal: true,
      internal_type: 'meeting_analyzer',
      feature: 'MEETING_ACTION_ITEMS',
      llm: store.llmConfig || {
        provider: 'anthropic',
        model: 'claude-3-haiku-20240307',
        language: 'en',
      },
      created_at: new Date().toISOString(),
    }

    actions.VORION_CREATE_CONVERSATION?.start({
      payload: {
        title,
        system_prompt: ACTION_ITEM_SYSTEM_PROMPT,
        extra_metadata: JSON.stringify(metadata),
      },
      onAfterHandle: (data) => {
        if (data && typeof data === 'object' && 'id' in data) {
          store.setConversationId((data as VorionConversationResponse).id)
        }
        store.setCreatingConversation(false)
      },
      onErrorHandle: (error) => {
        console.error('Failed to create internal conversation:', error)
        toast.error('Failed to initialize action item extractor')
        store.setCreatingConversation(false)
      },
    })
  }, [store.conversationId, store.isCreatingConversation])

  const extractActionItems = useCallback(() => {
    const fullText = store.transcript
    const convId = store.conversationId
    const config = store.llmConfig
    const lastCharIdx = store.lastProcessedCharIndex
    const newText = fullText.slice(lastCharIdx)

    console.log('[ActionExtractor] Check:', {
      convId,
      fullLength: fullText.length,
      lastCharIdx,
      newLength: newText.length,
      processing: processingRef.current,
    })

    if (!convId) {
      console.log('[ActionExtractor] No conversation ID yet')
      return
    }
    if (processingRef.current) {
      console.log('[ActionExtractor] Already processing')
      return
    }
    if (!fullText) {
      console.log('[ActionExtractor] No transcript text yet')
      return
    }

    if (newText.trim().length < MIN_CHARS_PER_CALL) {
      console.log('[ActionExtractor] Not enough new text yet:', newText.length)
      return
    }

    console.log(
      '[ActionExtractor] Starting extraction on chars',
      lastCharIdx,
      'to',
      fullText.length
    )

    processingRef.current = true
    store.setExtractingActions(true)

    const previousItems = store.actionItems
    const previousSummary = previousItems
      .map((item) => `- ${item.owner}: ${item.action} (status: ${item.status})`)
      .join('\n')

    const userMessage =
      `You are receiving an incremental chunk of a meeting transcript.\n\n` +
      `FULL TRANSCRIPT SO FAR (truncated to latest part):\n"""\n${fullText.slice(-4000)}\n"""\n\n` +
      `NEWLY ADDED TEXT SINCE LAST CALL:\n"""\n${newText}\n"""\n\n` +
      `EXISTING ACTION ITEMS (for context, may be empty):\n${previousSummary || 'None yet.'}\n\n` +
      `From the NEWLY ADDED TEXT, extract any NEW action items or refinements, following the system instructions.`

    const requestData: VorionPredictionRequest = {
      conversation_id: convId,
      prompt: { text: userMessage },
      llm_name: config?.provider || 'anthropic',
      llm_group_name: config?.model || 'claude-3-haiku-20240307',
      language: config?.language || 'en',
    }

    // Show toast when starting extraction
    toast.info('Analyzing latest part of the conversation...', { duration: 2000 })

    // Use async generator to stream the response
    const runExtraction = async () => {
      try {
        let fullResponse = ''

        for await (const streamChunk of streamVorionPrediction(requestData)) {
          if (streamChunk.chunk) {
            fullResponse += streamChunk.chunk
          }
          if (streamChunk.is_final) {
            console.log('[ActionExtractor] Stream complete, response length:', fullResponse.length)
          }
        }

        console.log('[ActionExtractor] Full response:', fullResponse.substring(0, 200))

        const items = parseActionItems(fullResponse, Date.now())
        if (items.length > 0) {
          store.addActionItems(items)
          toast.success(`Found ${items.length} action item(s)!`, { duration: 3000 })
        } else {
          toast.info('No action items found in this segment', { duration: 2000 })
        }

        store.setLastProcessedCharIndex(fullText.length)
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        toast.error(`Extraction failed: ${errorMsg}`, { duration: 5000 })
        console.error('[ActionExtractor] Extraction failed:', error)
      } finally {
        processingRef.current = false
        store.setExtractingActions(false)
      }
    }

    void runExtraction()
  }, [store.transcript, store.lastProcessedCharIndex, store.conversationId, store.llmConfig])

  // Trigger extraction when enough new characters accumulate
  useEffect(() => {
    const newChars = store.transcript.length - store.lastProcessedCharIndex

    console.log('[ActionExtractor] Debounce effect:', {
      isRecording: store.isRecording,
      confirmedLength: store.transcript.length,
      lastCharIdx: store.lastProcessedCharIndex,
      newChars,
    })

    if (!store.isRecording) {
      console.log('[ActionExtractor] Not recording, skip')
      return
    }
    if (!store.transcript) {
      console.log('[ActionExtractor] No transcript yet, skip')
      return
    }
    if (newChars < MIN_CHARS_PER_CALL) {
      console.log('[ActionExtractor] Not enough new chars yet:', newChars)
      return
    }

    console.log('[ActionExtractor] Scheduling extraction in 2s...')

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      console.log('[ActionExtractor] Debounce timer fired, calling extractActionItems')
      extractActionItems()
    }, 2000) // Shorter debounce since we're already waiting for char threshold

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [store.transcript.length, store.isRecording, store.lastProcessedCharIndex, extractActionItems])

  const pendingCount = store.actionItems.filter((i) => i.status === 'pending').length
  const completedCount = store.actionItems.filter((i) => i.status === 'completed').length

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'h-8 w-8 rounded-lg flex items-center justify-center',
              'bg-gradient-to-br from-amber-500/20 to-orange-500/20',
              'border border-amber-500/20'
            )}
          >
            <LuZap className="h-4 w-4 text-amber-500 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-zinc-900 dark:text-white/90">Action Items</h3>
            <p className="text-[11px] text-zinc-500 dark:text-white/40">
              Auto-extracted from transcript
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {store.isExtractingActions && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              <LuLoader className="h-3 w-3 text-amber-500 animate-spin" />
              <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                Extracting...
              </span>
            </div>
          )}

          {store.actionItems.length > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10">
              <span className="text-[10px] font-medium text-zinc-600 dark:text-white/60">
                {pendingCount} pending
              </span>
              {completedCount > 0 && (
                <>
                  <span className="text-zinc-300 dark:text-white/20">•</span>
                  <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                    {completedCount} done
                  </span>
                </>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
          >
            {isExpanded ? (
              <LuChevronUp className="h-4 w-4 text-zinc-400" />
            ) : (
              <LuChevronDown className="h-4 w-4 text-zinc-400" />
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {store.actionItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <div className="h-12 w-12 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-center mb-4">
                <LuSparkles className="h-5 w-5 text-zinc-400 dark:text-white/30" />
              </div>
              <p className="text-sm text-zinc-600 dark:text-white/50 mb-1">
                {store.isRecording ? 'Listening for action items...' : 'No action items yet'}
              </p>
              <p className="text-xs text-zinc-500 dark:text-white/30 max-w-[240px]">
                {store.isRecording
                  ? 'Action items will be automatically extracted as people discuss tasks and assignments'
                  : 'Start recording to enable automatic action item extraction'}
              </p>
            </div>
          ) : (
            store.actionItems.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'group relative rounded-xl border p-3 transition-all',
                  item.status === 'completed'
                    ? 'bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20 opacity-60'
                    : 'bg-white dark:bg-white/[0.02] border-zinc-200 dark:border-white/[0.06] hover:border-zinc-300 dark:hover:border-white/10'
                )}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => store.toggleActionItemStatus(item.id)}
                    className={cn(
                      'flex-shrink-0 h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all mt-0.5',
                      item.status === 'completed'
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-zinc-300 dark:border-white/20 hover:border-emerald-500 dark:hover:border-emerald-400'
                    )}
                  >
                    {item.status === 'completed' && <LuCheck className="h-3 w-3" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        'text-sm text-zinc-800 dark:text-white/80 leading-relaxed',
                        item.status === 'completed' && 'line-through'
                      )}
                    >
                      {item.action}
                    </p>

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-white/5">
                        <LuUser className="h-3 w-3 text-zinc-400" />
                        <span className="text-[10px] text-zinc-600 dark:text-white/60">
                          {item.owner}
                        </span>
                      </div>

                      <div
                        className={cn(
                          'px-1.5 py-0.5 rounded border text-[10px] font-medium capitalize',
                          getPriorityColor(item.priority)
                        )}
                      >
                        {item.priority}
                      </div>

                      {item.dueDate && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-white/5">
                          <LuClock className="h-3 w-3 text-zinc-400" />
                          <span className="text-[10px] text-zinc-600 dark:text-white/60">
                            {item.dueDate}
                          </span>
                        </div>
                      )}
                    </div>

                    {item.sourceSnippet && (
                      <p className="mt-2 text-[11px] text-zinc-400 dark:text-white/30 italic line-clamp-2">
                        "{item.sourceSnippet}"
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <div className="flex-shrink-0 px-4 py-2 border-t border-zinc-200 dark:border-white/[0.06] bg-zinc-50 dark:bg-white/[0.01]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-zinc-400 dark:text-white/30">
            Model: {store.llmConfig?.provider || 'anthropic'}/
            {store.llmConfig?.model || 'claude-3-haiku-20240307'}
          </span>
          <span className="text-[10px] text-zinc-400 dark:text-white/30">
            Language: {store.llmConfig?.language || 'en'}
          </span>
        </div>
      </div>
    </div>
  )
}
