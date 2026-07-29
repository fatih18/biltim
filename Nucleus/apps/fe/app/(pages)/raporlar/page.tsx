'use client'

import { ReportsDashboard } from '@/app/_components/ReportsDashboard'

export default function RaporlarPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="border-b rounded-2xl p-4 border-slate-800 pb-4">
          <h1 className="text-xl font-semibold md:text-2xl">5S Raporları</h1>
          <p className="mt-1 text-sm text-slate-400">
            Denetim, bulgu ve aksiyon verilerine ait tüm raporlar.
          </p>
        </header>

        <ReportsDashboard />
      </div>
    </div>
  )
}
