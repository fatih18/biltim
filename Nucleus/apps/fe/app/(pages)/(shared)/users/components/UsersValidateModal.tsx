'use client'

import { useModal } from '@/app/_hooks/UseModal'

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
  const modal = useModal(onClose, { enabled: isOpen })

  if (!isOpen) {
    return null
  }

  async function handleConfirm() {
    await onConfirm()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div {...modal} className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl">
        <div className="px-6 py-6 space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Verify Email</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
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
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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
