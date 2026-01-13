import { Search } from 'lucide-react'
import type { RolesFiltersState } from '../../hooks/useRolesManagement'

type RolesFiltersProps = {
  filters: RolesFiltersState
  errorMessage: string | null
  onChange: (updates: Partial<RolesFiltersState>) => void
  onPageChange: (page: number) => void
}

export function RolesFilters({ filters, errorMessage, onChange, onPageChange }: RolesFiltersProps) {
  return (
    <>
      {errorMessage && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={filters.search}
              onChange={(e) => {
                onChange({ search: e.target.value })
                onPageChange(1)
              }}
              placeholder="Search roles by name or description..."
              className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filters.isSystemFilter}
            onChange={(e) => {
              onChange({ isSystemFilter: e.target.value })
              onPageChange(1)
            }}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800"
          >
            <option value="">All roles</option>
            <option value="system">System roles</option>
            <option value="custom">Custom roles</option>
          </select>

          <select
            value={filters.itemsPerPage}
            onChange={(e) => {
              onChange({ itemsPerPage: Number.parseInt(e.target.value, 10) || 20 })
              onPageChange(1)
            }}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800"
          >
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
          </select>
        </div>
      </div>
    </>
  )
}
