'use client'

import { useEffect, useEffectEvent, useState } from 'react'
import { useGenericApiActions } from '@/app/_hooks/UseNucleusApi'
import { useGetUserRole } from '@/app/_hooks/user/useGetUserRole'
import { useMyScope } from '@/app/_hooks/user/useMyScope'
import { type SortCondition, useServerList } from '@/app/_hooks/UseServerList'
import { CENTRAL_ROLES, hasPrivilege } from '@/app/_utils/routeAccess'
import { type LocationRow, offeredLocations } from '../_utils/locationOptions'
import { nextPagingStep, pickerStatus } from '../_utils/locationPaging'

/** nucleus gives at most 200 rows a page whatever `limit` says, so the list is read page by page. */
const PAGE_SIZE = 200
// A tie-breaking sort keeps the pages from overlapping.
const SORT: SortCondition[] = [
  { field: 'name', direction: 'asc' },
  { field: 'id', direction: 'asc' },
]
const ACTIVE_ONLY = { is_active: true }

/**
 * Every active location for the report pickers, however many there are.
 *
 * The picker used to ask for `limit: 500` and keep the first answer, which is
 * the first 200 rows: past 200 locations the rest were not offered, and a
 * failed read left an empty list that looked like "no locations". Now every
 * page is read, a failure is reported, and a field manager is offered their
 * own locations only (the server refuses the rest).
 */
export function useLocationOptions() {
  const actions = useGenericApiActions()
  const { roles, isGod, isLoading: rolesLoading } = useGetUserRole()
  const { scope, failed: scopeFailed } = useMyScope()
  const roleNames = roles.map((r) => r.name)
  const scoped = hasPrivilege(roleNames, ['field manager']) && !hasPrivilege(roleNames, CENTRAL_ROLES, isGod)

  const list = useServerList<LocationRow>({
    action: actions.GET_FIVE_S_LOCATIONS,
    pageSize: PAGE_SIZE,
    sort: SORT,
    filters: ACTIVE_ONLY,
  })

  // A refused page ends the reading (locationPaging.ts); `error` is null until a request fails.
  const paging = {
    hasMore: list.hasMore,
    isLoading: list.isLoading,
    isLoadingMore: list.isLoadingMore,
    failed: list.error !== null,
  }
  const step = nextPagingStep(paging)
  const readNextPage = useEffectEvent(() => list.loadMore())
  useEffect(() => {
    if (step === 'read') readNextPage()
  }, [step])

  // Before the first effect has run nothing is loading yet, and "empty" would flash.
  const [requested, setRequested] = useState(false)
  useEffect(() => setRequested(true), [])

  const waitingForScope = rolesLoading || (scoped && !scope && !scopeFailed)
  const { loading, failed } = pickerStatus({ list: paging, requested, waitingForScope, scoped, scopeFailed })

  return {
    // A half-read list is never offered: it would look like the whole plant.
    names: failed ? [] : offeredLocations(list.rows, scoped ? (scope?.fieldManagerLocationNames ?? []) : null),
    loading,
    failed,
    scoped,
    reload: list.reload,
  }
}
