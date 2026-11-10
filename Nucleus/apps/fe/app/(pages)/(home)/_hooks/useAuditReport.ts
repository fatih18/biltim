'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { downloadFile } from '@/app/_utils/downloadFile'
import { AUDIT_REPORT_PATH, auditReportFailureMessage, auditReportParams } from '../_utils/auditReport'

/** Download the report of one completed audit; `busyId` is the plan whose report is being prepared. */
export function useAuditReport() {
  const [busyId, setBusyId] = useState<string | null>(null)

  const open = async (plan: { id: string; audit_id: string | null }) => {
    if (busyId || !plan.audit_id) return
    setBusyId(plan.id)
    const result = await downloadFile(AUDIT_REPORT_PATH, auditReportParams(plan.audit_id), 'denetim-raporu.xlsx')
    setBusyId(null)
    if (!result.ok) toast.error(auditReportFailureMessage(result.status, result.message))
  }

  return { busyId, open }
}
