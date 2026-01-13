'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  HiArrowDownTray,
  HiClipboardDocument,
  HiDocumentText,
  HiMiniPlay,
  HiMiniStop,
  HiOutlineTrash,
} from 'react-icons/hi2'
import { LuBot, LuChevronDown } from 'react-icons/lu'
import { PiVideoCameraFill, PiWaveformBold } from 'react-icons/pi'
import { toast } from 'sonner'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'
import { useMeetingAnalyzerStore, useVorionChatStore } from '@/app/_store'
import { cn } from '@/app/_utils'
import { useSpeechToText } from '../../_hooks'
import { ActionItemExtractor } from './ActionItemExtractor'

// ============================================================================
// Types
// ============================================================================

interface Recording {
  id: string
  file: File
  url: string
  name: string
  duration: number
  createdAt: Date
}

type CaptureFocusBehavior = 'focus-capturing-application' | 'focus-captured-surface'

interface ScreenCaptureController {
  setFocusBehavior?: (behavior: CaptureFocusBehavior) => void
}

interface WindowWithScreenCapture extends Window {
  CaptureController?: new () => ScreenCaptureController
}

type RecorderStatus = 'idle' | 'recording'

interface ScreenRecorderState {
  status: RecorderStatus
  isSupported: boolean
  error: string | null
  start: () => Promise<void>
  stop: () => void
  videoRef: React.RefObject<HTMLVideoElement | null>
  durationSeconds: number
  recordings: Recording[]
  addRecording: (file: File, duration: number) => Recording
  deleteRecording: (id: string) => void
}

// ============================================================================
// Hook: useScreenRecorder
// ============================================================================

function useScreenRecorder(): ScreenRecorderState {
  const [status, setStatus] = useState<RecorderStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [durationSeconds, setDurationSeconds] = useState(0)
  const [recordings, setRecordings] = useState<Recording[]>([])

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const startedAtRef = useRef<number | null>(null)
  const recordingDurationRef = useRef<number>(0)

  const addRecording = useCallback((file: File, duration: number): Recording => {
    const recording: Recording = {
      id: `rec-${Date.now()}`,
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      duration,
      createdAt: new Date(),
    }
    setRecordings((prev) => [recording, ...prev])
    return recording
  }, [])

  const deleteRecording = useCallback((id: string) => {
    setRecordings((prev) => {
      const rec = prev.find((r) => r.id === id)
      if (rec) {
        URL.revokeObjectURL(rec.url)
      }
      return prev.filter((r) => r.id !== id)
    })
  }, [])

  const isSupported =
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    'getDisplayMedia' in navigator.mediaDevices

  useEffect(() => {
    if (status !== 'recording' || startedAtRef.current === null) {
      setDurationSeconds(0)
      recordingDurationRef.current = 0
      return
    }

    const interval = window.setInterval(() => {
      if (startedAtRef.current !== null) {
        const diffMs = Date.now() - startedAtRef.current
        const secs = Math.floor(diffMs / 1000)
        setDurationSeconds(secs)
        recordingDurationRef.current = secs
      }
    }, 1000)

    return () => {
      window.clearInterval(interval)
    }
  }, [status])

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        t.stop()
      })
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const stopInternal = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  const start = useCallback(async () => {
    if (!isSupported) {
      setError('Screen recording is not supported in this browser.')
      toast.error('Screen recording not supported')
      return
    }
    if (status === 'recording') return

    setError(null)
    chunksRef.current = []

    try {
      const win = window as WindowWithScreenCapture

      let controller: ScreenCaptureController | undefined
      if (win.CaptureController) {
        controller = new win.CaptureController()
        controller.setFocusBehavior?.('focus-capturing-application')
      }

      const constraints: DisplayMediaStreamOptions & { controller?: ScreenCaptureController } = {
        video: { displaySurface: 'browser' },
        audio: true,
      }

      if (controller) {
        constraints.controller = controller
      }

      const stream = await navigator.mediaDevices.getDisplayMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(() => {})
      }

      if (typeof MediaRecorder === 'undefined') {
        cleanupStream()
        setError('MediaRecorder is not available in this browser.')
        toast.error('MediaRecorder not available')
        return
      }

      let mimeType = 'video/webm;codecs=vp9,opus'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8,opus'
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm'
      }

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        const finalDuration = recordingDurationRef.current
        cleanupStream()
        setStatus('idle')
        startedAtRef.current = null

        if (chunksRef.current.length === 0) return

        try {
          const blob = new Blob(chunksRef.current, { type: mimeType })
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
          const file = new File([blob], `recording-${timestamp}.webm`, {
            type: mimeType,
          })
          addRecording(file, finalDuration)
          toast.success('Recording saved')
        } catch (err) {
          console.log('Failed to finalize recording:', err)
        }

        chunksRef.current = []
      }

      recorder.onerror = (event) => {
        console.log('Screen recording error:', event.error)
        setError('Screen recording failed.')
        cleanupStream()
        setStatus('idle')
        startedAtRef.current = null
        chunksRef.current = []
      }

      const [videoTrack] = stream.getVideoTracks()
      if (videoTrack) {
        videoTrack.addEventListener('ended', () => {
          stopInternal()
        })
      }

      startedAtRef.current = Date.now()
      setStatus('recording')
      recorder.start()
      toast.info('Screen recording started')
    } catch (err) {
      console.log('Screen recording cancelled or failed:', err)
      cleanupStream()
      setStatus('idle')
      startedAtRef.current = null
      chunksRef.current = []
    }
  }, [addRecording, cleanupStream, isSupported, status, stopInternal])

  const stop = useCallback(() => {
    stopInternal()
  }, [stopInternal])

  return {
    status,
    isSupported,
    error,
    start,
    stop,
    videoRef,
    durationSeconds,
    recordings,
    addRecording,
    deleteRecording,
  }
}

// ============================================================================
// Helpers
// ============================================================================

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// ============================================================================
// Components
// ============================================================================

interface LiveTranscriptProps {
  status: RecorderStatus
  lang: string
}

function LiveTranscript({ status, lang }: LiveTranscriptProps) {
  const store = useMeetingAnalyzerStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [interim, setInterim] = useState('')
  const lastSavedRef = useRef('')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Save interim to store (with duplicate check)
  const saveInterim = useCallback(
    (text: string) => {
      if (!text.trim()) return

      // Check if this text is already at the end of transcript
      const current = store.transcript
      if (current.endsWith(text.trim())) return

      // Find the new part that isn't already saved
      const trimmed = text.trim()
      if (trimmed.startsWith(lastSavedRef.current)) {
        const newPart = trimmed.slice(lastSavedRef.current.length).trim()
        if (newPart) {
          store.appendText(newPart)
        }
      } else {
        // Completely new text
        store.appendText(trimmed)
      }
      lastSavedRef.current = trimmed
    },
    [store.transcript, store.appendText]
  )

  const handleResult = useCallback(
    (text: string, isFinal: boolean) => {
      const trimmed = text.trim()
      if (!trimmed) return

      // Always show interim
      setInterim(trimmed)

      // Clear existing timer
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }

      if (isFinal) {
        // Final: save immediately and reset
        saveInterim(trimmed)
        setInterim('')
        lastSavedRef.current = ''
      } else {
        // Interim: save after 1.5s of no updates (to catch lost finals)
        saveTimerRef.current = setTimeout(() => {
          saveInterim(trimmed)
          setInterim('')
          lastSavedRef.current = ''
        }, 1500)
      }
    },
    [saveInterim]
  )

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [])

  const handleError = useCallback((message: string) => {
    console.log('Speech recognition error:', message)
  }, [])

  const { isSupported, isListening, start, stop } = useSpeechToText({
    lang,
    continuous: true,
    interimResults: true,
    onResult: handleResult,
    onError: handleError,
  })

  useEffect(() => {
    if (!isSupported) return

    if (status === 'recording' && !isListening) {
      start()
    } else if (status !== 'recording' && isListening) {
      stop()
    }
  }, [isSupported, isListening, start, status, stop])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [store.transcript, interim])

  const isRecording = status === 'recording'

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'h-8 w-8 rounded-lg flex items-center justify-center',
              'bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20',
              'border border-violet-500/20'
            )}
          >
            <PiWaveformBold className="h-4 w-4 text-violet-500 dark:text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-zinc-900 dark:text-white/90">
              Live Transcript
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-white/40">
              Speech-to-text • May contain errors
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Copy transcript button */}
          {store.transcript && (
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(store.transcript)
                toast.success('Transcript copied to clipboard')
              }}
              className="h-7 px-2.5 rounded-md flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 dark:text-white/40 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
              title="Copy transcript"
            >
              <HiClipboardDocument className="h-3.5 w-3.5" />
              Copy
            </button>
          )}

          <div
            className={cn(
              'flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-medium',
              isListening
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-white/40 border border-zinc-200 dark:border-white/10'
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                isListening
                  ? 'bg-emerald-500 dark:bg-emerald-400 animate-pulse'
                  : 'bg-zinc-400 dark:bg-white/30'
              )}
            />
            {isListening ? 'Listening' : 'Idle'}
          </div>
        </div>
      </div>

      {/* Character count badge */}
      <div className="px-5 py-2 border-b border-zinc-100 dark:border-white/[0.03] flex items-center gap-2">
        <span className="text-[10px] font-medium text-zinc-400 dark:text-white/30">
          {store.transcript.length} characters
        </span>
        <span className="text-[10px] text-zinc-300 dark:text-white/20">•</span>
        <span className="text-[10px] text-zinc-400 dark:text-white/30">
          Next extraction at {store.lastProcessedCharIndex + 800} chars
        </span>
      </div>

      {/* Transcript content - single flowing text */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5">
        {!store.transcript && !interim ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <div className="h-12 w-12 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-center mb-4">
              <PiWaveformBold className="h-5 w-5 text-zinc-400 dark:text-white/30" />
            </div>
            <p className="text-sm text-zinc-600 dark:text-white/50 mb-1">
              {isRecording ? 'Listening for speech...' : 'Waiting for recording'}
            </p>
            <p className="text-xs text-zinc-500 dark:text-white/30 max-w-[240px]">
              {isRecording
                ? 'Speak clearly and your words will appear here in real-time'
                : 'Start recording to enable live transcription'}
            </p>
          </div>
        ) : (
          <div className="text-[13px] text-zinc-700 dark:text-white/80 leading-relaxed whitespace-pre-wrap">
            {store.transcript}
            {interim && (
              <span className="text-emerald-600 dark:text-emerald-400">
                {store.transcript ? ' ' : ''}
                {interim}
              </span>
            )}
            <span className="inline-block w-0.5 h-4 ml-0.5 bg-emerald-500 animate-pulse align-middle" />
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Recordings List Component
// ============================================================================

interface RecordingsListProps {
  recordings: Recording[]
  playingId: string | null
  transcript: string
  onPlay: (recording: Recording) => void
  onDelete: (id: string) => void
  onDownload: (recording: Recording) => void
  onDownloadTranscript: () => void
}

function RecordingsList({
  recordings,
  playingId,
  transcript,
  onPlay,
  onDelete,
  onDownload,
  onDownloadTranscript,
}: RecordingsListProps) {
  if (recordings.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-6">
        <div className="h-12 w-12 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-center mb-4">
          <PiVideoCameraFill className="h-5 w-5 text-zinc-400 dark:text-white/30" />
        </div>
        <p className="text-sm text-zinc-600 dark:text-white/50 mb-1">No recordings yet</p>
        <p className="text-xs text-zinc-500 dark:text-white/30 max-w-[220px]">
          Start a screen recording and it will appear here for playback
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {recordings.map((rec) => {
        const isPlaying = playingId === rec.id
        return (
          <div
            key={rec.id}
            className={cn(
              'group relative rounded-xl border p-3 transition-all',
              isPlaying
                ? 'bg-violet-500/10 border-violet-500/30'
                : 'bg-zinc-50 dark:bg-white/[0.02] border-zinc-200 dark:border-white/[0.06] hover:bg-zinc-100 dark:hover:bg-white/[0.04] hover:border-zinc-300 dark:hover:border-white/10'
            )}
          >
            <div className="flex items-start gap-3">
              {/* Play button */}
              <button
                type="button"
                onClick={() => onPlay(rec)}
                className={cn(
                  'h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all',
                  isPlaying
                    ? 'bg-violet-500 text-white'
                    : 'bg-zinc-200 dark:bg-white/5 text-zinc-600 dark:text-white/60 hover:bg-zinc-300 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white'
                )}
              >
                {isPlaying ? (
                  <HiMiniStop className="h-4 w-4" />
                ) : (
                  <HiMiniPlay className="h-4 w-4 ml-0.5" />
                )}
              </button>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-800 dark:text-white/80 truncate">
                  {rec.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-zinc-500 dark:text-white/40 tabular-nums">
                    {formatDuration(rec.duration)}
                  </span>
                  <span className="text-zinc-300 dark:text-white/20">•</span>
                  <span className="text-[11px] text-zinc-500 dark:text-white/40">
                    {rec.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => onDownload(rec)}
                  className="h-7 w-7 rounded-md flex items-center justify-center text-zinc-500 dark:text-white/40 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors"
                  title="Download Video"
                >
                  <HiArrowDownTray className="h-3.5 w-3.5" />
                </button>
                {transcript && (
                  <button
                    type="button"
                    onClick={onDownloadTranscript}
                    className="h-7 w-7 rounded-md flex items-center justify-center text-zinc-500 dark:text-white/40 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors"
                    title="Download Transcript"
                  >
                    <HiDocumentText className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onDelete(rec.id)}
                  className="h-7 w-7 rounded-md flex items-center justify-center text-zinc-500 dark:text-white/40 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  title="Delete"
                >
                  <HiOutlineTrash className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// Right Panel Tabs
// ============================================================================

type RightPanelTab = 'transcript' | 'recordings' | 'actions'

// Main Component
// ============================================================================

export function VorionAnalyzer() {
  const actions = useGenericApiActions()
  const chatStore = useVorionChatStore()
  const analyzerStore = useMeetingAnalyzerStore()

  const {
    status,
    isSupported,
    error,
    start,
    stop,
    videoRef,
    durationSeconds,
    recordings,
    deleteRecording,
  } = useScreenRecorder()

  const [activeTab, setActiveTab] = useState<RightPanelTab>('transcript')
  const [playingRecording, setPlayingRecording] = useState<Recording | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const [hasMounted, setHasMounted] = useState(false)
  const playbackVideoRef = useRef<HTMLVideoElement>(null)

  // Use store for meeting language (single source of truth)
  const meetingLanguage = analyzerStore.meetingLanguage
  const setMeetingLanguage = analyzerStore.setMeetingLanguage

  const isRecording = status === 'recording'
  const isPlayingBack = playingRecording !== null

  // Sync recording status to store so ActionItemExtractor can react
  useEffect(() => {
    analyzerStore.setIsRecording(isRecording)
  }, [isRecording])

  const handleToggle = useCallback(() => {
    if (isRecording) {
      stop()
    } else {
      setPlayingRecording(null) // Stop playback when starting new recording
      void start()
    }
  }, [isRecording, start, stop])

  const handlePlayRecording = useCallback(
    (recording: Recording) => {
      if (playingRecording?.id === recording.id) {
        // Stop playback
        setPlayingRecording(null)
      } else {
        setPlayingRecording(recording)
      }
    },
    [playingRecording]
  )

  const handleDownload = useCallback((recording: Recording) => {
    const a = document.createElement('a')
    a.href = recording.url
    a.download = recording.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [])

  const handleDownloadTranscript = useCallback(() => {
    const transcript = analyzerStore.transcript
    if (!transcript) {
      toast.error('No transcript available')
      return
    }

    const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transcript-${new Date().toISOString().slice(0, 10)}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Transcript downloaded')
  }, [analyzerStore.transcript])

  const handleDeleteRecording = useCallback(
    (id: string) => {
      if (playingRecording?.id === id) {
        setPlayingRecording(null)
      }
      deleteRecording(id)
      toast.success('Recording deleted')
    },
    [deleteRecording, playingRecording]
  )

  // Auto-switch to recordings tab when a new recording is saved
  const recordingsCount = recordings.length
  const prevCountRef = useRef(recordingsCount)
  useEffect(() => {
    if (recordingsCount > prevCountRef.current) {
      setActiveTab('recordings')
    }
    prevCountRef.current = recordingsCount
  }, [recordingsCount])

  // Mark client-side mount to keep SSR/CSR in sync for isSupported-based UI
  useEffect(() => {
    setHasMounted(true)
  }, [])

  // Load LLMs for analyzer if not already loaded (same pattern as main Vorion page)
  useEffect(() => {
    if (chatStore.availableLLMs) return

    actions.VORION_LIST_LLMS?.start({
      payload: { page_size: 100, available_only: true },
      onAfterHandle: (data) => {
        if (data?.items) {
          const providers: Record<string, typeof data.items> = {}
          for (const model of data.items) {
            const providerName = model.provider_name
            if (!providers[providerName]) {
              providers[providerName] = []
            }
            providers[providerName].push(model)
          }
          chatStore.setAvailableLLMs({
            providers,
            total_count: data.total,
          })
        }
      },
      onErrorHandle: (error) => {
        console.error('Failed to load LLMs for analyzer:', error)
      },
    })
  }, [])

  // Initialize / keep provider + model selection in sync with availableLLMs
  useEffect(() => {
    const apiLLMs = chatStore.availableLLMs
    if (!apiLLMs) return

    const providers = apiLLMs.providers
    const providerNames = Object.keys(providers)
    if (providerNames.length === 0) return

    let nextProvider = selectedProvider
    if (!nextProvider || !providers[nextProvider]) {
      const firstProvider = providerNames[0]
      if (!firstProvider) return
      nextProvider = firstProvider
      setSelectedProvider(firstProvider)
    }

    if (!nextProvider) return

    const models = providers[nextProvider]
    if (!models || models.length === 0) return

    if (
      !selectedModel ||
      !models.some((m: { model_name: string }) => m.model_name === selectedModel)
    ) {
      const firstModelName = models[0]?.model_name ?? null
      setSelectedModel(firstModelName)
    }
  }, [chatStore.availableLLMs, selectedProvider, selectedModel])

  // Sync LLM config to analyzer store when selection changes
  useEffect(() => {
    if (selectedProvider && selectedModel) {
      analyzerStore.setLLMConfig({
        provider: selectedProvider,
        model: selectedModel,
        language: meetingLanguage === 'tr-TR' ? 'tr' : 'en',
      })
    }
  }, [selectedProvider, selectedModel, meetingLanguage])

  return (
    <div
      className={cn(
        'h-full w-full flex flex-col overflow-hidden',
        'bg-gradient-to-br from-zinc-50 via-white to-zinc-100',
        'dark:from-[#050509] dark:via-[#050509] dark:to-[#050509]'
      )}
    >
      {/* Top bar */}
      <header className="flex-shrink-0 h-14 border-b border-zinc-200 dark:border-white/[0.06] flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" />
            <span className="text-sm font-medium text-zinc-900 dark:text-white/90">Analyzer</span>
          </div>
          <div className="h-4 w-px bg-zinc-200 dark:bg-white/10" />
          <span className="text-xs text-zinc-500 dark:text-white/40">Meeting Recording Studio</span>
        </div>

        {/* Duration, LLM Model, Language & Status */}
        <div className="flex items-center gap-4">
          {/* LLM selector - Enhanced */}
          {chatStore.availableLLMs && (
            <div className="hidden lg:flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 dark:border-violet-400/20">
                <LuBot className="h-3.5 w-3.5 text-violet-500 dark:text-violet-400" />
                <div className="flex items-center gap-1">
                  <select
                    value={selectedProvider ?? ''}
                    onChange={(e) => {
                      const next = e.target.value || null
                      setSelectedProvider(next)
                      setSelectedModel(null)
                    }}
                    className="bg-transparent text-[11px] font-medium text-violet-700 dark:text-violet-300 cursor-pointer focus:outline-none appearance-none pr-1"
                  >
                    {Object.keys(chatStore.availableLLMs.providers).map((providerName) => (
                      <option
                        key={providerName}
                        value={providerName}
                        className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white"
                      >
                        {providerName}
                      </option>
                    ))}
                  </select>
                  <span className="text-violet-400 dark:text-violet-500">/</span>
                  <select
                    value={selectedModel ?? ''}
                    onChange={(e) => setSelectedModel(e.target.value || null)}
                    className="bg-transparent text-[11px] font-medium text-violet-700 dark:text-violet-300 cursor-pointer focus:outline-none appearance-none max-w-[140px] truncate"
                  >
                    {selectedProvider &&
                      chatStore.availableLLMs.providers[selectedProvider]?.map((model) => (
                        <option
                          key={model.model_name}
                          value={model.model_name}
                          className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white"
                        >
                          {model.display_name || model.model_name}
                        </option>
                      ))}
                  </select>
                </div>
                <LuChevronDown className="h-3 w-3 text-violet-400 dark:text-violet-500" />
              </div>
            </div>
          )}

          {/* Language selector */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-500 dark:text-white/50">
            <span>Language</span>
            <select
              value={meetingLanguage}
              onChange={(e) => setMeetingLanguage(e.target.value as 'en-US' | 'tr-TR')}
              className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 shadow-sm dark:border-white/15 dark:bg-zinc-900 dark:text-white/80"
            >
              <option value="en-US">English</option>
              <option value="tr-TR">Türkçe</option>
            </select>
          </div>
          {isRecording && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <span className="text-xs font-medium text-red-500 dark:text-red-400 tabular-nums">
                {formatDuration(durationSeconds)}
              </span>
            </div>
          )}

          {recordings.length > 0 && !isRecording && (
            <span className="text-xs text-zinc-500 dark:text-white/40">
              {recordings.length} recording{recordings.length !== 1 ? 's' : ''} saved
            </span>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Preview area */}
        <div className="flex-1 flex flex-col min-w-0 p-4">
          {/* Screen preview / Playback area */}
          <div
            className={cn(
              'flex-1 relative rounded-2xl overflow-hidden',
              'bg-zinc-800 dark:bg-zinc-900 border transition-all duration-500',
              isRecording
                ? 'border-red-500/30 shadow-[0_0_60px_-12px_rgba(239,68,68,0.3)]'
                : isPlayingBack
                  ? 'border-violet-500/30 shadow-[0_0_60px_-12px_rgba(139,92,246,0.3)]'
                  : 'border-zinc-300 dark:border-white/[0.08]'
            )}
          >
            {/* Live preview video element (hidden when playing back) */}
            <video
              ref={videoRef}
              className={cn(
                'absolute inset-0 w-full h-full object-contain',
                isPlayingBack && 'hidden'
              )}
              muted
              playsInline
            />

            {/* Playback video element */}
            {isPlayingBack && (
              <video
                ref={playbackVideoRef}
                src={playingRecording.url}
                className="absolute inset-0 w-full h-full object-contain"
                controls
                autoPlay
                onEnded={() => setPlayingRecording(null)}
              >
                <track kind="captions" />
              </video>
            )}

            {/* Idle state overlay (no recording, no playback) */}
            {!isRecording && !isPlayingBack && (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {/* Animated background pattern */}
                <div className="absolute inset-0 opacity-30">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-900/20 via-transparent to-transparent" />
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)`,
                      backgroundSize: '32px 32px',
                    }}
                  />
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col items-center text-center px-8">
                  <div
                    className={cn(
                      'h-20 w-20 rounded-3xl mb-6 flex items-center justify-center',
                      'bg-gradient-to-br from-white/[0.08] to-white/[0.02]',
                      'border border-white/10 backdrop-blur-sm',
                      'shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]'
                    )}
                  >
                    <HiMiniPlay className="h-8 w-8 text-white/40 ml-1" />
                  </div>

                  <h2 className="text-lg font-medium text-white/80 mb-2">Ready to capture</h2>
                  <p className="text-sm text-white/40 max-w-md mb-8">
                    Click the button below to start recording your screen. The live preview will
                    appear here so you can monitor what&apos;s being captured.
                  </p>

                  {/* Big start button */}
                  <button
                    type="button"
                    onClick={handleToggle}
                    disabled={!hasMounted || !isSupported}
                    className={cn(
                      'group relative px-8 py-4 rounded-2xl font-semibold text-base',
                      'bg-gradient-to-r from-red-500 to-rose-500',
                      'text-white shadow-lg shadow-red-500/25',
                      'hover:shadow-xl hover:shadow-red-500/30 hover:scale-[1.02]',
                      'active:scale-[0.98] transition-all duration-200',
                      'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100'
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full bg-white/90 animate-pulse" />
                      Start Recording
                    </span>
                  </button>

                  {error && <p className="mt-4 text-xs text-red-400">{error}</p>}
                  {hasMounted && !isSupported && (
                    <p className="mt-4 text-xs text-amber-400">
                      Screen recording is not supported in this browser
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Recording state: floating controls */}
            {isRecording && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleToggle}
                  className={cn(
                    'flex items-center gap-2 px-5 py-2.5 rounded-full',
                    'bg-zinc-900/90 backdrop-blur-sm border border-white/10',
                    'text-white text-sm font-medium',
                    'hover:bg-zinc-800/90 transition-colors'
                  )}
                >
                  <HiMiniStop className="h-4 w-4 text-red-400" />
                  Stop Recording
                </button>
              </div>
            )}

            {/* Playback state: back to live button */}
            {isPlayingBack && (
              <button
                type="button"
                onClick={() => setPlayingRecording(null)}
                className={cn(
                  'absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full',
                  'bg-black/60 backdrop-blur-sm border border-white/10',
                  'text-white/80 text-xs font-medium',
                  'hover:bg-black/80 transition-colors'
                )}
              >
                ← Back to studio
              </button>
            )}
          </div>

          {/* Bottom info strip */}
          <div className="flex-shrink-0 mt-3 flex items-center justify-between px-1">
            <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-white/40">
              <span className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    isRecording
                      ? 'bg-emerald-500 dark:bg-emerald-400'
                      : isPlayingBack
                        ? 'bg-violet-500 dark:bg-violet-400'
                        : 'bg-zinc-400 dark:bg-white/30'
                  )}
                />
                {isRecording
                  ? 'Screen capture active'
                  : isPlayingBack
                    ? `Playing: ${playingRecording.name}`
                    : 'No active capture'}
              </span>
            </div>
            <span className="text-[11px] text-zinc-400 dark:text-white/30">
              Audio + Video • WebM format
            </span>
          </div>
        </div>

        {/* Right: Split panel - Transcript + Actions side by side */}
        <div
          className={cn(
            'w-[680px] flex-shrink-0 border-l border-zinc-200 dark:border-white/[0.06] flex flex-col',
            'bg-white dark:bg-transparent'
          )}
        >
          {/* Header with recordings toggle */}
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-white/[0.06] bg-zinc-50/50 dark:bg-white/[0.01]">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-white/40">
              Live Analysis
            </span>
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'recordings' ? 'transcript' : 'recordings')}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all',
                activeTab === 'recordings'
                  ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20'
                  : 'bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-white/50 border border-zinc-200 dark:border-white/10 hover:bg-zinc-200 dark:hover:bg-white/10'
              )}
            >
              <PiVideoCameraFill className="h-3 w-3" />
              Recordings
              {recordings.length > 0 && (
                <span className="h-4 min-w-[16px] px-1 rounded-full bg-violet-500/20 text-violet-600 dark:text-violet-400 text-[10px] flex items-center justify-center">
                  {recordings.length}
                </span>
              )}
            </button>
          </div>

          {/* Split content area */}
          {activeTab === 'recordings' ? (
            <div className="flex-1 overflow-y-auto p-4">
              <RecordingsList
                recordings={recordings}
                playingId={playingRecording?.id ?? null}
                transcript={analyzerStore.transcript}
                onPlay={handlePlayRecording}
                onDelete={handleDeleteRecording}
                onDownload={handleDownload}
                onDownloadTranscript={handleDownloadTranscript}
              />
            </div>
          ) : (
            <div className="flex-1 flex min-h-0">
              {/* Left: Transcript */}
              <div className="flex-1 min-w-0 border-r border-zinc-200 dark:border-white/[0.06]">
                <LiveTranscript status={status} lang={meetingLanguage} />
              </div>
              {/* Right: Actions */}
              <div className="flex-1 min-w-0">
                <ActionItemExtractor />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
