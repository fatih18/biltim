/**
 * Which planned audit the form opens (R71).
 *
 * The form used to look for the clicked plan (`?planId=`) only among the plans
 * of the viewer's own teams. A Merkez Ekip user who is also the field manager
 * of a region ("koray") clicked another team's plan on the home page, did not
 * find it in that list, and fell through to the single plan of his own team: the
 * form opened on HIS region instead of the location of the plan he clicked.
 *
 * The rule here is that the clicked plan always wins. When it cannot be opened
 * the form says why and offers the list; it never quietly opens another plan.
 */

export type OpenablePlan = {
  id: string
  location_id: string
  assigned_team_id: string
}

/** What the "Denetim Seç" list holds, which decides the sentence above it. */
export type PickScope = 'own-team' | 'all' | 'all-no-team'

export type PlanChoice<P extends OpenablePlan> =
  | { kind: 'open'; plan: P; notice: null }
  | { kind: 'pick'; plans: P[]; scope: PickScope; notice: string | null }
  | { kind: 'none'; notice: string | null }

export type PlanChoiceInput<P extends OpenablePlan> = {
  /** Every active plan still `planned` with no audit yet, as the server returned them. */
  plans: readonly P[]
  /** Ids of plans whose audit already waits in this device's offline queue. */
  queuedPlanIds: ReadonlySet<string>
  /** Whether the viewer is a member or the leader of this team. */
  isOnTeam: (teamId: string) => boolean
  /** Whether the viewer is a field manager of the plan's location. */
  isFieldManagerOf: (plan: P) => boolean
  /** Merkez Ekip, Super Admin, Müdür and the godmin: every plan is theirs to see. */
  seesEveryPlan: boolean
  /** Merkez Ekip, Super Admin and the godmin: may start the audit of their own location (#27). */
  mayStartOwnLocation: boolean
  /** The plan the viewer clicked, from the address bar. */
  requestedPlanId: string | null
}

const sameId = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase()

export const PLAN_GONE_NOTICE =
  'Seçtiğiniz denetim artık başlatılamıyor: başlatılmış, onaya gönderilmiş ya da silinmiş olabilir.'
export const PLAN_QUEUED_NOTICE =
  'Seçtiğiniz denetimin kaydı bu cihazda gönderilmeyi bekliyor; aynı denetim ikinci kez başlatılamaz. Bağlantı gelince otomatik gönderilir.'
export const PLAN_OWN_LOCATION_NOTICE =
  'Saha sorumlusu olduğunuz lokasyonun denetimini siz yapamazsınız; bu denetimi ekipteki diğer denetçiler başlatmalıdır.'
export const PLAN_NOT_YOUR_TEAM_NOTICE =
  'Seçtiğiniz denetim ekibinize atanmamış; yalnız kendi ekibinizin denetimlerini başlatabilirsiniz.'

function whyNotOpenable<P extends OpenablePlan>(requestedId: string, input: PlanChoiceInput<P>): string {
  const known = input.plans.find((p) => sameId(p.id, requestedId))
  if (!known) return PLAN_GONE_NOTICE
  if (input.queuedPlanIds.has(known.id)) return PLAN_QUEUED_NOTICE
  if (!input.mayStartOwnLocation && input.isFieldManagerOf(known)) return PLAN_OWN_LOCATION_NOTICE
  return PLAN_NOT_YOUR_TEAM_NOTICE
}

export function choosePlan<P extends OpenablePlan>(input: PlanChoiceInput<P>): PlanChoice<P> {
  const startable = input.plans.filter(
    (p) => !input.queuedPlanIds.has(p.id) && (input.mayStartOwnLocation || !input.isFieldManagerOf(p))
  )
  const mine = startable.filter((p) => input.isOnTeam(p.assigned_team_id))
  // The viewer's own team's plans lead the list; the rest keep the server's order.
  const reachable = input.seesEveryPlan ? [...mine, ...startable.filter((p) => !mine.includes(p))] : mine
  const scope: PickScope = !input.seesEveryPlan ? 'own-team' : mine.length > 0 ? 'all' : 'all-no-team'

  const requested = (input.requestedPlanId ?? '').trim()
  if (requested) {
    const hit = reachable.find((p) => sameId(p.id, requested))
    if (hit) return { kind: 'open', plan: hit, notice: null }
    const notice = whyNotOpenable(requested, input)
    return reachable.length > 0 ? { kind: 'pick', plans: reachable, scope, notice } : { kind: 'none', notice }
  }

  // R16 (Notlar 22.10, satır 16): nothing is opened by itself. A lone plan used
  // to open as soon as the page did, which left anyone with an assignment no way
  // to file a plan-less single finding. An audit starts only on purpose (the
  // clicked plan above, or a pick from the list); without a click the list stands
  // next to "Tekil Bulgu +".
  if (reachable.length === 0) return { kind: 'none', notice: null }
  return { kind: 'pick', plans: reachable, scope, notice: null }
}

/** The sentence above the "Denetim Seç" list. */
export function pickIntro(scope: PickScope): string {
  if (scope === 'own-team') {
    return 'Ekibinize atanmış planlı denetimler aşağıda. Denetime başlamak için birini seçin; seçmediğiniz sürece hiçbir denetim başlamaz.'
  }
  if (scope === 'all-no-team') {
    return 'Ekibinize atanmış planlı bir denetim yok. Yetkiniz olduğu için açık denetimlerin tamamı aşağıda listeleniyor.'
  }
  return 'Yetkiniz olduğu için açık denetimlerin tamamı aşağıda listeleniyor; ekibinize atananlar en üstte.'
}
