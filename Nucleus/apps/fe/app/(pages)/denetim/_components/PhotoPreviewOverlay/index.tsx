type PhotoPreviewOverlayProps = {
  /** The picture to show; nothing renders without one. */
  url: string | null;
  onClose: () => void;
};

/*
 * A picked photo, enlarged (#5). The single-finding modal's "Görüntüle" button
 * sets the address this shows; any screen that can open that modal has to render
 * it, or the button does nothing.
 */
export function PhotoPreviewOverlay({ url, onClose }: PhotoPreviewOverlayProps) {
  if (!url) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 px-4" onClick={onClose}>
      <div className="relative w-full max-w-4xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-10 right-0 rounded-md border border-slate-400 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 hover:bg-white dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-100 dark:hover:bg-slate-900"
        >
          ✕ Kapat
        </button>

        <img
          src={url}
          alt="Seçilen fotoğrafın büyük önizlemesi"
          className="max-h-[80vh] w-full rounded-xl border border-slate-300 bg-slate-100 object-contain dark:border-slate-700 dark:bg-slate-950"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}
