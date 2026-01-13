'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from '@/app/_store/lyricStore'
import type { Lyric, TextFormat } from '@/app/_store/lyricStore/types'
import { FormattedText } from './FormattedText'
import { FormattingToolbar } from './FormattingToolbar'

// Tür tanımları (sadece `type` kullanıldı)
export type LyricsCardProps = {
  className?: string
}

// GSAP tween tipi için yardımcı alias
type GsapTween = ReturnType<typeof gsap.to> | null

// Register the hook as a "plugin" so docs recommend it (safe to call every render)
// eslint-disable-next-line @typescript-eslint/no-unsafe-call
gsap.registerPlugin(useGSAP as unknown as gsap.Plugin)

export default function LyricsCard({ className = '' }: LyricsCardProps): React.JSX.Element | null {
  const store = useStore()

  // Temel state'ler
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [draftTitle, setDraftTitle] = useState<string>('')
  const [draftLyrics, setDraftLyrics] = useState<string>('')
  const [currentTitle, setCurrentTitle] = useState<string>('')
  const [currentLyrics, setCurrentLyrics] = useState<string>('')

  // Text selection state
  const [selectedText, setSelectedText] = useState<string>('')
  const [selectionStart, setSelectionStart] = useState<number>(0)
  const [selectionEnd, setSelectionEnd] = useState<number>(0)
  const [showToolbar, setShowToolbar] = useState<boolean>(false)
  const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-scroll state
  const [isAutoScrolling, setIsAutoScrolling] = useState<boolean>(false)
  // speed: piksel/s (px per second) - from lyric or default from settings
  const [scrollSpeed, setScrollSpeed] = useState<number>(
    store.selectedLyric?.scrollSpeed ?? store.settings.defaultScrollSpeed
  )
  const manualScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Font size - from lyric or global default, with fallback
  const fontSize = store.selectedLyric?.fontSize ?? store.settings?.fontSize ?? 18
  const isCentered = store.selectedLyric?.centered ?? store.settings.defaultCentered

  // Update scroll speed when selected lyric changes
  useEffect(() => {
    setScrollSpeed(store.selectedLyric?.scrollSpeed ?? store.settings.defaultScrollSpeed)
  }, [store.selectedLyric?.id, store.selectedLyric?.scrollSpeed, store.settings.defaultScrollSpeed])

  // Ref to kaydırılabilir container
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const tweenRef = useRef<GsapTween>(null)
  const lyricsViewRef = useRef<HTMLElement | null>(null)

  // Sync store -> internal state (ONLY when not editing)
  const syncWithLyric = useCallback(
    (lyric: Lyric | null) => {
      if (!lyric || isEditing) return

      setDraftTitle(lyric.title)
      setDraftLyrics(lyric.lyrics)
      setCurrentTitle(lyric.title)
      setCurrentLyrics(lyric.lyrics)
    },
    [isEditing]
  )

  useEffect(() => {
    syncWithLyric(store.selectedLyric)
  }, [store.selectedLyric, syncWithLyric])

  // useGSAP hook'tan context ve contextSafe al
  const { contextSafe } = useGSAP({ scope: scrollContainerRef })

  // Cleanup on unmount - prevent memory leaks
  useEffect(() => {
    return () => {
      if (tweenRef.current) {
        tweenRef.current.kill()
        tweenRef.current = null
      }
    }
  }, [])

  // Satırları hesapla ve her satırın başlangıç pozisyonunu sakla
  const lines: string[] = currentLyrics.split(/\r?\n/)
  const linePositions: number[] = []
  let position = 0
  for (let i = 0; i < lines.length; i++) {
    linePositions[i] = position
    position += (lines[i]?.length || 0) + 1 // +1 for \n
  }

  function increaseFont(): void {
    store.increaseFontSize()
  }

  function decreaseFont(): void {
    store.decreaseFontSize()
  }

  function enterEditMode(): boolean {
    setDraftTitle(currentTitle)
    setDraftLyrics(currentLyrics)
    setIsEditing(true)
    // stop auto-scroll if editing
    if (isAutoScrolling) {
      stopAutoScroll()
    }
    return true
  }

  function cancelEdit(): boolean {
    setDraftTitle(currentTitle)
    setDraftLyrics(currentLyrics)
    setIsEditing(false)
    return true
  }

  function saveEdit(): boolean {
    const trimmedTitle: string = draftTitle.trim()
    if (trimmedTitle.length === 0) return false

    setCurrentTitle(trimmedTitle)
    setCurrentLyrics(draftLyrics)
    setIsEditing(false)

    // Store'u güncelle - store metodunu kullan
    if (store.selectedLyric) {
      store.updateLyric(store.selectedLyric.id, {
        title: trimmedTitle,
        lyrics: draftLyrics,
      })
    }

    return true
  }

  function closeLyric(): void {
    // Clear any pending timeouts
    if (manualScrollTimeoutRef.current) {
      clearTimeout(manualScrollTimeoutRef.current)
      manualScrollTimeoutRef.current = null
    }

    // Auto-scroll'u durdur ve cleanup
    if (tweenRef.current) {
      tweenRef.current.kill()
      tweenRef.current = null
    }
    setIsAutoScrolling(false)

    // Seçili lyric'i temizle - store metodunu kullan
    store.selectLyric(null)
  }

  function goToPreviousSong(): void {
    if (!store.selectedLyric) return

    const sortedLyrics = [...store.lyrics].sort((a, b) => a.order - b.order)
    const currentIndex = sortedLyrics.findIndex((l) => l.id === store.selectedLyric?.id)

    if (currentIndex > 0) {
      // Clear any pending timeouts
      if (manualScrollTimeoutRef.current) {
        clearTimeout(manualScrollTimeoutRef.current)
        manualScrollTimeoutRef.current = null
      }

      // Stop auto-scroll before switching
      if (tweenRef.current) {
        tweenRef.current.kill()
        tweenRef.current = null
      }
      setIsAutoScrolling(false)

      const previousLyric = sortedLyrics[currentIndex - 1] || null
      store.selectLyric(previousLyric)
      syncWithLyric(previousLyric)
    }
  }

  function goToNextSong(): void {
    if (!store.selectedLyric) return

    const sortedLyrics = [...store.lyrics].sort((a, b) => a.order - b.order)
    const currentIndex = sortedLyrics.findIndex((l) => l.id === store.selectedLyric?.id)

    if (currentIndex < sortedLyrics.length - 1) {
      // Clear any pending timeouts
      if (manualScrollTimeoutRef.current) {
        clearTimeout(manualScrollTimeoutRef.current)
        manualScrollTimeoutRef.current = null
      }

      // Stop auto-scroll before switching
      if (tweenRef.current) {
        tweenRef.current.kill()
        tweenRef.current = null
      }
      setIsAutoScrolling(false)

      const nextLyric = sortedLyrics[currentIndex + 1] || null
      store.selectLyric(nextLyric)
      syncWithLyric(nextLyric)
    }
  }

  // Text selection handler - DOM-based position calculation
  function handleTextSelection(): void {
    // Clear any pending timeout first
    if (selectionTimeoutRef.current) {
      clearTimeout(selectionTimeoutRef.current)
    }

    // Small delay to ensure selection is complete
    selectionTimeoutRef.current = setTimeout(() => {
      const selection = window.getSelection()
      const selectedText = selection?.toString().trim() || ''

      if (!selection || selectedText.length === 0) {
        setShowToolbar(false)
        setSelectedText('')
        return
      }

      if (!lyricsViewRef.current) {
        return
      }

      try {
        const range = selection.getRangeAt(0)

        // Get all text content before selection
        const preRange = document.createRange()
        preRange.selectNodeContents(lyricsViewRef.current)
        preRange.setEnd(range.startContainer, range.startOffset)

        const textBeforeSelection = preRange.toString()
        const position = textBeforeSelection.length

        // Verify position by comparing
        const expectedText = currentLyrics.substring(position, position + selectedText.length)

        if (expectedText === selectedText) {
          // Perfect match
          setSelectedText(selectedText)
          setSelectionStart(position)
          setSelectionEnd(position + selectedText.length)
          setShowToolbar(true)
        } else {
          // Fallback: search nearby
          const searchStart = Math.max(0, position - 100)
          const foundIndex = currentLyrics.indexOf(selectedText, searchStart)
          if (foundIndex !== -1 && foundIndex < position + 100) {
            setSelectedText(selectedText)
            setSelectionStart(foundIndex)
            setSelectionEnd(foundIndex + selectedText.length)
            setShowToolbar(true)
          } else {
            // Last resort: simple indexOf
            const simpleIndex = currentLyrics.indexOf(selectedText)
            if (simpleIndex !== -1) {
              setSelectedText(selectedText)
              setSelectionStart(simpleIndex)
              setSelectionEnd(simpleIndex + selectedText.length)
              setShowToolbar(true)
            }
          }
        }
      } catch (error) {
        console.warn('Text selection error:', error)
        // Fallback to simple indexOf
        const start = currentLyrics.indexOf(selectedText)
        if (start !== -1) {
          setSelectedText(selectedText)
          setSelectionStart(start)
          setSelectionEnd(start + selectedText.length)
          setShowToolbar(true)
        }
      }
    }, 150) // Slightly longer delay for reliability
  }

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current)
      }
      if (manualScrollTimeoutRef.current) {
        clearTimeout(manualScrollTimeoutRef.current)
      }
    }
  }, [])

  // Close toolbar on click outside or escape
  useEffect(() => {
    if (!showToolbar) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Close if clicking outside lyrics or toolbar
      if (!target.closest('article') && !target.closest('[role="toolbar"]')) {
        setShowToolbar(false)
        setSelectedText('')
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowToolbar(false)
        setSelectedText('')
        window.getSelection()?.removeAllRanges()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [showToolbar])

  // Listen to selection changes
  useEffect(() => {
    // Skip if editing
    if (isEditing) {
      return undefined
    }

    const handleSelectionChange = () => {
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current)
      }

      selectionTimeoutRef.current = setTimeout(() => {
        handleTextSelection()
      }, 300)
    }

    document.addEventListener('selectionchange', handleSelectionChange)
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange)
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current)
      }
    }
  }, [isEditing, currentLyrics])

  // Apply formatting
  function applyFormat(
    format: Partial<Omit<TextFormat, 'start' | 'end'>>,
    keepToolbarOpen = false
  ): void {
    if (!store.selectedLyric || selectionStart === selectionEnd) return

    // Check if there's already a format at this position
    const existingFormatIndex = store.selectedLyric.formats?.findIndex(
      (f) => f.start === selectionStart && f.end === selectionEnd
    )

    if (
      existingFormatIndex !== undefined &&
      existingFormatIndex !== -1 &&
      store.selectedLyric.formats
    ) {
      // Merge with existing format
      const existingFormat = store.selectedLyric.formats[existingFormatIndex]
      if (existingFormat) {
        const mergedFormat: TextFormat = {
          ...existingFormat,
          ...format,
          start: selectionStart,
          end: selectionEnd,
        }
        store.removeFormat(store.selectedLyric.id, existingFormatIndex)
        store.applyFormat(store.selectedLyric.id, mergedFormat)
      }
    } else {
      // Create new format
      const newFormat: TextFormat = {
        start: selectionStart,
        end: selectionEnd,
        ...format,
      }
      store.applyFormat(store.selectedLyric.id, newFormat)
    }

    if (!keepToolbarOpen) {
      setShowToolbar(false)
    }
  }

  // Font size for selected text - keep toolbar open
  function increaseSelectedFontSize(): void {
    const existingFormat = store.selectedLyric?.formats?.find(
      (f) => f.start === selectionStart && f.end === selectionEnd
    )
    const currentSize = existingFormat?.fontSize || fontSize
    applyFormat({ fontSize: currentSize + 4 }, true)
  }

  function decreaseSelectedFontSize(): void {
    const existingFormat = store.selectedLyric?.formats?.find(
      (f) => f.start === selectionStart && f.end === selectionEnd
    )
    const currentSize = existingFormat?.fontSize || fontSize
    applyFormat({ fontSize: Math.max(currentSize - 4, 12) }, true)
  }

  // Auto-scroll kontrol fonksiyonları
  function startAutoScroll(): boolean {
    const el = scrollContainerRef.current
    if (!el) return false

    // Hesap: hedef son scrollTop değeri
    const target = el.scrollHeight - el.clientHeight
    const distance = Math.max(0, target - el.scrollTop)
    if (distance === 0) {
      setIsAutoScrolling(false)
      return false
    }

    // duration (s) = distance (px) / speed (px/s)
    const duration = Math.max(0.1, distance / scrollSpeed)

    // Kullanıcı etkileşimleri sonrası çağrılacak fonksiyonları contextSafe ile sarmala
    const start = contextSafe(() => {
      // kill varsa önce öldür
      if (tweenRef.current) {
        tweenRef.current.kill()
        tweenRef.current = null
      }

      // gsap tween ile scrollTop'u animate et
      tweenRef.current = gsap.to(el, {
        scrollTop: target,
        duration,
        ease: 'none',
        onComplete: () => {
          setIsAutoScrolling(false)
          tweenRef.current = null
        },
      })
    })

    // Başlat
    start()
    setIsAutoScrolling(true)
    return true
  }

  function stopAutoScroll(): boolean {
    // Clear any pending manual scroll restart
    if (manualScrollTimeoutRef.current) {
      clearTimeout(manualScrollTimeoutRef.current)
      manualScrollTimeoutRef.current = null
    }

    if (tweenRef.current) {
      tweenRef.current.kill()
      tweenRef.current = null
    }
    setIsAutoScrolling(false)
    return true
  }

  function toggleAutoScroll(): boolean {
    if (isAutoScrolling) {
      return stopAutoScroll()
    }
    return startAutoScroll()
  }

  // Manuel scroll interrupt handler - stops and restarts from current position
  const handleManualScroll = (): void => {
    if (!isAutoScrolling || !scrollContainerRef.current) return

    // Clear any pending restart timeout
    if (manualScrollTimeoutRef.current) {
      clearTimeout(manualScrollTimeoutRef.current)
      manualScrollTimeoutRef.current = null
    }

    // Stop current animation
    if (tweenRef.current) {
      tweenRef.current.kill()
      tweenRef.current = null
    }

    // Restart from current scroll position after brief pause
    const el = scrollContainerRef.current
    manualScrollTimeoutRef.current = setTimeout(() => {
      // Check if still auto-scrolling before restarting
      if (!isAutoScrolling) return

      const target = el.scrollHeight - el.clientHeight
      const distance = Math.max(0, target - el.scrollTop)

      if (distance > 0) {
        const duration = Math.max(0.1, distance / scrollSpeed)

        tweenRef.current = gsap.to(el, {
          scrollTop: target,
          duration,
          ease: 'none',
          onComplete: () => {
            setIsAutoScrolling(false)
            tweenRef.current = null
          },
        })
      } else {
        setIsAutoScrolling(false)
      }
    }, 200)
  }

  // Add event listeners for manual scroll interrupts
  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el || !isAutoScrolling) return

    const onWheel = () => handleManualScroll()
    const onTouchMove = () => handleManualScroll()

    el.addEventListener('wheel', onWheel, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })

    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchmove', onTouchMove)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAutoScrolling])

  // Restart auto-scroll when speed changes
  useEffect(() => {
    if (!isAutoScrolling) return

    stopAutoScroll()
    startAutoScroll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollSpeed])

  // Early return if no lyric selected - AFTER all hooks
  if (!store.selectedLyric) {
    return null
  }

  return (
    <article
      className={`w-full h-full min-h-0 flex flex-col px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-3 ${className}`}
      style={{ backgroundColor: store.settings.backgroundColor, color: store.settings.textColor }}
      aria-labelledby="lyrics-title"
    >
      <header className="flex-shrink-0 mb-1 sm:mb-1.5 flex flex-col gap-1 sm:gap-1.5">
        <div className="flex items-center gap-2 flex-1 w-full">
          <button
            type="button"
            onClick={closeLyric}
            className="p-3 hover:bg-gray-200 rounded-lg transition-all duration-300 hover:scale-110 active:scale-95 flex-shrink-0"
            aria-label="Back to list"
          >
            <ArrowLeft size={32} className="text-gray-700" />
          </button>

          <div className="flex-1 flex flex-col gap-0.5">
            {/* Band Name */}
            {!isEditing && store.selectedLyric?.band && (
              <p
                className="font-medium leading-tight"
                style={{
                  fontSize: `${store.settings.bandFontSize}px`,
                  color: store.settings.bandColor,
                }}
              >
                {store.selectedLyric.band}
              </p>
            )}

            {/* Title */}
            {isEditing ? (
              <input
                type="text"
                aria-label="Edit title"
                value={draftTitle}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setDraftTitle(e.target.value)
                }}
                className="w-full font-semibold leading-tight text-gray-900 bg-white border-b-2 border-blue-500 focus:outline-none focus:border-blue-600 p-1 rounded"
                placeholder="Enter title..."
                style={{
                  fontSize: `${store.settings.titleFontSize}px`,
                  color: store.settings.titleColor,
                }}
              />
            ) : (
              <h1
                id="lyrics-title"
                className="font-semibold leading-tight"
                style={{
                  fontSize: `${store.settings.titleFontSize}px`,
                  color: store.settings.titleColor,
                }}
              >
                {currentTitle}
              </h1>
            )}
          </div>

          {/* Previous/Next Song Buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={goToPreviousSong}
              disabled={
                !store.selectedLyric ||
                [...store.lyrics]
                  .sort((a, b) => a.order - b.order)
                  .findIndex((l) => l.id === store.selectedLyric?.id) === 0
              }
              className="p-2 sm:p-2.5 hover:bg-gray-200 rounded-lg transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed"
              aria-label="Previous song"
            >
              <ChevronLeft size={24} className="text-gray-700" />
            </button>
            <button
              type="button"
              onClick={goToNextSong}
              disabled={
                !store.selectedLyric ||
                [...store.lyrics]
                  .sort((a, b) => a.order - b.order)
                  .findIndex((l) => l.id === store.selectedLyric?.id) ===
                  store.lyrics.length - 1
              }
              className="p-2 sm:p-2.5 hover:bg-gray-200 rounded-lg transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed"
              aria-label="Next song"
            >
              <ChevronRight size={24} className="text-gray-700" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center sm:justify-end">
          <button
            type="button"
            onClick={() => decreaseFont()}
            className="px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-gray-200 rounded-md text-gray-700 hover:bg-gray-300 transition active:scale-95 font-medium"
            aria-label="Decrease font size"
          >
            A−
          </button>
          <button
            type="button"
            onClick={() => increaseFont()}
            className="px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-gray-200 rounded-md text-gray-700 hover:bg-gray-300 transition active:scale-95 font-medium"
            aria-label="Increase font size"
          >
            A+
          </button>

          <button
            type="button"
            onClick={() => toggleAutoScroll()}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base rounded-md transition active:scale-95 font-medium ${isAutoScrolling ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
            aria-pressed={isAutoScrolling}
            aria-label="Toggle auto scroll"
          >
            {isAutoScrolling ? 'Stop' : 'Auto'}
          </button>

          <button
            type="button"
            onClick={() => store.toggleCentered()}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base rounded-md transition active:scale-95 font-medium ${isCentered ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            aria-pressed={isCentered}
            aria-label="Toggle center align"
          >
            ≡
          </button>

          {isEditing ? (
            <>
              <button
                type="button"
                onClick={() => saveEdit()}
                className="px-5 py-2.5 text-base bg-green-600 text-white rounded-md hover:bg-green-700 transition active:scale-95 font-medium"
                aria-label="Save edits"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => cancelEdit()}
                className="px-5 py-2.5 text-base bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition active:scale-95 font-medium"
                aria-label="Cancel edits"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => enterEditMode()}
              className="px-5 py-2.5 text-base bg-blue-600 text-white rounded-md hover:bg-blue-700 transition active:scale-95 font-medium"
              aria-label="Enter edit mode"
            >
              Edit
            </button>
          )}
        </div>
      </header>

      {/* Formatting Toolbar - Mobile: Below header, Desktop: Fixed overlay */}
      {showToolbar && !isEditing && (
        <div className="flex-shrink-0 sm:hidden bg-white border-b border-gray-200 px-2 py-2 shadow-sm animate-in slide-in-from-top-2">
          <FormattingToolbar
            selectedText={selectedText}
            currentFontSize={fontSize}
            onIncreaseFontSize={increaseSelectedFontSize}
            onDecreaseFontSize={decreaseSelectedFontSize}
            onApplyBold={() => applyFormat({ bold: true }, true)}
            onApplyItalic={() => applyFormat({ italic: true }, true)}
            onApplyUnderline={() => applyFormat({ underline: true }, true)}
            onApplyColor={(color) => applyFormat({ color }, true)}
            onClose={() => setShowToolbar(false)}
          />
        </div>
      )}

      <section
        className={`flex-1 min-h-0 ${isEditing ? 'overflow-hidden' : 'overflow-auto prose prose-sm sm:prose-base'}`}
        style={{ color: store.settings.textColor }}
        ref={isEditing ? undefined : scrollContainerRef}
      >
        {isEditing ? (
          <textarea
            value={draftLyrics}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
              setDraftLyrics(e.target.value)
            }}
            className="w-full h-full p-2 rounded-md bg-white border-2 border-blue-500 focus:outline-none focus:border-blue-600 resize-none font-mono"
            style={{
              fontSize: `${fontSize}px`,
              whiteSpace: 'pre-wrap',
              lineHeight: '1.5',
              overflow: 'auto',
              boxSizing: 'border-box',
            }}
            aria-label="Edit lyrics"
            spellCheck={false}
            placeholder="Enter lyrics..."
          />
        ) : (
          <article
            ref={lyricsViewRef}
            className={`whitespace-pre-wrap leading-snug sm:leading-relaxed select-text cursor-text ${isCentered ? 'text-center' : ''}`}
            style={{ fontSize: `${fontSize}px` }}
            aria-label="Lyrics content"
            onMouseUp={handleTextSelection}
            onTouchEnd={handleTextSelection}
          >
            {lines.map((line: string, idx: number) => {
              const lineStart = linePositions[idx] || 0
              const lineEnd = lineStart + line.length

              // Filter formats that overlap with this line
              const lineFormats =
                store.selectedLyric?.formats
                  ?.filter((f) => f.start < lineEnd && f.end > lineStart)
                  .map((f) => ({
                    ...f,
                    start: Math.max(0, f.start - lineStart),
                    end: Math.min(line.length, f.end - lineStart),
                  })) || []

              return (
                <p key={idx} className="my-0.5 sm:my-1">
                  <FormattedText
                    text={line || '\u00A0'}
                    formats={lineFormats}
                    fontSize={fontSize}
                  />
                </p>
              )
            })}
          </article>
        )}
      </section>

      {/* Desktop Formatting Toolbar - Fixed overlay */}
      {showToolbar && !isEditing && (
        <div className="hidden sm:block fixed top-16 sm:top-20 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2">
          <FormattingToolbar
            selectedText={selectedText}
            currentFontSize={fontSize}
            onIncreaseFontSize={increaseSelectedFontSize}
            onDecreaseFontSize={decreaseSelectedFontSize}
            onApplyBold={() => applyFormat({ bold: true }, true)}
            onApplyItalic={() => applyFormat({ italic: true }, true)}
            onApplyUnderline={() => applyFormat({ underline: true }, true)}
            onApplyColor={(color) => applyFormat({ color }, true)}
            onClose={() => setShowToolbar(false)}
          />
        </div>
      )}

      <footer className="flex-shrink-0 mt-1 pt-2 pb-2 border-t border-gray-200 bg-white/50">
        <div className="flex items-center justify-between gap-3 text-sm text-gray-600">
          <span className="whitespace-nowrap font-medium">Font: {fontSize}px</span>
          <div className="flex items-center gap-1.5">
            <label htmlFor="speed" className="whitespace-nowrap font-medium">
              Speed: {scrollSpeed}
            </label>
            <input
              id="speed"
              type="range"
              min={1}
              max={50}
              value={scrollSpeed}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const newSpeed = Number(e.target.value)
                setScrollSpeed(newSpeed)
                // Save per-song scroll speed
                if (store.selectedLyric) {
                  store.updateLyric(store.selectedLyric.id, { scrollSpeed: newSpeed })
                }
              }}
              className="w-32 h-8"
              style={{ accentColor: '#3B82F6' }}
              aria-label="Scroll speed"
            />
          </div>
        </div>
      </footer>
    </article>
  )
}
