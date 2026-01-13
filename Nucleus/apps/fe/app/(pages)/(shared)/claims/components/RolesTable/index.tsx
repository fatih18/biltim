import type { RoleJSON } from '@monorepo/db-entities/schemas/default/role'
import { Edit3, Loader2, Shield, Trash2 } from 'lucide-react'

type RolesTableProps = {
  roles: RoleJSON[]
  isLoading: boolean
  onEdit: (role: RoleJSON) => void
  onDelete: (role: RoleJSON) => void
  onManageClaims: (role: RoleJSON) => void
}

export function RolesTable({
  roles,
  isLoading,
  onEdit,
  onDelete,
  onManageClaims,
}: RolesTableProps) {
  const hasData = roles.length > 0

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              Description
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              Type
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {isLoading ? (
            <tr>
              <td colSpan={4} className="px-4 py-12 text-center">
                <div className="flex items-center justify-center gap-2 text-slate-600">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Loading roles...</span>
                </div>
              </td>
            </tr>
          ) : !hasData ? (
            <tr>
              <td colSpan={4} className="px-4 py-12 text-center text-sm text-slate-500">
                No roles found.
              </td>
            </tr>
          ) : (
            roles.map((role) => (
              <tr key={role.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 text-sm font-medium text-slate-900">{role.name}</td>
                <td className="px-4 py-3 text-xs text-slate-700">
                  {role.description || <span className="text-slate-400">—</span>}
                </td>
                <td className="px-4 py-3">
                  {role.is_system ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      <Shield className="h-3 w-3" />
                      System
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700">
                      Custom
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onManageClaims(role)}
                      className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100"
                    >
                      <span>Manage Claims</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(role)}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Edit3 className="h-3 w-3" />
                      <span>Edit</span>
                    </button>
                    {!role.is_system && (
                      <button
                        type="button"
                        onClick={() => onDelete(role)}
                        className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-700 hover:bg-red-100"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
