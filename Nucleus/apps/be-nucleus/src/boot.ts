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
 * Correcting a carried-out audit (#12): its scores on the audit row and its
 * answers row by row. Merkez Ekip held neither claim — the "Düzenle" modal on
 * the home page answered "Yetkiniz olmayabilir" for exactly them. Müdür was
 * granted the same claims with them and keeps them, but the decision on rows
 * 12, 17 and 29 gives correcting a pending or completed audit to Merkez Ekip,
 * Super Admin and the godmin alone: the business-rule guard refuses it from
 * Müdür, not this list.
 *
 * Both also read roles and role assignments, read only. Both master-data
 * screens are theirs, and both need to know who holds which role: the teams
 * screen offers only auditors as members, and the improvement-actions screen
 * lists the managers. Without these reads the first offered everyone and the
 * second listed no one. Writing user_roles stays with the godmin and the
 * users screen's own route (/biltim/users/roles).
 *
 * Both delete findings (the "Sil" column on the findings register). That
 * claim came only from the hand-run roles-nucleus-claims.sql, so an install
 * where the script never ran answered 403; it is granted here too.
 *
 * Auditor: the date of a planned audit, two columns. The team leader — an
 * auditor — may move it (within the 2-change cap), and the home page offers
 * it. The role held only the status/audit_id/attendance column claims, so
 * nucleus dropped planned_date and date_change_count from the write and still
 * answered 200: the screen showed the new date, a refresh brought the old one
 * back. The column claims open the two fields; the business-rule guard keeps
 * them to the leader of the plan's own team.
 *
 * Only claims that exist are granted, and only once.
 */
const GRANTS: Array<[role: string, action: string]> = [
  ...['Manager', 'Content Manager Core Team'].flatMap((role) =>
    [
      'put.five_s_audits',
      'patch.five_s_audits',
      'post.five_s_audit_answers',
      'put.five_s_audit_answers',
      'patch.five_s_audit_answers',
      'get.roles',
      'get.user_roles',
      'delete.five_s_findings',
    ].map((action) => [role, action] as [string, string])
  ),
  ...['put', 'patch'].flatMap((method) =>
    ['planned_date', 'date_change_count'].map(
      (column) => ['Auditor', `${method}.five_s_audit_plans.${column}`] as [string, string]
    )
  ),
]

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

  /*
   * #22: finding numbers repeated (two #1, two #2 — Foto 2).
   *
   * finding_no comes from an identity sequence, and the schema push dropped
   * that sequence when the model briefly lost the identity (25.08) and created
   * a new one starting at 1 when it came back (08.09) — while #1 and #2
   * already existed. Nothing moved the new sequence past the stored maximum;
   * the hand-run script that would have never reached the server. This moves
   * it forward on every boot, only ever forward, so a future drop/re-add or a
   * rollback cannot hand out a used number again. Same exposure, same fix,
   * for board decisions' item_no.
   */
  for (const [table, column] of [
    ['five_s_findings', 'finding_no'],
    ['board_meeting_decisions', 'item_no'],
  ] as const) {
    try {
      const rows = await query(
        `select setval(x.s, x.m) as moved_to
           from (select pg_get_serial_sequence('main.${table}', '${column}')::regclass as s,
                        (select max(${column}) from main.${table}) as m) x
          where x.s is not null and x.m is not null
            and x.m > coalesce(pg_sequence_last_value(x.s), 0)`
      )
      if (rows.length > 0) console.log(`[boot] ${table}.${column} sayacı ${rows[0]?.moved_to} değerine ilerletildi`)
    } catch (error) {
      console.error(`[boot] ${table}.${column} sayacı ilerletilemedi`, error)
    }
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

  /*
   * The offline queue's last line of defence against writing one audit or
   * finding twice: a reply lost on a flaky link makes the tablet send the
   * same submission again, with the same client id. offline-queue-
   * idempotency.sql had these, but nothing runs SQL at deploy, so no install
   * had them and the retry wrote a copy. With them, nucleus answers 409 and
   * the screen picks up the row that already exists.
   *
   * Partial: older rows carry no client id and keep carrying none. If an
   * install already holds two rows with the same id, the index cannot be
   * built; that is logged and the API starts as before.
   */
  for (const [name, table, column] of [
    ['five_s_audits_client_submission_uq', 'five_s_audits', 'client_submission_id'],
    ['five_s_findings_client_finding_uq', 'five_s_findings', 'client_finding_id'],
  ] as const) {
    try {
      await query(
        `create unique index if not exists ${name} on main.${table} (${column}) where ${column} is not null`
      )
    } catch (error) {
      console.error(`[boot] ${table}.${column} tekillik indeksi kurulamadı`, error)
    }
  }
}
