'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LuCalendar,
  LuChevronDown,
  LuChevronUp,
  LuCircleAlert,
  LuCircleCheck,
  LuCircleX,
  LuExternalLink,
  LuGitBranch,
  LuLoader,
  LuMail,
  LuPaperclip,
  LuReply,
  LuSend,
  LuUsers,
  LuVideo,
  LuX,
} from 'react-icons/lu'
import { cn } from '@/app/_utils'
import type {
  ConversationThread,
  OutlookMessage,
  SendMailAttachment,
  SendMailRecipient,
} from './types'

// Detect special email types
type EmailType =
  | { type: 'meeting'; meetingType: 'invite' | 'update' | 'cancel' | 'response' }
  | { type: 'undeliverable' }
  | { type: 'devops'; status: 'succeeded' | 'failed' | 'other' }
  | { type: 'normal' }

function detectEmailType(subject: string, bodyPreview: string): EmailType {
  const subjectLower = subject.toLowerCase()
  const bodyLower = bodyPreview.toLowerCase()

  // Check for undeliverable/bounce messages
  const isUndeliverable =
    subjectLower.includes('undeliverable') ||
    subjectLower.includes('teslim edilemez') ||
    subjectLower.includes('delivery failed') ||
    subjectLower.includes('delivery status') ||
    subjectLower.includes('mail delivery') ||
    bodyLower.includes('teslim edilemedi') ||
    bodyLower.includes('could not be delivered') ||
    bodyLower.includes('delivery has failed')

  if (isUndeliverable) {
    return { type: 'undeliverable' }
  }

  // Check for Azure DevOps / CI-CD notifications
  const isDevOps =
    subjectLower.includes('[build succeeded]') ||
    subjectLower.includes('[build failed]') ||
    subjectLower.includes('[build canceled]') ||
    subjectLower.includes('[release') ||
    subjectLower.includes('[pull request') ||
    (bodyLower.includes('azure devops') && bodyLower.includes('build #')) ||
    (bodyLower.includes('pipeline') && bodyLower.includes('ran for'))

  if (isDevOps) {
    const status = subjectLower.includes('succeeded')
      ? 'succeeded'
      : subjectLower.includes('failed')
        ? 'failed'
        : 'other'
    return { type: 'devops', status }
  }

  // Check for Teams meeting
  const teamsMeeting = detectTeamsMeeting(subjectLower, bodyLower)
  if (teamsMeeting.isTeamsMeeting) {
    return { type: 'meeting', meetingType: teamsMeeting.meetingType }
  }

  return { type: 'normal' }
}

function detectTeamsMeeting(
  subjectLower: string,
  bodyLower: string
): {
  isTeamsMeeting: boolean
  meetingType: 'invite' | 'update' | 'cancel' | 'response'
} {
  // Check for Teams meeting patterns (English + Turkish)
  const hasTeamsLink =
    bodyLower.includes('teams.microsoft.com') ||
    bodyLower.includes('join microsoft teams') ||
    bodyLower.includes('microsoft teams toplantısı')
  const hasTeamsSubject =
    subjectLower.includes('teams meeting') ||
    subjectLower.includes('microsoft teams') ||
    subjectLower.includes('join a meeting')
  const hasMeetingKeywords =
    bodyLower.includes('join on your computer') ||
    bodyLower.includes('meeting id:') ||
    bodyLower.includes('click here to join') ||
    // Turkish patterns
    bodyLower.includes('bilgisayarınızda veya mobil') ||
    bodyLower.includes('toplantıya katılmak için') ||
    bodyLower.includes('toplantı kimliği:') ||
    bodyLower.includes('geçiş kodu:') ||
    bodyLower.includes('buraya tıklayın')

  const isTeamsMeeting = hasTeamsLink || hasTeamsSubject || hasMeetingKeywords

  if (!isTeamsMeeting) {
    return { isTeamsMeeting: false, meetingType: 'invite' }
  }

  // Detect meeting type
  let meetingType: 'invite' | 'update' | 'cancel' | 'response' = 'invite'

  if (subjectLower.includes('canceled') || subjectLower.includes('cancelled')) {
    meetingType = 'cancel'
  } else if (subjectLower.includes('updated') || subjectLower.includes('changed')) {
    meetingType = 'update'
  } else if (
    subjectLower.includes('accepted') ||
    subjectLower.includes('declined') ||
    subjectLower.includes('tentative')
  ) {
    meetingType = 'response'
  }

  return { isTeamsMeeting, meetingType }
}

// Parse email body to extract main content vs signature/headers
function parseEmailContent(bodyPreview: string) {
  const lines = bodyPreview.split('\n')
  const mainContent: string[] = []
  const metadata: string[] = []

  let inMetadata = false
  let consecutiveShortLines = 0
  let lastLineWasEmpty = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    const trimmed = line.trim()

    // Detect divider lines - any line containing repeated horizontal rule characters
    // Include common ASCII and Unicode dash/box characters used by Outlook/Teams
    // Using regex literal to avoid escape issues with character class ranges
    const dividerRegex = /[_=\u2012\u2013\u2014\u2015\u2500\u2501\u2502\u2503-]{3,}/

    const isDividerLine =
      dividerRegex.test(trimmed) ||
      /^[_=\s-]{10,}$/.test(trimmed) ||
      // Line that is mostly underscores or dashes
      (trimmed.replace(/[^_=\-\u2500\u2501]/g, '').length >= 5 && trimmed.length < 120)

    // Detect signature start patterns
    const isSignatureStart =
      trimmed.startsWith('--') ||
      trimmed.toLowerCase().startsWith('sent from') ||
      trimmed.toLowerCase().startsWith('get outlook') ||
      trimmed.match(
        /^(regards|best|thanks|cheers|sincerely|saygılarımla|iyi çalışmalar|selamlar),?\.?$/i
      )

    // Detect job titles (often after name in signatures)
    const isJobTitle = trimmed.match(
      /^(senior|junior|lead|chief|head|manager|director|engineer|developer|analyst|consultant|specialist|coordinator|account|ceo|cto|cfo|coo|vp|executive)/i
    )

    // Detect company patterns
    const isCompanyLine =
      trimmed.match(/^(rise|microsoft|google|amazon|apple|meta|ibm|oracle|sap)/i) ||
      trimmed.match(/(ltd|inc|corp|llc|gmbh|a\.ş\.|technology|consulting|software|& co)\.?$/i)

    // Detect phone/email patterns in signature
    const isContactInfo =
      trimmed.match(/^\+?[\d\s\-()]{7,}$/) || // Phone
      trimmed.match(/^[\w.-]+@[\w.-]+\.[a-z]{2,}$/i) // Email

    // Track short lines after empty line (signature pattern)
    if (trimmed === '') {
      lastLineWasEmpty = true
      consecutiveShortLines = 0
    } else if (lastLineWasEmpty && trimmed.length < 40 && trimmed.length > 0) {
      consecutiveShortLines++
      // After empty line, 2+ short lines likely signature
      if (consecutiveShortLines >= 2 && !inMetadata) {
        inMetadata = true
      }
    } else {
      lastLineWasEmpty = false
      consecutiveShortLines = 0
    }

    // Start metadata section
    if (isDividerLine || isSignatureStart) {
      inMetadata = true
    }

    // Detect header patterns (From:, To:, Subject:, Date:)
    if (trimmed.match(/^(from|to|cc|bcc|subject|date|sent|kimden|kime|konu|tarih):/i)) {
      inMetadata = true
    }

    // Job title or company after we're already in potential signature area
    if (inMetadata && (isJobTitle || isCompanyLine || isContactInfo)) {
      metadata.push(trimmed)
      continue
    }

    // Skip divider lines from display
    if (isDividerLine) {
      continue
    }

    if (inMetadata) {
      if (trimmed) metadata.push(trimmed)
    } else {
      mainContent.push(line)
    }
  }

  // Clean content - remove any remaining divider-like patterns
  let content = mainContent.join('\n').trim()
  // Regex literal with hyphen at end to avoid range issues
  const cleanupDividerRegex = /^[\s_=\u2012\u2013\u2014\u2015\u2500\u2501-]{3,}$/

  content = content
    .split('\n')
    .filter((line) => !cleanupDividerRegex.test(line.trim()))
    .join('\n')
    .trim()

  return {
    content: content || bodyPreview,
    metadata: metadata.join('\n').trim(),
    hasMetadata: metadata.length > 0,
  }
}

interface MessageBubbleProps {
  message: OutlookMessage
  isFirst: boolean
}

function MessageBubble({ message, isFirst }: MessageBubbleProps) {
  const [showDetails, setShowDetails] = useState(false)
  const bodyText =
    message.body && message.body.length > message.bodyPreview.length
      ? message.body
      : message.bodyPreview

  const parsed = parseEmailContent(bodyText)
  const emailType = detectEmailType(message.subject, bodyText)

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleOpenInOutlook = () => {
    if (message.webLink && typeof window !== 'undefined') {
      window.open(message.webLink, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className={cn('group max-w-[90%]', isFirst ? '' : 'mt-4')}>
      {/* Time stamp */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
          {formatDateTime(message.receivedDateTime)}
        </span>
        {!message.isRead && (
          <span className="text-[9px] font-medium text-zinc-900 dark:text-white px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-700 rounded">
            NEW
          </span>
        )}
      </div>

      {/* Message card */}
      <div
        className={cn(
          'rounded-lg',
          'transition-shadow duration-200',
          'hover:shadow-sm',
          emailType.type === 'meeting'
            ? 'bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50'
            : emailType.type === 'undeliverable'
              ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50'
              : emailType.type === 'devops'
                ? emailType.status === 'succeeded'
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50'
                  : emailType.status === 'failed'
                    ? 'bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/50'
                    : 'bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/50'
                : 'bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800'
        )}
      >
        {/* Type Badge */}
        {emailType.type === 'meeting' && (
          <div className="px-4 py-2 border-b border-indigo-200 dark:border-indigo-800/50 flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded bg-indigo-500 text-white">
              <LuVideo size={14} />
            </div>
            <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
              {emailType.meetingType === 'cancel'
                ? 'Meeting Cancelled'
                : emailType.meetingType === 'update'
                  ? 'Meeting Updated'
                  : emailType.meetingType === 'response'
                    ? 'Meeting Response'
                    : 'Teams Meeting'}
            </span>
          </div>
        )}

        {emailType.type === 'devops' && (
          <div
            className={cn(
              'px-4 py-2 border-b flex items-center gap-2',
              emailType.status === 'succeeded'
                ? 'border-emerald-200 dark:border-emerald-800/50'
                : emailType.status === 'failed'
                  ? 'border-orange-200 dark:border-orange-800/50'
                  : 'border-sky-200 dark:border-sky-800/50'
            )}
          >
            <div
              className={cn(
                'flex items-center justify-center w-6 h-6 rounded text-white',
                emailType.status === 'succeeded'
                  ? 'bg-emerald-500'
                  : emailType.status === 'failed'
                    ? 'bg-orange-500'
                    : 'bg-sky-500'
              )}
            >
              {emailType.status === 'succeeded' ? (
                <LuCircleCheck size={14} />
              ) : emailType.status === 'failed' ? (
                <LuCircleX size={14} />
              ) : (
                <LuGitBranch size={14} />
              )}
            </div>
            <span
              className={cn(
                'text-xs font-medium',
                emailType.status === 'succeeded'
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : emailType.status === 'failed'
                    ? 'text-orange-700 dark:text-orange-300'
                    : 'text-sky-700 dark:text-sky-300'
              )}
            >
              {emailType.status === 'succeeded'
                ? 'Build Succeeded'
                : emailType.status === 'failed'
                  ? 'Build Failed'
                  : 'Azure DevOps'}
            </span>
          </div>
        )}

        {emailType.type === 'undeliverable' && (
          <div className="px-4 py-2 border-b border-red-200 dark:border-red-800/50 flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded bg-red-500 text-white">
              <LuCircleAlert size={14} />
            </div>
            <span className="text-xs font-medium text-red-700 dark:text-red-300">
              Delivery Failed
            </span>
          </div>
        )}

        {/* Subject header */}
        <div
          className={cn(
            'px-4 py-2.5 flex items-start justify-between gap-3',
            emailType.type === 'meeting'
              ? 'border-b border-indigo-200 dark:border-indigo-800/50'
              : emailType.type === 'undeliverable'
                ? 'border-b border-red-200 dark:border-red-800/50'
                : 'border-b border-zinc-200 dark:border-zinc-800'
          )}
        >
          <div className="flex items-start gap-2">
            {emailType.type === 'meeting' && (
              <LuCalendar size={14} className="text-indigo-500 mt-0.5 flex-shrink-0" />
            )}
            {emailType.type === 'undeliverable' && (
              <LuCircleAlert size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
            )}
            <p
              className={cn(
                'text-sm font-medium leading-snug',
                emailType.type === 'meeting'
                  ? 'text-indigo-900 dark:text-indigo-100'
                  : emailType.type === 'undeliverable'
                    ? 'text-red-900 dark:text-red-100'
                    : 'text-zinc-900 dark:text-white'
              )}
            >
              {message.subject || '(No subject)'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenInOutlook}
            className={cn(
              'flex-shrink-0 p-1 rounded',
              'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200',
              'hover:bg-zinc-200 dark:hover:bg-zinc-700',
              'transition-all duration-150',
              'opacity-0 group-hover:opacity-100'
            )}
            title="Open in Outlook"
          >
            <LuExternalLink size={14} />
          </button>
        </div>

        {/* Main content */}
        <div className="px-4 py-3">
          {message.hasAttachments && message.attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {message.attachments.map((att) => (
                <div
                  key={att.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-[11px] text-zinc-700 dark:text-zinc-300 max-w-[220px]"
                >
                  <LuPaperclip size={12} className="flex-shrink-0" />
                  <span className="truncate">{att.name || 'Attachment'}</span>
                  {typeof att.size === 'number' && att.size > 0 && (
                    <span className="ml-1 text-[10px] text-zinc-400 dark:text-zinc-500 flex-shrink-0">
                      {Math.round(att.size / 1024) || 1} KB
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">
            {parsed.content || '(Empty message)'}
          </p>
        </div>

        {/* Collapsible metadata (signature, headers) */}
        {parsed.hasMetadata && (
          <div className="border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className={cn(
                'w-full px-4 py-2 flex items-center justify-between',
                'text-xs text-zinc-500 dark:text-zinc-400',
                'hover:bg-zinc-100 dark:hover:bg-zinc-800/50',
                'transition-colors duration-150'
              )}
            >
              <span>{showDetails ? 'Hide details' : 'Show signature & details'}</span>
              {showDetails ? <LuChevronUp size={14} /> : <LuChevronDown size={14} />}
            </button>

            {showDetails && (
              <div className="px-4 pb-3 pt-1">
                <pre className="text-xs text-zinc-400 dark:text-zinc-500 whitespace-pre-wrap font-mono leading-relaxed">
                  {parsed.metadata}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

type ReplyParams = {
  subject: string
  body: string
  to: SendMailRecipient[]
  cc?: SendMailRecipient[]
  mode: 'reply' | 'replyAll' | 'new'
  attachments?: SendMailAttachment[]
}

interface OutlookChatViewProps {
  thread: ConversationThread | null
  onLoadMore?: (senderEmail: string, currentCount: number) => void
  isLoadingMore?: boolean
  hasMore?: boolean
  onReply?: (params: ReplyParams) => void
  isReplying?: boolean
}

export function OutlookChatView({
  thread,
  onLoadMore,
  isLoadingMore = false,
  hasMore = true,
  onReply,
  isReplying = false,
}: OutlookChatViewProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const prevScrollHeightRef = useRef<number>(0)
  const [initialScrollDone, setInitialScrollDone] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [replyMode, setReplyMode] = useState<'reply' | 'replyAll'>('reply')
  const [replyTo, setReplyTo] = useState<SendMailRecipient[]>([])
  const [replyCc, setReplyCc] = useState<SendMailRecipient[]>([])
  const [replyAttachments, setReplyAttachments] = useState<SendMailAttachment[]>([])
  const [newRecipientEmail, setNewRecipientEmail] = useState('')
  const [showCcInput, setShowCcInput] = useState(false)
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Reset state when thread changes
  useEffect(() => {
    setInitialScrollDone(false)
    prevScrollHeightRef.current = 0
  }, [thread?.threadKey])

  // Scroll to bottom on initial load or thread change
  useEffect(() => {
    if (thread && scrollContainerRef.current && !initialScrollDone) {
      const container = scrollContainerRef.current
      // Small delay to ensure content is rendered
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight
        setInitialScrollDone(true)
      })
    }
  }, [thread?.threadKey, thread?.messages.length, initialScrollDone])

  // Maintain scroll position when new messages are prepended
  useEffect(() => {
    if (scrollContainerRef.current && prevScrollHeightRef.current > 0 && initialScrollDone) {
      const container = scrollContainerRef.current
      const newScrollHeight = container.scrollHeight
      const scrollDiff = newScrollHeight - prevScrollHeightRef.current
      if (scrollDiff > 0) {
        container.scrollTop = container.scrollTop + scrollDiff
      }
    }
  }, [thread?.messages.length, initialScrollDone])

  // Infinite scroll handler - load more when scrolling up near top
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || !thread || !onLoadMore || isLoadingMore || !hasMore) return

    const container = scrollContainerRef.current
    const scrollTop = container.scrollTop

    // When within 100px of the top, load more
    if (scrollTop < 100 && initialScrollDone) {
      prevScrollHeightRef.current = container.scrollHeight
      // Use first participant's address for loading more
      const firstParticipant = thread.participants[0]
      if (firstParticipant?.address) {
        onLoadMore(firstParticipant.address, thread.messages.length)
      }
    }
  }, [thread, onLoadMore, isLoadingMore, hasMore, initialScrollDone])

  if (!thread) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8 bg-zinc-50/50 dark:bg-zinc-900/50">
        <div className="w-16 h-16 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center mb-4 bg-white dark:bg-zinc-800">
          <LuMail className="h-7 w-7 text-zinc-400 dark:text-zinc-500" />
        </div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-1">
          Select a conversation
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs">
          Choose a conversation from the sidebar to view the email thread
        </p>
      </div>
    )
  }

  const getInitials = (name: string) => {
    const parts = name.split(' ').filter(Boolean)
    const first = parts[0]
    const second = parts[1]
    if (first && second && first.length > 0 && second.length > 0) {
      return (first.charAt(0) + second.charAt(0)).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  // Reverse to show oldest first (chat style) - oldest at top, newest at bottom
  const sortedMessages = [...thread.messages].sort(
    (a, b) => new Date(a.receivedDateTime).getTime() - new Date(b.receivedDateTime).getTime()
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className={cn(
          'flex items-center gap-3 px-6 py-3',
          'border-b border-zinc-200 dark:border-zinc-800',
          'bg-white dark:bg-zinc-950'
        )}
      >
        {thread.isGroup ? (
          <div className="w-10 h-10 rounded-md bg-zinc-600 dark:bg-zinc-400 flex items-center justify-center text-white dark:text-zinc-900">
            <LuUsers size={18} />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-md bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300 text-sm font-semibold">
            {getInitials(thread.threadName)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
            {thread.threadName}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
            {thread.isGroup
              ? `${thread.participants.length} participants`
              : thread.participants[0]?.address || ''}
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {thread.messages.length} email{thread.messages.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Messages with infinite scroll */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-6 bg-white dark:bg-zinc-950"
      >
        {/* Loading indicator at top */}
        {isLoadingMore && (
          <div className="flex items-center justify-center py-4 mb-4">
            <LuLoader className="h-4 w-4 text-zinc-400 animate-spin mr-2" />
            <span className="text-xs text-zinc-400">Loading older emails...</span>
          </div>
        )}

        {/* "Load more" hint at top */}
        {!isLoadingMore && hasMore && thread.messages.length >= 20 && (
          <div className="text-center py-2 mb-4">
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
              ↑ Scroll up for older emails
            </span>
          </div>
        )}

        {/* "No more" indicator */}
        {!hasMore && (
          <div className="text-center py-2 mb-4">
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
              Beginning of conversation
            </span>
          </div>
        )}

        <div className="max-w-2xl">
          {sortedMessages.map((msg, idx) => (
            <MessageBubble key={msg.id} message={msg} isFirst={idx === 0} />
          ))}
        </div>
      </div>

      {/* Collapsible Reply Composer */}
      {onReply && (
        <div className="border-t border-zinc-200/80 dark:border-zinc-800/80">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={async (e) => {
              const files = e.target.files
              if (!files) return
              const newAtts: SendMailAttachment[] = []
              for (const file of Array.from(files)) {
                const buffer = await file.arrayBuffer()
                const base64 = btoa(
                  new Uint8Array(buffer).reduce(
                    (data, byte) => data + String.fromCharCode(byte),
                    ''
                  )
                )
                newAtts.push({
                  name: file.name,
                  contentType: file.type || 'application/octet-stream',
                  contentBase64: base64,
                })
              }
              setReplyAttachments([...replyAttachments, ...newAtts])
              e.target.value = ''
            }}
          />

          {!isComposerOpen ? (
            /* Collapsed state - minimal reply bar */
            <div className="px-6 py-3 bg-zinc-50/80 dark:bg-zinc-900/80">
              <button
                type="button"
                onClick={() => {
                  setIsComposerOpen(true)
                  const lastMsg = sortedMessages[sortedMessages.length - 1]
                  if (lastMsg?.fromAddress && replyTo.length === 0) {
                    setReplyTo([{ address: lastMsg.fromAddress, name: lastMsg.from }])
                  }
                  setTimeout(() => textareaRef.current?.focus(), 100)
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all group"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <LuReply size={14} className="text-white" />
                </div>
                <span className="text-sm text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
                  Click to reply...
                </span>
              </button>
            </div>
          ) : (
            /* Expanded composer - full width */
            <div className="bg-white dark:bg-zinc-900">
              {/* Composer header */}
              <div className="px-6 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Reply mode toggle */}
                  <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                    <button
                      type="button"
                      onClick={() => {
                        setReplyMode('reply')
                        const lastMsg = sortedMessages[sortedMessages.length - 1]
                        if (lastMsg?.fromAddress) {
                          setReplyTo([{ address: lastMsg.fromAddress, name: lastMsg.from }])
                          setReplyCc([])
                        }
                      }}
                      className={cn(
                        'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                        replyMode === 'reply'
                          ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                          : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                      )}
                    >
                      Reply
                    </button>
                    {thread.isGroup && (
                      <button
                        type="button"
                        onClick={() => {
                          setReplyMode('replyAll')
                          const lastMsg = sortedMessages[sortedMessages.length - 1]
                          if (lastMsg) {
                            const to: SendMailRecipient[] = []
                            const cc: SendMailRecipient[] = []
                            if (lastMsg.fromAddress) {
                              to.push({ address: lastMsg.fromAddress, name: lastMsg.from })
                            }
                            for (const r of lastMsg.toRecipients) {
                              if (r.address) cc.push({ address: r.address, name: r.name })
                            }
                            for (const r of lastMsg.ccRecipients) {
                              if (r.address) cc.push({ address: r.address, name: r.name })
                            }
                            setReplyTo(to)
                            setReplyCc(cc)
                          }
                        }}
                        className={cn(
                          'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                          replyMode === 'replyAll'
                            ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                            : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                        )}
                      >
                        Reply All
                      </button>
                    )}
                  </div>

                  {/* Recipients inline */}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-zinc-400 dark:text-zinc-500">to</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {replyTo.slice(0, 2).map((r) => (
                        <span
                          key={`to-${r.address}`}
                          className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium"
                        >
                          {r.name || r.address}
                        </span>
                      ))}
                      {replyTo.length > 2 && (
                        <span className="text-xs text-zinc-400">+{replyTo.length - 2} more</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Close button */}
                <button
                  type="button"
                  onClick={() => setIsComposerOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <LuChevronDown size={18} />
                </button>
              </div>

              {/* Recipients expansion area */}
              <div className="px-6 py-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase w-6">To</span>
                  <div className="flex-1 flex flex-wrap items-center gap-1.5">
                    {replyTo.map((r, idx) => (
                      <span
                        key={`to-chip-${r.address}`}
                        className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-xs text-blue-700 dark:text-blue-300"
                      >
                        {r.name || r.address}
                        <button
                          type="button"
                          onClick={() => setReplyTo(replyTo.filter((_, i) => i !== idx))}
                          className="p-0.5 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800"
                        >
                          <LuX size={10} />
                        </button>
                      </span>
                    ))}
                    <input
                      type="email"
                      placeholder="Add..."
                      value={newRecipientEmail}
                      onChange={(e) => setNewRecipientEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newRecipientEmail.includes('@')) {
                          e.preventDefault()
                          setReplyTo([...replyTo, { address: newRecipientEmail.trim() }])
                          setNewRecipientEmail('')
                        }
                      }}
                      className="flex-1 min-w-[80px] px-1 py-0.5 text-sm bg-transparent outline-none text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400"
                    />
                  </div>
                  {!showCcInput && (
                    <button
                      type="button"
                      onClick={() => setShowCcInput(true)}
                      className="text-[11px] font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    >
                      +Cc
                    </button>
                  )}
                </div>
                {showCcInput && (
                  <div className="flex items-center gap-3 mt-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-700/40">
                    <span className="text-[11px] font-semibold text-zinc-400 uppercase w-6">
                      Cc
                    </span>
                    <div className="flex-1 flex flex-wrap items-center gap-1.5">
                      {replyCc.map((r, idx) => (
                        <span
                          key={`cc-chip-${r.address}`}
                          className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-xs text-zinc-600 dark:text-zinc-300"
                        >
                          {r.name || r.address}
                          <button
                            type="button"
                            onClick={() => setReplyCc(replyCc.filter((_, i) => i !== idx))}
                            className="p-0.5 rounded-full hover:bg-zinc-300 dark:hover:bg-zinc-600"
                          >
                            <LuX size={10} />
                          </button>
                        </span>
                      ))}
                      <input
                        type="email"
                        placeholder="Add CC..."
                        onKeyDown={(e) => {
                          const target = e.target as HTMLInputElement
                          if (e.key === 'Enter' && target.value.includes('@')) {
                            e.preventDefault()
                            setReplyCc([...replyCc, { address: target.value.trim() }])
                            target.value = ''
                          }
                        }}
                        className="flex-1 min-w-[80px] px-1 py-0.5 text-sm bg-transparent outline-none text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Editor area */}
              <div className="px-6 py-4">
                <textarea
                  ref={textareaRef}
                  value={replyText}
                  onChange={(e) => {
                    setReplyText(e.target.value)
                    // Auto-resize
                    e.target.style.height = 'auto'
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 300)}px`
                  }}
                  placeholder="Write your message..."
                  className={cn(
                    'w-full min-h-[120px] max-h-[300px]',
                    'bg-transparent border-none',
                    'text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200',
                    'placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
                    'focus:outline-none',
                    'resize-none'
                  )}
                />
              </div>

              {/* Attachments */}
              {replyAttachments.length > 0 && (
                <div className="px-6 py-2 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="flex flex-wrap items-center gap-2">
                    {replyAttachments.map((att, idx) => (
                      <span
                        key={`att-${att.name}-${idx}`}
                        className="inline-flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-700/40 text-xs"
                      >
                        <LuPaperclip size={12} className="text-amber-600 dark:text-amber-400" />
                        <span className="max-w-[120px] truncate text-zinc-700 dark:text-zinc-300">
                          {att.name}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setReplyAttachments(replyAttachments.filter((_, i) => i !== idx))
                          }
                          className="p-0.5 rounded hover:bg-amber-100 dark:hover:bg-amber-800/40"
                        >
                          <LuX size={12} className="text-zinc-400" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer toolbar */}
              <div className="px-6 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                    title="Attach files"
                  >
                    <LuPaperclip size={18} />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-zinc-400">
                    {replyTo.length > 0 &&
                      `${replyTo.length} recipient${replyTo.length > 1 ? 's' : ''}`}
                    {replyCc.length > 0 && ` + ${replyCc.length} CC`}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const lastMsg = sortedMessages[sortedMessages.length - 1]
                      if (lastMsg && replyText.trim() && replyTo.length > 0) {
                        onReply({
                          subject: `Re: ${lastMsg.subject}`,
                          body: replyText.trim(),
                          to: replyTo,
                          cc: replyCc.length > 0 ? replyCc : undefined,
                          mode: replyMode,
                          attachments: replyAttachments.length > 0 ? replyAttachments : undefined,
                        })
                        setReplyText('')
                        setReplyAttachments([])
                        setIsComposerOpen(false)
                      }
                    }}
                    disabled={!replyText.trim() || replyTo.length === 0 || isReplying}
                    className={cn(
                      'px-5 py-2 rounded-lg text-sm font-semibold transition-all',
                      'inline-flex items-center gap-2',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      !replyText.trim() || replyTo.length === 0 || isReplying
                        ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md hover:shadow-lg'
                    )}
                  >
                    {isReplying ? (
                      <>
                        <LuLoader size={14} className="animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <LuSend size={14} />
                        Send
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
