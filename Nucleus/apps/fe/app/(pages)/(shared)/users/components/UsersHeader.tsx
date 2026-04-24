'use client'

import { Shield, UserPlus } from 'lucide-react'

interface UsersHeaderProps {
  onCreate: () => void
  onRefresh: () => void
  isRefreshing: boolean
}

export function UsersHeader({ onCreate, onRefresh, isRefreshing }: UsersHeaderProps) {
  return (
    <header className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/40">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
            <Shield size={28} className="text-emerald-300" />
          </div>

          <div>
            <h1 className="text-xl font-semibold text-slate-50 md:text-2xl">Kullanıcılar</h1>
            <p className="mt-1 text-sm text-slate-400">
              Platform hesaplarını, doğrulama ve erişim kontrollerini yönetin.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-950/70 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRefreshing ? 'Yenileniyor…' : 'Yenile'}
          </button>

          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow transition hover:bg-emerald-400"
          >
            <UserPlus size={18} />
            Kullanıcı Ekle
          </button>
        </div>
      </div>
    </header>
  )
}
