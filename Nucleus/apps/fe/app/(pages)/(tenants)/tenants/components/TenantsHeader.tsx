import { Building2, RefreshCw, UserPlus } from 'lucide-react'

interface TenantsHeaderProps {
  onCreate: () => void
  onRefresh: () => void
  isRefreshing: boolean
}

export function TenantsHeader({ onCreate, onRefresh, isRefreshing }: TenantsHeaderProps) {
  return (
    <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl shadow-xl border border-slate-700/60 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-white/10 rounded-full p-3">
            <Building2 size={28} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Tenant Management</h1>
            <p className="text-slate-200">
              Create, update, and monitor tenant environments across the platform.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm font-medium disabled:opacity-60"
            disabled={isRefreshing}
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            {isRefreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 transition-colors text-sm font-semibold shadow"
          >
            <UserPlus size={18} />
            Add Tenant
          </button>
        </div>
      </div>
    </header>
  )
}
