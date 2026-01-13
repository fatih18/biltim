'use client'

import type React from 'react'
import type { TextFormat } from '@/app/_store/lyricStore/types'

type FormattedTextProps = {
  text: string
  formats?: TextFormat[]
  fontSize: number
}

export function FormattedText({
  text,
  formats = [],
  fontSize,
}: FormattedTextProps): React.JSX.Element {
  if (!formats || formats.length === 0 || text === '\u00A0') {
    return <span style={{ fontSize: `${fontSize}px` }}>{text}</span>
  }

  // Create character map with all formats applied
  const charStyles: React.CSSProperties[] = []
  for (let i = 0; i < text.length; i++) {
    charStyles[i] = {}
  }

  // Apply each format to the character range
  for (const format of formats) {
    const start = Math.max(0, format.start)
    const end = Math.min(text.length, format.end)

    for (let i = start; i < end; i++) {
      const style = charStyles[i]
      if (!style) continue

      // Merge styles for overlapping formats
      if (format.bold) style.fontWeight = 'bold'
      if (format.italic) style.fontStyle = 'italic'
      if (format.underline) style.textDecoration = 'underline'
      if (format.color) style.color = format.color
      if (format.fontSize) style.fontSize = `${format.fontSize}px`
    }
  }

  // Group consecutive characters with same style
  const parts: Array<{ text: string; style: React.CSSProperties; key: string }> = []
  let currentStyle = charStyles[0] || {}
  let currentText = text[0] || ''
  let startIndex = 0

  for (let i = 1; i < text.length; i++) {
    const nextStyle = charStyles[i] || {}
    const isSameStyle = JSON.stringify(nextStyle) === JSON.stringify(currentStyle)

    if (isSameStyle) {
      currentText += text[i]
    } else {
      parts.push({
        text: currentText,
        style: currentStyle,
        key: `part-${startIndex}-${i}`,
      })
      currentStyle = nextStyle
      currentText = text[i] || ''
      startIndex = i
    }
  }

  // Add last part
  if (currentText) {
    parts.push({
      text: currentText,
      style: currentStyle,
      key: `part-${startIndex}-${text.length}`,
    })
  }

  return (
    <span style={{ fontSize: `${fontSize}px` }}>
      {parts.map((part) => (
        <span key={part.key} style={part.style}>
          {part.text}
        </span>
      ))}
    </span>
  )
}
