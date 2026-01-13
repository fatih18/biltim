'use client'

interface TenantsDeleteModalProps {
  isOpen: boolean
  tenantName?: string
  onConfirm: () => void
  onClose: () => void
  isSubmitting: boolean
}

export function TenantsDeleteModal({
  isOpen,
  tenantName,
  onConfirm,
  onClose,
  isSubmitting,
}: TenantsDeleteModalProps) {
  if (!isOpen) {
    return null
  }

  function handleConfirm() {
    onConfirm()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="space-y-6 px-6 py-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Delete Tenant</h2>
            <p className="text-sm text-gray-600">
              This action will permanently remove tenant{' '}
              <strong>{tenantName ?? 'the selected tenant'}</strong> and all associated
              configuration. This cannot be undone.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Deleting…' : 'Delete Tenant'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
