'use client'

import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { Brain, Eye, Upload, Users } from 'lucide-react'
import { useRef } from 'react'

gsap.registerPlugin(useGSAP)

interface Proposal {
  id: string
  rfpTitle: string
  vendor: string
  amount: number
  currency: string
  status: string
  submittedDate: string
  lastUpdated: string
  score: number
  versions: number
  lastVersion: string
}

interface ProposalTableProps {
  proposals: Proposal[]
}

export function ProposalTable({ proposals }: ProposalTableProps) {
  const tableRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      gsap.fromTo(
        '.proposal-row',
        { x: -30, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5, stagger: 0.03, ease: 'power2.out', delay: 0.4 }
      )
    },
    { scope: tableRef }
  )

  function getStatusBadge(status: string) {
    const statusConfig = {
      'under-review':
        'bg-gradient-to-r from-purple-100 to-violet-100 text-purple-800 border-purple-200',
      'needs-revision': 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border-red-200',
      pending: 'bg-gradient-to-r from-orange-100 to-red-100 text-orange-800 border-orange-200',
    }

    return (
      statusConfig[status as keyof typeof statusConfig] ||
      'bg-slate-100 text-slate-800 border-slate-200'
    )
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div
      ref={tableRef}
      className="bg-white rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden"
    >
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 p-6 border-b border-slate-600/50">
        <h2 className="text-xl font-semibold text-white flex items-center gap-3">
          <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm">
            <Users className="text-white" size={24} />
          </div>
          Tekliflerim
        </h2>
      </div>

      <div className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-4 px-4 font-semibold text-slate-700">RFP</th>
                <th className="text-left py-4 px-4 font-semibold text-slate-700">Teklif Tutarı</th>
                <th className="text-left py-4 px-4 font-semibold text-slate-700">Durum</th>
                <th className="text-left py-4 px-4 font-semibold text-slate-700">AI Skoru</th>
                <th className="text-left py-4 px-4 font-semibold text-slate-700">Son Güncelleme</th>
                <th className="text-left py-4 px-4 font-semibold text-slate-700">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {proposals.map((proposal) => (
                <tr
                  key={proposal.id}
                  className="proposal-row border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-900">{proposal.rfpTitle}</p>
                      <p className="text-sm text-slate-500">Sürüm: {proposal.lastVersion}</p>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <p className="font-semibold text-slate-900">
                      {formatCurrency(proposal.amount)}
                    </p>
                  </td>
                  <td className="py-4 px-4">
                    <span
                      className={`px-3 py-2 rounded-full text-sm font-medium border ${getStatusBadge(proposal.status)}`}
                    >
                      {proposal.status === 'under-review'
                        ? 'İncelemede'
                        : proposal.status === 'needs-revision'
                          ? 'Revizyon Gerekli'
                          : 'Beklemede'}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Brain className="text-slate-600" size={16} />
                        <span className="font-semibold text-slate-900">{proposal.score}</span>
                      </div>
                      <div className="w-16 bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-slate-600 to-slate-700 h-2 rounded-full transition-all duration-1000"
                          style={{ width: `${proposal.score}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <p className="text-sm text-slate-600">{proposal.lastUpdated}</p>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        type="button"
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Upload size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
