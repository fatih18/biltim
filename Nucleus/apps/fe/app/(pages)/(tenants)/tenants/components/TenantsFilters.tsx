import { Filter } from 'lucide-react'
import type { TenantsFilters as TenantsFiltersState } from '@/app/_store/tenantsStore/types'

const TEXT_FILTERS: { key: keyof TenantsFiltersState; label: string; placeholder: string }[] = [
  { key: 'subdomain', label: 'Subdomain', placeholder: 'e.g. acme' },
  { key: 'schemaName', label: 'Schema Name', placeholder: 'e.g. acme_schema' },
  { key: 'companyName', label: 'Company Name', placeholder: 'e.g. Acme Inc.' },
  { key: 'godAdminEmail', label: 'Admin Email', placeholder: 'e.g. admin@acme.com' },
]

interface TenantsFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  filters: TenantsFiltersState
  onFiltersChange: (filters: TenantsFiltersState) => void
  onResetFilters: () => void
  isFiltersVisible: boolean
  onToggleFilters: () => void
}

export function TenantsFilters({
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  onResetFilters,
  isFiltersVisible,
  onToggleFilters,
}: TenantsFiltersProps) {
  function handleTextChange(key: keyof TenantsFiltersState) {
    return function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
      const nextFilters: TenantsFiltersState = {
        ...filters,
        [key]: event.target.value,
      }
      onFiltersChange(nextFilters)
    }
  }

  return (
    <section className="bg-white rounded-xl shadow-lg p-6 border border-slate-200 space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <label htmlFor="tenants-search" className="sr-only">
            Search tenants
          </label>
          <input
            id="tenants-search"
            type="search"
            placeholder="Search by company, subdomain, schema, or email…"
            value={search}
            onChange={function handleSearch(event) {
              onSearchChange(event.target.value)
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleFilters}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              isFiltersVisible
                ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
            }`}
          >
            <Filter size={16} />
            Filters
          </button>
          <button
            type="button"
            onClick={onResetFilters}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {isFiltersVisible ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          {TEXT_FILTERS.map(function renderFilter(filterMeta) {
            return (
              <div key={filterMeta.key} className="flex flex-col gap-1">
                <label
                  className="text-sm font-medium text-gray-700"
                  htmlFor={`tenants-filter-${filterMeta.key}`}
                >
                  {filterMeta.label}
                </label>
                <input
                  id={`tenants-filter-${filterMeta.key}`}
                  type="text"
                  value={filters[filterMeta.key]}
                  placeholder={filterMeta.placeholder}
                  onChange={handleTextChange(filterMeta.key)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}
