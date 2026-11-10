type StandaloneFindingEntryProps = {
  onOpen: () => void;
};

/*
 * "Tekil Bulgu +" beside the planned audits. A person with an assigned audit
 * could not file a finding on its own: every way in led into the audit form
 * (Notlar 22.10, satır 16). This is the way out of it, and it starts no audit.
 */
export function StandaloneFindingEntry({ onOpen }: StandaloneFindingEntryProps) {
  return (
    <section
      aria-labelledby="standalone-finding-title"
      className="mt-6 border-t border-slate-300 pt-4 dark:border-slate-800"
    >
      <h3 id="standalone-finding-title" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        Denetim yapmadan bulgu girin
      </h3>
      <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
        Tekil bulgu yukarıdaki denetimlerden bağımsız kaydedilir: bir soruya bağlamak isteğe bağlıdır ve lokasyonu
        formda seçersiniz. Saha sorumlusu lokasyondan gelir.
      </p>
      <button
        type="button"
        onClick={onOpen}
        className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400 sm:w-auto"
      >
        Tekil Bulgu +
      </button>
    </section>
  );
}
