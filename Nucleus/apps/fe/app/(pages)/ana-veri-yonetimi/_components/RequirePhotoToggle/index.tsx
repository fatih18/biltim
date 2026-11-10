import { REQUIRE_PHOTO_HELP, REQUIRE_PHOTO_TOOLTIP } from "../../_utils/questionPhotoRule";

type RequirePhotoToggleProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
};

/*
 * The "Fotoğraf Zorunlu" switch of a question's add and edit forms, next to
 * "Açıklama Zorunlu", with one line saying when it bites. The edge cases sit
 * in the tooltip (title) of the whole switch, so the phone form stays short.
 */
export function RequirePhotoToggle({ checked, onChange }: RequirePhotoToggleProps) {
  return (
    <div title={REQUIRE_PHOTO_TOOLTIP} className="flex basis-full flex-col gap-0.5 sm:basis-auto sm:max-w-sm">
      <label className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="rounded border-slate-400 dark:border-slate-600"
        />
        Fotoğraf Zorunlu
      </label>
      <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">{REQUIRE_PHOTO_HELP}</p>
    </div>
  );
}
