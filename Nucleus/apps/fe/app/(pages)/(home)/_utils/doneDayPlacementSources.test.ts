import { describe, expect, it } from 'bun:test'
import { countAudits, countOutsideRepeats, countRepeats, placeByDay } from './doneDayPlacement'
import { plan, shape } from './doneDayPlacementKit'

describe('plans read only to be repeated (planned outside the loaded page)', () => {
  const first = plan('p1', '2026-10-12')
  const page = [first, plan('p2', '2026-10-09'), plan('p3', '2026-10-05')]
  // Planned in August, done on 10 October: its plan is nowhere on the page.
  const old = plan('old', '2026-08-14', 'z')

  it('gives such an audit a repeat under the day it was done, and no row of its own', () => {
    const entries = placeByDay(page, { z: '2026-10-10' }, 'desc', [old])
    expect(shape(entries)).toEqual([
      'plan:p1@2026-10-12',
      'done:old@2026-10-10',
      'plan:p2@2026-10-09',
      'plan:p3@2026-10-05',
    ])
    expect(entries.find((e) => e.plan.id === 'old')).toMatchObject({ kind: 'done', day: '2026-10-10', plannedDay: '2026-08-14' })
  })

  it('places it by the direction of the tab (oldest first)', () => {
    const entries = placeByDay([...page].reverse(), { z: '2026-10-10' }, 'asc', [old])
    expect(shape(entries)).toEqual([
      'plan:p3@2026-10-05',
      'plan:p2@2026-10-09',
      'done:old@2026-10-10',
      'plan:p1@2026-10-12',
    ])
  })

  it('never counts it as an audit of the list, only as a repeat from outside the page', () => {
    const entries = placeByDay(page, { z: '2026-10-10' }, 'desc', [old])
    expect(countAudits(entries)).toBe(page.length)
    expect(countRepeats(entries)).toBe(1)
    expect(countOutsideRepeats(entries)).toBe(1)
  })

  it('counts a repeat of a plan on the page as inside, not outside', () => {
    const inside = [plan('p1', '2026-10-12', 'x'), ...page.slice(1)]
    const entries = placeByDay(inside, { x: '2026-10-06', z: '2026-10-10' }, 'desc', [old])
    expect(countRepeats(entries)).toBe(2)
    expect(countOutsideRepeats(entries)).toBe(1)
  })

  it('gives nothing for a source done on its planned day, or not done on a readable day', () => {
    const sameDay = plan('same', '2026-10-10', 'y')
    const noDay = plan('none', '2026-09-01', 'w')
    const entries = placeByDay(page, { y: '2026-10-10' }, 'desc', [sameDay, noDay])
    expect(entries.length).toBe(page.length)
  })

  it('skips a source the page holds already, so an audit is never repeated twice', () => {
    const held = plan('p2', '2026-10-09', 'x')
    const entries = placeByDay([first, held], { x: '2026-10-02' }, 'desc', [held, held])
    expect(shape(entries)).toEqual(['plan:p1@2026-10-12', 'plan:p2@2026-10-09', 'done:p2@2026-10-02'])
  })

  it('lists one source once even when it is handed in twice', () => {
    const entries = placeByDay(page, { z: '2026-10-10' }, 'desc', [old, old])
    expect(countRepeats(entries)).toBe(1)
  })

  it('is the old behaviour when there are no sources', () => {
    expect(shape(placeByDay(page, { z: '2026-10-10' }, 'desc'))).toEqual(shape(placeByDay(page, { z: '2026-10-10' }, 'desc', [])))
  })

  it('reads the planned day of a source by the string rule, in any zone', () => {
    const source = plan('late', '2026-08-14T23:30:00.000Z', 'v')
    const [only] = placeByDay([], { v: '2026-10-10T00:00:00.000Z' }, 'desc', [source])
    expect(only).toMatchObject({ kind: 'done', day: '2026-10-10', plannedDay: '2026-08-14' })
  })
})
