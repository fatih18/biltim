/**
 * Which plan statuses each tab of the home list asks the server for.
 *
 * "Plan / Yaklaşan" is every plan that is neither sent nor approved, so a plan
 * Merkez Ekip rejected (`rejected`, "Düzeltme Bekliyor") stays an open plan
 * there: it is not "Onay Bekleyen" until its team sends the correction again,
 * and not "Tamamlanan" until it is approved (R30).
 */
export type HomeTabKey = 'upcoming' | 'approval' | 'completed'

export type TabStatusFilter = { field: 'status'; operator: 'in' | 'notIn'; value: string[] }

export const TAB_STATUS_FILTERS: Record<HomeTabKey, TabStatusFilter> = {
  upcoming: { field: 'status', operator: 'notIn', value: ['completed', 'pending_approval'] },
  approval: { field: 'status', operator: 'in', value: ['pending_approval'] },
  completed: { field: 'status', operator: 'in', value: ['completed'] },
}
