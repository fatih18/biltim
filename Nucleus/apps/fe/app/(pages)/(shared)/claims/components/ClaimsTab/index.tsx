import { Loader2, Plus } from 'lucide-react'
import type { useClaimsManagement } from '../../hooks/useClaimsManagement'
import { ClaimModal } from '../ClaimModal'
import { ClaimsFilters } from '../ClaimsFilters'
import { ClaimsPagination } from '../ClaimsPagination'
import { ClaimsTable } from '../ClaimsTable'

type ClaimsTabProps = {
  management: ReturnType<typeof useClaimsManagement>
  methods: string[]
  modes: readonly ('exact' | 'startsWith')[]
}

export function ClaimsTab({ management, methods, modes }: ClaimsTabProps) {
  const {
    claims,
    pagination,
    filters,
    errorMessage,
    isInitialLoading,
    isRefreshing,
    isModalOpen,
    editingClaim,
    formState,
    isSubmitting,
    setPage,
    updateFilters,
    updateFormState,
    handleRefresh,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSubmit,
    handleDelete,
  } = management

  return (
    <>
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Claims</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Low-level permissions that map to specific API endpoints
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleRefresh}
                className="px-4 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 transition-colors text-sm font-medium disabled:opacity-60"
                disabled={isInitialLoading || isRefreshing}
              >
                {isRefreshing && <Loader2 className="h-4 w-4 animate-spin inline mr-2" />}
                Refresh
              </button>
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 transition-colors text-sm font-semibold text-white shadow"
              >
                <Plus size={18} />
                New Claim
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          <ClaimsFilters
            filters={filters}
            methods={methods}
            modes={modes}
            errorMessage={errorMessage}
            onChange={updateFilters}
            onPageChange={setPage}
          />

          <ClaimsTable
            claims={claims}
            isLoading={isInitialLoading}
            onEdit={openEditModal}
            onDelete={handleDelete}
          />

          <ClaimsPagination
            pagination={pagination}
            currentCount={claims.length}
            onPageChange={setPage}
          />
        </div>
      </section>

      <ClaimModal
        isOpen={isModalOpen}
        editingClaim={editingClaim}
        formState={formState}
        isSubmitting={isSubmitting}
        methods={methods}
        modes={modes}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onFormChange={updateFormState}
      />
    </>
  )
}
