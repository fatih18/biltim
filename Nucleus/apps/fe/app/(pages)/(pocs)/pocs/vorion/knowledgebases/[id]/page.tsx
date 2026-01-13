'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LuArchive,
  LuArrowLeft,
  LuBookOpen,
  LuDatabase,
  LuFileText,
  LuGlobe,
  LuHash,
  LuLoader,
  LuLock,
  LuPause,
  LuPlay,
  LuPlus,
  LuSearch,
  LuSettings,
  LuTag,
  LuTrash2,
  LuUpload,
  LuUsers,
} from 'react-icons/lu'
import { toast } from 'sonner'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'
import { useKnowledgeBaseStore } from '@/app/_store'
import { cn } from '@/app/_utils'
import type {
  VorionDocumentListItem,
  VorionKnowledgeBaseResponse,
  VorionSearchResult,
} from '@/lib/api'
import {
  ConfirmModal,
  DocumentCard,
  SearchModal,
  type UploadData,
  UploadDocumentsModal,
} from '../../_components'

// ============================================================================
// Helpers
// ============================================================================

function parseErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    try {
      const parsed = JSON.parse(error)
      return parsed.detail || parsed.message || error
    } catch {
      return error
    }
  }
  if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>
    return String(e.detail || e.message || 'An error occurred')
  }
  return 'An error occurred'
}

const VISIBILITY_CONFIG = {
  private: { icon: LuLock, label: 'Private', color: 'text-zinc-600 dark:text-zinc-400' },
  app: { icon: LuUsers, label: 'Team', color: 'text-blue-600 dark:text-blue-400' },
  public: { icon: LuGlobe, label: 'Public', color: 'text-emerald-600 dark:text-emerald-400' },
} as const

const STATUS_CONFIG = {
  active: {
    icon: LuPlay,
    label: 'Active',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
  },
  paused: {
    icon: LuPause,
    label: 'Paused',
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
  },
  archived: {
    icon: LuArchive,
    label: 'Archived',
    color: 'text-zinc-600',
    bg: 'bg-zinc-100 dark:bg-zinc-500/10',
  },
} as const

type SearchResultItem = {
  id: string
  content: string
  score: number
  document_title: string
  chunk_index: number
}

const DOC_PAGE_SIZE = 20

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: string | number
}) {
  return (
    <div
      className={cn(
        'p-4 rounded-xl',
        'bg-white dark:bg-zinc-900',
        'border border-zinc-200/70 dark:border-white/10'
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-zinc-400" />
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
      </div>
      <p className="text-lg font-bold text-zinc-900 dark:text-white">{value}</p>
    </div>
  )
}

// ============================================================================
// Page Component
// ============================================================================

export default function KnowledgebaseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const kbId = params.id as string

  const store = useKnowledgeBaseStore()
  const actions = useGenericApiActions()
  const [knowledgeBase, setKnowledgeBase] = useState<VorionKnowledgeBaseResponse | null>(null)
  const [documents, setDocuments] = useState<VorionDocumentListItem[]>([])

  // Pagination state
  const [docSkip, setDocSkip] = useState(0)
  const [docTotal, setDocTotal] = useState(0)
  const [hasMoreDocs, setHasMoreDocs] = useState(true)
  const [isLoadingMoreDocs, setIsLoadingMoreDocs] = useState(false)
  const loadMoreDocsRef = useRef<HTMLDivElement>(null)

  // Modal states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([])
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null)

  // Load knowledge base
  useEffect(() => {
    actions.VORION_GET_KNOWLEDGE_BASE?.start({
      payload: { _kb_id: kbId },
      onAfterHandle: (data) => {
        if (data) setKnowledgeBase(data)
      },
      onErrorHandle: (error) => {
        toast.error(parseErrorMessage(error))
      },
    })
  }, [kbId])

  // Load documents (initial)
  useEffect(() => {
    actions.VORION_LIST_DOCUMENTS?.start({
      payload: { _kb_id: kbId, skip: 0, limit: DOC_PAGE_SIZE },
      onAfterHandle: (data) => {
        if (data?.items) {
          setDocuments(data.items)
          setDocTotal(data.total || 0)
          setDocSkip(data.items.length)
          setHasMoreDocs(
            data.items.length >= DOC_PAGE_SIZE && data.items.length < (data.total || 0)
          )
        }
      },
      onErrorHandle: (error) => {
        toast.error(parseErrorMessage(error))
      },
    })
  }, [kbId])

  // Load more documents
  const loadMoreDocs = useCallback(() => {
    if (isLoadingMoreDocs || !hasMoreDocs) return
    setIsLoadingMoreDocs(true)

    actions.VORION_LIST_DOCUMENTS?.start({
      payload: { _kb_id: kbId, skip: docSkip, limit: DOC_PAGE_SIZE },
      onAfterHandle: (data) => {
        if (data?.items) {
          const existingIds = new Set(documents.map((d) => d.id))
          const newItems = data.items.filter((d: VorionDocumentListItem) => !existingIds.has(d.id))
          setDocuments((prev) => [...prev, ...newItems])
          setDocSkip((prev) => prev + newItems.length)
          setHasMoreDocs(newItems.length >= DOC_PAGE_SIZE)
        }
        setIsLoadingMoreDocs(false)
      },
      onErrorHandle: (error) => {
        toast.error(parseErrorMessage(error))
        setIsLoadingMoreDocs(false)
      },
    })
  }, [kbId, docSkip, hasMoreDocs, isLoadingMoreDocs, documents])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry?.isIntersecting && hasMoreDocs && !isLoadingMoreDocs) {
          loadMoreDocs()
        }
      },
      { threshold: 0.1 }
    )

    const currentRef = loadMoreDocsRef.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [hasMoreDocs, isLoadingMoreDocs, loadMoreDocs])

  // Handle upload
  const handleUpload = useCallback(
    (data: UploadData) => {
      // Build FormData for file upload
      const formData = new FormData()
      const uploadData = {
        urls: data.urls.filter((u) => u.trim()),
        youtube_urls: data.youtubeUrls.filter((u) => u.trim()),
      }
      formData.append('data', JSON.stringify(uploadData))
      for (const file of data.files) {
        formData.append('files', file)
      }

      actions.VORION_UPLOAD_DOCUMENTS?.start({
        payload: { _kb_id: kbId, data: JSON.stringify(uploadData), files: data.files },
        onAfterHandle: (result) => {
          if (result) {
            toast.success(`Upload started! Batch ID: ${result.id}`)
            setIsUploadModalOpen(false)
            // Refresh documents list
            actions.VORION_LIST_DOCUMENTS?.start({
              payload: { _kb_id: kbId, limit: 100 },
              onAfterHandle: (docData) => {
                if (docData?.items) setDocuments(docData.items)
              },
            })
          }
        },
        onErrorHandle: (error) => {
          toast.error(parseErrorMessage(error))
        },
      })
    },
    [kbId]
  )

  // Handle search
  const handleSearch = useCallback(
    (query: string, searchType: 'semantic' | 'keyword' | 'hybrid') => {
      actions.VORION_SEARCH_KB?.start({
        payload: { _kb_id: kbId, query, search_type: searchType, top_k: 10 },
        onAfterHandle: (data) => {
          if (data?.results) {
            const mapped = data.results.map((r: VorionSearchResult) => ({
              id: String(r.chunk_id),
              content: r.text,
              score: r.score,
              document_title: r.document_title,
              chunk_index: r.chunk_id,
            }))
            setSearchResults(mapped)
          }
        },
        onErrorHandle: (error) => {
          toast.error(parseErrorMessage(error))
        },
      })
    },
    [kbId]
  )

  // Handle delete document
  const handleDeleteDocument = useCallback((docId: string) => {
    setDeletingDocId(docId)
    actions.VORION_DELETE_DOCUMENT?.start({
      payload: { _doc_id: docId },
      onAfterHandle: () => {
        setDocuments((prev) => prev.filter((d) => d.id !== docId))
        setDeletingDocId(null)
        toast.success('Document deleted')
      },
      onErrorHandle: (error) => {
        setDeletingDocId(null)
        toast.error(parseErrorMessage(error))
      },
    })
  }, [])

  // Handle delete knowledge base
  const handleDeleteKnowledgeBase = useCallback(() => {
    actions.VORION_DELETE_KNOWLEDGE_BASE?.start({
      payload: { _kb_id: kbId },
      onAfterHandle: () => {
        store.removeKnowledgeBase(kbId)
        toast.success('Knowledge base deleted')
        router.push('/pocs/vorion/knowledgebases')
      },
      onErrorHandle: (error) => {
        toast.error(parseErrorMessage(error))
      },
    })
  }, [kbId, router])

  // Handle status toggle - visibility-based (API doesn't have status endpoint)
  const handleToggleStatus = useCallback(() => {
    if (!knowledgeBase) return
    // Toggle visibility as a workaround since status isn't in update payload
    const newVisibility = knowledgeBase.visibility === 'private' ? 'app' : 'private'

    actions.VORION_UPDATE_KNOWLEDGE_BASE?.start({
      payload: { _kb_id: kbId, visibility: newVisibility },
      onAfterHandle: (data) => {
        if (data) {
          setKnowledgeBase(data)
          toast.success(`Knowledge base visibility changed to ${newVisibility}`)
        }
      },
      onErrorHandle: (error) => {
        toast.error(parseErrorMessage(error))
      },
    })
  }, [knowledgeBase, kbId])

  // Loading states from actions
  const isLoading = actions.VORION_GET_KNOWLEDGE_BASE?.state?.isPending ?? false
  const isUploading = actions.VORION_UPLOAD_DOCUMENTS?.state?.isPending ?? false
  const isSearching = actions.VORION_SEARCH_KB?.state?.isPending ?? false
  const isDeleting = actions.VORION_DELETE_KNOWLEDGE_BASE?.state?.isPending ?? false

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <LuLoader size={32} className="animate-spin text-[#c68e76]" />
      </div>
    )
  }

  if (!knowledgeBase) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center">
        <LuBookOpen size={48} className="text-zinc-300 dark:text-zinc-600 mb-4" />
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
          Knowledge Base Not Found
        </h2>
        <Link href="/pocs/vorion/knowledgebases" className="text-[#c68e76] hover:underline">
          Back to Knowledge Bases
        </Link>
      </div>
    )
  }

  const visibilityKey = (knowledgeBase.visibility || 'private') as keyof typeof VISIBILITY_CONFIG
  const statusKey = (knowledgeBase.status || 'active') as keyof typeof STATUS_CONFIG
  const visibilityConfig = VISIBILITY_CONFIG[visibilityKey] || VISIBILITY_CONFIG.private
  const statusConfig = STATUS_CONFIG[statusKey] || STATUS_CONFIG.active
  const VisibilityIcon = visibilityConfig.icon
  const StatusIcon = statusConfig.icon

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header
        className={cn(
          'sticky top-0 z-40',
          'bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md',
          'border-b border-zinc-200 dark:border-white/10'
        )}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Back + Title */}
            <div className="flex items-center gap-4">
              <Link
                href="/pocs/vorion/knowledgebases"
                className={cn(
                  'p-2 rounded-lg',
                  'text-zinc-400 hover:text-zinc-600 dark:hover:text-white',
                  'hover:bg-zinc-100 dark:hover:bg-white/5',
                  'transition-colors'
                )}
              >
                <LuArrowLeft size={20} />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                    {knowledgeBase.name}
                  </h1>
                  <div
                    className={cn(
                      'flex items-center gap-1 px-2 py-0.5 rounded-full',
                      statusConfig.bg
                    )}
                  >
                    <StatusIcon size={12} className={statusConfig.color} />
                    <span className={cn('text-[10px] font-medium', statusConfig.color)}>
                      {statusConfig.label}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 font-mono">
                  /{knowledgeBase.slug}
                </p>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSearchModalOpen(true)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl',
                  'text-zinc-600 dark:text-zinc-400',
                  'hover:bg-zinc-100 dark:hover:bg-white/5',
                  'transition-colors'
                )}
              >
                <LuSearch size={16} />
                <span className="hidden sm:inline text-sm">Search</span>
              </button>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(true)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl',
                  'bg-[#c68e76] hover:bg-[#b07d67]',
                  'text-white font-medium text-sm',
                  'transition-colors'
                )}
              >
                <LuUpload size={16} />
                <span className="hidden sm:inline">Upload</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard icon={LuFileText} label="Documents" value={knowledgeBase.document_count} />
          <StatCard
            icon={LuHash}
            label="Chunks"
            value={(knowledgeBase.chunk_count || 0).toLocaleString()}
          />
          <StatCard
            icon={LuDatabase}
            label="Size"
            value={formatBytes(knowledgeBase.total_size_bytes || 0)}
          />
          <StatCard icon={VisibilityIcon} label="Visibility" value={visibilityConfig.label} />
          <StatCard icon={LuSettings} label="Chunk Size" value={knowledgeBase.default_chunk_size} />
          <StatCard icon={LuSettings} label="Overlap" value={knowledgeBase.default_chunk_overlap} />
        </div>

        {/* Tags */}
        {knowledgeBase.tags && knowledgeBase.tags.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {knowledgeBase.tags.map((tag) => (
              <span
                key={tag}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-lg',
                  'text-sm font-medium',
                  'bg-zinc-100 dark:bg-white/5',
                  'text-zinc-600 dark:text-zinc-400'
                )}
              >
                <LuTag size={12} />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        {knowledgeBase.description && (
          <div className="mb-8 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{knowledgeBase.description}</p>
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Documents ({docTotal > 0 ? `${documents.length}/${docTotal}` : documents.length})
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleStatus}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm',
                'text-zinc-600 dark:text-zinc-400',
                'hover:bg-zinc-100 dark:hover:bg-white/5',
                'transition-colors'
              )}
            >
              {knowledgeBase.status === 'active' ? <LuPause size={14} /> : <LuPlay size={14} />}
              {knowledgeBase.status === 'active' ? 'Pause' : 'Activate'}
            </button>
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm',
                'text-red-600 dark:text-red-400',
                'hover:bg-red-50 dark:hover:bg-red-500/10',
                'transition-colors'
              )}
            >
              <LuTrash2 size={14} />
              Delete KB
            </button>
          </div>
        </div>

        {/* Documents List */}
        {documents.length === 0 ? (
          <div
            className={cn(
              'flex flex-col items-center justify-center py-16',
              'bg-white dark:bg-zinc-900 rounded-2xl',
              'border border-zinc-200/70 dark:border-white/10'
            )}
          >
            <LuFileText size={40} className="text-zinc-300 dark:text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">
              No documents yet
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              Upload files, URLs, or YouTube videos to get started
            </p>
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl',
                'bg-[#c68e76] hover:bg-[#b07d67]',
                'text-white font-medium text-sm',
                'transition-colors'
              )}
            >
              <LuPlus size={16} />
              Upload Documents
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {documents.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  onDelete={handleDeleteDocument}
                  isDeleting={deletingDocId === doc.id}
                />
              ))}
            </div>

            {/* Infinite Scroll Trigger */}
            {hasMoreDocs && (
              <div ref={loadMoreDocsRef} className="flex justify-center py-8">
                {isLoadingMoreDocs && (
                  <div className="flex items-center gap-2 text-zinc-400">
                    <LuLoader size={20} className="animate-spin" />
                    <span className="text-sm">Loading more documents...</span>
                  </div>
                )}
              </div>
            )}

            {/* End of list indicator */}
            {!hasMoreDocs && documents.length > DOC_PAGE_SIZE && (
              <div className="text-center py-6 text-sm text-zinc-400">
                All {docTotal} documents loaded
              </div>
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <UploadDocumentsModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSubmit={handleUpload}
        isLoading={isUploading}
        knowledgeBaseName={knowledgeBase.name}
      />

      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSearch={handleSearch}
        isLoading={isSearching}
        knowledgeBaseName={knowledgeBase.name}
        results={searchResults}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteKnowledgeBase}
        title="Delete Knowledge Base"
        description={`"${knowledgeBase.name}" and all its documents will be permanently deleted. This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  )
}
