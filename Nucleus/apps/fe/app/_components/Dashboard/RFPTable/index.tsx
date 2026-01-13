'use client'

import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { Brain, Eye, FileText, Filter, MoreVertical, Plus, Search } from 'lucide-react'
import { useRef } from 'react'

gsap.registerPlugin(useGSAP)

interface RFP {
  id: string
  title: string
  status: string
  deadline: string
  proposals: number
  budget: number
  category: string
  customerType: string
  aiScore: number
  complianceRate: number
  riskLevel: string
  estimatedSavings: number
}

interface RFPTableProps {
  rfps: RFP[]
}

export function RFPTable({ rfps }: RFPTableProps) {
  const tableRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      gsap.fromTo(
        '.table-row',
        { x: -30, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5, stagger: 0.03, ease: 'power2.out', delay: 0.4 }
      )
    },
    { scope: tableRef }
  )

  function getStatusBadge(status: string) {
    const statusConfig = {
      active: 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200',
      review: 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border-yellow-200',
      completed: 'bg-gradient-to-r from-slate-100 to-slate-200 text-slate-800 border-slate-300',
      pending: 'bg-gradient-to-r from-orange-100 to-red-100 text-orange-800 border-orange-200',
    }

    return (
      statusConfig[status as keyof typeof statusConfig] ||
      'bg-slate-100 text-slate-800 border-slate-200'
    )
  }

  function getPriorityBadge(risk: string) {
    const riskConfig = {
      low: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
      medium: 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white',
      high: 'bg-gradient-to-r from-red-500 to-pink-500 text-white',
    }

    return riskConfig[risk as keyof typeof riskConfig] || 'bg-slate-500 text-white'
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
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm">
              <FileText className="text-white" size={24} />
            </div>
            Son RFP'ler
          </h2>
          <button
            type="button"
            onClick={() => {
              alert(
                '🚀 Yeni RFP oluşturma sayfasına yönlendiriliyorsunuz...\n\nÖzellikler:\n- RFP detayları girişi\n- Tedarikçi seçimi\n- Değerlendirme kriterleri\n- Teslim tarihi belirleme'
              )
            }}
            className="bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded-xl hover:bg-white/20 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl border border-white/20 hover:scale-105"
          >
            <Plus size={20} />
            Yeni RFP Oluştur
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
              size={20}
            />
            <input
              type="text"
              placeholder="RFP ara..."
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-400 focus:border-transparent bg-slate-50/50 backdrop-blur-sm"
            />
          </div>
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-3 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <Filter size={20} />
            Filtrele
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-4 px-4 font-semibold text-slate-700">RFP Detayları</th>
                <th className="text-left py-4 px-4 font-semibold text-slate-700">Durum</th>
                <th className="text-left py-4 px-4 font-semibold text-slate-700">AI Skoru</th>
                <th className="text-left py-4 px-4 font-semibold text-slate-700">Bütçe</th>
                <th className="text-left py-4 px-4 font-semibold text-slate-700">Son Tarih</th>
                <th className="text-left py-4 px-4 font-semibold text-slate-700">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {rfps.map((rfp) => (
                <tr
                  key={rfp.id}
                  className="table-row border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className="space-y-2">
                      <p className="font-semibold text-slate-900">{rfp.title}</p>
                      <p className="text-sm text-slate-500">
                        {rfp.category} • {rfp.customerType}
                      </p>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadge(rfp.riskLevel)}`}
                        >
                          {rfp.riskLevel === 'low'
                            ? 'Düşük Risk'
                            : rfp.riskLevel === 'medium'
                              ? 'Orta Risk'
                              : 'Yüksek Risk'}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span
                      className={`px-3 py-2 rounded-full text-sm font-medium border ${getStatusBadge(rfp.status)}`}
                    >
                      {rfp.status === 'active'
                        ? 'Aktif'
                        : rfp.status === 'review'
                          ? 'İncelemede'
                          : 'Tamamlandı'}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Brain className="text-slate-600" size={16} />
                        <span className="font-semibold text-slate-900">{rfp.aiScore}</span>
                      </div>
                      <div className="w-16 bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-slate-600 to-slate-700 h-2 rounded-full transition-all duration-1000"
                          style={{ width: `${rfp.aiScore}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-900">{formatCurrency(rfp.budget)}</p>
                      <p className="text-xs text-green-600">
                        ~{formatCurrency(rfp.estimatedSavings)} tasarruf
                      </p>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="space-y-1">
                      <p className="text-sm text-slate-900">{rfp.deadline}</p>
                      <p className="text-xs text-slate-500">{rfp.proposals} teklif</p>
                    </div>
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
                        <Brain size={16} />
                      </button>
                      <button
                        type="button"
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <MoreVertical size={16} />
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
