import {
  LIST_PAGE_SIZE,
  type Condition,
  type ListRow,
  type PageRequest,
  type PageStarter,
} from '@/app/_utils/readAllPages'

/* Tables the way nucleus serves them, shared by the role-read tests. */

const holds = (row: ListRow, condition: Condition): boolean =>
  Array.isArray(condition.value) && condition.value.includes(String(row[condition.field]))

/** A table the way nucleus serves it: filtered, sorted by id, 200 rows a page at most. */
export function serve(table: ListRow[], asked: PageRequest['payload'][] = []): PageStarter {
  return ({ payload, onAfterHandle }) => {
    asked.push(payload)
    const matching = table
      .filter((row) => (payload.filters ?? []).every((condition) => holds(row, condition)))
      .sort((a, b) => String(a.id).localeCompare(String(b.id)))
    const size = Math.min(payload.limit, LIST_PAGE_SIZE)
    const items = matching.slice((payload.page - 1) * size, payload.page * size)
    onAfterHandle({ data: { data: items, pagination: { hasNext: payload.page * size < matching.length } } })
  }
}

export const refuse: PageStarter = ({ onErrorHandle }) => onErrorHandle(new Error('refused'))

/** What the browser reports when it cancels a request, for example on navigation. */
export const cancelled: PageStarter = ({ onErrorHandle }) => onErrorHandle(new DOMException('cancelled', 'AbortError'))

export const roles: ListRow[] = [
  { id: 'r-aud', name: 'Auditor', alias: 'Denetçi' },
  { id: 'r-mgr', name: 'Manager', alias: 'Müdür' },
]

/** 450 auditors, then the one whose assignment is the last row of the table. */
export const crowded: ListRow[] = [
  ...Array.from({ length: 450 }, (_, i) => ({ id: `a-${String(i).padStart(4, '0')}`, user_id: `u-${i}`, role_id: 'r-aud' })),
  { id: 'z-last', user_id: 'u-late', role_id: 'r-mgr' },
]
