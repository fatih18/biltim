'use client'

import type { UserOAuthProvider } from '@monorepo/db-entities/schemas/default/user_oauth_provider'
import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { BsFillCameraFill } from 'react-icons/bs'
import { FaCheck, FaGithub, FaGoogleDrive } from 'react-icons/fa'
import { FiChevronRight } from 'react-icons/fi'
import { GrOnedrive } from 'react-icons/gr'
import {
  LuArrowLeft,
  LuFile,
  LuFileImage,
  LuFileText,
  LuFolder,
  LuFolderOpen,
  LuPlay,
  LuUpload,
  LuX,
} from 'react-icons/lu'
import { toast } from 'sonner'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'
import { useTextAreaStore } from '@/app/_store'
import type { KnowledgeBase } from '@/app/_store/knowledgeBaseStore'
import { cn } from '@/app/_utils'

// ============================================================================
// Types
// ============================================================================

interface MenuItemProps {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  hasSubmenu?: boolean
  hasBorder?: boolean
}

type CaptureFocusBehavior = 'focus-capturing-application' | 'focus-captured-surface'

interface ScreenCaptureController {
  setFocusBehavior?: (behavior: CaptureFocusBehavior) => void
}

interface WindowWithScreenCapture extends Window {
  CaptureController?: new () => ScreenCaptureController
}

interface OneDriveFile {
  id: string
  name: string
  size: number
  webUrl: string
  lastModifiedDateTime: string
  createdBy: string | null
  creatorId: string | null
  mimeType: string | null
  driveId: string | null
  graphId: string
}

// ============================================================================
// Menu Items Configuration
// ============================================================================

const FILE_MENU_ITEMS: Array<{ id: string; icon: React.ReactNode; label: string }> = [
  { id: 'upload', icon: <LuUpload size={14} />, label: 'Upload a file' },
  { id: 'screenshot', icon: <BsFillCameraFill size={14} />, label: 'Take a screenshot' },
  { id: 'record', icon: <LuPlay size={14} />, label: 'Record screen' },
  { id: 'github', icon: <FaGithub size={14} />, label: 'Add from GitHub' },
  { id: 'gdrive', icon: <FaGoogleDrive size={14} />, label: 'Add from Google Drive' },
  { id: 'onedrive', icon: <GrOnedrive size={14} />, label: 'Add from OneDrive' },
]

// Helper to get file icon based on type
function getFileIcon(file: File) {
  const type = file.type
  if (type.startsWith('image/')) return <LuFileImage size={16} className="text-blue-500" />
  if (type.includes('pdf') || type.includes('document') || type.includes('text'))
    return <LuFileText size={16} className="text-amber-500" />
  return <LuFile size={16} className="text-zinc-400" />
}

// File Preview Item Component - needs to be separate for hooks
function FilePreviewItem({
  file,
  index,
  onRemove,
}: {
  file: File
  index: number
  onRemove: (index: number) => void
}) {
  const mime = (file.type || '').toLowerCase()
  const isImage = mime.startsWith('image/')
  const isVideo = mime.startsWith('video/') || file.name.toLowerCase().endsWith('.webm')
  const isAudio = mime.startsWith('audio/')
  const [preview, setPreview] = useState<string | null>(null)

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

  return (
    <div
      className={cn(
        'relative group aspect-square rounded-xl overflow-hidden',
        'bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900',
        'border border-zinc-200/50 dark:border-white/10',
        'transition-all duration-300',
        'hover:scale-105 hover:shadow-lg hover:shadow-violet-500/10',
        'animate-in fade-in zoom-in-95 duration-300'
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {isImage && preview ? (
        <Image src={preview} alt={file.name} className="w-full h-full object-cover" />
      ) : isVideo && preview ? (
        <video src={preview} controls className="w-full h-full object-cover bg-black">
          <track kind="captions" label="No captions" />
        </video>
      ) : isAudio && preview ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-zinc-900/80">
          <audio src={preview} controls className="w-full">
            <track kind="captions" label="No captions" />
          </audio>
          <p className="text-[8px] text-zinc-200 mt-1 truncate max-w-full px-1">AUDIO</p>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-2">
          {getFileIcon(file)}
          <p className="text-[8px] text-zinc-500 dark:text-white/40 mt-1 truncate max-w-full px-1">
            {file.name.split('.').pop()?.toUpperCase()}
          </p>
        </div>
      )}

      {/* Remove button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onRemove(index)
        }}
        className={cn(
          'absolute top-1 right-1 p-1 rounded-full',
          'bg-black/50 backdrop-blur-sm',
          'opacity-0 group-hover:opacity-100',
          'hover:bg-red-500 transition-all duration-200'
        )}
      >
        <LuX size={10} className="text-white" />
      </button>

      {/* File name tooltip */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 p-1.5',
          'bg-gradient-to-t from-black/70 to-transparent',
          'opacity-0 group-hover:opacity-100 transition-opacity duration-200'
        )}
      >
        <p className="text-[9px] text-white truncate font-medium">{file.name}</p>
      </div>
    </div>
  )
}

// ============================================================================
// Sub-Components
// ============================================================================

function MenuItem({ icon, label, onClick, hasSubmenu, hasBorder }: MenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 w-full p-2.5 sm:p-3 rounded-lg',
        'text-left text-xs sm:text-sm',
        'text-zinc-600 dark:text-white/60',
        'hover:text-zinc-900 dark:hover:text-white',
        'hover:bg-zinc-100 dark:hover:bg-white/5',
        'transition-all duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50',
        hasBorder && 'border-t border-zinc-100 dark:border-white/10 mt-1 pt-3'
      )}
    >
      <span className="flex-shrink-0 text-zinc-500 dark:text-white/50">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {hasSubmenu && <FiChevronRight size={14} className="text-zinc-400 dark:text-white/40" />}
    </button>
  )
}

function SearchHeader({
  onBack,
  placeholder,
  value,
  onChange,
}: {
  onBack: () => void
  placeholder: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex items-center gap-2 p-2.5 border-b border-zinc-100 dark:border-white/10">
      <button
        type="button"
        onClick={onBack}
        aria-label="Go back"
        className={cn(
          'flex-shrink-0 p-1.5 rounded-lg',
          'text-zinc-600 dark:text-white',
          'hover:bg-zinc-100 dark:hover:bg-white/10',
          'transition-colors duration-200'
        )}
      >
        <LuArrowLeft size={16} />
      </button>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'flex-1 bg-transparent text-sm',
          'text-zinc-900 dark:text-white',
          'placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
          'focus:outline-none'
        )}
      />
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function PanelA() {
  const actions = useGenericApiActions()
  const store = useTextAreaStore()
  const isOpen = store.isPanelAOpen
  const isAbove = store.panelPosition === 'above'
  const isMainView = store.panelAState === 'main'
  const isProjectsView = store.panelAState === 'projects'
  const isUploadView = store.panelAState === 'upload'
  const isOneDriveView = store.panelAState === 'onedrive'

  // Drag & drop state
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Knowledge base state for "Use a Knowledgebase" view
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])
  const [kbSearchQuery, setKbSearchQuery] = useState('')
  const [kbHasMore, setKbHasMore] = useState(true)
  const [kbSkip, setKbSkip] = useState(0)
  const [isKbLoadingMore, setIsKbLoadingMore] = useState(false)
  const kbLoadMoreRef = useRef<HTMLDivElement | null>(null)

  const KB_PAGE_SIZE = 20

  // OneDrive / Microsoft OAuth linked state
  const [isOneDriveLinked, setIsOneDriveLinked] = useState<boolean | null>(null)

  const [oneDriveSearchQuery, setOneDriveSearchQuery] = useState('')

  const [oneDriveFiles, setOneDriveFiles] = useState<OneDriveFile[]>([])
  const [isOneDriveLoading, setIsOneDriveLoading] = useState(false)
  const [oneDriveError, setOneDriveError] = useState<string | null>(null)

  const [oneDriveFolderStack, setOneDriveFolderStack] = useState<string[]>([])

  const currentOneDriveFolderId =
    oneDriveFolderStack.length > 0 ? oneDriveFolderStack[oneDriveFolderStack.length - 1] : undefined

  // Handle file selection
  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return
      const newFiles = Array.from(files)
      store.uploadedFiles = [...(store.uploadedFiles || []), ...newFiles]
    },
    [store]
  )

  const filteredOneDriveFiles: OneDriveFile[] =
    oneDriveSearchQuery.trim().length === 0
      ? oneDriveFiles
      : oneDriveFiles.filter((file) => {
          const query = oneDriveSearchQuery.toLowerCase()
          return (
            file.name.toLowerCase().includes(query) ||
            (file.createdBy || '').toLowerCase().includes(query)
          )
        })

  // Check if Microsoft (OneDrive) account is linked
  useEffect(() => {
    if (!store.isPanelAOpen) return
    if (isOneDriveLinked !== null) return

    actions.GET_OAUTH_ACCOUNTS?.start({
      onAfterHandle: (data) => {
        if (!data) {
          setIsOneDriveLinked(false)
          return
        }
        // Azure OAuth provider is stored as 'azure' in user_oauth_providers
        const hasMicrosoft = data.data.some(
          (account: UserOAuthProvider) => account.provider === 'azure'
        )
        setIsOneDriveLinked(hasMicrosoft)
      },
      onErrorHandle: () => {
        setIsOneDriveLinked(false)
      },
    })
  }, [store.isPanelAOpen, isOneDriveLinked])

  // Load OneDrive files when OneDrive view opens
  useEffect(() => {
    if (!isOneDriveView) return
    if (!actions.GET_AZURE_DRIVE_FILES) {
      setOneDriveError('OneDrive integration is not available')
      return
    }

    setIsOneDriveLoading(true)
    setOneDriveError(null)

    actions.GET_AZURE_DRIVE_FILES.start({
      disableAutoRedirect: true,
      payload: currentOneDriveFolderId ? { parentId: currentOneDriveFolderId } : undefined,
      onAfterHandle: (data) => {
        if (!data) {
          setOneDriveFiles([])
        } else {
          setOneDriveFiles(data.data ?? [])
        }
        setIsOneDriveLoading(false)
      },
      onErrorHandle: (error) => {
        console.log('Failed to load OneDrive files:', error)
        setOneDriveError('Failed to load OneDrive files')
        setIsOneDriveLoading(false)
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOneDriveView, currentOneDriveFolderId])

  const handleAttachOneDriveFile = useCallback(
    (file: OneDriveFile) => {
      if (!file.mimeType) {
        toast.info('Folder selection is not supported yet. Please choose a file inside the folder.')
        return
      }

      if (!actions.GET_AZURE_DRIVE_FILE_DOWNLOAD_URL) {
        toast.error('OneDrive integration is not available')
        return
      }

      actions.GET_AZURE_DRIVE_FILE_DOWNLOAD_URL.start({
        disableAutoRedirect: true,
        payload: {
          _itemId: file.graphId,
          driveId: file.driveId ?? undefined,
        },
        onAfterHandle: async (data) => {
          if (!data?.downloadUrl) {
            toast.error('Failed to get OneDrive download URL')
            return
          }

          try {
            const response = await fetch(data.downloadUrl)
            if (!response.ok) {
              throw new Error(`Download failed with status ${response.status}`)
            }

            const blob = await response.blob()

            const webUrlName = file.webUrl ? file.webUrl.split('/').pop() : null
            const decodedFromWebUrl = webUrlName ? decodeURIComponent(webUrlName) : null
            const name = data.name || decodedFromWebUrl || file.name || 'onedrive-file'

            const downloadFile = new File([blob], name, {
              type: data.mimeType || file.mimeType || blob.type || 'application/octet-stream',
            })

            store.uploadedFiles = [...(store.uploadedFiles || []), downloadFile]

            toast.success('OneDrive file attached', {
              description: name,
            })

            store.panelAState = 'main'
            store.isPanelAOpen = false
          } catch (error) {
            console.log('Failed to download OneDrive file:', error)
            toast.error('Failed to download OneDrive file')
          }
        },
        onErrorHandle: (error) => {
          console.log('Failed to get OneDrive download URL:', error)
          toast.error('Failed to get OneDrive download URL')
        },
      })
    },
    [actions, store]
  )

  // Handle screenshot capture using getDisplayMedia
  const handleTakeScreenshot = useCallback(async () => {
    try {
      const win = window as WindowWithScreenCapture

      // Use Conditional Focus API if available so the current tab stays focused
      let controller: ScreenCaptureController | undefined
      if (win.CaptureController) {
        controller = new win.CaptureController()
        controller.setFocusBehavior?.('focus-capturing-application')
      }

      const constraints: DisplayMediaStreamOptions & {
        controller?: ScreenCaptureController
      } = {
        video: { displaySurface: 'browser' },
        audio: false,
      }

      if (controller) {
        constraints.controller = controller
      }

      // Request screen capture permission and show picker
      const stream = await navigator.mediaDevices.getDisplayMedia(constraints)

      // Get the video track
      const track = stream.getVideoTracks()[0]
      if (!track) {
        stream.getTracks().forEach((t) => {
          t.stop()
        })
        return
      }

      // Create a video element to capture the frame
      const video = document.createElement('video')
      video.srcObject = stream
      video.autoplay = true
      video.playsInline = true

      // Wait for video to be ready
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          video.play()
          resolve()
        }
      })

      // Small delay to ensure frame is rendered
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Create canvas and capture frame
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        stream.getTracks().forEach((t) => {
          t.stop()
        })
        return
      }
      ctx.drawImage(video, 0, 0)

      // Stop the stream immediately after capture
      stream.getTracks().forEach((t) => {
        t.stop()
      })

      // Convert canvas to blob then to File
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/png', 1.0)
      })

      if (!blob) return

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const file = new File([blob], `screenshot-${timestamp}.png`, {
        type: 'image/png',
      })

      // Add to uploaded files
      store.uploadedFiles = [...(store.uploadedFiles || []), file]
    } catch (error) {
      // User cancelled or permission denied - silently ignore
      console.log('Screenshot cancelled or failed:', error)
    }
  }, [store])

  // Handle screen recording with optional audio
  const handleRecordScreen = useCallback(async () => {
    try {
      const win = window as WindowWithScreenCapture

      let controller: ScreenCaptureController | undefined
      if (win.CaptureController) {
        controller = new win.CaptureController()
        controller.setFocusBehavior?.('focus-capturing-application')
      }

      const constraints: DisplayMediaStreamOptions & {
        controller?: ScreenCaptureController
      } = {
        video: { displaySurface: 'browser' },
        audio: true,
      }

      if (controller) {
        constraints.controller = controller
      }

      const stream = await navigator.mediaDevices.getDisplayMedia(constraints)

      if (typeof MediaRecorder === 'undefined') {
        stream.getTracks().forEach((t) => {
          t.stop()
        })
        console.log('MediaRecorder is not supported in this browser.')
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
      const chunks: BlobPart[] = []

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      recorder.onstop = () => {
        try {
          stream.getTracks().forEach((t) => {
            t.stop()
          })

          store.isScreenRecording = false
          store.stopScreenRecordingCallback = null

          if (chunks.length === 0) return

          const blob = new Blob(chunks, { type: mimeType })
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
          const extension = 'webm'
          const file = new File([blob], `screen-recording-${timestamp}.${extension}`, {
            type: mimeType,
          })

          store.uploadedFiles = [...(store.uploadedFiles || []), file]
          toast.success('Screen recording added', {
            description: file.name,
          })
        } catch (error) {
          console.log('Error while finalizing recording:', error)
        }
      }

      recorder.onerror = (event) => {
        console.log('Screen recording error:', event.error)
        stream.getTracks().forEach((t) => {
          t.stop()
        })
        store.isScreenRecording = false
        store.stopScreenRecordingCallback = null
      }

      const [videoTrack] = stream.getVideoTracks()
      if (videoTrack) {
        videoTrack.addEventListener('ended', () => {
          if (recorder.state === 'recording') {
            recorder.stop()
          }
        })
      }

      store.isScreenRecording = true
      store.stopScreenRecordingCallback = () => {
        if (recorder.state === 'recording') {
          recorder.stop()
        }
      }

      recorder.start()

      toast.info('Screen recording started', {
        description:
          'Use the browser\'s "Stop sharing" button to finish. Recording the current tab may not work reliably; prefer a window or entire screen.',
      })
    } catch (error) {
      console.log('Screen recording cancelled or failed:', error)
      store.isScreenRecording = false
      store.stopScreenRecordingCallback = null
    }
  }, [store])

  // Load initial knowledge bases when projects view opens or search changes
  useEffect(() => {
    if (!isProjectsView) return

    const isSearching = kbSearchQuery.trim().length > 0
    if (isSearching) {
      actions.VORION_SEARCH_KNOWLEDGE_BASES?.start({
        payload: { q: kbSearchQuery.trim(), skip: 0, limit: KB_PAGE_SIZE },
        onAfterHandle: (data) => {
          if (data?.items) {
            setKnowledgeBases(data.items)
            setKbSkip(data.items.length)
            const total = (data.total as number | undefined) ?? data.items.length
            setKbHasMore(data.items.length >= KB_PAGE_SIZE && data.items.length < total)
          } else {
            setKnowledgeBases([])
            setKbSkip(0)
            setKbHasMore(false)
          }
        },
      })
    } else {
      actions.VORION_LIST_KNOWLEDGE_BASES?.start({
        payload: { skip: 0, limit: KB_PAGE_SIZE },
        onAfterHandle: (data) => {
          if (data?.items) {
            setKnowledgeBases(data.items)
            setKbSkip(data.items.length)
            const total = (data.total as number | undefined) ?? data.items.length
            setKbHasMore(data.items.length >= KB_PAGE_SIZE && data.items.length < total)
          } else {
            setKnowledgeBases([])
            setKbSkip(0)
            setKbHasMore(false)
          }
        },
      })
    }
  }, [isProjectsView, kbSearchQuery])

  // Load more knowledge bases on scroll
  const loadMoreKnowledgeBases = useCallback(() => {
    if (isKbLoadingMore || !kbHasMore) return

    const isSearching = kbSearchQuery.trim().length > 0
    setIsKbLoadingMore(true)
    const handleAfter = (data: unknown) => {
      const typed = data as { items?: KnowledgeBase[] }
      if (typed?.items && typed.items.length > 0) {
        const items = typed.items
        setKnowledgeBases((prev) => {
          const existingIds = new Set(prev.map((kb) => kb.id))
          const newItems = items.filter((kb) => !existingIds.has(kb.id))
          setKbSkip((prevSkip) => prevSkip + newItems.length)
          setKbHasMore(newItems.length >= KB_PAGE_SIZE)
          return [...prev, ...newItems]
        })
      } else {
        setKbHasMore(false)
      }
      setIsKbLoadingMore(false)
    }

    if (isSearching) {
      actions.VORION_SEARCH_KNOWLEDGE_BASES?.start({
        payload: { q: kbSearchQuery.trim(), skip: kbSkip, limit: KB_PAGE_SIZE },
        onAfterHandle: handleAfter,
        onErrorHandle: () => {
          setIsKbLoadingMore(false)
        },
      })
    } else {
      actions.VORION_LIST_KNOWLEDGE_BASES?.start({
        payload: { skip: kbSkip, limit: KB_PAGE_SIZE },
        onAfterHandle: handleAfter,
        onErrorHandle: () => {
          setIsKbLoadingMore(false)
        },
      })
    }
  }, [kbHasMore, isKbLoadingMore, kbSearchQuery, kbSkip])

  // IntersectionObserver for infinite scroll in projects (knowledge bases) view
  useEffect(() => {
    if (!isProjectsView) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry?.isIntersecting && kbHasMore && !isKbLoadingMore) {
          loadMoreKnowledgeBases()
        }
      },
      { threshold: 0.1 }
    )

    const currentRef = kbLoadMoreRef.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [isProjectsView, kbHasMore, isKbLoadingMore, loadMoreKnowledgeBases])

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      handleFileSelect(e.dataTransfer.files)
    },
    [handleFileSelect]
  )

  // Remove file
  const handleRemoveFile = useCallback(
    (index: number) => {
      if (!store.uploadedFiles) return
      const newFiles = [...store.uploadedFiles]
      newFiles.splice(index, 1)
      store.uploadedFiles = newFiles.length > 0 ? newFiles : null
    },
    [store]
  )

  return (
    <div
      className={cn(
        'absolute z-50 min-w-[220px] sm:min-w-[260px]',
        'rounded-xl overflow-hidden',
        'bg-white dark:bg-zinc-900',
        'border border-zinc-200 dark:border-white/10',
        'shadow-xl shadow-zinc-200/50 dark:shadow-black/30',
        'transition-all duration-300 ease-out',
        // Position
        isAbove ? 'bottom-full mb-2 left-0 sm:left-2' : 'top-full mt-2 left-0 sm:left-2',
        // Origin for animation
        isAbove ? 'origin-bottom-left' : 'origin-top-left',
        // Visibility
        isOpen
          ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
          : cn(
              'opacity-0 scale-95 pointer-events-none',
              isAbove ? 'translate-y-2' : '-translate-y-2'
            )
      )}
      role="menu"
      aria-hidden={!isOpen}
    >
      {/* Main Menu */}
      {isMainView && (
        <div className="p-1.5 sm:p-2 animate-in fade-in duration-200">
          {FILE_MENU_ITEMS.map((item) => {
            let label = item.label
            if (item.id === 'onedrive') {
              if (isOneDriveLinked === null) {
                label = 'Add from OneDrive (Checking...)'
              } else if (isOneDriveLinked) {
                label = 'Add from OneDrive (Connected)'
              } else {
                label = 'Add from OneDrive (Connect)'
              }
            }

            return (
              <MenuItem
                key={item.id}
                icon={item.icon}
                label={label}
                onClick={() => {
                  if (item.id === 'upload') {
                    store.panelAState = 'upload'
                  } else if (item.id === 'screenshot') {
                    handleTakeScreenshot()
                    store.isPanelAOpen = false
                  } else if (item.id === 'record') {
                    handleRecordScreen()
                    store.isPanelAOpen = false
                  } else if (item.id === 'onedrive') {
                    if (isOneDriveLinked) {
                      setOneDriveFolderStack([])
                      setOneDriveSearchQuery('')
                      store.panelAState = 'onedrive'
                    } else {
                      toast.error('Please connect OneDrive from Settings first.')
                    }
                  } else {
                    console.log(item.id)
                  }
                }}
              />
            )
          })}

          <MenuItem
            icon={<LuFolderOpen size={14} className="text-amber-500" />}
            label="Use a Knowledgebase"
            onClick={() => {
              store.panelAState = 'projects'
            }}
            hasSubmenu
            hasBorder
          />

          <MenuItem
            icon={<LuPlay size={14} className="text-emerald-500" />}
            label="Deploy as a widget"
            onClick={() => console.log('deploy')}
            hasBorder
          />
        </div>
      )}

      {/* Projects View */}
      {isProjectsView && (
        <div className="animate-in fade-in slide-in-from-right-2 duration-200">
          <SearchHeader
            onBack={() => {
              store.panelAState = 'main'
            }}
            placeholder="Search knowledge bases..."
            value={kbSearchQuery}
            onChange={(value) => {
              setKbSearchQuery(value)
            }}
          />

          <div className="p-1.5 sm:p-2 max-h-[200px] overflow-y-auto">
            {knowledgeBases.map((kb) => {
              const isSelected = store.selectedProjectSlug === kb.slug
              return (
                <button
                  key={kb.id}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      store.selectedProject = null
                      store.selectedProjectSlug = null
                    } else {
                      store.selectedProject = kb.name
                      store.selectedProjectSlug = kb.slug
                    }
                  }}
                  className={cn(
                    'flex items-center gap-2.5 w-full p-2.5 sm:p-3 rounded-lg',
                    'text-left text-xs sm:text-sm',
                    'transition-all duration-200',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50',
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      : 'text-zinc-600 dark:text-white/60 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5'
                  )}
                >
                  <LuFolder
                    size={14}
                    className={isSelected ? 'text-blue-500' : 'text-zinc-400 dark:text-white/40'}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{kb.name}</p>
                    <p className="text-[10px] text-zinc-400 truncate">/{kb.slug}</p>
                  </div>
                  {isSelected && <FaCheck size={12} className="text-blue-500" />}
                </button>
              )
            })}

            <div ref={kbLoadMoreRef} className="flex justify-center py-2">
              {isKbLoadingMore && (
                <span className="text-[10px] text-zinc-400">Loading more...</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* OneDrive Files View */}
      {isOneDriveView && (
        <div className="animate-in fade-in slide-in-from-right-2 duration-200 w-[360px]">
          <SearchHeader
            onBack={() => {
              if (oneDriveFolderStack.length > 0) {
                setOneDriveFolderStack((prev) => prev.slice(0, -1))
              } else {
                store.panelAState = 'main'
              }
            }}
            placeholder="Search OneDrive files..."
            value={oneDriveSearchQuery}
            onChange={(value) => {
              setOneDriveSearchQuery(value)
            }}
          />

          <div className="p-1.5 sm:p-2 max-h-[220px] overflow-y-auto">
            {isOneDriveLoading && (
              <p className="text-[11px] text-zinc-400 px-1 py-2">Loading OneDrive files...</p>
            )}

            {!isOneDriveLoading && oneDriveError && (
              <p className="text-[11px] text-red-500 px-1 py-2">{oneDriveError}</p>
            )}

            {!isOneDriveLoading && !oneDriveError && filteredOneDriveFiles.length === 0 && (
              <p className="text-[11px] text-zinc-400 px-1 py-2">No OneDrive files found.</p>
            )}

            {filteredOneDriveFiles.map((file) => (
              <button
                key={file.id}
                type="button"
                onClick={() => {
                  if (!file.mimeType) {
                    setOneDriveFolderStack((prev) => [...prev, file.id])
                  } else {
                    handleAttachOneDriveFile(file)
                  }
                }}
                className={cn(
                  'flex items-center gap-2.5 w-full p-2.5 sm:p-3 rounded-lg',
                  'text-left text-xs sm:text-sm',
                  'transition-all duration-200',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50',
                  'text-zinc-600 dark:text-white/60 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5'
                )}
              >
                {file.mimeType ? (
                  <GrOnedrive size={14} className="text-blue-500" />
                ) : (
                  <LuFolder size={14} className="text-amber-500" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="truncate">{file.name}</p>
                  <p className="text-[10px] text-zinc-400 truncate">
                    {file.createdBy ? `${file.createdBy} • ` : ''}
                    {new Date(file.lastModifiedDateTime).toLocaleString()}
                  </p>
                </div>
                <span className="text-[10px] text-zinc-400">
                  {file.mimeType ? `${Math.max(1, Math.round(file.size / 1024))} KB` : 'Folder'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Upload View - Beautiful Glassmorphism Design */}
      {isUploadView && (
        <div className="animate-in fade-in slide-in-from-right-2 duration-300 w-[360px]">
          {/* Header with gradient */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-pink-500/10 dark:from-violet-500/20 dark:via-fuchsia-500/20 dark:to-pink-500/20" />
            <div className="relative flex items-center gap-2 p-3 border-b border-zinc-100 dark:border-white/10">
              <button
                type="button"
                onClick={() => {
                  store.panelAState = 'main'
                }}
                aria-label="Go back"
                className={cn(
                  'flex-shrink-0 p-1.5 rounded-lg',
                  'text-zinc-600 dark:text-white',
                  'hover:bg-white/50 dark:hover:bg-white/10',
                  'transition-colors duration-200'
                )}
              >
                <LuArrowLeft size={16} />
              </button>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-zinc-800 dark:text-white">
                  Upload Files
                </h3>
                <p className="text-[10px] text-zinc-500 dark:text-white/50">
                  Images, PDFs, documents
                </p>
              </div>
            </div>
          </div>

          <div className="p-4">
            {/* Premium Drop Zone */}
            <button
              type="button"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'relative w-full overflow-hidden rounded-2xl p-8 cursor-pointer',
                'transition-all duration-500 ease-out',
                'group',
                isDragging
                  ? 'scale-[1.02] shadow-2xl shadow-violet-500/20'
                  : 'hover:scale-[1.01] hover:shadow-xl hover:shadow-violet-500/10'
              )}
            >
              {/* Animated gradient background */}
              <div
                className={cn(
                  'absolute inset-0 transition-all duration-500',
                  isDragging
                    ? 'bg-gradient-to-br from-violet-500/20 via-fuchsia-500/20 to-pink-500/20'
                    : 'bg-gradient-to-br from-zinc-100 via-zinc-50 to-white dark:from-zinc-800/50 dark:via-zinc-900/50 dark:to-zinc-950/50'
                )}
              />

              {/* Animated border */}
              <div
                className={cn(
                  'absolute inset-0 rounded-2xl transition-all duration-500',
                  isDragging
                    ? 'border-2 border-violet-400 dark:border-violet-500'
                    : 'border-2 border-dashed border-zinc-200 dark:border-white/10 group-hover:border-violet-300 dark:group-hover:border-violet-500/50'
                )}
              />

              {/* Glow effect when dragging */}
              {isDragging && (
                <div className="absolute inset-0 animate-pulse">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-pink-500/10 blur-xl" />
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.txt,.md,.csv,.json,.xml"
              />

              <div className="relative flex flex-col items-center gap-4 text-center">
                {/* Animated icon container */}
                <div
                  className={cn(
                    'relative p-4 rounded-2xl transition-all duration-500',
                    isDragging
                      ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/30 scale-110'
                      : 'bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-700 dark:to-zinc-800 group-hover:from-violet-100 group-hover:to-fuchsia-100 dark:group-hover:from-violet-900/50 dark:group-hover:to-fuchsia-900/50'
                  )}
                >
                  <LuUpload
                    size={28}
                    className={cn(
                      'transition-all duration-500',
                      isDragging
                        ? 'text-white animate-bounce'
                        : 'text-zinc-400 dark:text-white/40 group-hover:text-violet-500 dark:group-hover:text-violet-400'
                    )}
                  />

                  {/* Floating particles effect */}
                  <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-violet-400 opacity-0 group-hover:opacity-100 group-hover:animate-ping" />
                  <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 rounded-full bg-fuchsia-400 opacity-0 group-hover:opacity-100 group-hover:animate-ping animation-delay-200" />
                </div>

                <div className="space-y-1">
                  <p
                    className={cn(
                      'text-base font-semibold transition-colors duration-300',
                      isDragging
                        ? 'text-violet-600 dark:text-violet-400'
                        : 'text-zinc-700 dark:text-white/80 group-hover:text-violet-600 dark:group-hover:text-violet-400'
                    )}
                  >
                    {isDragging ? '✨ Release to upload' : 'Drop files here'}
                  </p>
                  <p className="text-xs text-zinc-400 dark:text-white/40">
                    or <span className="text-violet-500 font-medium">browse</span> your computer
                  </p>
                </div>

                {/* File type badges */}
                <div className="flex flex-wrap justify-center gap-1.5">
                  {['PNG', 'JPG', 'PDF', 'DOC'].map((type) => (
                    <span
                      key={type}
                      className={cn(
                        'px-2 py-0.5 rounded-md text-[10px] font-medium',
                        'bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-white/40',
                        'group-hover:bg-violet-100 dark:group-hover:bg-violet-500/10',
                        'group-hover:text-violet-600 dark:group-hover:text-violet-400',
                        'transition-colors duration-300'
                      )}
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            </button>

            {/* Beautiful File Preview Grid */}
            {store.uploadedFiles && store.uploadedFiles.length > 0 && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between px-1">
                  <p className="text-xs font-semibold text-zinc-600 dark:text-white/60">
                    {store.uploadedFiles.length} file{store.uploadedFiles.length > 1 ? 's' : ''}{' '}
                    ready
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      store.uploadedFiles = null
                    }}
                    className="text-[10px] text-red-500 hover:text-red-600 font-medium"
                  >
                    Clear all
                  </button>
                </div>

                {/* File grid with image previews */}
                <div className="grid grid-cols-3 gap-2 max-h-[180px] overflow-y-auto p-1">
                  {store.uploadedFiles.map((file, index) => (
                    <FilePreviewItem
                      key={`${file.name}-${index}`}
                      file={file}
                      index={index}
                      onRemove={handleRemoveFile}
                    />
                  ))}
                </div>

                {/* Done Button - Gradient */}
                <button
                  type="button"
                  onClick={() => {
                    store.panelAState = 'main'
                    store.isPanelAOpen = false
                  }}
                  className={cn(
                    'w-full py-2.5 mt-2 rounded-xl text-sm font-semibold',
                    'bg-gradient-to-r from-violet-500 to-fuchsia-500',
                    'hover:from-violet-600 hover:to-fuchsia-600',
                    'text-white shadow-lg shadow-violet-500/20',
                    'transition-all duration-300 hover:scale-[1.02]'
                  )}
                >
                  ✓ Attach {store.uploadedFiles.length} file
                  {store.uploadedFiles.length > 1 ? 's' : ''}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
