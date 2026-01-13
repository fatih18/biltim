import { Edit3, Loader2, Trash2 } from 'lucide-react'
import type { ClaimsTableProps } from '../../types'

export function ClaimsTable({ claims, isLoading, onEdit, onDelete }: ClaimsTableProps) {
  const hasData = claims.length > 0

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              Action
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              Method
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              Path
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              Mode
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              Description
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {isLoading ? (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center">
                <div className="flex items-center justify-center gap-2 text-slate-600">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Loading claims...</span>
                </div>
              </td>
            </tr>
          ) : !hasData ? (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">
                No claims found.
              </td>
            </tr>
          ) : (
            claims.map((claim) => (
              <tr key={claim.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 text-sm font-medium text-slate-900">{claim.action}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs font-semibold uppercase text-slate-700">
                    {claim.method}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-800">{claim.path}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700">
                    {claim.mode}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-700">
                  {claim.description || <span className="text-slate-400">—</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(claim)}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Edit3 className="h-3 w-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(claim)}
                      className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-700 hover:bg-red-100"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Delete</span>
                    </button>
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
