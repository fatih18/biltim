import { useCallback, useEffect, useRef, useState } from 'react'

type UseSpeechToTextOptions = {
  lang?: string
  continuous?: boolean
  interimResults?: boolean
  onResult?: (text: string, isFinal: boolean) => void
  onError?: (message: string) => void
}

type UseSpeechToTextReturn = {
  isSupported: boolean
  isListening: boolean
  start: () => void
  stop: () => void
}

type SpeechRecognitionAlternativeLike = {
  transcript: string
}

type SpeechRecognitionResultLike = ArrayLike<SpeechRecognitionAlternativeLike> & {
  isFinal: boolean
}

type SpeechRecognitionResultListLike = ArrayLike<SpeechRecognitionResultLike>

type SpeechRecognitionEventLike = {
  resultIndex: number
  results: SpeechRecognitionResultListLike
}

type SpeechRecognitionErrorEventLike = {
  error: string
}

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null

  const w = window as typeof window & {
    webkitSpeechRecognition?: SpeechRecognitionConstructor
    SpeechRecognition?: SpeechRecognitionConstructor
  }

  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

export function useSpeechToText(options: UseSpeechToTextOptions = {}): UseSpeechToTextReturn {
  const [isSupported, setIsSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const onResultRef = useRef<UseSpeechToTextOptions['onResult'] | undefined>(options.onResult)
  const onErrorRef = useRef<UseSpeechToTextOptions['onError'] | undefined>(options.onError)

  useEffect(() => {
    onResultRef.current = options.onResult
  }, [options.onResult])

  useEffect(() => {
    onErrorRef.current = options.onError
  }, [options.onError])

  useEffect(() => {
    const Ctor = getSpeechRecognitionConstructor()
    if (!Ctor) {
      setIsSupported(false)
      return
    }

    setIsSupported(true)
    const recognition = new Ctor()

    recognition.lang = options.lang ?? 'en-US'
    recognition.continuous = options.continuous ?? true
    recognition.interimResults = options.interimResults ?? true

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i] as SpeechRecognitionResultLike
        const transcript = Array.from(result as ArrayLike<SpeechRecognitionAlternativeLike>)
          .map((alt) => alt.transcript)
          .join(' ')
          .trim()

        if (!transcript) continue

        const isFinal = result.isFinal
        onResultRef.current?.(transcript, isFinal)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      setIsListening(false)
      const message = event.error || 'Unknown SpeechRecognition error'
      onErrorRef.current?.(message)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      setIsListening(false)
      recognition.onresult = null
      recognition.onerror = null
      recognition.onend = null
      recognition.stop()
      recognitionRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.lang, options.continuous, options.interimResults])

  const start = useCallback(() => {
    if (!isSupported || !recognitionRef.current) return

    try {
      recognitionRef.current.start()
      setIsListening(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start speech recognition'
      onErrorRef.current?.(message)
    }
  }, [isSupported])

  const stop = useCallback(() => {
    if (!recognitionRef.current) return
    recognitionRef.current.stop()
  }, [])

  return { isSupported, isListening, start, stop }
}
