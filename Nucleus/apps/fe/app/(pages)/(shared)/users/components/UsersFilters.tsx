'use client'

import { Filter } from 'lucide-react'
import type { StoreProps } from '@/app/_store/usersStore/types'

const FILTER_CONFIG = [
  {
    id: 'status' as const,
    label: 'Status',
    options: [
      { value: '', label: 'All' },
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ],
  },
  {
    id: 'locked' as const,
    label: 'Lock State',
    options: [
      { value: '', label: 'All' },
      { value: 'unlocked', label: 'Unlocked' },
      { value: 'locked', label: 'Locked' },
    ],
  },
] as const

interface UsersFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  filters: StoreProps['filters']
  onFiltersChange: (filters: StoreProps['filters']) => void
  onResetFilters: () => void
  isFiltersVisible: boolean
  onToggleFilters: () => void
}

export function UsersFilters({
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  onResetFilters,
  isFiltersVisible,
  onToggleFilters,
}: UsersFiltersProps) {
  function handleSelectChange(filterKey: keyof StoreProps['filters']) {
    return function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
      const nextFilters: StoreProps['filters'] = {
        ...filters,
        [filterKey]: event.target.value as (typeof filters)[typeof filterKey],
      }
      onFiltersChange(nextFilters)
    }
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/40 space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <label htmlFor="users-search" className="sr-only">
            Search users
          </label>
          <input
            id="users-search"
            type="search"
            placeholder="Search by email, name, or claim…"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-2.5 text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleFilters}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${isFiltersVisible
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
              : 'border-slate-800 bg-slate-950/40 text-slate-200 hover:bg-slate-950/70'
              }`}
          >
            <Filter size={16} />
            Filters
          </button>

          <button
            type="button"
            onClick={onResetFilters}
            className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-950/70"
          >
            Reset
          </button>
        </div>
      </div>

      {isFiltersVisible ? (
        <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-4 md:grid-cols-2">
          {FILTER_CONFIG.map((filter) => (
            <div key={filter.id}>
              <label
                htmlFor={`users-filter-${filter.id}`}
                className="mb-1 block text-sm font-medium text-slate-200"
              >
                {filter.label}
              </label>

              <select
                id={`users-filter-${filter.id}`}
                value={filters[filter.id]}
                onChange={handleSelectChange(filter.id)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2.5 text-slate-100 outline-none transition focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20"
              >
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value} className="bg-slate-950 text-slate-100">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}
