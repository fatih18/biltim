'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  LuBot,
  LuBrain,
  LuCheck,
  LuChevronDown,
  LuClock,
  LuCopy,
  LuDatabase,
  LuInfo,
  LuRefreshCw,
  LuTerminal,
  LuTriangleAlert,
  LuUser,
  LuZap,
} from 'react-icons/lu'
import type { AttachedFile, ChatMessage } from '@/app/_store/vorionChatStore'
import { cn } from '@/app/_utils'
import { MobileModal } from '../MobileModal'

// ============================================================================
// Attached Files Gallery
// ============================================================================

function AttachedFilesGallery({ files }: { files: AttachedFile[] }) {
  const images = files.filter((f) => f.type.startsWith('image/') && f.previewUrl)
  const otherFiles = files.filter((f) => !f.type.startsWith('image/') || !f.previewUrl)

  if (images.length === 0 && otherFiles.length === 0) return null

  return (
    <div className="mb-3">
      {/* Image Grid */}
      {images.length > 0 && (
        <div
          className={cn(
            'grid gap-2',
            images.length === 1 ? 'grid-cols-1 max-w-[280px]' : 'grid-cols-2 max-w-[400px]'
          )}
        >
          {images.map((img, idx) => (
            <div
              key={`${img.name}-${idx}`}
              className={cn(
                'relative group overflow-hidden rounded-xl',
                'bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900',
                'border border-zinc-200/50 dark:border-white/10',
                'shadow-sm hover:shadow-lg transition-all duration-300',
                images.length === 1 ? 'aspect-auto' : 'aspect-square'
              )}
            >
              {img.previewUrl && (
                <Image
                  src={img.previewUrl}
                  alt={img.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 300px"
                  className={cn(
                    'w-full h-full',
                    images.length === 1 ? 'object-contain max-h-[300px]' : 'object-cover',
                    'transition-transform duration-300 group-hover:scale-105'
                  )}
                />
              )}
              {/* Overlay with filename on hover */}
              <div
                className={cn(
                  'absolute inset-x-0 bottom-0 p-2',
                  'bg-gradient-to-t from-black/60 to-transparent',
                  'opacity-0 group-hover:opacity-100 transition-opacity duration-200'
                )}
              >
                <p className="text-[10px] text-white/90 truncate font-medium">{img.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Other files (non-image) - Beautiful document cards */}
      {otherFiles.length > 0 && (
        <div className={cn('flex flex-wrap gap-2', images.length > 0 && 'mt-3')}>
          {otherFiles.map((file, idx) => {
            // Determine file type and styling
            const ext = file.name.split('.').pop()?.toLowerCase() || ''
            const isPDF = ext === 'pdf'
            const isDoc = ['doc', 'docx'].includes(ext)
            const isExcel = ['xls', 'xlsx', 'csv'].includes(ext)
            const isText = ['txt', 'md', 'json', 'xml'].includes(ext)

            const typeConfig = isPDF
              ? {
                  icon: '📄',
                  gradient: 'from-red-500 to-rose-600',
                  bgGradient: 'from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30',
                  border: 'border-red-200/50 dark:border-red-500/20',
                  text: 'text-red-700 dark:text-red-400',
                  label: 'PDF',
                }
              : isDoc
                ? {
                    icon: '📝',
                    gradient: 'from-blue-500 to-indigo-600',
                    bgGradient:
                      'from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30',
                    border: 'border-blue-200/50 dark:border-blue-500/20',
                    text: 'text-blue-700 dark:text-blue-400',
                    label: ext.toUpperCase(),
                  }
                : isExcel
                  ? {
                      icon: '📊',
                      gradient: 'from-emerald-500 to-green-600',
                      bgGradient:
                        'from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30',
                      border: 'border-emerald-200/50 dark:border-emerald-500/20',
                      text: 'text-emerald-700 dark:text-emerald-400',
                      label: ext.toUpperCase(),
                    }
                  : isText
                    ? {
                        icon: '📃',
                        gradient: 'from-amber-500 to-orange-600',
                        bgGradient:
                          'from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30',
                        border: 'border-amber-200/50 dark:border-amber-500/20',
                        text: 'text-amber-700 dark:text-amber-400',
                        label: ext.toUpperCase(),
                      }
                    : {
                        icon: '📁',
                        gradient: 'from-zinc-500 to-slate-600',
                        bgGradient:
                          'from-zinc-50 to-slate-50 dark:from-zinc-900/50 dark:to-slate-900/50',
                        border: 'border-zinc-200/50 dark:border-white/10',
                        text: 'text-zinc-700 dark:text-zinc-400',
                        label: ext.toUpperCase() || 'FILE',
                      }

            return (
              <div
                key={`${file.name}-${idx}`}
                className={cn(
                  'group relative flex items-center gap-3 px-4 py-3 rounded-xl',
                  'bg-gradient-to-br',
                  typeConfig.bgGradient,
                  'border',
                  typeConfig.border,
                  'transition-all duration-300',
                  'hover:shadow-md hover:scale-[1.02]'
                )}
              >
                {/* Icon with gradient background */}
                <div
                  className={cn(
                    'flex-shrink-0 w-10 h-10 rounded-lg',
                    'bg-gradient-to-br',
                    typeConfig.gradient,
                    'flex items-center justify-center',
                    'shadow-sm'
                  )}
                >
                  <span className="text-lg">{typeConfig.icon}</span>
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium truncate max-w-[180px]', typeConfig.text)}>
                    {file.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={cn(
                        'text-[10px] font-semibold px-1.5 py-0.5 rounded',
                        'bg-white/50 dark:bg-black/20',
                        typeConfig.text
                      )}
                    >
                      {typeConfig.label}
                    </span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {file.size < 1024 * 1024
                        ? `${(file.size / 1024).toFixed(0)} KB`
                        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Hooks
// ============================================================================

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}

// ====================================================================================
// Hooks - Buffered typewriter for streaming messages
// ============================================================================

interface TypewriterChar {
  char: string
  age: number // 0 = just added, increases each tick
}

function useBufferedTypewriter(content: string, isStreaming: boolean) {
  // Buffer = full content from backend
  // Displayed = what we show on screen (lags behind buffer)
  const [displayedLength, setDisplayedLength] = useState(0)
  const [chars, setChars] = useState<TypewriterChar[]>([])

  // When content changes, update our char array
  useEffect(() => {
    if (!content) {
      setChars([])
      setDisplayedLength(0)
      return
    }

    setChars((prev) => {
      // Build new array, preserving age for existing chars
      const newChars: TypewriterChar[] = []
      for (let i = 0; i < content.length; i++) {
        const existingChar = prev[i]
        const newChar = content[i] ?? ''
        if (existingChar && existingChar.char === newChar) {
          // Keep existing char with its age
          newChars.push(existingChar)
        } else {
          // New char, age = 0
          newChars.push({ char: newChar, age: 0 })
        }
      }
      return newChars
    })
  }, [content])

  // Constant-speed reveal: increment displayedLength towards content.length
  // Daha yağ gibi akması için yavaş ve smooth
  useEffect(() => {
    const intervalMs = 18 // tick interval (daha yavaş = daha smooth)
    const charsPerTick = 1 // 1 char per tick = ~55 chars/sec

    const interval = setInterval(() => {
      setDisplayedLength((prev) => {
        const target = chars.length
        if (prev >= target) return prev
        return Math.min(prev + charsPerTick, target)
      })

      // Age up all displayed chars (yavaş yaşlandır = daha uzun fade)
      setChars((prev) =>
        prev.map((c, i) => (i < displayedLength ? { ...c, age: Math.min(c.age + 0.5, 10) } : c))
      )
    }, intervalMs)

    return () => clearInterval(interval)
  }, [chars.length, displayedLength])

  // When streaming stops, quickly catch up to full content
  useEffect(() => {
    if (!isStreaming && displayedLength < chars.length) {
      // Catch up faster when streaming ends
      const catchUpInterval = setInterval(() => {
        setDisplayedLength((prev) => {
          if (prev >= chars.length) {
            clearInterval(catchUpInterval)
            return prev
          }
          return Math.min(prev + 3, chars.length)
        })
      }, 8)
      return () => clearInterval(catchUpInterval)
    }
    return undefined
  }, [isStreaming, chars.length, displayedLength])

  // Build display text and per-char opacity
  const displayChars = chars.slice(0, displayedLength)

  return { displayChars, isComplete: displayedLength >= chars.length }
}

// ============================================================================
// Types
// ============================================================================

interface MessageItemProps {
  message: ChatMessage
}

interface CodeBlockProps {
  code: string
  language?: string
}

// ============================================================================
// Syntax Highlighting (Basic)
// ============================================================================

const KEYWORDS = new Set([
  'const',
  'let',
  'var',
  'function',
  'return',
  'if',
  'else',
  'for',
  'while',
  'class',
  'extends',
  'import',
  'export',
  'from',
  'default',
  'async',
  'await',
  'try',
  'catch',
  'throw',
  'new',
  'this',
  'super',
  'static',
  'get',
  'set',
  'true',
  'false',
  'null',
  'undefined',
  'typeof',
  'instanceof',
  'in',
  'of',
  'def',
  'print',
  'self',
  'None',
  'True',
  'False',
  'elif',
  'lambda',
  'with',
  'as',
  'interface',
  'type',
  'enum',
  'implements',
  'extends',
  'readonly',
  'public',
  'private',
])

function highlightCode(code: string, _language?: string): React.ReactNode[] {
  const lines = code.split('\n')

  return lines.map((line, lineIdx) => {
    const tokens: React.ReactNode[] = []
    let currentPos = 0

    // Simple tokenizer
    const regex =
      /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\/\/.*|#.*|\b\d+\.?\d*\b|\b[a-zA-Z_]\w*\b|[{}()[\];,.:=<>+\-*/%!&|?])/g
    let match = regex.exec(line)

    while (match !== null) {
      // Add text before match
      if (match.index > currentPos) {
        tokens.push(
          <span key={`${lineIdx}-${currentPos}`}>{line.slice(currentPos, match.index)}</span>
        )
      }

      const token = match[0]
      let className = ''

      // String
      if (token.startsWith('"') || token.startsWith("'") || token.startsWith('`')) {
        className = 'text-emerald-600 dark:text-emerald-400'
      }
      // Comment
      else if (token.startsWith('//') || token.startsWith('#')) {
        className = 'text-zinc-400 dark:text-zinc-500 italic'
      }
      // Number
      else if (/^\d/.test(token)) {
        className = 'text-amber-600 dark:text-amber-400'
      }
      // Keyword
      else if (KEYWORDS.has(token)) {
        className = 'text-violet-600 dark:text-violet-400 font-medium'
      }
      // Function call (followed by parenthesis)
      else if (
        /^[a-zA-Z_]\w*$/.test(token) &&
        line
          .slice(match.index + token.length)
          .trimStart()
          .startsWith('(')
      ) {
        className = 'text-blue-600 dark:text-blue-400'
      }
      // Operators and punctuation
      else if (/^[{}()[\];,.:=<>+\-*/%!&|?]+$/.test(token)) {
        className = 'text-zinc-500 dark:text-zinc-400'
      }

      tokens.push(
        <span key={`${lineIdx}-${match.index}`} className={className}>
          {token}
        </span>
      )
      currentPos = match.index + token.length
      match = regex.exec(line)
    }

    // Add remaining text
    if (currentPos < line.length) {
      tokens.push(<span key={`${lineIdx}-end`}>{line.slice(currentPos)}</span>)
    }

    return (
      <div key={lineIdx} className="table-row">
        <span className="table-cell pr-4 text-right text-zinc-400 dark:text-zinc-600 select-none text-xs w-8">
          {lineIdx + 1}
        </span>
        <span className="table-cell">{tokens.length > 0 ? tokens : '\n'}</span>
      </div>
    )
  })
}

// ============================================================================
// Code Block Component
// ============================================================================

function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [code])

  const highlightedCode = useMemo(() => highlightCode(code, language), [code, language])

  return (
    <div className="relative group my-4 rounded-xl overflow-hidden border border-zinc-200/80 dark:border-white/10 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-zinc-100 to-zinc-50 dark:from-zinc-800 dark:to-zinc-800/80 border-b border-zinc-200/80 dark:border-white/10">
        <div className="flex items-center gap-2">
          <LuTerminal size={14} className="text-zinc-400 dark:text-zinc-500" />
          <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">
            {language || 'code'}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium',
            'transition-all duration-200',
            copied
              ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-zinc-200/50 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-500 dark:text-white/50'
          )}
        >
          {copied ? <LuCheck size={12} /> : <LuCopy size={12} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      {/* Code with syntax highlighting */}
      <div className="overflow-x-auto bg-zinc-50 dark:bg-zinc-900/80">
        <pre className="p-4 text-sm font-mono leading-relaxed">
          <code className="table text-zinc-800 dark:text-zinc-200">{highlightedCode}</code>
        </pre>
      </div>
    </div>
  )
}

// ============================================================================
// Markdown Renderer
// ============================================================================

function renderMarkdown(content: string): React.ReactNode[] {
  const elements: React.ReactNode[] = []

  // First, split by code blocks to handle them separately
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g
  let lastIndex = 0
  let match = codeBlockRegex.exec(content)

  while (match !== null) {
    // Process text before code block
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index)
      elements.push(...renderTextContent(textBefore, `pre-${lastIndex}`))
    }

    // Add code block
    const language = match[1] || undefined
    const code = match[2]?.trim() ?? ''
    elements.push(<CodeBlock key={`code-${match.index}`} code={code} language={language} />)

    lastIndex = match.index + match[0].length
    match = codeBlockRegex.exec(content)
  }

  // Process remaining text after last code block
  if (lastIndex < content.length) {
    const remainingText = content.slice(lastIndex)
    elements.push(...renderTextContent(remainingText, `post-${lastIndex}`))
  }

  return elements
}

function renderTextContent(text: string, keyPrefix: string): React.ReactNode[] {
  const elements: React.ReactNode[] = []
  const lines = text.split('\n')
  let listItems: { type: 'ul' | 'ol'; items: React.ReactNode[] } | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    const trimmedLine = line.trim()

    // Skip empty lines but close any open list
    if (!trimmedLine) {
      if (listItems) {
        elements.push(
          listItems.type === 'ul' ? (
            <ul
              key={`${keyPrefix}-list-${i}`}
              className="list-disc list-inside space-y-1 my-2 ml-1"
            >
              {listItems.items}
            </ul>
          ) : (
            <ol
              key={`${keyPrefix}-list-${i}`}
              className="list-decimal list-inside space-y-1 my-2 ml-1"
            >
              {listItems.items}
            </ol>
          )
        )
        listItems = null
      }
      continue
    }

    // Horizontal rule
    if (/^(-{3,}|_{3,}|\*{3,})$/.test(trimmedLine)) {
      if (listItems) {
        elements.push(
          listItems.type === 'ul' ? (
            <ul
              key={`${keyPrefix}-list-${i}`}
              className="list-disc list-inside space-y-1 my-2 ml-1"
            >
              {listItems.items}
            </ul>
          ) : (
            <ol
              key={`${keyPrefix}-list-${i}`}
              className="list-decimal list-inside space-y-1 my-2 ml-1"
            >
              {listItems.items}
            </ol>
          )
        )
        listItems = null
      }
      elements.push(
        <hr key={`${keyPrefix}-hr-${i}`} className="my-4 border-zinc-200 dark:border-white/10" />
      )
      continue
    }

    // Headings
    const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      if (listItems) {
        elements.push(
          listItems.type === 'ul' ? (
            <ul
              key={`${keyPrefix}-list-${i}`}
              className="list-disc list-inside space-y-1 my-2 ml-1"
            >
              {listItems.items}
            </ul>
          ) : (
            <ol
              key={`${keyPrefix}-list-${i}`}
              className="list-decimal list-inside space-y-1 my-2 ml-1"
            >
              {listItems.items}
            </ol>
          )
        )
        listItems = null
      }
      const level = headingMatch[1]?.length ?? 1
      const headingText = headingMatch[2] ?? ''
      const key = `${keyPrefix}-h-${i}`
      const content = renderInlineMarkdown(headingText)

      switch (level) {
        case 1:
          elements.push(
            <h1 key={key} className="text-2xl font-bold mt-6 mb-3">
              {content}
            </h1>
          )
          break
        case 2:
          elements.push(
            <h2 key={key} className="text-xl font-bold mt-5 mb-2">
              {content}
            </h2>
          )
          break
        case 3:
          elements.push(
            <h3 key={key} className="text-lg font-semibold mt-4 mb-2">
              {content}
            </h3>
          )
          break
        case 4:
          elements.push(
            <h4 key={key} className="text-base font-semibold mt-3 mb-1">
              {content}
            </h4>
          )
          break
        case 5:
          elements.push(
            <h5 key={key} className="text-sm font-semibold mt-2 mb-1">
              {content}
            </h5>
          )
          break
        default:
          elements.push(
            <h6 key={key} className="text-sm font-medium mt-2 mb-1">
              {content}
            </h6>
          )
      }
      continue
    }

    // Unordered list items (-, *, +)
    const ulMatch = trimmedLine.match(/^[-*+]\s+(.+)$/)
    if (ulMatch) {
      if (!listItems || listItems.type !== 'ul') {
        if (listItems) {
          elements.push(
            <ol
              key={`${keyPrefix}-list-${i}`}
              className="list-decimal list-inside space-y-1 my-2 ml-1"
            >
              {listItems.items}
            </ol>
          )
        }
        listItems = { type: 'ul', items: [] }
      }
      listItems.items.push(
        <li key={`${keyPrefix}-li-${i}`} className="text-zinc-700 dark:text-zinc-300">
          {renderInlineMarkdown(ulMatch[1] ?? '')}
        </li>
      )
      continue
    }

    // Ordered list items (1., 2., etc)
    const olMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/)
    if (olMatch) {
      if (!listItems || listItems.type !== 'ol') {
        if (listItems) {
          elements.push(
            <ul
              key={`${keyPrefix}-list-${i}`}
              className="list-disc list-inside space-y-1 my-2 ml-1"
            >
              {listItems.items}
            </ul>
          )
        }
        listItems = { type: 'ol', items: [] }
      }
      listItems.items.push(
        <li key={`${keyPrefix}-li-${i}`} className="text-zinc-700 dark:text-zinc-300">
          {renderInlineMarkdown(olMatch[2] ?? '')}
        </li>
      )
      continue
    }

    // Regular paragraph
    if (listItems) {
      elements.push(
        listItems.type === 'ul' ? (
          <ul key={`${keyPrefix}-list-${i}`} className="list-disc list-inside space-y-1 my-2 ml-1">
            {listItems.items}
          </ul>
        ) : (
          <ol
            key={`${keyPrefix}-list-${i}`}
            className="list-decimal list-inside space-y-1 my-2 ml-1"
          >
            {listItems.items}
          </ol>
        )
      )
      listItems = null
    }
    elements.push(
      <p key={`${keyPrefix}-p-${i}`} className="my-1.5">
        {renderInlineMarkdown(trimmedLine)}
      </p>
    )
  }

  // Close any remaining list
  if (listItems) {
    elements.push(
      listItems.type === 'ul' ? (
        <ul key={`${keyPrefix}-list-end`} className="list-disc list-inside space-y-1 my-2 ml-1">
          {listItems.items}
        </ul>
      ) : (
        <ol key={`${keyPrefix}-list-end`} className="list-decimal list-inside space-y-1 my-2 ml-1">
          {listItems.items}
        </ol>
      )
    )
  }

  return elements
}

function renderInlineMarkdown(text: string): React.ReactNode {
  // Process inline elements: code, bold, italic, links
  const result: React.ReactNode[] = []

  // Combined regex for inline elements
  const inlineRegex = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|_[^_]+_|\*[^*]+\*|\[([^\]]+)\]\(([^)]+)\))/g
  let lastIndex = 0
  let match = inlineRegex.exec(text)

  while (match !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index))
    }

    const token = match[0]

    // Inline code
    if (token.startsWith('`') && token.endsWith('`')) {
      result.push(
        <code
          key={`code-${match.index}`}
          className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-white/10 text-sm font-mono text-pink-600 dark:text-pink-400"
        >
          {token.slice(1, -1)}
        </code>
      )
    }
    // Bold: **text** or __text__
    else if (
      (token.startsWith('**') && token.endsWith('**')) ||
      (token.startsWith('__') && token.endsWith('__'))
    ) {
      result.push(
        <strong key={`bold-${match.index}`} className="font-semibold text-zinc-900 dark:text-white">
          {token.slice(2, -2)}
        </strong>
      )
    }
    // Italic: *text* or _text_
    else if (
      (token.startsWith('*') && token.endsWith('*')) ||
      (token.startsWith('_') && token.endsWith('_'))
    ) {
      result.push(
        <em key={`italic-${match.index}`} className="italic">
          {token.slice(1, -1)}
        </em>
      )
    }
    // Link: [text](url)
    else if (token.startsWith('[') && match[2] && match[3]) {
      result.push(
        <a
          key={`link-${match.index}`}
          href={match[3]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          {match[2]}
        </a>
      )
    } else {
      result.push(token)
    }

    lastIndex = match.index + match[0].length
    match = inlineRegex.exec(text)
  }

  // Add remaining text
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex))
  }

  return result.length === 1 ? result[0] : result
}

// ============================================================================
// Reasoning Section
// ============================================================================

function ReasoningSection({ reasoning }: { reasoning: string }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg w-full text-left',
          'bg-purple-50 dark:bg-purple-500/10',
          'border border-purple-200 dark:border-purple-500/20',
          'hover:bg-purple-100 dark:hover:bg-purple-500/20',
          'transition-colors duration-200'
        )}
      >
        <LuBrain size={16} className="text-purple-600 dark:text-purple-400" />
        <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Reasoning</span>
        <span className="text-xs text-purple-500 dark:text-purple-400 ml-auto">
          {isExpanded ? 'Hide' : 'Show'}
        </span>
      </button>
      {isExpanded && (
        <div className="mt-2 p-3 rounded-lg bg-purple-50/50 dark:bg-purple-500/5 border border-purple-100 dark:border-purple-500/10">
          <p className="text-sm text-purple-800 dark:text-purple-200 whitespace-pre-wrap">
            {reasoning}
          </p>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Copyable ID Component
// ============================================================================

function CopyableId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [id])

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 -mx-2 rounded-md w-full',
        'text-xs font-mono text-zinc-500 dark:text-white/50',
        'hover:bg-zinc-200/50 dark:hover:bg-white/5',
        'transition-all duration-200',
        copied && 'bg-emerald-100/50 dark:bg-emerald-500/10'
      )}
    >
      <span className="truncate">{id}</span>
      <span className="ml-auto flex-shrink-0">
        {copied ? (
          <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-medium">
            Copied!
          </span>
        ) : (
          <LuCopy size={10} className="text-zinc-400 dark:text-white/30" />
        )}
      </span>
    </button>
  )
}

// ============================================================================
// Message Metadata Content (Shared between desktop and mobile modal)
// ============================================================================

function MetadataContent({
  message,
  formatTokens,
  formatDuration,
}: {
  message: ChatMessage
  formatTokens: (n: number) => string
  formatDuration: (ms: number) => string
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Token Details */}
      {(message.inputTokens || message.outputTokens) && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-md bg-zinc-200/80 dark:bg-white/10 flex items-center justify-center">
              <LuDatabase size={12} className="text-zinc-500 dark:text-white/50" />
            </div>
            <span className="text-xs font-semibold text-zinc-600 dark:text-white/60 uppercase tracking-wide">
              Tokens
            </span>
          </div>
          <div className="space-y-1 pl-0.5">
            {message.inputTokens && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 dark:text-white/40">Input</span>
                <span className="font-mono text-zinc-600 dark:text-white/70">
                  {formatTokens(message.inputTokens)}
                </span>
              </div>
            )}
            {message.outputTokens && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 dark:text-white/40">Output</span>
                <span className="font-mono text-zinc-600 dark:text-white/70">
                  {formatTokens(message.outputTokens)}
                </span>
              </div>
            )}
            {message.totalTokens && (
              <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-200/50 dark:border-white/5">
                <span className="text-zinc-500 dark:text-white/50 font-medium">Total</span>
                <span className="font-mono font-semibold text-zinc-700 dark:text-white/80">
                  {formatTokens(message.totalTokens)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cache Info */}
      {(message.cacheReadTokens || message.cacheCreationTokens) && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
              <LuDatabase size={12} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-xs font-semibold text-zinc-600 dark:text-white/60 uppercase tracking-wide">
              Cache
            </span>
          </div>
          <div className="space-y-1 pl-0.5">
            {message.cacheReadTokens && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-600/70 dark:text-emerald-400/70">Read</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  {formatTokens(message.cacheReadTokens)}
                </span>
              </div>
            )}
            {message.cacheCreationTokens && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-blue-600/70 dark:text-blue-400/70">Created</span>
                <span className="font-mono text-blue-600 dark:text-blue-400">
                  {formatTokens(message.cacheCreationTokens)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Timing */}
      {message.processingDurationMs && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-md bg-zinc-200/80 dark:bg-white/10 flex items-center justify-center">
              <LuClock size={12} className="text-zinc-500 dark:text-white/50" />
            </div>
            <span className="text-xs font-semibold text-zinc-600 dark:text-white/60 uppercase tracking-wide">
              Timing
            </span>
          </div>
          <div className="space-y-1 pl-0.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 dark:text-white/40">Duration</span>
              <span className="font-mono text-zinc-600 dark:text-white/70">
                {formatDuration(message.processingDurationMs)}
              </span>
            </div>
            {message.outputTokens && message.processingDurationMs > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 dark:text-white/40">Speed</span>
                <span className="font-mono text-zinc-500 dark:text-white/50">
                  {((message.outputTokens / message.processingDurationMs) * 1000).toFixed(1)} tok/s
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info Column */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-md bg-zinc-200/80 dark:bg-white/10 flex items-center justify-center">
            <LuZap size={12} className="text-zinc-500 dark:text-white/50" />
          </div>
          <span className="text-xs font-semibold text-zinc-600 dark:text-white/60 uppercase tracking-wide">
            Info
          </span>
        </div>
        <div className="space-y-1 pl-0.5">
          {(message.stopReason || message.finishReason) && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 dark:text-white/40">Finish</span>
              <span className="font-mono text-zinc-600 dark:text-white/70">
                {message.finishReason || message.stopReason}
              </span>
            </div>
          )}
          {message.createdAt && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 dark:text-white/40">Time</span>
              <span className="font-mono text-zinc-500 dark:text-white/50">
                {new Date(message.createdAt).toLocaleString('tr-TR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Model Info */}
      <div className="space-y-2 col-span-2">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-md bg-violet-100 dark:bg-violet-500/10 flex items-center justify-center">
            <LuZap size={12} className="text-violet-600 dark:text-violet-400" />
          </div>
          <span className="text-xs font-semibold text-zinc-600 dark:text-white/60 uppercase tracking-wide">
            Model
          </span>
        </div>
        <div className="text-sm font-medium text-zinc-700 dark:text-white/80">
          {message.modelName || 'Unknown'}
        </div>
        <div className="text-xs text-zinc-500 dark:text-white/50 capitalize">
          {message.modelProvider || 'AI'}
        </div>
      </div>

      {/* Message ID - Copyable */}
      <div className="space-y-2 col-span-2">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-md bg-zinc-200/80 dark:bg-white/10 flex items-center justify-center">
            <LuCopy size={12} className="text-zinc-500 dark:text-white/50" />
          </div>
          <span className="text-xs font-semibold text-zinc-600 dark:text-white/60 uppercase tracking-wide">
            Message ID
          </span>
        </div>
        <CopyableId id={message.id} />
      </div>
    </div>
  )
}

// ============================================================================
// Message Metadata Component
// ============================================================================

function MessageMetadata({ message }: { message: ChatMessage }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false)
  const isMobile = useIsMobile()

  const hasMetadata =
    message.modelName ||
    message.totalTokens ||
    message.processingDurationMs ||
    message.cacheReadTokens

  if (!hasMetadata) return null

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`
    return tokens.toString()
  }

  // Mobile: Show compact button that opens modal
  if (isMobile) {
    return (
      <div className="mt-3 pt-2 border-t border-zinc-100 dark:border-white/5">
        <button
          type="button"
          onClick={() => setIsMobileModalOpen(true)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 w-full rounded-lg',
            'bg-zinc-100/80 dark:bg-white/5',
            'text-xs text-zinc-600 dark:text-white/60',
            'active:bg-zinc-200 dark:active:bg-white/10',
            'transition-colors'
          )}
        >
          <LuInfo size={14} className="text-zinc-400 dark:text-white/40" />
          <span className="font-medium">{message.modelName || 'AI'}</span>
          <span className="text-zinc-400 dark:text-white/30">•</span>
          {message.totalTokens && (
            <span className="tabular-nums">{formatTokens(message.totalTokens)} tokens</span>
          )}
          <LuChevronDown size={14} className="ml-auto text-zinc-400 dark:text-white/30" />
        </button>

        <MobileModal
          isOpen={isMobileModalOpen}
          onClose={() => setIsMobileModalOpen(false)}
          title="Message Details"
        >
          <MetadataContent
            message={message}
            formatTokens={formatTokens}
            formatDuration={formatDuration}
          />
        </MobileModal>
      </div>
    )
  }

  // Desktop: Expandable inline section
  return (
    <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-white/5">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'group flex items-center gap-2 px-3 py-2 -mx-3 rounded-lg',
          'text-xs text-zinc-500 dark:text-white/50',
          'hover:bg-zinc-100/80 dark:hover:bg-white/5',
          'transition-all duration-200'
        )}
      >
        <div className="flex items-center justify-center w-5 h-5 rounded-md bg-zinc-100 dark:bg-white/10 group-hover:bg-zinc-200 dark:group-hover:bg-white/15 transition-colors">
          <LuZap size={10} className="text-zinc-400 dark:text-white/40" />
        </div>
        <span className="font-semibold text-zinc-700 dark:text-white/70">
          {message.modelName || 'Unknown'}
        </span>
        <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-white/20" />
        <span className="capitalize text-zinc-500 dark:text-white/50">
          {message.modelProvider || 'AI'}
        </span>
        {message.totalTokens && (
          <>
            <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-white/20" />
            <span className="tabular-nums">{formatTokens(message.totalTokens)} tokens</span>
          </>
        )}
        {message.processingDurationMs && (
          <>
            <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-white/20" />
            <span className="tabular-nums">{formatDuration(message.processingDurationMs)}</span>
          </>
        )}
        <LuChevronDown
          size={12}
          className={cn(
            'ml-auto text-zinc-400 dark:text-white/30 transition-transform duration-300',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {isExpanded && (
        <div className="mt-3 p-4 rounded-xl bg-gradient-to-br from-zinc-50 to-zinc-100/50 dark:from-white/5 dark:to-white/[0.02] border border-zinc-200/60 dark:border-white/10">
          <div className="grid grid-cols-4 gap-4">
            {/* Token Details */}
            {(message.inputTokens || message.outputTokens) && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-md bg-zinc-200/80 dark:bg-white/10 flex items-center justify-center">
                    <LuDatabase size={12} className="text-zinc-500 dark:text-white/50" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-600 dark:text-white/60 uppercase tracking-wide">
                    Tokens
                  </span>
                </div>
                <div className="space-y-1 pl-0.5">
                  {message.inputTokens && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400 dark:text-white/40">Input</span>
                      <span className="font-mono text-zinc-600 dark:text-white/70">
                        {formatTokens(message.inputTokens)}
                      </span>
                    </div>
                  )}
                  {message.outputTokens && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400 dark:text-white/40">Output</span>
                      <span className="font-mono text-zinc-600 dark:text-white/70">
                        {formatTokens(message.outputTokens)}
                      </span>
                    </div>
                  )}
                  {message.totalTokens && (
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-200/50 dark:border-white/5">
                      <span className="text-zinc-500 dark:text-white/50 font-medium">Total</span>
                      <span className="font-mono font-semibold text-zinc-700 dark:text-white/80">
                        {formatTokens(message.totalTokens)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cache Info */}
            {(message.cacheReadTokens || message.cacheCreationTokens) && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
                    <LuDatabase size={12} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-600 dark:text-white/60 uppercase tracking-wide">
                    Cache
                  </span>
                </div>
                <div className="space-y-1 pl-0.5">
                  {message.cacheReadTokens && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-emerald-600/70 dark:text-emerald-400/70">Read</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400">
                        {formatTokens(message.cacheReadTokens)}
                      </span>
                    </div>
                  )}
                  {message.cacheCreationTokens && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-blue-600/70 dark:text-blue-400/70">Created</span>
                      <span className="font-mono text-blue-600 dark:text-blue-400">
                        {formatTokens(message.cacheCreationTokens)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Timing */}
            {message.processingDurationMs && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-md bg-zinc-200/80 dark:bg-white/10 flex items-center justify-center">
                    <LuClock size={12} className="text-zinc-500 dark:text-white/50" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-600 dark:text-white/60 uppercase tracking-wide">
                    Timing
                  </span>
                </div>
                <div className="space-y-1 pl-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 dark:text-white/40">Duration</span>
                    <span className="font-mono text-zinc-600 dark:text-white/70">
                      {formatDuration(message.processingDurationMs)}
                    </span>
                  </div>
                  {message.outputTokens && message.processingDurationMs > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400 dark:text-white/40">Speed</span>
                      <span className="font-mono text-zinc-500 dark:text-white/50">
                        {((message.outputTokens / message.processingDurationMs) * 1000).toFixed(1)}{' '}
                        tok/s
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Info Column */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-md bg-zinc-200/80 dark:bg-white/10 flex items-center justify-center">
                  <LuZap size={12} className="text-zinc-500 dark:text-white/50" />
                </div>
                <span className="text-xs font-semibold text-zinc-600 dark:text-white/60 uppercase tracking-wide">
                  Info
                </span>
              </div>
              <div className="space-y-1 pl-0.5">
                {(message.stopReason || message.finishReason) && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 dark:text-white/40">Finish</span>
                    <span className="font-mono text-zinc-600 dark:text-white/70">
                      {message.finishReason || message.stopReason}
                    </span>
                  </div>
                )}
                {message.createdAt && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 dark:text-white/40">Time</span>
                    <span className="font-mono text-zinc-500 dark:text-white/50">
                      {new Date(message.createdAt).toLocaleString('tr-TR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Message ID - Copyable */}
            <div className="space-y-2 col-span-4">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-md bg-zinc-200/80 dark:bg-white/10 flex items-center justify-center">
                  <LuCopy size={12} className="text-zinc-500 dark:text-white/50" />
                </div>
                <span className="text-xs font-semibold text-zinc-600 dark:text-white/60 uppercase tracking-wide">
                  Message ID
                </span>
              </div>
              <CopyableId id={message.id} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function MessageItem({ message, onRetry }: MessageItemProps & { onRetry?: () => void }) {
  const isUser = message.role === 'user'
  const isStreaming = message.isStreaming
  const isError = message.isError

  // Use buffered typewriter ONLY for currently streaming assistant messages
  const isCurrentlyStreaming = !isUser && Boolean(isStreaming)
  const { displayChars, isComplete } = useBufferedTypewriter(
    isCurrentlyStreaming ? message.content || '' : '',
    isCurrentlyStreaming
  )

  // Show typewriter only while streaming, otherwise show markdown
  const shouldUseTypewriter = isCurrentlyStreaming && !isComplete
  const contentForRender = shouldUseTypewriter ? '' : message.content || ''

  const renderedContent = useMemo(() => {
    if (!contentForRender) return null
    return renderMarkdown(contentForRender)
  }, [contentForRender])

  // Error state
  if (isError) {
    return (
      <div
        className={cn('group relative', 'animate-in fade-in slide-in-from-bottom-2 duration-300')}
      >
        <div className="flex gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50">
          {/* Error Icon */}
          <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/50 dark:to-red-800/50 text-red-600 dark:text-red-400">
            <LuTriangleAlert className="w-3 h-3 sm:w-4 sm:h-4" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 sm:mb-2">
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
                Error
              </span>
            </div>

            <div className="text-[13px] sm:text-sm text-red-700 dark:text-red-300">
              <p className="font-medium mb-1">Failed to generate response</p>
              <p className="text-red-600/80 dark:text-red-400/80 text-[11px] sm:text-xs">
                {message.errorMessage || 'An unexpected error occurred. Please try again.'}
              </p>
            </div>

            {/* Retry Button */}
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-2 sm:mt-3 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
              >
                <LuRefreshCw className="w-3 h-3" />
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('group relative', 'animate-in fade-in slide-in-from-bottom-2 duration-300')}>
      {/* Message Container */}
      <div
        className={cn(
          // Mobile: compact, no gap for avatar
          'p-3 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl',
          'transition-all duration-200',
          isUser
            ? [
                'bg-gradient-to-br from-[#c68e76]/8 to-[#c68e76]/4',
                'dark:from-[#c68e76]/15 dark:to-[#c68e76]/5',
                'border border-[#c68e76]/10 dark:border-[#c68e76]/20',
                // Mobile: minimal left margin, Desktop: more margin
                'ml-4 sm:ml-12 md:ml-16',
              ]
            : [
                'bg-white dark:bg-zinc-900/50',
                'border border-zinc-200/60 dark:border-white/5',
                'shadow-sm hover:shadow-md dark:shadow-none',
              ]
        )}
      >
        {/* Mobile: Inline header with small icon */}
        <div className="flex items-start gap-2 sm:gap-3">
          {/* Avatar - Hidden on mobile for assistant, small for user */}
          <div
            className={cn(
              'flex-shrink-0 rounded-lg sm:rounded-xl flex items-center justify-center',
              'transition-transform duration-200 group-hover:scale-105',
              // Mobile: smaller, Desktop: normal size
              'w-6 h-6 sm:w-8 sm:h-8 md:w-9 md:h-9',
              isUser
                ? 'bg-gradient-to-br from-[#c68e76] to-[#a67560] text-white shadow-sm shadow-[#c68e76]/20'
                : 'bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-700 dark:to-zinc-800 text-zinc-600 dark:text-white/70 shadow-sm'
            )}
          >
            {isUser ? (
              <LuUser className="w-3 h-3 sm:w-4 sm:h-4" />
            ) : (
              <LuBot className="w-3 h-3 sm:w-4 sm:h-4" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Role Label */}
            <div className="flex items-center gap-2 mb-1 sm:mb-2">
              <span
                className={cn(
                  'text-[10px] sm:text-xs font-semibold uppercase tracking-wider',
                  isUser ? 'text-[#c68e76] dark:text-[#c68e76]' : 'text-zinc-500 dark:text-white/50'
                )}
              >
                {isUser ? 'You' : 'Assistant'}
              </span>
              {isStreaming && (
                <span className="flex items-center gap-1 text-[10px] sm:text-xs text-zinc-400 dark:text-white/40">
                  <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="hidden sm:inline">Generating...</span>
                </span>
              )}
            </div>

            {/* Attached Files (for user messages) */}
            {isUser && message.attachedFiles && message.attachedFiles.length > 0 && (
              <AttachedFilesGallery files={message.attachedFiles} />
            )}

            {/* Reasoning (if present) */}
            {message.reasoning && <ReasoningSection reasoning={message.reasoning} />}

            {/* Main Content */}
            <div
              className={cn(
                // Mobile: smaller text
                'text-[13px] sm:text-sm md:text-[15px] leading-relaxed',
                'prose prose-zinc dark:prose-invert prose-sm max-w-none',
                'prose-p:my-1.5 sm:prose-p:my-2',
                'prose-headings:font-semibold prose-headings:mt-3 sm:prose-headings:mt-4 prose-headings:mb-1.5 sm:prose-headings:mb-2',
                'prose-ul:my-1.5 sm:prose-ul:my-2 prose-ol:my-1.5 sm:prose-ol:my-2 prose-li:my-0.5',
                'prose-strong:font-semibold prose-strong:text-zinc-800 dark:prose-strong:text-white',
                isUser ? 'text-zinc-700 dark:text-zinc-200' : 'text-zinc-700 dark:text-zinc-300'
              )}
            >
              {shouldUseTypewriter
                ? (() => {
                    // Tamamlanan satırlar markdown, son satır typewriter
                    const displayText = displayChars.map((c) => c.char).join('')
                    const lastNewlineIdx = displayText.lastIndexOf('\n')

                    if (lastNewlineIdx === -1) {
                      // Henüz satır tamamlanmadı, sadece typewriter
                      return (
                        <p className="whitespace-pre-wrap">
                          {displayChars.map((c, i) => (
                            <span
                              key={i}
                              style={{
                                opacity: Math.min(1, 0.15 + c.age * 0.12),
                                transition: 'opacity 180ms ease-out',
                              }}
                            >
                              {c.char}
                            </span>
                          ))}
                        </p>
                      )
                    }

                    // Tamamlanan satırlar (markdown) + son satır (typewriter)
                    const completedText = displayText.slice(0, lastNewlineIdx + 1)
                    const currentLineChars = displayChars.slice(lastNewlineIdx + 1)

                    return (
                      <>
                        {renderMarkdown(completedText)}
                        {currentLineChars.length > 0 && (
                          <p className="whitespace-pre-wrap my-0">
                            {currentLineChars.map((c, i) => (
                              <span
                                key={i}
                                style={{
                                  opacity: Math.min(1, 0.15 + c.age * 0.12),
                                  transition: 'opacity 180ms ease-out',
                                }}
                              >
                                {c.char}
                              </span>
                            ))}
                          </p>
                        )}
                      </>
                    )
                  })()
                : renderedContent}
            </div>

            {/* Metadata (for assistant messages) */}
            {!isUser && !isStreaming && <MessageMetadata message={message} />}
          </div>
        </div>
      </div>
    </div>
  )
}
