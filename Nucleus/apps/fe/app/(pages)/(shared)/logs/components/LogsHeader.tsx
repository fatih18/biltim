import { Activity, RefreshCw } from 'lucide-react'

interface LogsHeaderProps {
  onRefresh: () => void
  isLoading?: boolean
}

export function LogsHeader({ onRefresh, isLoading = false }: LogsHeaderProps) {
  return (
    <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white rounded-2xl shadow-xl border border-slate-600/60 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-full">
            <Activity className="text-emerald-400" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Denetim Logları</h1>
            <p className="text-slate-200">Sistem aktivitelerini ve değişiklikleri takip edin</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm font-medium disabled:opacity-60"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          {isLoading ? 'Yenileniyor...' : 'Yenile'}
        </button>
      </div>
    </div>
  )
}
