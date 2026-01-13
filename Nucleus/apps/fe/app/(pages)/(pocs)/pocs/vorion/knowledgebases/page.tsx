'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LuArrowLeft, LuLoader, LuPlus, LuSearch } from 'react-icons/lu'
import { toast } from 'sonner'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'
import { useKnowledgeBaseStore } from '@/app/_store'
import { cn } from '@/app/_utils'
import type { VorionKnowledgeBaseResponse } from '@/lib/api'
import {
  type CreateKnowledgeBaseData,
  CreateKnowledgeBaseModal,
  EmptyState,
  KnowledgeBaseCard,
} from '../_components'

// ============================================================================
// Constants
// ============================================================================

const PAGE_SIZE = 20

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

// ============================================================================
// Page Component
// ============================================================================

export default function KnowledgebasesPage() {
  const store = useKnowledgeBaseStore()
  const actions = useGenericApiActions()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [hasMore, setHasMore] = useState(true)
  const [currentSkip, setCurrentSkip] = useState(0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Load knowledge bases on mount
  useEffect(() => {
    actions.VORION_LIST_KNOWLEDGE_BASES?.start({
      payload: { skip: 0, limit: PAGE_SIZE },
      onAfterHandle: (data) => {
        if (data?.items) {
          store.setKnowledgeBases(data.items)
          setTotalCount(data.total || 0)
          setHasMore(data.items.length >= PAGE_SIZE && data.items.length < (data.total || 0))
          setCurrentSkip(data.items.length)
        }
      },
      onErrorHandle: (error) => {
        toast.error(parseErrorMessage(error))
      },
    })
  }, [])

  // Infinite scroll - load more
  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return
    setIsLoadingMore(true)

    actions.VORION_LIST_KNOWLEDGE_BASES?.start({
      payload: { skip: currentSkip, limit: PAGE_SIZE },
      onAfterHandle: (data) => {
        if (data?.items) {
          // Append to existing
          const existingIds = new Set(store.knowledgeBases.map((kb) => kb.id))
          const newItems = data.items.filter(
            (kb: VorionKnowledgeBaseResponse) => !existingIds.has(kb.id)
          )
          store.setKnowledgeBases([...store.knowledgeBases, ...newItems])
          setCurrentSkip((prev) => prev + newItems.length)
          setHasMore(newItems.length >= PAGE_SIZE)
        }
        setIsLoadingMore(false)
      },
      onErrorHandle: (error) => {
        toast.error(parseErrorMessage(error))
        setIsLoadingMore(false)
      },
    })
  }, [currentSkip, hasMore, isLoadingMore, store.knowledgeBases])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry?.isIntersecting && hasMore && !isLoadingMore) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    const currentRef = loadMoreRef.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [hasMore, isLoadingMore, loadMore])

  // Filter knowledge bases by search
  const filteredKnowledgeBases = store.knowledgeBases.filter((kb) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      kb.name.toLowerCase().includes(query) ||
      kb.slug.toLowerCase().includes(query) ||
      kb.description?.toLowerCase().includes(query)
    )
  })

  // Handle create
  const handleCreate = useCallback((data: CreateKnowledgeBaseData) => {
    actions.VORION_CREATE_KNOWLEDGE_BASE?.start({
      payload: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        visibility: data.visibility,
        default_chunk_size: data.default_chunk_size,
        default_chunk_overlap: data.default_chunk_overlap,
      },
      onAfterHandle: (newKb) => {
        if (newKb) {
          store.addKnowledgeBase(newKb)
          setIsCreateModalOpen(false)
          toast.success('Knowledge base created!')
        }
      },
      onErrorHandle: (error) => {
        toast.error(parseErrorMessage(error))
      },
    })
  }, [])

  const isLoading = actions.VORION_LIST_KNOWLEDGE_BASES?.state?.isPending ?? false
  const isCreating = actions.VORION_CREATE_KNOWLEDGE_BASE?.state?.isPending ?? false

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
                href="/pocs/vorion"
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
                <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Knowledge Bases</h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {totalCount > 0
                    ? `${totalCount} collections`
                    : 'Manage your document collections'}
                </p>
              </div>
            </div>

            {/* Right: Create button */}
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl',
                'bg-[#c68e76] hover:bg-[#b07d67]',
                'text-white font-medium text-sm',
                'transition-colors'
              )}
            >
              <LuPlus size={16} />
              <span className="hidden sm:inline">New Knowledge Base</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        {store.knowledgeBases.length > 0 && (
          <div className="mb-6">
            <div className="relative max-w-md">
              <LuSearch
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search knowledge bases..."
                className={cn(
                  'w-full pl-10 pr-4 py-2.5 rounded-xl',
                  'bg-white dark:bg-zinc-900',
                  'border border-zinc-200 dark:border-white/10',
                  'text-zinc-900 dark:text-white',
                  'placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
                  'focus:outline-none focus:ring-2 focus:ring-[#c68e76]/50',
                  'transition-all'
                )}
              />
            </div>
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <LuLoader size={32} className="animate-spin text-[#c68e76]" />
          </div>
        ) : store.knowledgeBases.length === 0 ? (
          <EmptyState onCreateClick={() => setIsCreateModalOpen(true)} />
        ) : filteredKnowledgeBases.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-500 dark:text-zinc-400">
              No knowledge bases found for "{searchQuery}"
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredKnowledgeBases.map((kb, index) => (
                <KnowledgeBaseCard key={kb.id} knowledgeBase={kb} index={index} />
              ))}
            </div>

            {/* Infinite Scroll Trigger */}
            {!searchQuery && hasMore && (
              <div ref={loadMoreRef} className="flex justify-center py-8">
                {isLoadingMore && (
                  <div className="flex items-center gap-2 text-zinc-400">
                    <LuLoader size={20} className="animate-spin" />
                    <span className="text-sm">Loading more...</span>
                  </div>
                )}
              </div>
            )}

            {/* End of list indicator */}
            {!hasMore && store.knowledgeBases.length > PAGE_SIZE && (
              <div className="text-center py-6 text-sm text-zinc-400">
                All {totalCount} knowledge bases loaded
              </div>
            )}
          </>
        )}
      </main>

      {/* Create Modal */}
      <CreateKnowledgeBaseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreate}
        isLoading={isCreating}
      />
    </div>
  )
}
