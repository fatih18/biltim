import { ArrowRight, Bell, CheckCircle2, FileText, Shield, Users, Workflow } from 'lucide-react'
import Link from 'next/link'

// Tables that support verification flows
const verifiableTables = [
  {
    id: 'content',
    name: 'Content',
    description: 'Manage approval workflows for content items',
    icon: FileText,
    color: 'from-violet-500 to-purple-600',
  },
]

// Coming soon tables
const comingSoonTables = [
  { name: 'Projects', icon: Workflow },
  { name: 'Documents', icon: FileText },
  { name: 'Invoices', icon: FileText },
]

export default function Verifications() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-200">
              <Shield className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Verification Flows</h1>
              <p className="text-slate-500">Design and manage approval workflows for your data</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Feature highlights */}
        <div className="mb-10 grid gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">Multi-step Approval</div>
              <div className="text-xs text-slate-500">Sequential or parallel verifiers</div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <Bell className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">Smart Notifications</div>
              <div className="text-xs text-slate-500">Trigger-based alerts</div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
              <CheckCircle2 className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">Digital Signatures</div>
              <div className="text-xs text-slate-500">Optional signature requirements</div>
            </div>
          </div>
        </div>

        {/* Active tables */}
        <div className="mb-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Available Tables</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {verifiableTables.map((table) => {
              const Icon = table.icon
              return (
                <Link
                  key={table.id}
                  href={`/verifications/${table.id}`}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100"
                >
                  <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 opacity-50 transition-transform duration-300 group-hover:scale-150" />

                  <div className="relative">
                    <div className="mb-4 flex items-start justify-between">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${table.color} text-white shadow-lg`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-all group-hover:bg-indigo-500 group-hover:text-white">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>

                    <h3 className="mb-1 text-lg font-semibold text-slate-900">{table.name}</h3>
                    <p className="text-sm text-slate-500">{table.description}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Coming soon */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-slate-500">Coming Soon</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {comingSoonTables.map((table) => {
              const Icon = table.icon
              return (
                <div
                  key={table.name}
                  className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 opacity-60"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-200">
                    <Icon className="h-5 w-5 text-slate-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-500">{table.name}</div>
                    <div className="text-xs text-slate-400">Not available yet</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
