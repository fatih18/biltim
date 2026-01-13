'use client'

export function Legend() {
  return (
    <div className="absolute top-4 right-4 z-10 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border-2 border-gray-200 p-4">
      <h3 className="text-sm font-bold text-gray-700 mb-3">Relation Types</h3>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-green-500" />
          <span className="text-xs text-gray-600">One-to-One</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-blue-500" />
          <span className="text-xs text-gray-600">One-to-Many</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-purple-500" />
          <span className="text-xs text-gray-600">Many-to-Many</span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-200">
        <h4 className="text-xs font-semibold text-gray-600 mb-2">Field Badges</h4>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-medium">
              S
            </span>
            <span className="text-xs text-gray-600">Searchable</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium">
              F
            </span>
            <span className="text-xs text-gray-600">Filterable</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-medium">
              O
            </span>
            <span className="text-xs text-gray-600">Sortable</span>
          </div>
        </div>
      </div>
    </div>
  )
}
