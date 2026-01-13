/** biome-ignore-all lint/a11y/noStaticElementInteractions: <> */
'use client'
import { GripVertical, Pencil, Plus, Settings, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import LyricsCard from '@/app/_components/Global/LyricReader'
import { useStore } from '@/app/_store/lyricStore'

export default function LyricsPage() {
  const store = useStore()
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [touchStartY, setTouchStartY] = useState<number>(0)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newBand, setNewBand] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [swipedId, setSwipedId] = useState<string | null>(null)
  const [touchStartX, setTouchStartX] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [tempTitle, setTempTitle] = useState('')
  const [isTouchReordering, setIsTouchReordering] = useState(false)

  // Initialize from localStorage after hydration to avoid mismatch
  useEffect(() => {
    store.initializeFromStorage()
    setIsLoading(false)
  }, [])

  const isDragHandle = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false
    return Boolean(target.closest('[data-drag-handle="true"]'))
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    store.reorderLyrics(draggedIndex, index)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    const touch = e.touches[0]
    if (!touch) return
    const fromHandle = isDragHandle(e.target)
    setIsTouchReordering(fromHandle)
    setDraggedIndex(fromHandle ? index : null)
    if (fromHandle) {
      setSwipedId(null)
    }
    setTouchStartY(touch.clientY)
    setTouchStartX(touch.clientX)
  }

  const handleTouchMove = (e: React.TouchEvent, index: number) => {
    const touch = e.touches[0]
    if (!touch) return

    const currentY = touch.clientY
    const currentX = touch.clientX
    const diffY = currentY - touchStartY
    const diffX = currentX - touchStartX

    // Horizontal swipe for delete (priority)
    if (!isTouchReordering && Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 30) {
      // Swiping left = show delete
      if (diffX < -50) {
        setSwipedId(sortedLyrics[index]?.id || null)
      } else if (diffX > 30) {
        setSwipedId(null)
      }
      return
    }

    if (!isTouchReordering || draggedIndex === null) return

    // Vertical drag for reorder
    if (Math.abs(diffY) > 50) {
      if (diffY > 0 && index < sortedLyrics.length - 1) {
        store.reorderLyrics(draggedIndex, index + 1)
        setDraggedIndex(index + 1)
        setTouchStartY(currentY)
      } else if (diffY < 0 && index > 0) {
        store.reorderLyrics(draggedIndex, index - 1)
        setDraggedIndex(index - 1)
        setTouchStartY(currentY)
      }
    }
  }

  const handleTouchEnd = () => {
    setDraggedIndex(null)
    setTouchStartY(0)
    setTouchStartX(0)
    setIsTouchReordering(false)
  }

  const handleAddSong = () => {
    if (!newBand.trim() || !newTitle.trim()) return

    store.addLyric(newBand.trim(), newTitle.trim())
    setNewBand('')
    setNewTitle('')
    setShowAddModal(false)
  }

  const handleDeleteSong = (id: string) => {
    store.deleteLyric(id)
    setDeleteConfirm(null)
  }

  const handleTitleEdit = () => {
    setTempTitle(store.settings.libraryTitle)
    setIsEditingTitle(true)
  }

  const handleTitleSave = () => {
    if (tempTitle.trim()) {
      store.setLibraryTitle(tempTitle.trim())
    }
    setIsEditingTitle(false)
  }

  const handleTitleCancel = () => {
    setIsEditingTitle(false)
    setTempTitle('')
  }

  // Sort lyrics by order
  const sortedLyrics = [...store.lyrics].sort((a, b) => a.order - b.order)

  // Show loader while initializing from localStorage
  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="flex flex-col items-center gap-6">
          {/* Animated Music Note */}
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-blue-600"
                aria-label="Loading music library"
              >
                <title>Loading music library</title>
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900 mb-1">Loading Library</p>
            <p className="text-sm text-gray-500">Preparing your songs...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!store.selectedLyric)
    return (
      <div className="w-full h-full flex flex-col overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-50">
        {/* Header */}
        <div className="flex-shrink-0 px-6 sm:px-8 lg:px-12 pt-8 pb-6 border-b border-gray-100">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              {isEditingTitle ? (
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleTitleSave()
                      if (e.key === 'Escape') handleTitleCancel()
                    }}
                    className="text-3xl sm:text-4xl md:text-5xl font-bold bg-transparent border-b-2 border-blue-600 text-gray-900 focus:outline-none flex-1 max-w-full"
                    ref={(el) => el?.focus()}
                  />
                  <button
                    type="button"
                    onClick={handleTitleSave}
                    className="text-green-600 hover:text-green-700 p-2"
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    onClick={handleTitleCancel}
                    className="text-red-600 hover:text-red-700 p-2"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 sm:gap-3 mb-2 group max-w-full overflow-hidden">
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent truncate flex-1">
                    {store.settings.libraryTitle}
                  </h1>
                  <button
                    type="button"
                    onClick={handleTitleEdit}
                    className="opacity-0 sm:group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 p-2 flex-shrink-0"
                    aria-label="Edit library title"
                  >
                    <Pencil size={20} className="sm:w-6 sm:h-6" />
                  </button>
                </div>
              )}
              <p className="text-base text-gray-500 font-medium">{sortedLyrics.length} tracks</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="group relative p-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 transition-all duration-300 shadow-sm hover:shadow-md"
              >
                <Plus size={22} className="text-white transition-colors" />
              </button>
              <Link
                href="/lyrics/settings"
                className="group relative p-3.5 rounded-2xl bg-white hover:bg-gray-50 transition-all duration-300 shadow-sm hover:shadow-md border border-gray-200"
              >
                <Settings
                  size={22}
                  className="text-gray-600 group-hover:text-gray-900 transition-colors"
                />
              </Link>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto px-6 sm:px-8 lg:px-12 py-8">
          <div className="max-w-6xl mx-auto space-y-3">
            {sortedLyrics.map((lyric, index) => (
              <div
                key={lyric.id}
                onDragOver={(e) => handleDragOver(e, index)}
                onTouchStart={(e) => handleTouchStart(e, index)}
                onTouchMove={(e) => handleTouchMove(e, index)}
                onTouchEnd={handleTouchEnd}
                className={`group relative flex items-center gap-3 sm:gap-6 bg-white rounded-2xl sm:rounded-3xl transition-all duration-500 border-2 border-gray-100 hover:border-blue-200 overflow-hidden ${
                  draggedIndex === index
                    ? 'opacity-30 scale-95'
                    : 'opacity-100 hover:shadow-2xl hover:shadow-blue-100/50 hover:-translate-y-1'
                }`}
              >
                {/* Drag Handle Area - Smaller on mobile */}
                <button
                  type="button"
                  data-drag-handle="true"
                  draggable
                  onDragStart={(e) => {
                    e.stopPropagation()
                    handleDragStart(index)
                  }}
                  onDragEnd={handleDragEnd}
                  className="absolute left-0 top-0 bottom-0 w-12 sm:w-20 bg-gradient-to-r from-gray-50 to-transparent cursor-grab active:cursor-grabbing touch-none flex items-center justify-center group-hover:from-blue-50 z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  aria-label="Reorder song"
                >
                  <GripVertical
                    size={20}
                    className="text-gray-300 group-hover:text-blue-400 transition-colors sm:w-6 sm:h-6"
                  />
                </button>

                {/* Order Badge - Smaller on mobile */}
                <div className="flex-shrink-0 ml-12 sm:ml-20 w-12 h-12 sm:w-20 sm:h-20 relative z-10">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-xl sm:rounded-2xl rotate-3 group-hover:rotate-6 transition-transform" />
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all">
                    <span className="text-white font-black text-base sm:text-2xl">
                      {lyric.order}
                    </span>
                  </div>
                </div>

                {/* Content - More space on mobile */}
                <button
                  onClick={() => store.selectLyric(lyric)}
                  type="button"
                  className="relative z-10 flex-1 min-w-0 py-5 sm:py-8 pr-4 sm:pr-8 text-left"
                >
                  <h2 className="text-base sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2 line-clamp-2 sm:truncate group-hover:text-blue-600 transition-colors leading-tight">
                    {lyric.title}
                  </h2>
                  <p className="text-xs sm:text-base text-gray-500 font-semibold truncate uppercase tracking-wide">
                    {lyric.band}
                  </p>
                </button>

                {/* Delete Button - Always visible on mobile, hover on desktop */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    setDeleteConfirm(lyric.id)
                    setSwipedId(null) // Close swipe after click
                  }}
                  className={`relative z-20 flex-shrink-0 mr-4 sm:mr-6 p-2 sm:p-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-all active:scale-95 ${
                    swipedId === lyric.id
                      ? 'opacity-100 scale-110'
                      : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
                  }`}
                  aria-label="Delete song"
                >
                  <Trash2 size={18} className="sm:w-5 sm:h-5" />
                </button>

                {/* Animated gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                {/* Corner accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              </div>
            ))}
          </div>
        </div>

        {/* Add Song Modal */}
        {showAddModal && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddModal(false)}
            onKeyDown={(e) => e.key === 'Escape' && setShowAddModal(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-song-title"
          >
            <div
              className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full space-y-4"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              role="document"
            >
              <h2 id="add-song-title" className="text-2xl font-bold text-gray-900">
                Add New Song
              </h2>

              <div className="space-y-4">
                <div>
                  <label htmlFor="band" className="block text-sm font-semibold text-gray-700 mb-2">
                    Band Name
                  </label>
                  <input
                    id="band"
                    type="text"
                    value={newBand}
                    onChange={(e) => setNewBand(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                    placeholder="Enter band name..."
                  />
                </div>

                <div>
                  <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-2">
                    Song Title
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddSong()
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                    placeholder="Enter song title..."
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddSong}
                  disabled={!newBand.trim() || !newTitle.trim()}
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
                >
                  Add Song
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setDeleteConfirm(null)}
            onKeyDown={(e) => e.key === 'Escape' && setDeleteConfirm(null)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-song-title"
          >
            <div
              className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full space-y-4"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              role="document"
            >
              <h2 id="delete-song-title" className="text-2xl font-bold text-red-600">
                Delete Song?
              </h2>
              <p className="text-gray-600">
                Are you sure you want to delete this song? This action cannot be undone.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSong(deleteConfirm)}
                  className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  return <LyricsCard />
}

/*
<main className="w-full h-full pb-12">
      <LyricsCard title={title} lyrics={lyrics} />
    </main>
*/
