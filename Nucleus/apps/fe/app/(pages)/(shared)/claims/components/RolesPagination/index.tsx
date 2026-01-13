import type { PaginationInfo } from '../../types'

type RolesPaginationProps = {
  pagination: PaginationInfo | undefined
  currentCount: number
  onPageChange: (page: number) => void
}

export function RolesPagination({ pagination, currentCount, onPageChange }: RolesPaginationProps) {
  if (!pagination || pagination.total === 0) return null

  const { page: currentPage, total: totalItems, totalPages, hasPrev, hasNext } = pagination

  return (
    <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
      <div className="text-sm text-slate-600">
        Showing <span className="font-medium">{currentCount}</span> of{' '}
        <span className="font-medium">{totalItems}</span> roles
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => hasPrev && onPageChange(Math.max(currentPage - 1, 1))}
          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!hasPrev}
        >
          Previous
        </button>
        <span className="text-xs text-slate-600">
          Page <span className="font-semibold">{currentPage}</span> of{' '}
          <span className="font-semibold">{totalPages}</span>
        </span>
        <button
          type="button"
          onClick={() => hasNext && onPageChange(currentPage + 1)}
          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!hasNext}
        >
          Next
        </button>
      </div>
    </div>
  )
}
