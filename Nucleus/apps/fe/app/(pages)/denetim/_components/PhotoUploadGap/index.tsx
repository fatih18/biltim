type PhotoUploadGapProps = {
  /** photoFirst.ts → photoUploadAbortText; null shows nothing. */
  text: string | null;
  /**
   * The way around a connection that will not carry the photos: put the whole
   * form, photos included, in the offline queue, which uploads them when the
   * connection is back. Absent where the queue does not apply (a correction).
   * `disabled` while the form is not saveable (the save button's own rule).
   */
  queue?: { busy: boolean; disabled: boolean; onClick: () => void };
};

/*
 * Beside the save button after a save that stopped because a required photo did
 * not upload. Nothing was written, so the form stays open and editable; the
 * toast says the same once and is gone, this stays until the next attempt.
 */
export function PhotoUploadGap({ text, queue }: PhotoUploadGapProps) {
  if (!text) return null;
  return (
    <section
      role="alert"
      aria-label="Fotoğraf yüklenemedi"
      className="w-full rounded-md border border-rose-400/60 bg-rose-50 px-3 py-2 text-[11px] text-rose-800 dark:border-rose-400/40 dark:bg-rose-950/30 dark:text-rose-200 sm:max-w-md"
    >
      <p className="font-semibold">Fotoğraf yüklenemedi, kayıt yapılmadı</p>
      <p className="mt-1 text-rose-700 dark:text-rose-300">{text}</p>
      {queue ? (
        <div className="mt-2 flex flex-col gap-1 xs:flex-row xs:items-center xs:justify-between">
          <p className="text-rose-700 dark:text-rose-300">
            İnternet gelmiyorsa formu fotoğraflarıyla birlikte kuyruğa alın; bağlantı gelince otomatik gönderilir.
          </p>
          <button
            type="button"
            disabled={queue.busy || queue.disabled}
            onClick={queue.onClick}
            className="inline-flex shrink-0 items-center justify-center rounded-md border border-rose-400 bg-white px-3 py-1.5 font-semibold text-rose-800 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-400/50 dark:bg-slate-950/60 dark:text-rose-200 dark:hover:bg-slate-900 dark:focus-visible:ring-sky-400"
          >
            {queue.busy ? "Kuyruğa alınıyor…" : "Kuyruğa al"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
