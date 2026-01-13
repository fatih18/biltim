'use client'

import { Bold, Italic, Palette, Type, Underline, X } from 'lucide-react'
import type React from 'react'

type FormattingToolbarProps = {
  onApplyBold: () => void
  onApplyItalic: () => void
  onApplyUnderline: () => void
  onApplyColor: (color: string) => void
  onIncreaseFontSize: () => void
  onDecreaseFontSize: () => void
  onClose: () => void
  selectedText: string
  currentFontSize?: number
}

export function FormattingToolbar({
  onApplyBold,
  onApplyItalic,
  onApplyUnderline,
  onApplyColor,
  onIncreaseFontSize,
  onDecreaseFontSize,
  onClose,
  selectedText,
}: FormattingToolbarProps): React.JSX.Element | null {
  if (!selectedText) return null

  const colors = [
    '#EF4444', // red
    '#F59E0B', // orange
    '#10B981', // green
    '#3B82F6', // blue
    '#8B5CF6', // purple
    '#EC4899', // pink
  ]

  return (
    <div
      role="toolbar"
      aria-label="Text formatting toolbar"
      className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white border-2 border-gray-300 rounded-lg shadow-xl max-w-[95vw]"
    >
      <button
        type="button"
        onClick={onDecreaseFontSize}
        className="p-3 hover:bg-gray-200 rounded transition active:scale-95 text-gray-900"
        aria-label="Decrease font size"
        title="Smaller"
      >
        <Type size={20} />
      </button>
      <button
        type="button"
        onClick={onIncreaseFontSize}
        className="p-3 hover:bg-gray-200 rounded transition active:scale-95 text-gray-900"
        aria-label="Increase font size"
        title="Bigger"
      >
        <Type size={28} />
      </button>

      <div className="w-px h-10 bg-gray-300 mx-2" />

      <button
        type="button"
        onClick={onApplyBold}
        className="p-3 hover:bg-gray-200 rounded transition active:scale-95 text-gray-900"
        aria-label="Bold"
        title="Bold"
      >
        <Bold size={24} />
      </button>
      <button
        type="button"
        onClick={onApplyItalic}
        className="p-3 hover:bg-gray-200 rounded transition active:scale-95 text-gray-900"
        aria-label="Italic"
        title="Italic"
      >
        <Italic size={24} />
      </button>
      <button
        type="button"
        onClick={onApplyUnderline}
        className="p-3 hover:bg-gray-200 rounded transition active:scale-95 text-gray-900"
        aria-label="Underline"
        title="Underline"
      >
        <Underline size={24} />
      </button>

      <div className="w-px h-10 bg-gray-300 mx-2" />

      <div className="flex items-center gap-2">
        <Palette size={22} className="text-gray-900 mr-1" />
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onApplyColor(color)}
            className="w-9 h-9 rounded hover:scale-110 transition active:scale-95 border-2 border-gray-300"
            style={{ backgroundColor: color }}
            aria-label={`Color ${color}`}
            title={`Color ${color}`}
          />
        ))}
      </div>

      <div className="w-px h-10 bg-gray-300 mx-2" />

      <button
        type="button"
        onClick={onClose}
        className="p-3 hover:bg-gray-200 rounded transition active:scale-95 text-gray-900"
        aria-label="Close"
        title="Close toolbar"
      >
        <X size={22} />
      </button>
    </div>
  )
}
