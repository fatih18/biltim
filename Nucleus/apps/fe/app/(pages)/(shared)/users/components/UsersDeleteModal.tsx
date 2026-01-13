'use client'

interface UsersDeleteModalProps {
  isOpen: boolean
  userEmail: string | undefined
  onConfirm: () => void
  onClose: () => void
  isSubmitting: boolean
}

export function UsersDeleteModal({
  isOpen,
  userEmail,
  onConfirm,
  onClose,
  isSubmitting,
}: UsersDeleteModalProps) {
  if (!isOpen) {
    return null
  }

  async function handleConfirm() {
    await onConfirm()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl shadow-slate-950/60">
        <div className="space-y-4 px-6 py-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Kullanıcıyı Sil</h2>
            <p className="text-sm text-slate-400">
              Bu kullanıcı kalıcı olarak silinecek. Bu işlem geri alınamaz.
            </p>
          </div>

          <div className="rounded-lg border border-rose-900/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
            Silinecek kullanıcı:{' '}
            <span className="font-semibold text-rose-100">{userEmail ?? 'Bilinmeyen email'}</span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 bg-slate-950/40 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 transition-colors"
            >
              İptal
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Siliniyor…' : 'Kullanıcıyı Sil'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
