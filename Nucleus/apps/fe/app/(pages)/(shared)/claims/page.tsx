'use client'

import { AlertTriangle, Shield } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'
import { useStore } from '../../../_store'
import { ClaimsTab } from './components/ClaimsTab'
import { RolesTab } from './components/RolesTab'
import { useClaimsManagement } from './hooks/useClaimsManagement'
import { useRolesManagement } from './hooks/useRolesManagement'

type Tab = 'claims' | 'roles'

export default function ClaimsManagementPage() {
  const actions = useGenericApiActions()
  const store = useStore()
  const user = store.user

  const [activeTab, setActiveTab] = useState<Tab>('claims')

  const methods = useMemo(() => ['GET', 'POST', 'PATCH', 'DELETE'], [])
  const modes = useMemo(() => ['exact', 'startsWith'] as const, [])

  const claimsManagement = useClaimsManagement(actions, user?.is_god ?? false)
  const rolesManagement = useRolesManagement(actions, user?.is_god ?? false)

  // Not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
            <h1 className="mb-2 text-2xl font-semibold text-slate-800">Authorization Management</h1>
            <p className="text-sm text-slate-600">Please log in to manage claims and roles.</p>
          </div>
        </div>
      </div>
    )
  }

  // Not authorized (not god admin)
  if (!user.is_god) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-red-200 bg-white p-8 text-center shadow-lg">
            <AlertTriangle className="text-red-500" size={32} />
            <h1 className="text-2xl font-semibold text-slate-800">Access denied</h1>
            <p className="text-sm text-slate-600">
              Only god administrators can manage claims and authorization settings.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Main page
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <header className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white rounded-2xl shadow-xl border border-slate-600/60 p-6">
          <div className="flex items-center gap-4">
            <div className="bg-white/10 rounded-full p-3">
              <Shield size={28} className="text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Authorization Management</h1>
              <p className="text-slate-200">
                Define claims and roles that control access to endpoints and resources.
              </p>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('claims')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'claims'
                ? 'border-b-2 border-emerald-500 text-emerald-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Claims
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'roles'
                ? 'border-b-2 border-emerald-500 text-emerald-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Roles
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'claims' ? (
          <ClaimsTab management={claimsManagement} methods={methods} modes={modes} />
        ) : (
          <RolesTab management={rolesManagement} />
        )}
      </div>
    </div>
  )
}
