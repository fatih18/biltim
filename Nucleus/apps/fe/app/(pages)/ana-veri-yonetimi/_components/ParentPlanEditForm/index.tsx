"use client";

import React from "react";
import { DateInput } from "@/app/_components/DateInput";
import { toDayKey } from "@/app/_utils/dateConflicts";
import { Input, PrimaryButton, SecondaryButton } from "../../components/ui";
import { checkPeriodDraft, QUARTER_MAX_LENGTH, type PeriodDraft } from "../../_utils/periodRange";

export type ParentPlanEdit = {
  quarter: string;
  dateRangeStart: string;
  dateRangeEnd: string;
};

const DATE_CLASS =
  "date-dark w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/70 px-3 py-2 text-xs text-slate-900 dark:text-slate-50 outline-none ring-sky-500/40 dark:ring-sky-400/40 focus:border-sky-400 dark:focus:border-sky-400 focus:ring-2";

/**
 * Edit a period plan's name and date range (R68, R69). For Merkez Ekip, Super
 * Admin and the godmin; the screen only offers it to them and the server
 * refuses anyone else.
 *
 * `onSave` answers whether it was saved. The form stays open on a refusal, so
 * what was typed is not lost.
 */
export function ParentPlanEditForm({
  plan,
  childDates,
  onSave,
  onCancel,
}: {
  plan: { id: string; quarter?: string | null; dateRangeStart?: string | null; dateRangeEnd?: string | null };
  /** Planned dates of the period's audit plans that are not cancelled. */
  childDates: readonly string[];
  onSave: (id: string, next: ParentPlanEdit) => Promise<boolean>;
  onCancel: () => void;
}) {
  const original: PeriodDraft = {
    quarter: plan.quarter ?? "",
    start: toDayKey(plan.dateRangeStart),
    end: toDayKey(plan.dateRangeEnd),
  };
  const [draft, setDraft] = React.useState<PeriodDraft>(original);
  const [saving, setSaving] = React.useState(false);
  const ids = React.useId();

  const check = checkPeriodDraft(draft, original, childDates);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!check.canSave || saving) return;
    setSaving(true);
    try {
      await onSave(plan.id, {
        quarter: draft.quarter.trim(),
        dateRangeStart: draft.start,
        dateRangeEnd: draft.end,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      aria-label="Dönem planını düzenle"
      className="space-y-3 border-t border-slate-300 bg-slate-100 p-4 dark:border-slate-800 dark:bg-slate-950/40"
    >
      <div className="grid gap-3 xs:grid-cols-2 md:grid-cols-3">
        <div className="space-y-1 xs:col-span-2 md:col-span-1">
          <label htmlFor={`${ids}-quarter`} className="block text-xs font-medium text-slate-700 dark:text-slate-300">
            Dönem adı (ör: 2026-Q4)
          </label>
          <Input
            id={`${ids}-quarter`}
            value={draft.quarter}
            maxLength={QUARTER_MAX_LENGTH}
            onChange={(e) => setDraft({ ...draft, quarter: e.target.value })}
            placeholder="2026-Q4"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor={`${ids}-start`} className="block text-xs font-medium text-slate-700 dark:text-slate-300">
            Başlangıç tarihi
          </label>
          <DateInput
            id={`${ids}-start`}
            className={DATE_CLASS}
            value={draft.start}
            onChange={(start) => setDraft({ ...draft, start })}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor={`${ids}-end`} className="block text-xs font-medium text-slate-700 dark:text-slate-300">
            Bitiş tarihi
          </label>
          <DateInput
            id={`${ids}-end`}
            className={DATE_CLASS}
            value={draft.end}
            onChange={(end) => setDraft({ ...draft, end })}
          />
        </div>
      </div>

      {check.reasons.length > 0 && (
        <ul role="alert" className="space-y-1 rounded-md border border-rose-500/40 bg-rose-100 px-3 py-2 dark:border-rose-500/30 dark:bg-rose-500/10">
          {check.reasons.map((reason) => (
            <li key={reason} className="text-[11px] font-medium text-rose-700 dark:text-rose-300 sm:text-xs">
              {reason}
            </li>
          ))}
        </ul>
      )}

      <p className="text-[11px] text-slate-600 dark:text-slate-400 sm:text-xs">
        Dönemin aralığı, bağlı denetim planlarının tarih sınırıdır. Yalnızca Merkez Ekip değiştirebilir.
      </p>

      <div className="flex flex-col-reverse gap-2 xs:flex-row xs:justify-end">
        <SecondaryButton type="button" onClick={onCancel} disabled={saving}>
          Vazgeç
        </SecondaryButton>
        <PrimaryButton type="submit" disabled={!check.canSave || saving}>
          {saving ? "Kaydediliyor…" : "Dönemi Kaydet"}
        </PrimaryButton>
      </div>
    </form>
  );
}
