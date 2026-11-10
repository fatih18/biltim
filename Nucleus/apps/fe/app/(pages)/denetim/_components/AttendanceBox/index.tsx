import { ATTENDANCE_HINT, ATTENDANCE_LABEL, NO_FIELD_MANAGER_TEXT } from "../../_utils/attendanceText";

export type AttendanceBoxProps = {
  /** The location has a field manager; without one the rule does not apply and the box is not shown. */
  hasFieldManager: boolean;
  checked: boolean;
  /** The field manager's name, shown next to the label. */
  managerName: string;
  onChange: (attended: boolean) => void;
};

/**
 * "Bölge sorumlusu veya görevlendirdiği kişi denetime katıldı": the auditor
 * ticks it, and only then do the questions open (_utils/attendance.ts).
 */
export function AttendanceBox({ hasFieldManager, checked, managerName, onChange }: AttendanceBoxProps) {
  return (
    <div className="space-y-1 sm:col-span-2">
      {hasFieldManager ? (
        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950/40">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-500"
          />
          <span>
            <span className="font-medium text-slate-800 dark:text-slate-200">{ATTENDANCE_LABEL}</span>
            {managerName ? (
              <span className="text-slate-600 dark:text-slate-400">{` (${managerName})`}</span>
            ) : null}
            <span className="block text-[11px] text-slate-500 dark:text-slate-400">{ATTENDANCE_HINT}</span>
          </span>
        </label>
      ) : (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">{NO_FIELD_MANAGER_TEXT}</p>
      )}
    </div>
  );
}
