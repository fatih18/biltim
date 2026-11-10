import { describe, expect, it } from 'bun:test'
import { AUDIT, FM1, FM2, LEADER, MEMBER, PLAN_A, mailWorld, plan, user } from './mailKit'
import { preparePlanMail } from './planMail'

const USERS = [
  user(LEADER, 'lider@firma.example', 'Mehmet', 'Demir'),
  user(MEMBER, 'uye@firma.example', 'Ayşe', 'Kaya'),
  user(FM1, 'saha1@firma.example', 'Can', 'Yıldız'),
  user(FM2, 'saha2@firma.example', 'Elif', 'Çelik'),
]

const APP = 'http://172.26.16.27:3000'

describe('the invitation of a new plan', () => {
  it('goes to the team and to the field managers of the plan’s location', async () => {
    const { deps } = mailWorld({ plans: [plan()], members: [MEMBER], users: USERS })
    const mail = await preparePlanMail(deps.sql, 'invitation', PLAN_A, APP)
    expect(mail?.recipients).toEqual(['lider@firma.example', 'uye@firma.example', 'saha1@firma.example', 'saha2@firma.example'])
    expect(mail?.content.subject).toBe('Yeni 5S denetim planı: Haddehane 2 - 12.11.2026')
    expect(mail?.content.text).toContain('Denetim ekibi: Mehmet Demir (ekip lideri), Ayşe Kaya')
    expect(mail?.content.text).toContain('Dönem: 2026 Q4')
  })

  it('counts a field manager who is also on the team once, and skips accounts without an address or switched off', async () => {
    const users = [
      user(LEADER, 'lider@firma.example', 'Mehmet', 'Demir'),
      user(MEMBER, null, 'Ayşe', 'Kaya'),
      user(FM1, 'saha1@firma.example', 'Can', 'Yıldız', false),
      user(FM2, 'LIDER@firma.example', 'Elif', 'Çelik'),
    ]
    const { deps } = mailWorld({ plans: [plan()], members: [MEMBER, LEADER], users })
    const mail = await preparePlanMail(deps.sql, 'invitation', PLAN_A, null)
    expect(mail?.recipients).toEqual(['lider@firma.example'])
    expect(mail?.skipped).toEqual({ missing: 0, inactive: 1, noAddress: 1 })
    expect(mail?.content.text).not.toContain('http')
  })

  it('asks for each account once, whatever role it holds, in canonical form', async () => {
    const { deps, calls } = mailWorld({ plans: [plan(PLAN_A, { field_manager_user_ids: [FM1.toUpperCase(), FM1] })], members: [LEADER.toUpperCase()], users: USERS })
    await preparePlanMail(deps.sql, 'invitation', PLAN_A, null)
    const lookup = calls.find((c) => c.text.includes('from main.users u left join main.profiles'))
    expect(lookup?.params[0]).toEqual([LEADER, FM1])
  })

  it('is null when the plan is gone', async () => {
    const { deps } = mailWorld({ plans: [] })
    expect(await preparePlanMail(deps.sql, 'invitation', PLAN_A, null)).toBeNull()
  })

  it('reads a location without field managers and a team without members as an audience of the leader alone', async () => {
    const { deps } = mailWorld({ plans: [plan(PLAN_A, { field_manager_user_ids: [] })], members: [], users: USERS })
    const mail = await preparePlanMail(deps.sql, 'invitation', PLAN_A, null)
    expect(mail?.recipients).toEqual(['lider@firma.example'])
  })
})

describe('the completion of an audit', () => {
  const finished = {
    audit_row_id: AUDIT,
    audit_date: new Date(2026, 10, 11),
    total_score: '82.50',
    target_score: '75.00',
  }

  it('goes to the field managers of the location only, never to the team', async () => {
    const { deps, calls } = mailWorld({ plans: [plan(PLAN_A, finished)], members: [MEMBER], users: USERS, findings: 3 })
    const mail = await preparePlanMail(deps.sql, 'completion', PLAN_A, APP)
    expect(mail?.recipients).toEqual(['saha1@firma.example', 'saha2@firma.example'])
    expect(calls.some((c) => c.text.includes('five_s_audit_team_members'))).toBe(false)
  })

  it('names the location, the audit’s own day, the score against the target and the findings it opened', async () => {
    const { deps, calls } = mailWorld({ plans: [plan(PLAN_A, finished)], users: USERS, findings: 3 })
    const mail = await preparePlanMail(deps.sql, 'completion', PLAN_A, APP)
    expect(mail?.content.subject).toBe('5S denetimi tamamlandı: Haddehane 2 - 11.11.2026')
    expect(mail?.content.text).toContain('Denetim puanı: 82,5 (hedef puan: 75, hedefe ulaşıldı)')
    expect(mail?.content.text).toContain('Açılan bulgu sayısı: 3')
    expect(calls.find((c) => c.text.includes('from main.five_s_findings'))?.params).toEqual([AUDIT])
  })

  it('falls back to the planned day and leaves the score and the count out when the plan has no audit', async () => {
    const { deps, calls } = mailWorld({ plans: [plan()], users: USERS })
    const mail = await preparePlanMail(deps.sql, 'completion', PLAN_A, null)
    expect(mail?.content.subject).toBe('5S denetimi tamamlandı: Haddehane 2 - 12.11.2026')
    expect(mail?.content.text).not.toContain('Denetim puanı')
    expect(mail?.content.text).not.toContain('Açılan bulgu sayısı')
    expect(calls.some((c) => c.text.includes('from main.five_s_findings'))).toBe(false)
  })
})
