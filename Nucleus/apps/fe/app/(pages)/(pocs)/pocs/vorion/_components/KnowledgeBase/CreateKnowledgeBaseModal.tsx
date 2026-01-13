'use client'

import { useCallback, useState } from 'react'
import { LuBookOpen, LuGlobe, LuLoader, LuLock, LuUsers, LuX } from 'react-icons/lu'
import { cn } from '@/app/_utils'

// ============================================================================
// Types
// ============================================================================

interface CreateKnowledgeBaseModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateKnowledgeBaseData) => void
  isLoading?: boolean
}

export interface CreateKnowledgeBaseData {
  name: string
  slug: string
  description?: string
  visibility: 'private' | 'app' | 'public'
  default_chunk_size: number
  default_chunk_overlap: number
}

// ============================================================================
// Helpers
// ============================================================================

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const VISIBILITY_OPTIONS = [
  {
    value: 'private' as const,
    label: 'Private',
    description: 'Only you can access',
    icon: LuLock,
  },
  {
    value: 'app' as const,
    label: 'Team',
    description: 'Team members can access',
    icon: LuUsers,
  },
  {
    value: 'public' as const,
    label: 'Public',
    description: 'Anyone can access',
    icon: LuGlobe,
  },
]

// ============================================================================
// Component
// ============================================================================

export function CreateKnowledgeBaseModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: CreateKnowledgeBaseModalProps) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<'private' | 'app' | 'public'>('private')
  const [chunkSize, setChunkSize] = useState(1000)
  const [chunkOverlap, setChunkOverlap] = useState(200)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

  const handleNameChange = useCallback(
    (value: string) => {
      setName(value)
      if (!slugManuallyEdited) {
        setSlug(generateSlug(value))
      }
    },
    [slugManuallyEdited]
  )

  const handleSlugChange = useCallback((value: string) => {
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
    setSlugManuallyEdited(true)
  }, [])

  const handleSubmit = useCallback(() => {
    if (!name.trim() || !slug.trim()) return

    onSubmit({
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim() || undefined,
      visibility,
      default_chunk_size: chunkSize,
      default_chunk_overlap: chunkOverlap,
    })
  }, [name, slug, description, visibility, chunkSize, chunkOverlap, onSubmit])

  const handleClose = useCallback(() => {
    if (isLoading) return
    setName('')
    setSlug('')
    setDescription('')
    setVisibility('private')
    setChunkSize(1000)
    setChunkOverlap(200)
    setSlugManuallyEdited(false)
    onClose()
  }, [isLoading, onClose])

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
          'w-full max-w-lg max-h-[90vh] overflow-auto',
          'bg-white dark:bg-zinc-900',
          'rounded-2xl shadow-2xl shadow-black/20',
          'border border-zinc-200 dark:border-white/10',
          'animate-in fade-in zoom-in-95 duration-200'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#c68e76]/10">
              <LuBookOpen size={20} className="text-[#c68e76]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Create Knowledge Base
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Store and search your documents
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className={cn(
              'p-2 rounded-lg',
              'text-zinc-400 hover:text-zinc-600 dark:hover:text-white',
              'hover:bg-zinc-100 dark:hover:bg-white/5',
              'transition-colors',
              isLoading && 'opacity-50 cursor-not-allowed'
            )}
          >
            <LuX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Name */}
          <div>
            <label
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              htmlFor="name"
            >
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="My Knowledge Base"
              disabled={isLoading}
              className={cn(
                'w-full px-4 py-2.5 rounded-xl',
                'bg-zinc-50 dark:bg-white/5',
                'border border-zinc-200 dark:border-white/10',
                'text-zinc-900 dark:text-white',
                'placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
                'focus:outline-none focus:ring-2 focus:ring-[#c68e76]/50',
                'transition-all',
                isLoading && 'opacity-50 cursor-not-allowed'
              )}
            />
          </div>

          {/* Slug */}
          <div>
            <label
              htmlFor="slug"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
            >
              Slug <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="my-knowledge-base"
                disabled={isLoading}
                className={cn(
                  'w-full pl-7 pr-4 py-2.5 rounded-xl font-mono text-sm',
                  'bg-zinc-50 dark:bg-white/5',
                  'border border-zinc-200 dark:border-white/10',
                  'text-zinc-900 dark:text-white',
                  'placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
                  'focus:outline-none focus:ring-2 focus:ring-[#c68e76]/50',
                  'transition-all',
                  isLoading && 'opacity-50 cursor-not-allowed'
                )}
              />
            </div>
            <p className="mt-1.5 text-xs text-zinc-400">
              URL-friendly identifier (lowercase, numbers, hyphens only)
            </p>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
            >
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this knowledge base about?"
              rows={3}
              disabled={isLoading}
              className={cn(
                'w-full px-4 py-2.5 rounded-xl resize-none',
                'bg-zinc-50 dark:bg-white/5',
                'border border-zinc-200 dark:border-white/10',
                'text-zinc-900 dark:text-white',
                'placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
                'focus:outline-none focus:ring-2 focus:ring-[#c68e76]/50',
                'transition-all',
                isLoading && 'opacity-50 cursor-not-allowed'
              )}
            />
          </div>

          {/* Visibility */}
          <div>
            <label
              htmlFor="visibility"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
            >
              Visibility
            </label>
            <div className="grid grid-cols-3 gap-2">
              {VISIBILITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setVisibility(option.value)}
                  disabled={isLoading}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-3 rounded-xl',
                    'border transition-all duration-200',
                    visibility === option.value
                      ? 'bg-[#c68e76]/10 border-[#c68e76]/30 text-[#c68e76]'
                      : 'bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20',
                    isLoading && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <option.icon
                    size={18}
                    className={visibility === option.value ? 'text-[#c68e76]' : 'text-zinc-400'}
                  />
                  <span
                    className={cn(
                      'text-xs font-medium',
                      visibility === option.value
                        ? 'text-[#c68e76]'
                        : 'text-zinc-600 dark:text-zinc-400'
                    )}
                  >
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Settings */}
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300">
              Advanced settings
            </summary>
            <div className="mt-3 space-y-4 p-4 rounded-xl bg-zinc-50 dark:bg-white/5">
              <div>
                <label
                  htmlFor="chunkSize"
                  className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5"
                >
                  Chunk Size (characters)
                </label>
                <input
                  type="number"
                  value={chunkSize}
                  onChange={(e) => setChunkSize(Number(e.target.value))}
                  min={100}
                  max={10000}
                  disabled={isLoading}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg text-sm',
                    'bg-white dark:bg-zinc-900',
                    'border border-zinc-200 dark:border-white/10',
                    'text-zinc-900 dark:text-white',
                    'focus:outline-none focus:ring-2 focus:ring-[#c68e76]/50'
                  )}
                />
              </div>
              <div>
                <label
                  htmlFor="chunkOverlap"
                  className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5"
                >
                  Chunk Overlap (characters)
                </label>
                <input
                  type="number"
                  value={chunkOverlap}
                  onChange={(e) => setChunkOverlap(Number(e.target.value))}
                  min={0}
                  max={1000}
                  disabled={isLoading}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg text-sm',
                    'bg-white dark:bg-zinc-900',
                    'border border-zinc-200 dark:border-white/10',
                    'text-zinc-900 dark:text-white',
                    'focus:outline-none focus:ring-2 focus:ring-[#c68e76]/50'
                  )}
                />
              </div>
            </div>
          </details>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-zinc-100 dark:border-white/5">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium',
              'text-zinc-600 dark:text-zinc-400',
              'hover:bg-zinc-100 dark:hover:bg-white/5',
              'transition-colors',
              isLoading && 'opacity-50 cursor-not-allowed'
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || !name.trim() || !slug.trim()}
            className={cn(
              'flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium',
              'bg-[#c68e76] hover:bg-[#b07d67] text-white',
              'transition-colors',
              (isLoading || !name.trim() || !slug.trim()) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isLoading && <LuLoader size={14} className="animate-spin" />}
            Create
          </button>
        </div>
      </div>
    </>
  )
}
