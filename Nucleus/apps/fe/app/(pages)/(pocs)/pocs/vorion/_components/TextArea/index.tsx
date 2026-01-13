'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BiChevronDown } from 'react-icons/bi'
import { FaArrowUp, FaMicrophoneAlt, FaTools } from 'react-icons/fa'
import { GiArchiveResearch, GiDuration, GiFeather } from 'react-icons/gi'
import { IoMdGlobe } from 'react-icons/io'
import { LuFile, LuPaperclip, LuX } from 'react-icons/lu'
import {
  PiDetectiveFill,
  PiMicrosoftOutlookLogo,
  PiUsersThreeFill,
  PiWaveform,
} from 'react-icons/pi'
import { SlFolderAlt } from 'react-icons/sl'
import { TfiPlus } from 'react-icons/tfi'
import { VscSettings } from 'react-icons/vsc'
import { toast } from 'sonner'
import { useTextAreaStore, useVorionChatStore } from '@/app/_store'
import { cn } from '@/app/_utils'
import { applySpeechTriggers, useSpeechToText } from '../../_hooks'
import { TEXTAREA_CONFIG } from '../constants'
import { OutlookClient } from '../OutlookClient'
import { PanelA } from './PanelA'
import { PanelB } from './PanelB'
import { PanelC } from './PanelC'

// ============================================================================
// Types
// ============================================================================

interface ToolbarButtonProps {
  isActive?: boolean
  onClick?: () => void
  label: string
  children: React.ReactNode
  className?: string
}

interface SelectedTagProps {
  icon: React.ReactNode
  label: string
  onRemove: () => void
}

// ============================================================================
// Sub-Components
// ============================================================================

function ToolbarButton({ isActive, onClick, label, children, className }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={isActive}
      className={cn(
        'flex-shrink-0 size-7 sm:size-8 flex items-center justify-center',
        'rounded-lg border transition-all duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50',
        {
          'border-blue-400/60 text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10':
            isActive,
          'border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-white/40': !isActive,
          'hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-zinc-700 dark:hover:text-white/70':
            !isActive,
        },
        className
      )}
    >
      {children}
    </button>
  )
}

// ============================================================================
// Attached Files Preview (inline in textarea)
// ============================================================================

function FilePreviewThumbnail({
  file,
  index,
  onRemove,
  onPreview,
}: {
  file: File
  index: number
  onRemove: (index: number) => void
  onPreview?: (index: number) => void
}) {
  const [preview, setPreview] = useState<string | null>(null)
  const isImage = file.type.startsWith('image/')

  useEffect(() => {
    if (isImage) {
      const reader = new FileReader()
      reader.onload = () => setPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }, [file, isImage])

  return (
    <div className="relative p-1 group">
      {/* Remove button - positioned outside overflow container */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onRemove(index)
        }}
        className={cn(
          'absolute -top-0.5 -right-0.5 z-10 p-1 rounded-full',
          'bg-red-500 text-white shadow-md',
          'opacity-0 group-hover:opacity-100',
          'hover:bg-red-600 transition-all duration-200',
          'hover:scale-110'
        )}
      >
        <LuX size={10} />
      </button>

      <button
        type="button"
        className={cn(
          'relative w-14 h-14 rounded-xl overflow-hidden',
          'bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900',
          'border border-zinc-200/50 dark:border-white/10',
          'transition-all duration-200',
          'hover:scale-105 hover:shadow-lg hover:shadow-violet-500/10',
          'animate-in fade-in zoom-in-95 duration-200'
        )}
        onClick={() => {
          onPreview?.(index)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onPreview?.(index)
          }
        }}
      >
        {isImage && preview ? (
          <Image src={preview} alt={file.name} fill sizes="56px" className="object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-1">
            <LuFile size={16} className="text-zinc-400 dark:text-white/40" />
            <p className="text-[7px] text-zinc-500 dark:text-white/40 mt-0.5 truncate max-w-full">
              {file.name.split('.').pop()?.toUpperCase()}
            </p>
          </div>
        )}

        {/* Filename overlay */}
        <div
          className={cn(
            'absolute inset-x-0 bottom-0 p-1',
            'bg-gradient-to-t from-black/70 to-transparent',
            'opacity-0 group-hover:opacity-100 transition-opacity'
          )}
        >
          <p className="text-[7px] text-white truncate">{file.name}</p>
        </div>
      </button>
    </div>
  )
}

function FilePreviewModalContent({ file }: { file: File }) {
  const [preview, setPreview] = useState<string | null>(null)
  const mime = (file.type || '').toLowerCase()
  const isImage = mime.startsWith('image/')
  const isVideo = mime.startsWith('video/') || file.name.toLowerCase().endsWith('.webm')
  const isAudio = mime.startsWith('audio/')

  useEffect(() => {
    if (isImage) {
      const reader = new FileReader()
      reader.onload = () => setPreview(reader.result as string)
      reader.readAsDataURL(file)
      return undefined
    }

    if (isVideo || isAudio) {
      const url = URL.createObjectURL(file)
      setPreview(url)

      return () => {
        URL.revokeObjectURL(url)
      }
    }

    return undefined
  }, [file, isAudio, isImage, isVideo])

  const label = file.name

  return (
    <div className="flex flex-col gap-3">
      <div className="text-sm font-medium text-zinc-100 truncate" title={label}>
        {label}
      </div>
      <div className="relative w-full max-h-[60vh] flex items-center justify-center rounded-xl bg-zinc-900 overflow-hidden">
        {isImage && preview ? (
          <Image src={preview} alt={file.name} fill sizes="512px" className="object-contain" />
        ) : isVideo && preview ? (
          <video src={preview} controls className="w-full h-full max-h-[60vh] bg-black">
            <track kind="captions" label="No captions" />
          </video>
        ) : isAudio && preview ? (
          <div className="w-full flex flex-col items-center justify-center p-4 bg-zinc-900">
            <audio src={preview} controls className="w-full">
              <track kind="captions" label="No captions" />
            </audio>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4">
            <LuFile size={32} className="text-zinc-400" />
            <p className="mt-2 text-xs text-zinc-400">No preview available</p>
          </div>
        )}
      </div>
    </div>
  )
}

function AttachedFilesPreview({
  files,
  onRemove,
  onAddMore,
  onPreview,
}: {
  files: File[]
  onRemove: (index: number) => void
  onAddMore: () => void
  onPreview: (index: number) => void
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2',
        'border-t border-zinc-100 dark:border-white/5',
        'bg-zinc-50/30 dark:bg-black/10',
        'overflow-x-auto scrollbar-none'
      )}
    >
      {files.map((file, index) => (
        <FilePreviewThumbnail
          key={`${file.name}-${index}`}
          file={file}
          index={index}
          onRemove={onRemove}
          onPreview={onPreview}
        />
      ))}

      {/* Add more button */}
      <button
        type="button"
        onClick={onAddMore}
        className={cn(
          'flex-shrink-0 w-16 h-16 rounded-xl',
          'border-2 border-dashed border-zinc-200 dark:border-white/10',
          'flex items-center justify-center',
          'text-zinc-400 dark:text-white/30',
          'hover:border-violet-300 dark:hover:border-violet-500/50',
          'hover:text-violet-500 dark:hover:text-violet-400',
          'hover:bg-violet-50 dark:hover:bg-violet-500/5',
          'transition-all duration-200'
        )}
      >
        <TfiPlus size={16} />
      </button>
    </div>
  )
}

function SelectedTag({ icon, label, onRemove }: SelectedTagProps) {
  return (
    <div
      className={cn(
        'hidden sm:flex items-center gap-1.5 px-2 py-1',
        'rounded-lg border border-blue-400/40 dark:border-blue-400/60',
        'bg-blue-50 dark:bg-blue-500/10',
        'text-blue-600 dark:text-blue-400',
        'text-xs font-medium',
        'animate-in fade-in slide-in-from-left-2 duration-200'
      )}
    >
      {icon}
      <span className="max-w-[80px] truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="ml-0.5 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
      >
        <LuX size={12} />
      </button>
    </div>
  )
}

// ============================================================================
// Types (Component Props)
// ============================================================================

interface TextAreaProps {
  onSubmit?: (message: string) => void
}

// ============================================================================
// Main Component
// ============================================================================

export function TextArea({ onSubmit }: TextAreaProps) {
  const store = useTextAreaStore()
  const chatStore = useVorionChatStore()
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)

  // Map model names to display names
  const modelDisplayNames = useMemo(() => {
    const map: Record<string, string> = {}
    const apiLLMs = chatStore.availableLLMs
    if (apiLLMs?.providers) {
      for (const models of Object.values(apiLLMs.providers)) {
        for (const m of models) {
          map[m.model_name] = m.display_name
        }
      }
    }
    return map
  }, [chatStore.availableLLMs])

  // Get display name for selected model (capitalized)
  const selectedModelDisplay = useMemo(() => {
    const modelName = store.selectedModel?.[0]
    if (!modelName) return 'Model'
    const displayName = modelDisplayNames[modelName] || modelName
    // Capitalize first letter
    return displayName.charAt(0).toUpperCase() + displayName.slice(1)
  }, [store.selectedModel, modelDisplayNames])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleSpeechResult = useCallback(
    (segment: string, isFinal: boolean) => {
      if (!isFinal) return
      if (!segment.trim()) return

      const updated = applySpeechTriggers(segment, store.textValue)
      store.textValue = updated
    },
    [store]
  )

  const handleSpeechError = useCallback((message: string) => {
    console.log('Speech recognition error:', message)
    toast.error('Voice input error', {
      description: message,
    })
  }, [])

  const {
    isSupported: isSpeechSupported,
    isListening: isVoiceListening,
    start: startVoice,
    stop: stopVoice,
  } = useSpeechToText({
    lang: 'en-US',
    continuous: true,
    interimResults: false,
    onResult: handleSpeechResult,
    onError: handleSpeechError,
  })

  // Panel toggle handlers
  const togglePanelA = useCallback(() => {
    store.isPanelBOpen = false
    store.isPanelCOpen = false
    store.isPanelAOpen = !store.isPanelAOpen
  }, [store])

  const toggleVoiceInput = useCallback(() => {
    if (!isSpeechSupported) {
      toast.error('Voice input is not supported in this browser.')
      return
    }

    if (isVoiceListening) {
      stopVoice()
    } else {
      startVoice()
    }
  }, [isSpeechSupported, isVoiceListening, startVoice, stopVoice])

  const togglePanelB = useCallback(() => {
    store.isPanelAOpen = false
    store.isPanelCOpen = false
    store.isPanelBOpen = !store.isPanelBOpen
  }, [store])

  const togglePanelC = useCallback(() => {
    store.isPanelAOpen = false
    store.isPanelBOpen = false
    store.isPanelCOpen = !store.isPanelCOpen
  }, [store])

  const closeAllPanels = useCallback(() => {
    store.isPanelAOpen = false
    store.isPanelBOpen = false
    store.isPanelCOpen = false
  }, [store])

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const isAnyPanelOpen = store.isPanelAOpen || store.isPanelBOpen || store.isPanelCOpen
      const target = event.target as Node

      if (isAnyPanelOpen && containerRef.current && !containerRef.current.contains(target)) {
        closeAllPanels()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [store.isPanelAOpen, store.isPanelBOpen, store.isPanelCOpen, closeAllPanels])

  // Text change handler
  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      store.textValue = e.target.value
    },
    [store]
  )

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const adjustHeight = () => {
      textarea.style.height = 'auto'
      const { lineHeight, minRows, maxRows } = TEXTAREA_CONFIG
      const minHeight = lineHeight * minRows
      const maxHeight = lineHeight * maxRows
      const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight)
      textarea.style.height = `${newHeight}px`
    }

    adjustHeight()
  }, [store.textValue])

  // Submit handler
  const handleSubmit = useCallback(() => {
    const text = store.textValue.trim()
    if (!text) return

    closeAllPanels()
    onSubmit?.(text)
  }, [closeAllPanels, onSubmit, store.textValue])

  // Keyboard handler for Enter to submit
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  const hasActiveTools = Boolean(store.selectedTools && store.selectedTools.length > 0)

  return (
    <div ref={containerRef} className="w-full relative z-20">
      {/* Container */}
      <div
        className={cn(
          'w-full rounded-xl sm:rounded-2xl overflow-hidden flex flex-col',
          'bg-white dark:bg-zinc-900',
          'border border-zinc-200 dark:border-white/10',
          'shadow-lg shadow-zinc-200/50 dark:shadow-black/20',
          'transition-shadow duration-300',
          'focus-within:shadow-xl focus-within:shadow-zinc-300/50 dark:focus-within:shadow-black/30'
        )}
      >
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={store.textValue}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={TEXTAREA_CONFIG.placeholder}
          className={cn(
            'w-full resize-none p-3 sm:p-4',
            'text-sm sm:text-base leading-6',
            'bg-transparent',
            'text-zinc-900 dark:text-white',
            'placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
            'focus:outline-none',
            'transition-all duration-200'
          )}
          style={{
            minHeight: `${TEXTAREA_CONFIG.lineHeight * TEXTAREA_CONFIG.minRows}px`,
            maxHeight: `${TEXTAREA_CONFIG.lineHeight * TEXTAREA_CONFIG.maxRows}px`,
          }}
        />

        {/* Attached Files Preview */}
        {store.uploadedFiles && store.uploadedFiles.length > 0 && (
          <AttachedFilesPreview
            files={store.uploadedFiles}
            onRemove={(index) => {
              const newFiles = [...(store.uploadedFiles || [])]
              newFiles.splice(index, 1)
              store.uploadedFiles = newFiles.length > 0 ? newFiles : null
            }}
            onAddMore={() => {
              store.panelAState = 'upload'
              store.isPanelAOpen = true
            }}
            onPreview={(index) => {
              setPreviewIndex(index)
            }}
          />
        )}

        {/* Toolbar */}
        <div
          className={cn(
            'flex items-center gap-1 sm:gap-1.5 p-2 sm:p-3',
            'border-t border-zinc-100 dark:border-white/5',
            'bg-zinc-50/50 dark:bg-black/20',
            'overflow-x-auto scrollbar-none'
          )}
        >
          {/* Left: Panel Toggles */}
          <div className="flex items-center gap-1">
            {/* Add Files Panel */}
            <ToolbarButton isActive={store.isPanelAOpen} onClick={togglePanelA} label="Add files">
              <TfiPlus
                size={14}
                className={cn('transition-transform duration-300', {
                  'rotate-45': store.isPanelAOpen,
                })}
              />
            </ToolbarButton>

            {/* Settings Panel */}
            <ToolbarButton isActive={store.isPanelBOpen} onClick={togglePanelB} label="Settings">
              <VscSettings size={14} />
            </ToolbarButton>
          </div>

          {/* Separator */}
          <div className="w-px h-4 bg-zinc-200 dark:bg-white/10 mx-1 hidden sm:block" />

          {/* Feature Toggles */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              isActive={store.isAgenticMode}
              onClick={() => {
                store.isAgenticMode = !store.isAgenticMode
              }}
              label="Agentic mode"
            >
              <PiDetectiveFill size={14} />
            </ToolbarButton>

            <ToolbarButton
              isActive={store.isThinkingExtended}
              onClick={() => {
                store.isThinkingExtended = !store.isThinkingExtended
              }}
              label="Extended thinking"
            >
              <GiDuration size={14} />
            </ToolbarButton>

            <ToolbarButton
              isActive={store.isResearchMode}
              onClick={() => {
                store.isResearchMode = !store.isResearchMode
              }}
              label="Research mode"
              className="hidden sm:flex"
            >
              <GiArchiveResearch size={14} />
            </ToolbarButton>

            <ToolbarButton
              isActive={store.isWebSearchEnabled}
              onClick={() => {
                store.isWebSearchEnabled = !store.isWebSearchEnabled
              }}
              label="Web search"
            >
              <IoMdGlobe size={14} />
            </ToolbarButton>

            <ToolbarButton
              isActive={hasActiveTools}
              onClick={() => {
                store.panelBState = 'tools'
                togglePanelB()
              }}
              label="Tools"
              className="hidden sm:flex"
            >
              <FaTools size={12} />
            </ToolbarButton>

            {/* Screen recording indicator */}
            {store.isScreenRecording && (
              <button
                type="button"
                onClick={() => {
                  store.stopScreenRecordingCallback?.()
                }}
                className={cn(
                  'hidden sm:inline-flex items-center gap-1.5 px-2 py-1 rounded-full ml-1',
                  'border border-red-500/70 bg-red-500/10 text-red-500',
                  'text-[11px] font-medium',
                  'shadow-sm shadow-red-500/20',
                  'transition-all duration-200 hover:bg-red-500/20 hover:border-red-400',
                  'animate-pulse'
                )}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
                <span>Recording...</span>
                <span className="text-[10px] underline ml-0.5">Stop</span>
              </button>
            )}
          </div>

          {/* Selected Items */}
          {store.selectedProject && (
            <SelectedTag
              icon={<SlFolderAlt size={12} />}
              label={store.selectedProject}
              onRemove={() => {
                store.selectedProject = null
                store.selectedProjectSlug = null
              }}
            />
          )}

          {store.selectedStyle && (
            <SelectedTag
              icon={<GiFeather size={12} />}
              label={store.selectedStyle}
              onRemove={() => {
                store.selectedStyle = null
              }}
            />
          )}

          {/* Attached Files Indicator */}
          {store.uploadedFiles && store.uploadedFiles.length > 0 && (
            <div
              className={cn(
                'hidden sm:flex items-center gap-1.5 px-2 py-1',
                'rounded-lg border border-emerald-400/40 dark:border-emerald-400/60',
                'bg-emerald-50 dark:bg-emerald-500/10',
                'text-emerald-600 dark:text-emerald-400',
                'text-xs font-medium',
                'animate-in fade-in slide-in-from-left-2 duration-200'
              )}
            >
              <LuPaperclip size={12} />
              <span>
                {store.uploadedFiles.length} file{store.uploadedFiles.length > 1 ? 's' : ''}
              </span>
              <button
                type="button"
                onClick={() => {
                  store.uploadedFiles = null
                }}
                aria-label="Clear files"
                className="ml-0.5 hover:text-emerald-800 dark:hover:text-emerald-200 transition-colors"
              >
                <LuX size={12} />
              </button>
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1 min-w-2" />

          {/* Right Side Actions */}
          <div className="flex items-center gap-1">
            {/* Vorion Link */}
            <Link
              href="/low-code"
              className={cn(
                'hidden sm:flex size-8 items-center justify-center rounded-lg',
                'border border-zinc-200 dark:border-white/10',
                'hover:bg-zinc-100 dark:hover:bg-white/5',
                'transition-all duration-200'
              )}
              aria-label="Low-code builder"
            >
              <Image src="/vorion.png" alt="" width={16} height={16} />
            </Link>

            {/* Model Selector */}
            <button
              type="button"
              onClick={togglePanelC}
              className={cn(
                'flex items-center gap-1 px-2 py-1.5 rounded-lg',
                'text-xs font-medium',
                'bg-zinc-100 dark:bg-white/5',
                'text-zinc-700 dark:text-white/70',
                'hover:bg-zinc-200 dark:hover:bg-white/10',
                'transition-all duration-200'
              )}
            >
              <span className="max-w-[80px] sm:max-w-[120px] truncate">
                {store.isMultiModel ? 'Multi' : selectedModelDisplay}
              </span>
              <BiChevronDown size={16} />
            </button>

            {/* Multi Model Toggle */}
            <ToolbarButton
              isActive={store.isMultiModel}
              onClick={() => {
                store.isMultiModel = !store.isMultiModel
              }}
              label="Multi model"
              className="hidden sm:flex"
            >
              <PiUsersThreeFill size={14} />
            </ToolbarButton>

            <ToolbarButton
              isActive={store.isOutlookOverlayOpen}
              onClick={() => {
                store.isOutlookOverlayOpen = true
              }}
              label="Outlook"
              className="hidden sm:flex"
            >
              <PiMicrosoftOutlookLogo size={14} />
            </ToolbarButton>

            {/* Voice Input */}
            <ToolbarButton
              isActive={isVoiceListening}
              onClick={toggleVoiceInput}
              label="Voice input"
              className="hidden sm:flex"
            >
              <FaMicrophoneAlt size={12} />
            </ToolbarButton>

            {/* Waveform */}
            <ToolbarButton
              isActive={false}
              onClick={() => {}}
              label="Audio"
              className="hidden sm:flex"
            >
              <PiWaveform size={14} />
            </ToolbarButton>

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!store.textValue.trim()}
              aria-label="Send message"
              className={cn(
                'flex items-center justify-center size-7 sm:size-8 rounded-lg',
                'transition-all duration-200',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c68e76]/50',
                {
                  'bg-[#c68e76] hover:bg-[#b87d66] text-white shadow-md shadow-[#c68e76]/30':
                    store.textValue.trim(),
                  'bg-zinc-200 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-500 cursor-not-allowed':
                    !store.textValue.trim(),
                }
              )}
            >
              <FaArrowUp size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Attached file preview modal */}
      {store.uploadedFiles && previewIndex !== null && store.uploadedFiles[previewIndex] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="relative max-w-2xl w-[90vw] rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl p-4 sm:p-5">
            <button
              type="button"
              onClick={() => setPreviewIndex(null)}
              className="absolute top-3 right-3 inline-flex items-center justify-center rounded-full bg-zinc-800 text-zinc-200 hover:bg-zinc-700 p-1"
              aria-label="Close preview"
            >
              <LuX size={14} />
            </button>
            <FilePreviewModalContent file={store.uploadedFiles[previewIndex]} />
          </div>
        </div>
      )}

      {/* Panels */}
      <PanelA />
      <PanelB />
      <PanelC />

      {store.isOutlookOverlayOpen && <OutlookClient />}
    </div>
  )
}
