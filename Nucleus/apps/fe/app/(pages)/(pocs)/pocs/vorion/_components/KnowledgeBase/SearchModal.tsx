'use client'

import { useCallback, useState } from 'react'
import { LuBookOpen, LuHash, LuLoader, LuSearch, LuSparkles, LuX, LuZap } from 'react-icons/lu'
import { cn } from '@/app/_utils'

// ============================================================================
// Types
// ============================================================================

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSearch: (query: string, type: SearchType) => void
  isLoading?: boolean
  knowledgeBaseName?: string
  results?: SearchResult[]
}

export type SearchType = 'semantic' | 'keyword' | 'hybrid'

export interface SearchResult {
  id: string
  content: string
  score: number
  document_title: string
  chunk_index: number
}

// ============================================================================
// Component
// ============================================================================

export function SearchModal({
  isOpen,
  onClose,
  onSearch,
  isLoading = false,
  knowledgeBaseName,
  results = [],
}: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [searchType, setSearchType] = useState<SearchType>('semantic')

  const handleSearch = useCallback(() => {
    if (!query.trim()) return
    onSearch(query.trim(), searchType)
  }, [query, searchType, onSearch])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSearch()
      }
    },
    [handleSearch]
  )

  const handleClose = useCallback(() => {
    setQuery('')
    setSearchType('semantic')
    onClose()
  }, [onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 cursor-default"
        onClick={handleClose}
        aria-label="Close modal"
      />

      {/* Modal */}
      <div
        className={cn(
          'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
          'w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col',
          'bg-white dark:bg-zinc-900',
          'rounded-2xl shadow-2xl shadow-black/20',
          'border border-zinc-200 dark:border-white/10',
          'animate-in fade-in zoom-in-95 duration-200'
        )}
      >
        {/* Header */}
        <div className="p-5 border-b border-zinc-100 dark:border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-[#c68e76]/10 to-[#b07d67]/10">
                <LuSearch size={20} className="text-[#c68e76]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  Search Knowledge Base
                </h2>
                {knowledgeBaseName && (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">in {knowledgeBaseName}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className={cn(
                'p-2 rounded-lg',
                'text-zinc-400 hover:text-zinc-600 dark:hover:text-white',
                'hover:bg-zinc-100 dark:hover:bg-white/5',
                'transition-colors'
              )}
            >
              <LuX size={20} />
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <LuSearch
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What are you looking for?"
              className={cn(
                'w-full pl-11 pr-4 py-3 rounded-xl',
                'bg-zinc-50 dark:bg-white/5',
                'border border-zinc-200 dark:border-white/10',
                'text-zinc-900 dark:text-white',
                'placeholder:text-zinc-400',
                'focus:outline-none focus:ring-2 focus:ring-[#c68e76]/50',
                'transition-all'
              )}
            />
          </div>

          {/* Search Type Selector */}
          <div className="flex gap-2 mt-3">
            {[
              {
                id: 'semantic' as const,
                label: 'Semantic',
                icon: LuSparkles,
                desc: 'AI-powered meaning search',
              },
              {
                id: 'keyword' as const,
                label: 'Keyword',
                icon: LuHash,
                desc: 'Exact text matching',
              },
              { id: 'hybrid' as const, label: 'Hybrid', icon: LuZap, desc: 'Best of both' },
            ].map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => setSearchType(type.id)}
                className={cn(
                  'flex-1 flex items-center gap-2 px-3 py-2 rounded-xl',
                  'border transition-all',
                  searchType === type.id
                    ? 'bg-[#c68e76]/10 border-[#c68e76]/30 text-[#c68e76]'
                    : 'bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                )}
              >
                <type.icon size={14} />
                <span className="text-sm font-medium">{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <LuLoader size={28} className="animate-spin text-[#c68e76] mb-3" />
              <p className="text-sm text-zinc-500">Searching...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-zinc-500 mb-4">
                Found {results.length} result{results.length !== 1 ? 's' : ''}
              </p>
              {results.map((result, index) => (
                <div
                  key={result.id}
                  className={cn(
                    'p-4 rounded-xl',
                    'bg-zinc-50 dark:bg-white/5',
                    'border border-zinc-100 dark:border-white/10',
                    'animate-in fade-in slide-in-from-bottom-2'
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <LuBookOpen size={14} className="text-zinc-400" />
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        {result.document_title}
                      </span>
                      <span className="text-xs text-zinc-400">Chunk #{result.chunk_index}</span>
                    </div>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-bold',
                        result.score > 0.8
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                          : result.score > 0.5
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                            : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-500/10 dark:text-zinc-400'
                      )}
                    >
                      {(result.score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3">
                    {result.content}
                  </p>
                </div>
              ))}
            </div>
          ) : query ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <LuSearch size={32} className="text-zinc-300 dark:text-zinc-600 mb-3" />
              <p className="text-zinc-500 dark:text-zinc-400">Press Enter to search</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <LuSparkles size={32} className="text-zinc-300 dark:text-zinc-600 mb-3" />
              <p className="text-zinc-500 dark:text-zinc-400">
                Enter a query to search your knowledge base
              </p>
              <p className="text-xs text-zinc-400 mt-1">Try semantic search for best results</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-zinc-100 dark:border-white/5">
          <button
            type="button"
            onClick={handleClose}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium',
              'text-zinc-600 dark:text-zinc-400',
              'hover:bg-zinc-100 dark:hover:bg-white/5',
              'transition-colors'
            )}
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSearch}
            disabled={isLoading || !query.trim()}
            className={cn(
              'flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium',
              'bg-[#c68e76] hover:bg-[#b07d67]',
              'text-white',
              'transition-colors',
              (isLoading || !query.trim()) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isLoading ? <LuLoader size={14} className="animate-spin" /> : <LuSearch size={14} />}
            Search
          </button>
        </div>
      </div>
    </>
  )
}
