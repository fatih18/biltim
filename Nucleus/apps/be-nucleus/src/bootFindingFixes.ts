import { transaction } from './db'
import { backfillFindingClosedAt, describeInstallFailure, installFindingClosedAt } from './findingClosedAt'
import { ensureUniqueFindingNumbers, renumberDuplicateFindings } from './findingNumbers'

/** Where the boot log lines go; `console` fits. */
export type BootLog = { log: (line: string) => void; error: (line: string) => void }

/** The four steps, each as a function a test can replace; the defaults are the real ones. */
export type FindingFixSteps = {
  /** R61: every finding that shares its number with an older one takes a fresh number. */
  renumber: () => Promise<void>
  /** R61: the unique index that makes a repeated number impossible from here on. */
  ensureUniqueIndex: () => Promise<void>
  /** Installs the closing-date trigger in one transaction (5 second lock timeout). */
  installTrigger: () => Promise<void>
  /** Dates the findings closed before the trigger existed; returns how many it dated. */
  backfillClosedAt: () => Promise<number>
}

export const REAL_FINDING_FIX_STEPS: FindingFixSteps = {
  renumber: async () => {
    await renumberDuplicateFindings()
  },
  ensureUniqueIndex: async () => {
    await ensureUniqueFindingNumbers()
  },
  installTrigger: () => transaction(installFindingClosedAt),
  backfillClosedAt: backfillFindingClosedAt,
}

/** Runs one step; a failure becomes one log line and never leaves this function. */
async function isolated<T>(
  step: () => Promise<T>,
  onFailure: (error: Error) => string,
  log: BootLog
): Promise<T | undefined> {
  try {
    return await step()
  } catch (error) {
    log.error(onFailure(error instanceof Error ? error : new Error(String(error))))
    return undefined
  }
}

/**
 * The finding corrections of boot, in the one order that works:
 *
 * 1. renumber the duplicates. The sequence was already moved past the stored
 *    maximum by boot.ts, so the renumbered rows get fresh numbers;
 * 2. build the unique index, which only succeeds once nothing repeats;
 * 3. install the closing-date trigger (findingClosedAt.ts);
 * 4. date the findings closed before the trigger existed, from the audit log.
 *
 * Each step has its own try/catch: one that fails is logged and the rest still
 * run, and boot continues either way. Deploy runs no SQL, so these run on every
 * start and each one touches only what is still in the old shape.
 */
export async function applyFindingBootFixes(
  steps: FindingFixSteps = REAL_FINDING_FIX_STEPS,
  log: BootLog = console
): Promise<void> {
  await isolated(
    steps.renumber,
    (error) => `[boot] tekrar eden bulgu numaraları düzeltilemedi: ${error.message}`,
    log
  )
  await isolated(
    steps.ensureUniqueIndex,
    (error) => `[boot] bulgu numarası tekillik indeksi adımı çalışmadı: ${error.message}`,
    log
  )
  const installed = await isolated(
    async () => {
      await steps.installTrigger()
      return true
    },
    describeInstallFailure,
    log
  )
  if (installed) log.log('[boot] bulgu kapanma tarihi tetikleyicisi kuruldu (five_s_findings_closed_at)')
  const stamped = await isolated(
    steps.backfillClosedAt,
    (error) => `[boot] kapanmış bulguların kapanma tarihi doldurulamadı: ${error.message}`,
    log
  )
  if (stamped !== undefined && stamped > 0) {
    log.log(`[boot] ${stamped} kapanmış bulguya kapanma tarihi denetim kaydından yazıldı`)
  }
}
