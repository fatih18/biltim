import { Loader2, Plus } from 'lucide-react'
import { useState } from 'react'
import type { useRolesManagement } from '../../hooks/useRolesManagement'
import { RoleClaimsModal } from '../RoleClaimsModal'
import { RoleModal } from '../RoleModal'
import { RolesFilters } from '../RolesFilters'
import { RolesPagination } from '../RolesPagination'
import { RolesTable } from '../RolesTable'

type RolesTabProps = {
  management: ReturnType<typeof useRolesManagement>
}

export function RolesTab({ management }: RolesTabProps) {
  const {
    roles,
    pagination,
    filters,
    errorMessage,
    isInitialLoading,
    isRefreshing,
    isModalOpen,
    editingRole,
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

  const [isClaimsModalOpen, setIsClaimsModalOpen] = useState(false)
  const [selectedRoleForClaims, setSelectedRoleForClaims] =
    useState<ReturnType<typeof useRolesManagement>['editingRole']>(null)

  const handleManageClaims = (role: Parameters<typeof RolesTable>[0]['roles'][number]) => {
    setSelectedRoleForClaims(role)
    setIsClaimsModalOpen(true)
  }

  const handleCloseClaimsModal = () => {
    setIsClaimsModalOpen(false)
    setSelectedRoleForClaims(null)
  }

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Roles</h2>
              <p className="text-sm text-slate-600">
                Group claims into reusable roles for efficient permission management
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleRefresh}
                className="px-4 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 transition-colors text-sm font-medium disabled:opacity-60"
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
                New Role
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          <RolesFilters
            filters={filters}
            errorMessage={errorMessage}
            onChange={updateFilters}
            onPageChange={setPage}
          />

          <RolesTable
            roles={roles}
            isLoading={isInitialLoading}
            onEdit={openEditModal}
            onDelete={handleDelete}
            onManageClaims={handleManageClaims}
          />

          <RolesPagination
            pagination={pagination}
            currentCount={roles.length}
            onPageChange={setPage}
          />
        </div>
      </section>

      <RoleModal
        isOpen={isModalOpen}
        editingRole={editingRole}
        formState={formState}
        isSubmitting={isSubmitting}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onFormChange={updateFormState}
      />

      <RoleClaimsModal
        isOpen={isClaimsModalOpen}
        role={selectedRoleForClaims}
        onClose={handleCloseClaimsModal}
      />
    </>
  )
}
