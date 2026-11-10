import { CENTRAL_ROLES, hasPrivilege } from '@/app/_utils/routeAccess'

/*
 * The report of one completed audit, for the field manager of its location
 * (customer notes, row 75: "Bölge sorumlusu tamamlanan denetimin raporunu
 * görebilsin").
 *
 * The report is the plant's own form for the audit — the KYS.180 question
 * sheet with its score and the findings raised in it — which the backend
 * writes at `/reports/location-form.xlsx?audit_id=…`. The backend decides who
 * may open which audit (their own location, approved audits only); the
 * decisions here only keep the button off rows it would refuse.
 */

export const AUDIT_REPORT_PATH = '/reports/location-form.xlsx'

/** A field manager and nothing above: the person whose reports are narrowed to their locations. */
export function isFieldManagerOnly(roleNames: readonly string[], isGod: boolean): boolean {
  return hasPrivilege(roleNames, ['field manager']) && !hasPrivilege(roleNames, CENTRAL_ROLES, isGod)
}

/**
 * Whether a plan row offers the report: the field manager's own location, the
 * audit approved (`completed`, not `pending_approval`) and the audit actually
 * done. Every other role keeps the screen as it was.
 */
export function canOpenAuditReport(input: {
  planStatus: string
  auditId: string | null | undefined
  locationId: string | null | undefined
  isFieldManager: boolean
  fieldManagerLocationIds: readonly string[]
}): boolean {
  const locationId = String(input.locationId ?? '').trim()
  return (
    input.isFieldManager &&
    input.planStatus === 'completed' &&
    String(input.auditId ?? '').trim() !== '' &&
    locationId !== '' &&
    input.fieldManagerLocationIds.includes(locationId)
  )
}

export function auditReportParams(auditId: string): Record<string, string> {
  return { audit_id: auditId.trim() }
}

/**
 * A refused or failed download, said as what is wrong and what to do. The
 * server's own sentence wins for a 403: it knows whether the audit is still
 * waiting for approval or belongs to another location.
 */
export function auditReportFailureMessage(status: number, serverMessage: string): string {
  if (status === 403) {
    return serverMessage.trim() || 'Bu denetimin raporunu açma yetkiniz yok. Yalnız kendi lokasyonunuzun onaylanmış denetimlerinin raporunu açabilirsiniz.'
  }
  if (status === 404) {
    return 'Bu denetim bulunamadı; liste eskimiş olabilir. Sayfayı yenileyip tekrar deneyin.'
  }
  if (status === 401) {
    return 'Oturumunuz sona ermiş, rapor açılamadı. Yeniden giriş yapıp tekrar deneyin.'
  }
  return 'Rapor hazırlanamadı. Bağlantınızı kontrol edip tekrar deneyin.'
}
