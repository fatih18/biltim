import { describe, expect, it } from 'bun:test'
import { type HomeTabKey, TAB_SORT_DIRECTION, TAB_STATUS_FILTERS } from './tabStatus'

const TABS: HomeTabKey[] = ['upcoming', 'approval', 'completed']

/** The tabs a status shows up in, the way the server applies each tab's filter. */
function tabsHolding(status: string): HomeTabKey[] {
  return TABS.filter((tab) => {
    const { operator, value } = TAB_STATUS_FILTERS[tab]
    return operator === 'in' ? value.includes(status) : !value.includes(status)
  })
}

describe('home tab filters', () => {
  it('puts every status in exactly one tab', () => {
    for (const status of ['planned', 'pending_approval', 'rejected', 'completed', 'cancelled']) {
      expect(tabsHolding(status)).toHaveLength(1)
    }
  })

  it('keeps a rejected plan open: neither "Onay Bekleyen" nor "Tamamlanan"', () => {
    expect(tabsHolding('rejected')).toEqual(['upcoming'])
  })

  it('keeps sent and approved plans in their own tabs', () => {
    expect(tabsHolding('pending_approval')).toEqual(['approval'])
    expect(tabsHolding('completed')).toEqual(['completed'])
    expect(tabsHolding('planned')).toEqual(['upcoming'])
  })
})

describe('home tab order', () => {
  it('reads the plans still to come oldest first and the sent and approved ones newest first', () => {
    expect(TAB_SORT_DIRECTION).toEqual({ upcoming: 'asc', approval: 'desc', completed: 'desc' })
  })
})
