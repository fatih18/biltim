import { describe, expect, it } from 'bun:test'
import { FM1, FM2, LEADER, MEMBER, TEAM_USERS, user } from '../mail/mailKit'
import { AUDIT, PLAN_A, noticeWorld, plan, planId } from './noticeKit'
import { processNotice, runNoticePass } from './process'
import { NOTICE_BATCH, NOTICE_RETRY_MS } from './types'

const CREATED_BODY =
  'Plan: Haddehane 5S denetimi. Dönem: 2026 Q4. Lokasyon: Haddehane 2. Planlanan tarih: 12.11.2026. Denetim ekibi: Mehmet Demir (ekip lideri), Ayşe Kaya. Planın güncel tarihi ve durumu uygulamada ana sayfadaki Plan / Yaklaşan sekmesinde görünür.'

const COMPLETED_BODY =
  'Lokasyon: Haddehane 2. Denetim tarihi: 12.11.2026. Denetim puanı: 82,5 (hedef puan: 75, hedefe ulaşıldı). Açılan bulgu sayısı: 3. Denetimin raporunu uygulamada ana sayfadaki Tamamlanan sekmesinden açabilirsiniz. Açılan bulguları Bulgular sayfasında görebilir, düzelttiğinizde bulguyu "sonrası" fotoğrafıyla kapatabilirsiniz.'

const nobodyPlan = (n: number) => plan(planId(n), 'created', { leader_user_id: '', field_manager_user_ids: [] })

describe('a created plan', () => {
  it('tells the team leader, the members and the field managers, once each, with the mail’s own words', async () => {
    const w = noticeWorld({ plans: [plan()], members: [MEMBER], users: TEAM_USERS })
    expect(await processNotice('created', PLAN_A, w.deps)).toEqual({ outcome: 'written', added: 4 })
    expect(w.notifications.map((n) => n.user_id)).toEqual([LEADER, MEMBER, FM1, FM2])
    for (const n of w.notifications) {
      expect(n).toMatchObject({
        type: 'plan_created',
        source: `plan-created:${PLAN_A}`,
        title: 'Yeni 5S denetim planı: Haddehane 2 - 12.11.2026',
        body: CREATED_BODY,
      })
    }
  })

  it('counts a person once when they are the leader, a member and a field manager at the same time', async () => {
    const w = noticeWorld({
      plans: [plan(PLAN_A, 'created', { field_manager_user_ids: [LEADER, FM1] })],
      members: [LEADER, MEMBER, MEMBER],
      users: TEAM_USERS,
    })
    await processNotice('created', PLAN_A, w.deps)
    expect(w.notifications.map((n) => n.user_id)).toEqual([LEADER, MEMBER, FM1])
  })

  it('skips switched-off accounts, but still tells a person who has no mail address', async () => {
    const users = [user(LEADER, null, 'Mehmet', 'Demir'), user(MEMBER, 'uye@firma.example', 'Ayşe', 'Kaya', false), user(FM1, 'saha1@firma.example')]
    const w = noticeWorld({ plans: [plan()], members: [MEMBER], users })
    await processNotice('created', PLAN_A, w.deps)
    expect(w.notifications.map((n) => n.user_id)).toEqual([LEADER, FM1])
  })

  it('writes nothing, not even a transaction, when nobody is left to tell', async () => {
    const users = [user(LEADER, 'lider@firma.example', 'Mehmet', 'Demir', false), user(FM1, null, 'Can', 'Yıldız', false)]
    const w = noticeWorld({ plans: [plan()], members: [], users })
    expect(await processNotice('created', PLAN_A, w.deps)).toEqual({ outcome: 'nobody', added: 0 })
    expect(w.notifications).toEqual([])
    expect(w.events).toEqual([])
  })

  it('reports a plan that vanished as gone', async () => {
    const w = noticeWorld({ plans: [], users: TEAM_USERS })
    expect(await processNotice('created', PLAN_A, w.deps)).toEqual({ outcome: 'gone', added: 0 })
  })
})

describe('a completed plan', () => {
  it('tells the field managers only, with the score and the findings of the audit', async () => {
    const w = noticeWorld({ plans: [plan(PLAN_A, 'completed')], members: [MEMBER], users: TEAM_USERS, findings: 3 })
    expect(await processNotice('completed', PLAN_A, w.deps)).toEqual({ outcome: 'written', added: 2 })
    expect(w.notifications.map((n) => n.user_id)).toEqual([FM1, FM2])
    for (const n of w.notifications) {
      expect(n).toMatchObject({
        type: 'plan_completed',
        source: `plan-completed:${PLAN_A}`,
        title: '5S denetimi tamamlandı: Haddehane 2 - 12.11.2026',
        body: COMPLETED_BODY,
      })
    }
    expect(w.calls.some((c) => c.params.includes(AUDIT))).toBe(true)
  })

  it('writes nothing when the location has no field manager', async () => {
    const w = noticeWorld({ plans: [plan(PLAN_A, 'completed', { field_manager_user_ids: [] })], users: TEAM_USERS })
    expect(await processNotice('completed', PLAN_A, w.deps)).toEqual({ outcome: 'nobody', added: 0 })
    expect(w.notifications).toEqual([])
  })
})

describe('never twice', () => {
  it('a second tick finds the plan told and adds nothing, and so does a second backend', async () => {
    const w = noticeWorld({ plans: [plan()], members: [MEMBER], users: TEAM_USERS })
    await runNoticePass(w.deps)
    expect(w.notifications).toHaveLength(4)
    await runNoticePass(w.deps)
    expect(w.notifications).toHaveLength(4)
    // A process that read the plan before the first one wrote: the statement itself adds nothing.
    expect(await processNotice('created', PLAN_A, w.deps)).toEqual({ outcome: 'already', added: 0 })
    expect(w.notifications).toHaveLength(4)
  })

  it('writes under the event’s lock, in one transaction', async () => {
    const w = noticeWorld({ plans: [plan()], members: [MEMBER], users: TEAM_USERS })
    await processNotice('created', PLAN_A, w.deps)
    expect(w.events).toEqual(['begin', `lock:plan-created:${PLAN_A}`, 'insert:4', 'commit'])
  })
})

describe('a pass', () => {
  const bigWorld = (count: number) =>
    noticeWorld({ plans: Array.from({ length: count }, (_, i) => plan(planId(i + 1))), members: [MEMBER], users: TEAM_USERS })

  it('handles at most twenty plans, the rest on the next pass', async () => {
    const w = bigWorld(25)
    expect(await runNoticePass(w.deps)).toMatchObject({ plans: NOTICE_BATCH, added: NOTICE_BATCH * 4 })
    expect(await runNoticePass(w.deps)).toMatchObject({ plans: 5, added: 20 })
    expect(await runNoticePass(w.deps)).toMatchObject({ plans: 0, added: 0 })
  })

  it('takes both kinds in turn, so a mass planning cannot hold back a finished audit', async () => {
    const plans = [...Array.from({ length: 25 }, (_, i) => plan(planId(i + 1))), plan(planId(99), 'completed')]
    const w = noticeWorld({ plans, members: [MEMBER], users: TEAM_USERS, findings: 1 })
    const report = await runNoticePass(w.deps)
    expect(report.plans).toBe(NOTICE_BATCH)
    expect(w.notifications.some((n) => n.type === 'plan_completed')).toBe(true)
  })

  it('does not let plans nobody can be told about use up the batch every minute', async () => {
    const plans = [...Array.from({ length: NOTICE_BATCH }, (_, i) => nobodyPlan(i + 1)), plan(planId(50))]
    const w = noticeWorld({ plans, members: [], users: TEAM_USERS })
    expect(await runNoticePass(w.deps)).toMatchObject({ plans: NOTICE_BATCH, nobody: NOTICE_BATCH, added: 0 })
    const second = await runNoticePass(w.deps)
    expect(second).toMatchObject({ plans: 1, added: 3, resting: NOTICE_BATCH })
    expect(w.notifications.every((n) => n.source === `plan-created:${planId(50)}`)).toBe(true)
  })

  it('looks at a plan nobody could be told about again after a while, and says so in the log only once', async () => {
    const w = noticeWorld({ plans: [nobodyPlan(1)], members: [], users: TEAM_USERS })
    await runNoticePass(w.deps)
    expect(await runNoticePass(w.deps)).toMatchObject({ plans: 0, resting: 1 })
    w.clock.at += NOTICE_RETRY_MS + 1
    expect(await runNoticePass(w.deps)).toMatchObject({ plans: 1, nobody: 1 })
    expect(w.lines.filter((l) => l.includes('yazılacak kimse yok'))).toHaveLength(1)
  })

  it('keeps going after a plan failed and says so in one line for the whole pass', async () => {
    const plans = [plan(planId(1)), plan(planId(2)), plan(planId(3))]
    const w = noticeWorld({ plans, members: [MEMBER], users: TEAM_USERS, brokenPlan: planId(2) })
    const report = await runNoticePass(w.deps)
    expect(report).toMatchObject({ plans: 3, failed: 1, added: 8 })
    const errors = w.lines.filter((l) => l.startsWith('HATA'))
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('1 plan için bildirim yazılamadı')
    expect(errors[0]).toContain('plan okunamadı')
    expect(w.notifications.some((n) => n.source.endsWith(planId(2)))).toBe(false)
  })

  it('takes no further plan once it is told to stop', async () => {
    const w = bigWorld(5)
    let n = 0
    w.deps.stopped = () => n++ >= 3
    const report = await runNoticePass(w.deps)
    expect(report.plans).toBeLessThan(5)
  })
})
