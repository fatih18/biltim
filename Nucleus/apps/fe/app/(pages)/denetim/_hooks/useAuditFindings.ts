'use client'

import { useEffect, useEffectEvent, useState } from 'react'
import { toast } from 'sonner'
import { confirmDialog } from '@/app/_components/Global/ConfirmDialog'
import { useGenericApiActions } from '@/app/_hooks/UseNucleusApi'
import {
  auditFindingsPayload,
  findingDeleteConfirmation,
  findingDeleteFailure,
  findingNumberLabel,
  findingRowsOf,
  withoutFinding,
} from '../_utils/findingDelete'
import type { FiveSFindingLite } from '../_utils/findingTypes'

/**
 * The findings of the audit open for correction, and the delete per finding
 * (customer notes, row 73).
 *
 * Read by `audit_id`, any status: the question screen's own list holds the
 * location's OPEN findings only, so a closed finding of this audit was not on
 * it and could not be reached. `onDeleted` is how the page drops the row from
 * its open-findings list, which the question rows' warnings and counts are
 * derived from.
 */
export function useAuditFindings(props: {
  auditId: string | null
  canDelete: boolean
  onDeleted: (findingId: string) => void
}) {
  const actions = useGenericApiActions()
  const [items, setItems] = useState<FiveSFindingLite[]>([])
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // An effect event: the generated action object is new on every render and
  // must never be an effect dependency (it loops the request).
  const load = useEffectEvent((auditId: string) => {
    setLoading(true)
    actions.GET_FIVE_S_FINDINGS?.start({
      payload: auditFindingsPayload(auditId),
      onAfterHandle: (res) => {
        setItems(findingRowsOf(res))
        setLoading(false)
      },
      onErrorHandle: () => {
        setItems([])
        setLoading(false)
        toast.error('Bu denetimin bulguları okunamadı. Sayfayı yenileyip tekrar deneyin.')
      },
    })
  })

  useEffect(() => {
    if (props.auditId) load(props.auditId)
    else setItems([])
  }, [props.auditId])

  const drop = (findingId: string) => {
    setItems((prev) => withoutFinding(prev, findingId))
    props.onDeleted(findingId)
  }

  const remove = async (finding: FiveSFindingLite) => {
    if (!props.canDelete || deletingId) return
    if (!(await confirmDialog(findingDeleteConfirmation(finding)))) return

    setDeletingId(finding.id)
    actions.DELETE_FIVE_S_FINDING?.start({
      payload: { _id: finding.id },
      onAfterHandle: () => {
        setDeletingId(null)
        drop(finding.id)
        toast.success(`${findingNumberLabel(finding)} silindi.`)
      },
      onErrorHandle: (_error, code) => {
        setDeletingId(null)
        const failure = findingDeleteFailure(code)
        if (failure.gone) drop(finding.id)
        toast.error(failure.message)
      },
    })
  }

  return {
    items,
    loading,
    deletingId,
    canDelete: props.canDelete,
    /** Only this audit's own findings are deleted from here, not other audits' at the same place. */
    isDeletable: (findingId: string) => props.canDelete && items.some((row) => row.id === findingId),
    remove,
  }
}
