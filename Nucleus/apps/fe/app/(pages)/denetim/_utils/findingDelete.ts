import { ADMIN_ROLES, hasPrivilege } from '@/app/_utils/routeAccess'
import type { FiveSFindingLite } from './findingTypes'

/*
 * Deleting a finding while an audit is being corrected (customer notes, row
 * 73: "Denetim onaya geldiğinde düzenlenebiliyor bulgular silinemiyor").
 *
 * Merkez Ekip, Super Admin and the godmin correct a sent or approved audit on
 * the question screen; this is the pure side of its "Sil" per finding — who
 * is offered it, what the confirmation says, what the list looks like after
 * and what a refusal is told. The calls and the dialog live in
 * `_hooks/useAuditFindings`.
 */

/**
 * Only while an audit is open for correction, and only for the roles that may
 * correct it (`ADMIN_ROLES`, not Müdür; the godmin through `isGod`). The server
 * refuses everyone else's delete of such a finding in any case.
 */
export function canDeleteAuditFindings(input: {
  correcting: boolean
  roleNames: readonly string[]
  isGod: boolean
}): boolean {
  return input.correcting && hasPrivilege(input.roleNames, ADMIN_ROLES, input.isGod)
}

/**
 * Whether the finding gets a "Sil": the person may delete while correcting, and
 * the finding is on the audit's own list. That list holds the audit's findings
 * and its in-audit single findings (readAuditFindings.ts), so those are
 * deletable by the same rule; the location's other open findings are not.
 */
export function isDeletableFinding(canDelete: boolean, listed: readonly { id: string }[], findingId: string): boolean {
  return canDelete && listed.some((row) => row.id === findingId)
}

/** Every row of `list` except the finding `id`. */
export function withoutFinding<T extends { id: string }>(list: readonly T[], id: string): T[] {
  return list.filter((row) => row.id !== id)
}

/**
 * The location's open findings together with the audit's own findings of any
 * status (a closed one is listed here too, so it can be deleted), each finding
 * once, the highest number first as the open list is read.
 */
export function mergeFindingRows<T extends { id: string; finding_no?: number | null }>(
  openAtLocation: readonly T[],
  ofAudit: readonly T[]
): T[] {
  const byId = new Map<string, T>()
  for (const row of [...openAtLocation, ...ofAudit]) {
    if (!byId.has(row.id)) byId.set(row.id, row)
  }
  return [...byId.values()].sort((a, b) => (b.finding_no ?? -1) - (a.finding_no ?? -1))
}

export function findingNumberLabel(finding: Pick<FiveSFindingLite, 'finding_no'>): string {
  return finding.finding_no == null ? 'Numarasız bulgu' : `#${finding.finding_no} numaralı bulgu`
}

/**
 * What the dialog says: what disappears, what changes around it, and that it
 * cannot be undone. A closed finding also loses the evidence it was closed on.
 */
export function findingDeleteConfirmation(finding: Pick<FiveSFindingLite, 'finding_no' | 'status'>) {
  const closed = String(finding.status ?? '').trim().toLowerCase() === 'closed'
  return {
    title: 'Bulguyu sil',
    message: [
      `${findingNumberLabel(finding)} kalıcı olarak silinecek: bulgu kaydı ve fotoğraf bağlantıları bu denetimden, bulgu listesinden ve raporlardan kalkar; sorudaki açık bulgu uyarısı da kaybolur.`,
      closed ? 'Kapatılmış bulgunun kapanış kanıtı da kaybolur.' : '',
      'Bu işlem geri alınamaz.',
    ]
      .filter(Boolean)
      .join(' '),
    confirmLabel: 'Sil',
    tone: 'danger' as const,
  }
}

export type FindingDeleteFailure = {
  message: string
  /** The finding is not on the server any more: the row should leave the list too. */
  gone: boolean
}

/** A refused or failed delete, said as what is wrong, what it means and what to do. */
export function findingDeleteFailure(code: number | null | undefined): FindingDeleteFailure {
  if (code === 404) {
    return { message: 'Bu bulgu zaten silinmiş; liste güncellendi.', gone: true }
  }
  if (code === 401) {
    return { message: 'Oturumunuz sona ermiş, bulgu silinmedi. Yeniden giriş yapıp tekrar deneyin.', gone: false }
  }
  if (code === 403) {
    return {
      message:
        'Bulgu silinemedi: onay bekleyen ya da tamamlanmış bir denetimin bulgusunu yalnız Merkez Ekip ve Super Admin silebilir.',
      gone: false,
    }
  }
  return { message: 'Bulgu silinemedi. Bağlantınızı kontrol edip tekrar deneyin.', gone: false }
}

/** The panel's heading and empty line: while correcting, it also lists the audit's own findings. */
export function findingsPanelText(correcting: boolean) {
  return correcting
    ? {
        title: 'Bu Denetimin ve Lokasyonun Bulguları',
        empty: 'Bu denetimde ve lokasyonda listelenecek bulgu yok.',
      }
    : { title: 'Bu Lokasyondaki Açık Bulgular', empty: 'Bu lokasyonda açık bulgu yok.' }
}
