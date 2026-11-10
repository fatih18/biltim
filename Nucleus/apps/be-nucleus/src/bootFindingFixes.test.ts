import { describe, expect, it } from 'bun:test'
import { type BootLog, type FindingFixSteps, applyFindingBootFixes } from './bootFindingFixes'

/** The finding corrections of boot, with fakes in place of the database. */

type StepName = keyof FindingFixSteps

const ORDER: StepName[] = ['renumber', 'ensureUniqueIndex', 'installTrigger', 'backfillClosedAt']

/** Lets the event loop turn, so a step that is not awaited would overlap the next one. */
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

/** Every step records its start and its end; `fail` makes the named steps throw what is given. */
function scripted(fail: Partial<Record<StepName, Error | string>> = {}, stamped = 0) {
  const events: string[] = []
  const run = async (name: StepName) => {
    events.push(`start ${name}`)
    await tick()
    events.push(`end ${name}`)
    const failure = fail[name]
    if (failure !== undefined) throw failure
  }
  const steps: FindingFixSteps = {
    renumber: () => run('renumber'),
    ensureUniqueIndex: () => run('ensureUniqueIndex'),
    installTrigger: () => run('installTrigger'),
    backfillClosedAt: async () => {
      await run('backfillClosedAt')
      return stamped
    },
  }
  const lines: { log: string[]; error: string[] } = { log: [], error: [] }
  const log: BootLog = { log: (line) => lines.log.push(line), error: (line) => lines.error.push(line) }
  return { steps, events, lines, log }
}

describe('the finding corrections of boot', () => {
  it('run in one order, one after the other: renumber, unique index, trigger, back-fill', async () => {
    const { steps, events, log } = scripted()
    await applyFindingBootFixes(steps, log)
    expect(events).toEqual(ORDER.flatMap((name) => [`start ${name}`, `end ${name}`]))
  })

  it('log nothing as an error when every step works, and say that the trigger was installed', async () => {
    const { steps, lines, log } = scripted()
    await applyFindingBootFixes(steps, log)
    expect(lines.error).toEqual([])
    expect(lines.log).toEqual(['[boot] bulgu kapanma tarihi tetikleyicisi kuruldu (five_s_findings_closed_at)'])
  })

  it('count the back-filled findings in the log only when there were some', async () => {
    const some = scripted({}, 3)
    await applyFindingBootFixes(some.steps, some.log)
    expect(some.lines.log).toContain('[boot] 3 kapanmış bulguya kapanma tarihi denetim kaydından yazıldı')
    const none = scripted({}, 0)
    await applyFindingBootFixes(none.steps, none.log)
    expect(none.lines.log.some((line) => line.includes('kapanmış bulguya'))).toBe(false)
  })

  for (const broken of ORDER) {
    it(`let the other three steps run when ${broken} fails, and never throw`, async () => {
      const { steps, events, lines, log } = scripted({ [broken]: new Error('boom') })
      await applyFindingBootFixes(steps, log)
      expect(events.filter((event) => event.startsWith('end '))).toEqual(ORDER.map((name) => `end ${name}`))
      expect(events.filter((event) => event.startsWith('start '))).toEqual(ORDER.map((name) => `start ${name}`))
      expect(lines.error).toHaveLength(1)
      expect(lines.error[0]).toContain('boom')
      expect(lines.error[0]).toStartWith('[boot]')
    })
  }

  it('do not say the trigger was installed when it was not', async () => {
    const { steps, lines, log } = scripted({ installTrigger: new Error('nope') })
    await applyFindingBootFixes(steps, log)
    expect(lines.log.some((line) => line.includes('tetikleyicisi kuruldu'))).toBe(false)
  })

  it('survive every step failing at once, with something other than an Error thrown', async () => {
    const { steps, events, lines, log } = scripted({
      renumber: 'text',
      ensureUniqueIndex: new Error('index'),
      installTrigger: 'trigger',
      backfillClosedAt: new Error('fill'),
    })
    await applyFindingBootFixes(steps, log)
    expect(events.filter((event) => event.startsWith('end '))).toHaveLength(4)
    expect(lines.error).toHaveLength(4)
    expect(lines.error[0]).toContain('text')
    expect(lines.error[2]).toContain('trigger')
  })

  it('log the clear lock-timeout line, once, when the trigger install waits too long, and still back-fill', async () => {
    const timeout = Object.assign(new Error('canceling statement due to lock timeout'), { code: '55P03' })
    const { steps, events, lines, log } = scripted({ installTrigger: timeout })
    await applyFindingBootFixes(steps, log)
    expect(lines.error).toHaveLength(1)
    expect(lines.error[0]).toContain('5 saniyede kilitlenemedi')
    expect(lines.error[0]).toContain('eski tetikleyici yerinde')
    expect(events).toContain('end backfillClosedAt')
  })
})
