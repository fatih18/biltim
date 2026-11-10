import { useRef, useState } from 'react'
import type { PageStarter } from '@/app/_utils/readAllPages'
import type { AuditPlanRow } from '../page'
import { toPlanRow } from '../_utils/planRow'
import { readRepeatSources, type DayRange, type PlanStarter, type TabCondition } from '../_utils/repeatSources'

/**
 * The plans read only to be repeated under the day they were done (R43), and
 * whether that read failed.
 *
 * `plans` are not rows of the tab and not part of its counts: `placeByDay` turns
 * them into repeats and nothing else. `unavailable` is the honest half: when the
 * read fails the list says so, instead of passing off a partial list as whole.
 */
export type RepeatState = { plans: AuditPlanRow[]; unavailable: boolean }

const NONE: RepeatState = { plans: [], unavailable: false }

export type RepeatLoad = {
  /** Null where the generated action is missing. */
  startAudits: PageStarter | null
  startPlans: PlanStarter | null
  /** The tab's own plan conditions, scope included. */
  tabFilters: readonly TabCondition[]
  range: DayRange
  knownAuditIds: readonly string[]
  /** Called with what was found while it still belongs to the tab on screen. */
  onFound: (plans: AuditPlanRow[], auditDays: Record<string, string>) => void
}

/**
 * One read at a time, the latest wins: switching tabs while an earlier read is
 * on its way drops that answer instead of showing another tab's repeats.
 *
 * `load` and `clear` touch only the state setter and a ref, both stable, so the
 * copies the page's dependency-free `fetchAll` keeps from its first render stay
 * correct.
 */
export function useRepeatSources(): RepeatState & {
  load: (request: RepeatLoad) => void
  clear: () => void
} {
  const [state, setState] = useState<RepeatState>(NONE)
  const latest = useRef(0)

  const clear = () => {
    latest.current += 1
    setState(NONE)
  }

  const load = (request: RepeatLoad) => {
    const mine = ++latest.current
    setState(NONE)
    const { startAudits, startPlans, tabFilters, range, knownAuditIds, onFound } = request
    if (!startAudits || !startPlans) {
      setState({ plans: [], unavailable: true })
      return
    }
    readRepeatSources({
      startAudits,
      startPlans,
      tabFilters,
      range,
      knownAuditIds,
      onDone: (found) => {
        if (latest.current !== mine) return
        const plans = found.plans.map(toPlanRow).filter((plan) => plan.id !== '')
        setState({ plans, unavailable: false })
        onFound(plans, found.auditDays)
      },
      onError: (error) => {
        if (latest.current !== mine) return
        console.error('repeat sources error', error)
        setState({ plans: [], unavailable: true })
      },
    })
  }

  return { ...state, load, clear }
}
