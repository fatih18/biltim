'use client'

import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { toast } from 'sonner'
import { confirmDialog } from '@/app/_components/Global/ConfirmDialog'
import { useGenericApiActions } from '@/app/_hooks/UseNucleusApi'
import {
  findingDeleteConfirmation,
  findingDeleteFailure,
  findingNumberLabel,
  isDeletableFinding,
  withoutFinding,
} from '../_utils/findingDelete'
import type { FiveSFindingLite } from '../_utils/findingTypes'
import { readAuditFindings } from '../_utils/readAuditFindings'

/**
 * The findings of the audit open for correction, and the delete per finding
 * (customer notes, row 73).
 *
 * Read by `audit_id`, any status: the question screen's own list holds the
 * location's OPEN findings only, so a closed finding of this audit was not on
 * it and could not be reached. The single findings raised inside the audit hang
 * under carrier audit rows of the same plan and are read with it
 * (readAuditFindings.ts). `onDeleted` is how the page drops the row from its
 * open-findings list, which the question rows' warnings and counts are derived
 * from.
 */
export function useAuditFindings(props: {
  auditId: string | null
  /** The plan of the audit being corrected; null when it never had one. */
  planId: string | null
  canDelete: boolean
  onDeleted: (findingId: string) => void
}) {
  const actions = useGenericApiActions()
  const [items, setItems] = useState<FiveSFindingLite[]>([])
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  // The read that was started last: the answer of an older one (another audit, a re-read) is dropped.
  const latestRead = useRef(0)

  // An effect event: the generated action object is new on every render and
  // must never be an effect dependency (it loops the request).
  const load = useEffectEvent((auditId: string, planId: string | null) => {
    latestRead.current += 1
    const mine = latestRead.current
    setLoading(true)
    readAuditFindings({
      startAudits: (request) => actions.GET_FIVE_S_AUDITS?.start(request),
      startFindings: (request) => actions.GET_FIVE_S_FINDINGS?.start(request),
      auditId,
      planId,
      onDone: (findings) => {
        if (mine !== latestRead.current) return
        setItems(findings)
        setLoading(false)
      },
      onError: () => {
        if (mine !== latestRead.current) return
        setItems([])
        setLoading(false)
        toast.error('Bu denetimin bulguları okunamadı. Sayfayı yenileyip tekrar deneyin.')
      },
    })
  })

  useEffect(() => {
    if (props.auditId) {
      load(props.auditId, props.planId)
      return
    }
    latestRead.current += 1
    setItems([])
    setLoading(false)
  }, [props.auditId, props.planId])

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
    /** The audit's own findings and its in-audit single findings are deleted from here, not other audits' at the same place. */
    isDeletable: (findingId: string) => isDeletableFinding(props.canDelete, items, findingId),
    remove,
  }
}
