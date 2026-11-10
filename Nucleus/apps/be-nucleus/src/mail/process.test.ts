import { describe, expect, it } from 'bun:test'
import { FM1, FM2, LEADER, MEMBER, PLAN_A, PLAN_B, TEAM_USERS, mailWorld, oneDuePlan, plan, user } from './mailKit'
import { envelope, processPlan, runMailTick } from './process'

const SMTP_DOWN = { success: false, error: '421 4.7.0 smtp.firma.example: bağlantı zaman aşımı' }

describe('claim, then send', () => {
  it('sets the marker before the mail is handed to the provider, and keeps it once the mail is out', async () => {
    const w = mailWorld(oneDuePlan())
    expect(await processPlan('invitation', PLAN_A, w.deps)).toBe('sent')
    expect(w.events).toEqual([`claim:${PLAN_A}`, 'send'])
    expect(w.world.plans[0]?.claimed).toBe(true)
  })

  it('sends one message, the audience in bcc and the sender’s own box in to', async () => {
    const w = mailWorld(oneDuePlan())
    await processPlan('invitation', PLAN_A, w.deps)
    expect(w.sent).toHaveLength(1)
    expect(w.sent[0]?.to).toBe('denetim@firma.example')
    expect(w.sent[0]?.bcc).toEqual(['lider@firma.example', 'uye@firma.example', 'saha1@firma.example', 'saha2@firma.example'])
    expect(w.sent[0]?.subject).toContain('Haddehane 2')
    expect(w.sent[0]?.text).toContain('Denetim ekibi')
    expect(w.sent[0]?.html).toContain('<table')
  })

  it('sends nothing when another tick or process took the plan first', async () => {
    const w = mailWorld(oneDuePlan())
    const taken = w.world.plans[0]
    if (taken) taken.claimed = true
    expect(await processPlan('invitation', PLAN_A, w.deps)).toBe('lost')
    expect(w.events).toEqual([])
    expect(w.sent).toEqual([])
  })

  it('never sends the same plan twice across ticks', async () => {
    const w = mailWorld(oneDuePlan())
    await runMailTick(w.deps)
    await runMailTick(w.deps)
    await runMailTick(w.deps)
    expect(w.sent).toHaveLength(1)
  })

  it('settles a plan nobody can be mailed about instead of trying it every minute', async () => {
    const w = mailWorld({ plans: [plan()], members: [], users: [user(LEADER, null), user(FM1, 'x@firma.example', 'A', 'B', false), user(FM2, null)] })
    expect(await processPlan('invitation', PLAN_A, w.deps)).toBe('nobody')
    expect(w.sent).toEqual([])
    expect(w.world.plans[0]?.claimed).toBe(true)
    expect(w.lines.join('\n')).toContain(`plan ${PLAN_A} için posta atılacak kimse yok`)
  })
})

describe('no mail configured', () => {
  it('does nothing: no database read, no write, no mail', async () => {
    const w = mailWorld(oneDuePlan(), { available: false })
    expect(await runMailTick(w.deps)).toEqual({ available: false, sent: 0, nobody: 0, lost: 0, failed: 0, waiting: 0 })
    expect(w.calls).toEqual([])
    expect(w.events).toEqual([])
    expect(w.sent).toEqual([])
    expect(w.world.plans[0]).toMatchObject({ claimed: false, attempts: 0 })
  })

  it('sends the waiting plans as soon as a provider appears', async () => {
    const w = mailWorld(oneDuePlan(), { available: false })
    await runMailTick(w.deps)
    w.setAvailable(true)
    expect(await runMailTick(w.deps)).toMatchObject({ available: true, sent: 1 })
  })
})

describe('a tick', () => {
  it('handles at most ten plans per kind, the rest on the next tick', async () => {
    const plans = Array.from({ length: 15 }, (_, i) => plan(`00000000-0000-4000-8000-${String(i).padStart(12, '0')}`))
    const w = mailWorld({ plans, members: [MEMBER], users: TEAM_USERS })
    expect(await runMailTick(w.deps)).toMatchObject({ sent: 10 })
    expect(await runMailTick(w.deps)).toMatchObject({ sent: 5 })
  })

  it('does not let plans that are resting crowd out a new one', async () => {
    const plans = Array.from({ length: 11 }, (_, i) => plan(`00000000-0000-4000-8000-${String(i).padStart(12, '0')}`))
    const w = mailWorld({ plans, members: [MEMBER], users: TEAM_USERS })
    for (const p of plans.slice(0, 10)) w.deps.retryAt.set(`invitation:${p.id}`, w.clock.at + 60_000)
    const report = await runMailTick(w.deps)
    expect(report).toMatchObject({ sent: 1, waiting: 10 })
    expect(w.sent).toHaveLength(1)
    expect(w.world.plans[10]?.claimed).toBe(true)
  })

  it('keeps going with the next plan after one failed', async () => {
    let n = 0
    const w = mailWorld(
      { plans: [plan(PLAN_A), plan(PLAN_B)], members: [MEMBER], users: TEAM_USERS },
      { send: async () => (n++ === 0 ? SMTP_DOWN : { success: true }) }
    )
    expect(await runMailTick(w.deps)).toMatchObject({ failed: 1, sent: 1 })
  })
})

describe('envelope', () => {
  const content = { subject: 'S', text: 'T', html: 'H' }

  it('puts the audience in bcc and the sender in to', () => {
    expect(envelope('denetim@firma.example', ['a@x.co', 'b@x.co'], content)).toEqual({
      to: 'denetim@firma.example',
      bcc: ['a@x.co', 'b@x.co'],
      subject: 'S',
      text: 'T',
      html: 'H',
    })
  })

  it('lets the first recipient stand in when the provider reports no sender', () => {
    expect(envelope('', ['a@x.co', 'b@x.co'], content).to).toBe('a@x.co')
    expect(envelope('', ['a@x.co', 'b@x.co'], content).bcc).toEqual(['b@x.co'])
    expect('bcc' in envelope('', ['a@x.co'], content)).toBe(false)
  })
})
