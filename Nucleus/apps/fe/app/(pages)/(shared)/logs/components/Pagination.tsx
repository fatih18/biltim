import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  itemsPerPage: number
  totalItems: number
  startIndex: number
  hasPrevious: boolean
  hasNext: boolean
  onPageChange: (page: number) => void
  onItemsPerPageChange: (itemsPerPage: number) => void
}

export function Pagination({
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  startIndex,
  hasPrevious,
  hasNext,
  onPageChange,
  onItemsPerPageChange,
}: PaginationProps) {
  const displayStart = totalItems === 0 ? 0 : startIndex + 1
  const displayEnd = totalItems === 0 ? 0 : Math.min(startIndex + itemsPerPage, totalItems)
  const displayTotalPages = totalPages > 0 ? totalPages : 1

  return (
    <div className="border-t border-white/10 bg-white/5 px-6 py-3 text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-200">
            {totalItems} kayıttan {displayStart}–{displayEnd} arası gösteriliyor
          </div>

          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-sm text-white outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/60"
          >
            <option value={5} className="bg-slate-900 text-white">
              Sayfa başına 5
            </option>
            <option value={10} className="bg-slate-900 text-white">
              Sayfa başına 10
            </option>
            <option value={25} className="bg-slate-900 text-white">
              Sayfa başına 25
            </option>
            <option value={50} className="bg-slate-900 text-white">
              Sayfa başına 50
            </option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!hasPrevious}
            className="rounded-md border border-white/10 bg-white/5 p-2 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="px-3 py-1 text-sm text-slate-200">
            Sayfa {currentPage} / {displayTotalPages}
          </span>

          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!hasNext}
            className="rounded-md border border-white/10 bg-white/5 p-2 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
