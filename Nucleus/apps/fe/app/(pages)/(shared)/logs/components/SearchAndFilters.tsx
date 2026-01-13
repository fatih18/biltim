import { Filter, Search } from 'lucide-react'

export interface SearchFilters {
  entity_name: string
  operation_type: string
  user_id: string
  entity_id: string
}

interface SearchAndFiltersProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  showFilters: boolean
  onToggleFilters: () => void
  filters: SearchFilters
  onFilterChange: (key: keyof SearchFilters, value: string) => void
}

export function SearchAndFilters({
  searchTerm,
  onSearchChange,
  showFilters,
  onToggleFilters,
  filters,
  onFilterChange,
}: SearchAndFiltersProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Search logs by entity name, summary, IP address..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            type="button"
            onClick={onToggleFilters}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              showFilters
                ? 'bg-blue-100 text-blue-700 border-blue-300'
                : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
            }`}
          >
            <Filter size={16} />
            Filters
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg border">
            <div>
              <label
                htmlFor="entity-name-filter"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Entity Name
              </label>
              <input
                id="entity-name-filter"
                type="text"
                placeholder="Filter by entity"
                value={filters.entity_name}
                onChange={(e) => onFilterChange('entity_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label
                htmlFor="operation-type-filter"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Operation Type
              </label>
              <select
                id="operation-type-filter"
                value={filters.operation_type}
                onChange={(e) => onFilterChange('operation_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Operations</option>
                <option value="INSERT">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
                <option value="SOFT_DELETE">Soft Delete</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="user-id-filter"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                User ID
              </label>
              <input
                id="user-id-filter"
                type="text"
                placeholder="Filter by user"
                value={filters.user_id}
                onChange={(e) => onFilterChange('user_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label
                htmlFor="entity-id-filter"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Entity ID
              </label>
              <input
                id="entity-id-filter"
                type="text"
                placeholder="Filter by entity ID"
                value={filters.entity_id}
                onChange={(e) => onFilterChange('entity_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
