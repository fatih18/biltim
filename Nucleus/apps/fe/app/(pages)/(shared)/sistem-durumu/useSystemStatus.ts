'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type Action = {
  start: (args: {
    // biome-ignore lint/suspicious/noExplicitAny: the generated actions are per-endpoint
    payload: any
    // biome-ignore lint/suspicious/noExplicitAny: the translated body is per-screen
    onAfterHandle?: (data: any) => void
    // biome-ignore lint/suspicious/noExplicitAny: refusals come through untranslated
    onErrorHandle?: (error: any) => void
  }) => void
}

export type ActionMap = Record<string, Action | undefined>

/** Runs an action as a promise; a refusal resolves to null rather than throwing. */
function call<T>(action: Action | undefined, payload: unknown = {}): Promise<T | null> {
  return new Promise((resolve) => {
    if (!action) {
      resolve(null)
      return
    }
    action.start({
      payload,
      onAfterHandle: (data: unknown) => resolve(((data as { data?: T })?.data ?? data ?? null) as T),
      onErrorHandle: () => resolve(null),
    })
  })
}

export type Snapshot = {
  system?: {
    cpu?: { usage?: number; cores?: number }
    memory?: { usagePercent?: number; used?: number; total?: number }
    disk?: { usagePercent?: number; used?: number; total?: number }
    process?: { uptime?: number; eventLoopLag?: number }
  }
  application?: {
    requests?: { total?: number; perMinute?: number }
    responseTime?: { avg?: number; p95?: number }
    errors?: { total?: number; rate?: number }
    rateLimits?: { blocked?: number; blockedPerMinute?: number }
  }
  database?: {
    connections?: { active?: number; idle?: number; total?: number }
    queries?: { avgTime?: number; slowQueries?: number }
  }
  redis?: {
    memory?: { used?: number }
    connections?: { connected?: number }
    hitRate?: number
  }
}

export type Readiness = {
  status?: string
  checks?: { database?: string; redis?: string }
}

export type Alert = { id?: string; severity?: string; message?: string; metric?: string }

export type ServerLogRecord = {
  timestamp?: string
  level?: string
  message?: string
  scope?: string
}

export type SystemStatus = {
  readiness: Readiness | null
  snapshot: Snapshot | null
  alerts: Alert[]
  logs: ServerLogRecord[]
  levelCounts: Record<string, number>
  /** Round trip of the readiness probe, measured in the browser. */
  latencyMs: number | null
  isLoading: boolean
  /** True once a read has come back, so "0" is distinguishable from "not yet". */
  loaded: boolean
  refresh: () => void
}

export function useSystemStatus(actions: ActionMap, nowMs: number): SystemStatus {
  const [state, setState] = useState<Omit<SystemStatus, 'refresh'>>({
    readiness: null,
    snapshot: null,
    alerts: [],
    logs: [],
    levelCounts: {},
    latencyMs: null,
    isLoading: true,
    loaded: false,
  })
  const [tick, setTick] = useState(0)
  const refresh = useCallback(() => setTick((t) => t + 1), [])

  /*
   * The actions live in a ref, NOT in the dependency list. A generated action
   * carries its own request state, so a new object arrives on every render a
   * request causes; depending on it re-runs this effect, which starts more
   * requests, until React stops it with "Maximum update depth exceeded".
   */
  const actionsRef = useRef(actions)
  actionsRef.current = actions
  const ready = Boolean(actions.GET_MONITORING_SNAPSHOT)

  useEffect(() => {
    if (!ready) return
    let cancelled = false
    const a = actionsRef.current
    const started = performance.now()
    setState((prev) => ({ ...prev, isLoading: true }))

    Promise.all([
      call<Readiness>(a.GET_HEALTH_READY),
      call<Snapshot>(a.GET_MONITORING_SNAPSHOT),
      call<{ alerts?: Alert[] }>(a.GET_MONITORING_ALERTS),
      call<{ records?: ServerLogRecord[]; levelCounts?: Record<string, number> }>(a.GET_SERVER_LOGS, {
        limit: 60,
      }),
    ]).then(([readiness, snapshot, alertBody, logBody]) => {
      if (cancelled) return
      setState({
        readiness,
        snapshot,
        alerts: alertBody?.alerts ?? [],
        logs: logBody?.records ?? [],
        levelCounts: logBody?.levelCounts ?? {},
        latencyMs: Math.round(performance.now() - started),
        isLoading: false,
        loaded: true,
      })
    })

    return () => {
      cancelled = true
    }
  }, [ready, nowMs, tick])

  return { ...state, refresh }
}

/* ---- presentation helpers, pure so they can be tested without a browser ---- */

export function formatBytes(bytes: number | undefined | null): string {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes)) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`
}

export function formatUptime(seconds: number | undefined | null): string {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) return '—'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d} gün ${h} saat`
  if (h > 0) return `${h} saat ${m} dakika`
  if (m > 0) return `${m} dakika`
  return `${Math.floor(seconds)} saniye`
}

export function percent(value: number | undefined | null): string {
  return typeof value === 'number' && Number.isFinite(value) ? `%${value.toFixed(1)}` : '—'
}

/** A usage percentage becomes a colour: green, amber past 80, red past 90. */
export function usageTone(value: number | undefined | null): 'ok' | 'warn' | 'bad' | 'neutral' {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'neutral'
  if (value >= 90) return 'bad'
  if (value >= 80) return 'warn'
  return 'ok'
}

export function checkTone(value: string | undefined): 'ok' | 'bad' | 'neutral' {
  if (!value) return 'neutral'
  return value.toLowerCase() === 'ok' ? 'ok' : 'bad'
}
