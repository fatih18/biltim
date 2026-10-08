import { query } from './db'

/**
 * Data corrections that have to reach every install, applied at start-up.
 *
 * The delivery script (`deploy/update.sh`) pulls, builds and restarts; it runs
 * no SQL. A correction that lives in a .sql file therefore reaches the server
 * only if somebody remembers to run it by hand. Each step here is idempotent —
 * it touches only rows still in the old shape — so running it on every boot
 * costs one cheap query once there is nothing left to do.
 *
 * A failure is logged and swallowed: a correction that cannot run must not
 * keep the API from starting.
 */
/*
 * Role grants the 7 Oct changes need, on top of roles-nucleus-claims.sql.
 *
 * Merkez Ekip and Müdür correct a carried-out audit (#12): its scores on the
 * audit row and its answers row by row. They held neither — the "Düzenle"
 * modal on the home page answered "Yetkiniz olmayabilir" for exactly them.
 * Only claims that exist are granted, and only once.
 */
const GRANTS: Array<[role: string, action: string]> = ['Manager', 'Content Manager Core Team'].flatMap(
  (role) =>
    [
      'put.five_s_audits',
      'patch.five_s_audits',
      'post.five_s_audit_answers',
      'put.five_s_audit_answers',
      'patch.five_s_audit_answers',
    ].map((action) => [role, action] as [string, string])
)

export async function applyBootFixes(): Promise<void> {
  try {
    const granted = await query(
      `insert into main.role_claims (role_id, claim_id)
       select r.id, c.id
         from unnest($1::text[], $2::text[]) as w(role_name, action)
         join main.roles r on r.name = w.role_name
         join main.claims c on c.action = w.action
        where not exists (select 1 from main.role_claims rc where rc.role_id = r.id and rc.claim_id = c.id)
       returning id`,
      [GRANTS.map((g) => g[0]), GRANTS.map((g) => g[1])]
    )
    if (granted.length > 0) console.log(`[boot] ${granted.length} rol yetkisi eklendi (denetim düzeltme)`)
  } catch (error) {
    console.error('[boot] rol yetkileri eklenemedi', error)
  }

  try {
    /*
     * The single-finding form saves its finding under an audit row of its own
     * — no plan, no answers, every score 0. Those rows were counted as audits:
     * a 0 in every average and an extra audit in every count (#23). The form
     * now marks them `source = 'single_finding'`; this marks the ones it wrote
     * before it did. "No answers" is what tells them apart from a real audit,
     * which always has its question answers.
     */
    const rows = await query(
      `update main.five_s_audits a set source = 'single_finding', updated_at = now()
        where a.source is null
          and a.plan_id is null
          and coalesce(a.total_score, 0) = 0
          and not exists (select 1 from main.five_s_audit_answers x where x.audit_id = a.id)
        returning a.id`
    )
    if (rows.length > 0) {
      console.log(`[boot] ${rows.length} tekil bulgu kaydı denetim sayımlarından çıkarıldı`)
    }
  } catch (error) {
    console.error('[boot] tekil bulgu düzeltmesi uygulanamadı', error)
  }

  try {
    /*
     * #3: the findings register says which audit a finding came from — or
     * that it was raised on its own. `form_title` was in the schema, shown by
     * the register when present, and never written. The screens now write
     * "Tekil Bulgu" or "<lokasyon> · <gün>" with each finding; this fills in
     * the ones written before, in the same words.
     */
    const rows = await query(
      `update main.five_s_findings f
          set form_title = case when a.source = 'single_finding' then 'Tekil Bulgu'
                                else concat_ws(' · ', nullif(trim(a.department_name), ''),
                                               to_char(a.audit_date, 'DD.MM.YYYY')) end,
              updated_at = now()
         from main.five_s_audits a
        where a.id = f.audit_id and f.form_title is null
        returning f.id`
    )
    if (rows.length > 0) console.log(`[boot] ${rows.length} bulguya ana denetim adı yazıldı`)
  } catch (error) {
    console.error('[boot] bulgu kaynak düzeltmesi uygulanamadı', error)
  }
}
