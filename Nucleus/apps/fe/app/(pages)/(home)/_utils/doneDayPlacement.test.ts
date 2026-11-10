import { describe, expect, it } from 'bun:test'
import { countAudits, countRepeats, dayKey, doneDayOf, placeByDay } from './doneDayPlacement'
import { plan, shape } from './doneDayPlacementKit'

describe('dayKey', () => {
  it('reads the day of a date and of a timestamp without moving it', () => {
    expect(dayKey('2026-10-02')).toBe('2026-10-02')
    expect(dayKey('2026-10-02T00:00:00.000Z')).toBe('2026-10-02')
    expect(dayKey('2026-10-02 21:00:00')).toBe('2026-10-02')
  })

  it('is empty for what is not a day', () => {
    expect(dayKey('')).toBe('')
    expect(dayKey(null)).toBe('')
    expect(dayKey(undefined)).toBe('')
    expect(dayKey('02.10.2026')).toBe('')
  })
})

describe('doneDayOf', () => {
  it('is empty for a plan with no audit, or an audit whose day was not read', () => {
    expect(doneDayOf(plan('p', '2026-10-08'), { a: '2026-10-02' })).toBe('')
    expect(doneDayOf(plan('p', '2026-10-08', 'a'), {})).toBe('')
  })

  it('reads the audit day of the plan\'s audit', () => {
    expect(doneDayOf(plan('p', '2026-10-08', 'a'), { a: '2026-10-02T00:00:00.000Z' })).toBe('2026-10-02')
  })
})

describe('placeByDay', () => {
  it('adds nothing for plans done on their planned day, or not done yet', () => {
    const plans = [plan('a', '2026-10-09', 'x'), plan('b', '2026-10-08')]
    const entries = placeByDay(plans, { x: '2026-10-09' }, 'desc')
    expect(shape(entries)).toEqual(['plan:a@2026-10-09', 'plan:b@2026-10-08'])
    expect(entries.every((e) => e.kind === 'planned' && e.doneDay === null)).toBe(true)
  })

  it('lists an audit done on another day under both days (planned 08.10, done 02.10)', () => {
    const plans = [plan('late', '2026-10-12'), plan('moved', '2026-10-08', 'x'), plan('early', '2026-10-01')]
    const entries = placeByDay(plans, { x: '2026-10-02' }, 'desc')
    expect(shape(entries)).toEqual([
      'plan:late@2026-10-12',
      'plan:moved@2026-10-08',
      'done:moved@2026-10-02',
      'plan:early@2026-10-01',
    ])
  })

  it('marks the planned entry with the day the audit was done, and the repeat with the planned day', () => {
    const [first, second] = placeByDay([plan('moved', '2026-10-08', 'x')], { x: '2026-10-02' }, 'desc')
    expect(first).toMatchObject({ kind: 'planned', day: '2026-10-08', doneDay: '2026-10-02' })
    expect(second).toMatchObject({ kind: 'done', day: '2026-10-02', plannedDay: '2026-10-08' })
  })

  it('places a repeat by the same direction the plans are sorted in (oldest first)', () => {
    const plans = [plan('early', '2026-10-01'), plan('moved', '2026-10-08', 'x'), plan('late', '2026-10-12')]
    const entries = placeByDay(plans, { x: '2026-10-10' }, 'asc')
    expect(shape(entries)).toEqual([
      'plan:early@2026-10-01',
      'plan:moved@2026-10-08',
      'done:moved@2026-10-10',
      'plan:late@2026-10-12',
    ])
  })

  it('puts a repeat after the plans that are planned for its own day', () => {
    const plans = [plan('moved', '2026-10-12', 'x'), plan('same', '2026-10-09'), plan('older', '2026-10-05')]
    const entries = placeByDay(plans, { x: '2026-10-09' }, 'desc')
    expect(shape(entries)).toEqual([
      'plan:moved@2026-10-12',
      'plan:same@2026-10-09',
      'done:moved@2026-10-09',
      'plan:older@2026-10-05',
    ])
  })

  it('keeps several repeats of one day in the order the plans came in', () => {
    const plans = [plan('p1', '2026-10-12', 'a'), plan('p2', '2026-10-11', 'b')]
    const entries = placeByDay(plans, { a: '2026-10-06', b: '2026-10-06' }, 'desc')
    expect(shape(entries)).toEqual([
      'plan:p1@2026-10-12',
      'plan:p2@2026-10-11',
      'done:p1@2026-10-06',
      'done:p2@2026-10-06',
    ])
  })

  it('puts a repeat beyond the last loaded plan at the end of the list', () => {
    const plans = [plan('p1', '2026-10-12', 'a'), plan('p2', '2026-10-11')]
    const entries = placeByDay(plans, { a: '2026-09-20' }, 'desc')
    expect(shape(entries)).toEqual(['plan:p1@2026-10-12', 'plan:p2@2026-10-11', 'done:p1@2026-09-20'])
  })

  it('never reorders the plans, so a date edited on screen keeps its row', () => {
    const plans = [plan('a', '2026-10-05'), plan('b', '2026-10-20'), plan('c', '2026-10-07')]
    const entries = placeByDay(plans, {}, 'desc')
    expect(entries.map((e) => e.plan.id)).toEqual(['a', 'b', 'c'])
  })

  it('gives a plan with an unreadable planned day no repeat, but still says when it was done', () => {
    const [only, ...rest] = placeByDay([plan('p', '', 'x')], { x: '2026-10-02' }, 'desc')
    expect(rest).toEqual([])
    expect(only).toMatchObject({ kind: 'planned', doneDay: '2026-10-02' })
  })

  it('reads the day of a timestamp the same as the day alone', () => {
    const entries = placeByDay([plan('p', '2026-10-08T00:00:00.000Z', 'x')], { x: '2026-10-08T00:00:00.000Z' }, 'desc')
    expect(shape(entries)).toEqual(['plan:p@2026-10-08'])
  })

  it('gives every entry its own key', () => {
    const entries = placeByDay([plan('p', '2026-10-08', 'x')], { x: '2026-10-02' }, 'desc')
    expect(new Set(entries.map((e) => e.key)).size).toBe(entries.length)
  })
})

describe('counting a list that holds repeats', () => {
  const plans = [plan('a', '2026-10-12', 'x'), plan('b', '2026-10-11', 'y'), plan('c', '2026-10-10')]
  const entries = placeByDay(plans, { x: '2026-10-05', y: '2026-10-11' }, 'desc')

  it('counts a repeat as no extra audit', () => {
    expect(entries.length).toBe(4)
    expect(countAudits(entries)).toBe(plans.length)
  })

  it('says how many audits are listed twice', () => {
    expect(countRepeats(entries)).toBe(1)
    expect(countRepeats(placeByDay(plans, {}, 'desc'))).toBe(0)
  })
})
