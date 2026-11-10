"use client";

import { useId, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useGenericApiActions } from "@/app/_hooks/UseNucleusApi";
import { useModal } from "@/app/_hooks/UseModal";
import {
  checkRejectReason,
  REJECT_REASON_MAX,
  REJECT_REASON_MIN,
  reasonLength,
  serverMessageOf,
} from "@/app/_utils/planReview";

/**
 * "Reddet" on a sent audit (R30): Merkez Ekip says what has to be corrected and
 * the audit goes back to its own team. Nothing is deleted. The reason is
 * required; the server refuses a plan that is no longer waiting for approval.
 */
export function RejectPlanDialog(props: {
  planId: string;
  locationName: string;
  plannedDate: string;
  onClose: () => void;
  /** The plan was rejected: the list has to be read again. */
  onRejected: () => void;
  /** The server says the plan moved meanwhile (404, 409): read the list again, keep the dialog open. */
  onStale: () => void;
}) {
  const { planId, locationName, plannedDate, onClose, onRejected, onStale } = props;
  const actions = useGenericApiActions();
  const ids = useId();
  const titleId = `${ids}-baslik`;
  const fieldId = `${ids}-sebep`;
  const hintId = `${ids}-ipucu`;
  const modal = useModal(onClose, { labelledBy: titleId });

  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const checked = checkRejectReason(reason);
  const length = reasonLength(reason);
  const invalid = !checked.ok;
  const showProblem = invalid && (touched || length > REJECT_REASON_MAX);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    if (!checked.ok || sending) return;
    const reject = actions.REJECT_PLAN;
    if (!reject) {
      setServerError("Reddetme işlemi bu oturumda kullanılamıyor. Sayfayı yenileyip tekrar deneyin.");
      return;
    }
    setSending(true);
    setServerError(null);
    reject.start({
      payload: { plan_id: planId, reason: checked.reason },
      onAfterHandle: () => {
        setSending(false);
        toast.success("Denetim düzeltme için ekibine geri gönderildi.");
        onRejected();
      },
      onErrorHandle: (error, code) => {
        setSending(false);
        setServerError(
          serverMessageOf(error) ??
            "Denetim reddedilemedi. Bağlantınızı kontrol edip tekrar deneyin; sorun sürerse yöneticinize bildirin.",
        );
        if (code === 404 || code === 409) onStale();
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 xs:items-center xs:p-4">
      <div
        {...modal}
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-xl border border-slate-300 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900 xs:max-w-lg xs:rounded-xl md:p-6"
      >
        <form onSubmit={submit} noValidate>
          <h3 id={titleId} className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Denetimi Reddet
          </h3>
          <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
            {locationName} — planlanan tarih {plannedDate || "-"}
          </p>
          <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
            Denetim, yazdığınız sebeple birlikte ekibine geri döner; ekip düzeltip yeniden gönderir. Hiçbir şey silinmez,
            yeni bir denetim açılmaz.
          </p>

          <label htmlFor={fieldId} className="mt-4 block text-xs font-medium text-slate-700 dark:text-slate-300">
            Reddetme sebebi
          </label>
          <textarea
            id={fieldId}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setServerError(null);
            }}
            onBlur={() => setTouched(true)}
            rows={5}
            required
            aria-invalid={showProblem}
            aria-describedby={hintId}
            placeholder="Neyin düzeltilmesi gerektiğini yazın. Örnek: 3. sorudaki fotoğraf başka bir lokasyona ait."
            className={[
              "mt-1 w-full resize-y rounded-md border bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500/40 placeholder:text-slate-400 focus:ring-2 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500",
              showProblem
                ? "border-rose-500 focus:border-rose-500 dark:border-rose-500 dark:focus:border-rose-500"
                : "border-slate-300 focus:border-sky-400 dark:border-slate-700 dark:focus:border-sky-400",
            ].join(" ")}
          />
          <div id={hintId} className="mt-1 flex items-start justify-between gap-3 text-[11px]">
            <p
              role={showProblem ? "alert" : undefined}
              className={showProblem ? "text-rose-700 dark:text-rose-300" : "text-slate-500 dark:text-slate-400"}
            >
              {showProblem && !checked.ok
                ? checked.message
                : `En az ${REJECT_REASON_MIN}, en fazla ${REJECT_REASON_MAX} karakter.`}
            </p>
            <p
              aria-live="polite"
              className={[
                "shrink-0 tabular-nums",
                length > REJECT_REASON_MAX ? "text-rose-700 dark:text-rose-300" : "text-slate-500 dark:text-slate-400",
              ].join(" ")}
            >
              {length} / {REJECT_REASON_MAX}
            </p>
          </div>

          {serverError ? (
            <p
              role="alert"
              className="mt-3 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-[11px] text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200"
            >
              {serverError}
            </p>
          ) : null}

          <div className="mt-5 flex flex-col-reverse gap-2 text-xs xs:flex-row xs:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-400 px-4 py-2 text-slate-800 hover:bg-slate-200 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={sending || (touched && invalid)}
              className="rounded-md border border-rose-700 bg-rose-600 px-4 py-2 font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-500 dark:bg-rose-600 dark:hover:bg-rose-500"
            >
              {sending ? "Gönderiliyor…" : "Reddet ve Ekibe Geri Gönder"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
