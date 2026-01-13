import { Loader2 } from 'lucide-react'
import type { ClaimModalProps } from '../../types'

export function ClaimModal({
  isOpen,
  editingClaim,
  formState,
  isSubmitting,
  methods,
  modes,
  onClose,
  onSubmit,
  onFormChange,
}: ClaimModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 text-slate-50 shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">{editingClaim ? 'Edit Claim' : 'New Claim'}</h2>
            <p className="text-xs text-slate-300">
              Configure a claim that maps to a backend endpoint.
            </p>
          </div>
        </header>

        <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
          <div className="space-y-1">
            <label htmlFor="claim-action" className="text-xs font-medium text-slate-200">
              Action
            </label>
            <input
              id="claim-action"
              type="text"
              value={formState.action}
              onChange={(e) => onFormChange({ action: e.target.value })}
              placeholder="users.read, profiles.read..."
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-400"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="claim-method" className="text-xs font-medium text-slate-200">
                Method
              </label>
              <select
                id="claim-method"
                value={formState.method}
                onChange={(e) => onFormChange({ method: e.target.value })}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-50"
              >
                {methods.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="claim-mode" className="text-xs font-medium text-slate-200">
                Mode
              </label>
              <select
                id="claim-mode"
                value={formState.mode}
                onChange={(e) => onFormChange({ mode: e.target.value as 'exact' | 'startsWith' })}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-50"
              >
                {modes.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="claim-path" className="text-xs font-medium text-slate-200">
              Path
            </label>
            <input
              id="claim-path"
              type="text"
              value={formState.path}
              onChange={(e) => onFormChange({ path: e.target.value })}
              placeholder="/users, /profiles/:id..."
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-400"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="claim-description" className="text-xs font-medium text-slate-200">
              Description
            </label>
            <textarea
              id="claim-description"
              value={formState.description}
              onChange={(e) => onFormChange({ description: e.target.value })}
              rows={3}
              placeholder="Optional description..."
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-400"
            />
          </div>

          <footer className="mt-6 flex items-center justify-end gap-2 border-t border-slate-700 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-600 bg-slate-800 px-4 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-emerald-950 shadow-sm hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-3 w-3 animate-spin" />}
              <span>{editingClaim ? 'Save' : 'Create'}</span>
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
