import type { RoleJSON } from '@monorepo/db-entities/schemas/default/role'
import { Loader2 } from 'lucide-react'
import type { RoleFormState } from '../../hooks/useRolesManagement'

type RoleModalProps = {
  isOpen: boolean
  editingRole: RoleJSON | null
  formState: RoleFormState
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onFormChange: (updates: Partial<RoleFormState>) => void
}

export function RoleModal({
  isOpen,
  editingRole,
  formState,
  isSubmitting,
  onClose,
  onSubmit,
  onFormChange,
}: RoleModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 text-slate-50 shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">{editingRole ? 'Edit Role' : 'New Role'}</h2>
            <p className="text-xs text-slate-300">
              Group claims together for efficient permission management.
            </p>
          </div>
        </header>

        <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
          <div className="space-y-1">
            <label htmlFor="role-name" className="text-xs font-medium text-slate-200">
              Name
            </label>
            <input
              id="role-name"
              type="text"
              value={formState.name}
              onChange={(e) => onFormChange({ name: e.target.value })}
              placeholder="admin, editor, viewer..."
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-400"
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="role-description" className="text-xs font-medium text-slate-200">
              Description
            </label>
            <textarea
              id="role-description"
              value={formState.description}
              onChange={(e) => onFormChange({ description: e.target.value })}
              rows={3}
              placeholder="Optional description..."
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="role-is-system"
              type="checkbox"
              checked={formState.is_system}
              onChange={(e) => onFormChange({ is_system: e.target.checked })}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0"
            />
            <label htmlFor="role-is-system" className="text-sm text-slate-200">
              System Role (protected from deletion)
            </label>
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
              <span>{editingRole ? 'Save' : 'Create'}</span>
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
