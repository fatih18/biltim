'use client'

import { useEffect, useEffectEvent, useRef, useState } from 'react'

/** Reads who is busy on `day` and answers with the warnings, or says the read failed. */
export type DayConflictLoader = (
  planId: string,
  day: string,
  onDone: (warnings: string[]) => void,
  onError: () => void
) => void

export type DayConflictState = {
  /** `idle`: nothing to check yet. `loading`: the day is being read. */
  status: 'idle' | 'loading' | 'ready' | 'failed'
  warnings: string[]
  /** Reads the same day again after a failure. */
  retry: () => void
}

type Answer = { key: string; failed: boolean; warnings: string[] }

/**
 * The same-day clash warnings for one plan on one chosen day (R28).
 *
 * The day is read from the server each time the plan or the day changes, so a
 * plan outside the page on screen is still seen. An answer that arrives after
 * the choice moved on is dropped. A failed read is its own state: it must not
 * look like "nothing clashes".
 */
export function useDayConflicts(load: DayConflictLoader | undefined, planId: string, day: string): DayConflictState {
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [attempt, setAttempt] = useState(0)
  const latest = useRef(0)
  const key = `${planId}|${day}|${attempt}`
  const active = Boolean(load) && day !== ''

  const ask = useEffectEvent((requestKey: string) => {
    if (!load || day === '') return
    const request = ++latest.current
    load(
      planId,
      day,
      (warnings) => {
        if (latest.current === request) setAnswer({ key: requestKey, failed: false, warnings })
      },
      () => {
        if (latest.current === request) setAnswer({ key: requestKey, failed: true, warnings: [] })
      }
    )
  })

  useEffect(() => {
    ask(key)
    // A new choice, or leaving, makes whatever is still on its way stale.
    return () => {
      latest.current += 1
    }
  }, [key])

  const retry = () => setAttempt((count) => count + 1)
  if (!active) return { status: 'idle', warnings: [], retry }
  if (answer?.key !== key) return { status: 'loading', warnings: [], retry }
  return { status: answer.failed ? 'failed' : 'ready', warnings: answer.warnings, retry }
}
