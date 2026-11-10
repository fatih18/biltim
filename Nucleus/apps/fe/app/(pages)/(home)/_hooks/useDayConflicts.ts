'use client'

import { useEffect, useEffectEvent, useRef, useState } from 'react'
import {
  conflictKey,
  conflictView,
  isChecking,
  takeAnswer,
  type DayConflictAnswer,
  type DayConflictOutcome,
  type DayConflictStatus,
} from './dayConflictState'

/** Reads who is busy on `day` and answers with the warnings, or says the read failed. */
export type DayConflictLoader = (
  planId: string,
  day: string,
  onDone: (warnings: string[]) => void,
  onError: () => void
) => void

export type DayConflictState = {
  status: DayConflictStatus
  warnings: string[]
  /** Reads the same day again after a failure. */
  retry: () => void
}

/**
 * The same-day clash warnings for one plan on one chosen day (R28).
 *
 * The day is read from the server each time the plan or the day changes, so a
 * plan outside the page on screen is still seen. The decisions (the key, a late
 * answer, the status, a failed read that must not look like "nothing clashes")
 * are in `dayConflictState`; this only wires them to React.
 */
export function useDayConflicts(load: DayConflictLoader | undefined, planId: string, day: string): DayConflictState {
  const [answer, setAnswer] = useState<DayConflictAnswer | null>(null)
  const [attempt, setAttempt] = useState(0)
  const latest = useRef(0)
  const key = conflictKey(planId, day, attempt)
  const active = isChecking(Boolean(load), day)

  const ask = useEffectEvent((requestKey: string) => {
    if (!load || day === '') return
    const request = ++latest.current
    const keep = (outcome: DayConflictOutcome) => {
      const kept = takeAnswer({ latest: latest.current, request, key: requestKey, outcome })
      if (kept) setAnswer(kept)
    }
    load(
      planId,
      day,
      (warnings) => keep({ failed: false, warnings }),
      () => keep({ failed: true })
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
  return { ...conflictView({ active, key, answer }), retry }
}
