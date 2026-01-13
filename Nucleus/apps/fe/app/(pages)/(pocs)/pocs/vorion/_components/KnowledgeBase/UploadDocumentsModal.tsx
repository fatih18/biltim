'use client'

import { useCallback, useRef, useState } from 'react'
import {
  LuFile,
  LuFileText,
  LuGlobe,
  LuLoader,
  LuPlus,
  LuTrash2,
  LuUpload,
  LuX,
  LuYoutube,
} from 'react-icons/lu'
import { cn } from '@/app/_utils'

// ============================================================================
// Types
// ============================================================================

interface UploadDocumentsModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: UploadData) => void
  isLoading?: boolean
  knowledgeBaseName?: string
}

export interface UploadData {
  files: File[]
  urls: string[]
  youtubeUrls: string[]
}

type TabType = 'files' | 'urls' | 'youtube'

// ============================================================================
// Component
// ============================================================================

export function UploadDocumentsModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  knowledgeBaseName,
}: UploadDocumentsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('files')
  const [files, setFiles] = useState<File[]>([])
  const [urls, setUrls] = useState<string[]>([''])
  const [youtubeUrls, setYoutubeUrls] = useState<string[]>([''])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // File handlers
  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return
    setFiles((prev) => [...prev, ...Array.from(selectedFiles)])
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      handleFileSelect(e.dataTransfer.files)
    },
    [handleFileSelect]
  )

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  // URL handlers
  const updateUrl = useCallback((index: number, value: string) => {
    setUrls((prev) => prev.map((url, i) => (i === index ? value : url)))
  }, [])

  const addUrl = useCallback(() => {
    setUrls((prev) => [...prev, ''])
  }, [])

  const removeUrl = useCallback((index: number) => {
    setUrls((prev) => prev.filter((_, i) => i !== index))
  }, [])

  // YouTube handlers
  const updateYoutubeUrl = useCallback((index: number, value: string) => {
    setYoutubeUrls((prev) => prev.map((url, i) => (i === index ? value : url)))
  }, [])

  const addYoutubeUrl = useCallback(() => {
    setYoutubeUrls((prev) => [...prev, ''])
  }, [])

  const removeYoutubeUrl = useCallback((index: number) => {
    setYoutubeUrls((prev) => prev.filter((_, i) => i !== index))
  }, [])

  // Submit
  const handleSubmit = useCallback(() => {
    const validUrls = urls.filter((url) => url.trim())
    const validYoutubeUrls = youtubeUrls.filter((url) => url.trim())

    if (files.length === 0 && validUrls.length === 0 && validYoutubeUrls.length === 0) {
      return
    }

    onSubmit({
      files,
      urls: validUrls,
      youtubeUrls: validYoutubeUrls,
    })
  }, [files, urls, youtubeUrls, onSubmit])

  // Close handler
  const handleClose = useCallback(() => {
    if (isLoading) return
    setFiles([])
    setUrls([''])
    setYoutubeUrls([''])
    setActiveTab('files')
    onClose()
  }, [isLoading, onClose])

  const totalItems =
    files.length + urls.filter((u) => u.trim()).length + youtubeUrls.filter((u) => u.trim()).length

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
          'w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col',
          'bg-white dark:bg-zinc-900',
          'rounded-2xl shadow-2xl shadow-black/20',
          'border border-zinc-200 dark:border-white/10',
          'animate-in fade-in zoom-in-95 duration-200'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10">
              <LuUpload size={20} className="text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Upload Documents
              </h2>
              {knowledgeBaseName && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">to {knowledgeBaseName}</p>
              )}
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

        {/* Tabs */}
        <div className="flex border-b border-zinc-100 dark:border-white/5">
          {[
            { id: 'files' as const, label: 'Files', icon: LuFile, count: files.length },
            {
              id: 'urls' as const,
              label: 'URLs',
              icon: LuGlobe,
              count: urls.filter((u) => u.trim()).length,
            },
            {
              id: 'youtube' as const,
              label: 'YouTube',
              icon: LuYoutube,
              count: youtubeUrls.filter((u) => u.trim()).length,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-3',
                'text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'text-[#c68e76] border-b-2 border-[#c68e76] -mb-px'
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              )}
            >
              <tab.icon size={16} />
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                    activeTab === tab.id
                      ? 'bg-[#c68e76]/10 text-[#c68e76]'
                      : 'bg-zinc-100 dark:bg-white/10 text-zinc-500'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Files Tab */}
          {activeTab === 'files' && (
            <div className="space-y-4">
              {/* Drop Zone */}
              <button
                type="button"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'w-full p-8 rounded-2xl border-2 border-dashed',
                  'transition-all duration-300',
                  isDragging
                    ? 'border-violet-400 bg-violet-50 dark:bg-violet-500/10 scale-[1.02]'
                    : 'border-zinc-200 dark:border-white/10 hover:border-violet-300 dark:hover:border-violet-500/30'
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="hidden"
                  accept=".pdf,.txt,.csv,.json,.md,.docx,.html"
                />
                <div className="flex flex-col items-center gap-3">
                  <div
                    className={cn(
                      'p-4 rounded-2xl',
                      isDragging
                        ? 'bg-violet-100 dark:bg-violet-500/20'
                        : 'bg-zinc-100 dark:bg-white/5'
                    )}
                  >
                    <LuUpload
                      size={24}
                      className={cn(
                        'transition-colors',
                        isDragging ? 'text-violet-500' : 'text-zinc-400'
                      )}
                    />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-zinc-700 dark:text-white">
                      {isDragging ? 'Drop files here' : 'Drag & drop files'}
                    </p>
                    <p className="text-sm text-zinc-400">or click to browse</p>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-center">
                    {['PDF', 'TXT', 'CSV', 'JSON', 'MD', 'DOCX'].map((type) => (
                      <span
                        key={type}
                        className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-white/5 text-zinc-500"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              </button>

              {/* File List */}
              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl',
                        'bg-zinc-50 dark:bg-white/5',
                        'border border-zinc-100 dark:border-white/10'
                      )}
                    >
                      <LuFileText size={18} className="text-zinc-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-700 dark:text-white truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-zinc-400">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      >
                        <LuTrash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* URLs Tab */}
          {activeTab === 'urls' && (
            <div className="space-y-3">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Add web page URLs to scrape and index
              </p>
              {urls.map((url, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-1 relative">
                    <LuGlobe
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                    />
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => updateUrl(index, e.target.value)}
                      placeholder="https://example.com/page"
                      className={cn(
                        'w-full pl-10 pr-4 py-2.5 rounded-xl',
                        'bg-zinc-50 dark:bg-white/5',
                        'border border-zinc-200 dark:border-white/10',
                        'text-zinc-900 dark:text-white text-sm',
                        'placeholder:text-zinc-400',
                        'focus:outline-none focus:ring-2 focus:ring-[#c68e76]/50'
                      )}
                    />
                  </div>
                  {urls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeUrl(index)}
                      className="p-2.5 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    >
                      <LuTrash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addUrl}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl',
                  'text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-white',
                  'hover:bg-zinc-100 dark:hover:bg-white/5',
                  'transition-colors'
                )}
              >
                <LuPlus size={14} />
                Add another URL
              </button>
            </div>
          )}

          {/* YouTube Tab */}
          {activeTab === 'youtube' && (
            <div className="space-y-3">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Add YouTube video URLs to transcribe and index
              </p>
              {youtubeUrls.map((url, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-1 relative">
                    <LuYoutube
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500"
                    />
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => updateYoutubeUrl(index, e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      className={cn(
                        'w-full pl-10 pr-4 py-2.5 rounded-xl',
                        'bg-zinc-50 dark:bg-white/5',
                        'border border-zinc-200 dark:border-white/10',
                        'text-zinc-900 dark:text-white text-sm',
                        'placeholder:text-zinc-400',
                        'focus:outline-none focus:ring-2 focus:ring-[#c68e76]/50'
                      )}
                    />
                  </div>
                  {youtubeUrls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeYoutubeUrl(index)}
                      className="p-2.5 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    >
                      <LuTrash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addYoutubeUrl}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl',
                  'text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-white',
                  'hover:bg-zinc-100 dark:hover:bg-white/5',
                  'transition-colors'
                )}
              >
                <LuPlus size={14} />
                Add another video
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-zinc-100 dark:border-white/5">
          <p className="text-sm text-zinc-400">
            {totalItems} item{totalItems !== 1 ? 's' : ''} selected
          </p>
          <div className="flex gap-3">
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
              disabled={isLoading || totalItems === 0}
              className={cn(
                'flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium',
                'bg-gradient-to-r from-violet-500 to-fuchsia-500',
                'hover:from-violet-600 hover:to-fuchsia-600',
                'text-white shadow-lg shadow-violet-500/20',
                'transition-all',
                (isLoading || totalItems === 0) && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isLoading && <LuLoader size={14} className="animate-spin" />}
              Upload {totalItems > 0 ? `(${totalItems})` : ''}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
