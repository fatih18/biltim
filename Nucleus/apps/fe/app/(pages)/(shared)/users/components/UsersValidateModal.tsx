'use client'

interface UsersValidateModalProps {
  isOpen: boolean
  userEmail: string | undefined
  onConfirm: () => void
  onClose: () => void
  isSubmitting: boolean
}

export function UsersValidateModal({
  isOpen,
  userEmail,
  onConfirm,
  onClose,
  isSubmitting,
}: UsersValidateModalProps) {
  if (!isOpen) {
    return null
  }

  async function handleConfirm() {
    await onConfirm()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="px-6 py-6 space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Verify Email</h2>
            <p className="text-sm text-gray-500">
              This will mark the user&apos;s email as verified and allow them to access
              email-protected features.
            </p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Email to verify: <span className="font-medium">{userEmail ?? 'Unknown'}</span>
          </div>
          <div className="flex items-center justify-end gap-3">
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
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Verifying…' : 'Verify Email'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
