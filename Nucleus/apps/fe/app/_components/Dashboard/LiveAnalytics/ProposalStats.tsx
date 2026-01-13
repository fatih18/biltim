'use client'

import { Award, Clock, DollarSign, FileText, Shield, Target, TrendingUp, Users } from 'lucide-react'
import { useState } from 'react'
import type { ProposalStatsProps } from './types'

export function ProposalStats({ proposals }: ProposalStatsProps) {
  const [selectedStat, setSelectedStat] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const totalProposals = proposals.length
  const averageScore =
    proposals.length > 0
      ? Math.round(proposals.reduce((acc, p) => acc + p.score, 0) / proposals.length)
      : 0
  const lowRiskCount = proposals.filter((p) => p.riskLevel === 'low').length
  const approvedCount = proposals.filter((p) => p.status === 'approved').length
  const totalAmount = proposals.reduce((acc, p) => acc + p.amount, 0)
  const averageDeliveryTime =
    proposals.length > 0
      ? Math.round(proposals.reduce((acc, p) => acc + p.deliveryTime, 0) / proposals.length)
      : 0
  const highScoreCount = proposals.filter((p) => p.score >= 90).length
  const underReviewCount = proposals.filter((p) => p.status === 'under-review').length

  const handleStatClick = (statId: string, statData: { title: string; value: string | number }) => {
    setSelectedStat(selectedStat === statId ? null : statId)
    if (statId === 'details') {
      setShowDetails(!showDetails)
    } else {
      alert(`${statData.title}: ${statData.value}\nDetaylı analiz yakında eklenecek!`)
    }
  }

  const stats = [
    {
      id: 'total',
      title: 'Toplam Teklif',
      value: totalProposals || 0,
      icon: FileText,
      color: 'from-slate-500 to-slate-600',
      bgColor: 'from-slate-50 to-slate-100',
      change: '+12%',
      trend: 'up',
    },
    {
      id: 'average',
      title: 'Ortalama Puan',
      value: averageScore || 0,
      icon: Award,
      color: 'from-slate-500 to-slate-600',
      bgColor: 'from-slate-50 to-slate-100',
      change: '+5%',
      trend: 'up',
    },
    {
      id: 'lowrisk',
      title: 'Düşük Riskli',
      value: lowRiskCount || 0,
      icon: Shield,
      color: 'from-green-500 to-green-600',
      bgColor: 'from-green-50 to-green-100',
      change: '+8%',
      trend: 'up',
    },
    {
      id: 'approved',
      title: 'Onaylanan',
      value: approvedCount || 0,
      icon: Target,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'from-emerald-50 to-emerald-100',
      change: '+15%',
      trend: 'up',
    },
    {
      id: 'totalvalue',
      title: 'Toplam Değer',
      value: totalAmount > 0 ? `${(totalAmount / 1000000).toFixed(1)}M TL` : '0M TL',
      icon: DollarSign,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'from-orange-50 to-orange-100',
      change: '+23%',
      trend: 'up',
    },
    {
      id: 'delivery',
      title: 'Ort. Teslimat',
      value: averageDeliveryTime > 0 ? `${averageDeliveryTime} gün` : '0 gün',
      icon: Clock,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'from-blue-50 to-blue-100',
      change: '-7%',
      trend: 'down',
    },
    {
      id: 'highscore',
      title: 'Yüksek Puan',
      value: highScoreCount || 0,
      icon: TrendingUp,
      color: 'from-indigo-500 to-indigo-600',
      bgColor: 'from-indigo-50 to-indigo-100',
      change: '+18%',
      trend: 'up',
    },
    {
      id: 'underreview',
      title: 'İnceleniyor',
      value: underReviewCount || 0,
      icon: Users,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'from-purple-50 to-purple-100',
      change: '+3%',
      trend: 'up',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <button
          key={index}
          type="button"
          onClick={() => handleStatClick(stat.id || `stat-${index}`, stat)}
          className={`comparator-card relative overflow-hidden bg-gradient-to-br ${stat.bgColor} p-6 rounded-2xl border border-slate-200 hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer group text-left w-full ${
            selectedStat === (stat.id || `stat-${index}`) ? 'ring-2 ring-blue-500 shadow-2xl' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div
              className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.color} p-3 shadow-lg group-hover:scale-110 transition-transform`}
            >
              <stat.icon className="text-white" size={24} />
            </div>
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                stat.trend === 'up' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}
            >
              {stat.trend === 'up' ? (
                <TrendingUp size={12} />
              ) : (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <title>Down</title>
                  <path
                    fillRule="evenodd"
                    d="M14.707 12.293a1 1 0 010 1.414L10 18.414l-4.707-4.707a1 1 0 111.414-1.414L10 15.586l3.293-3.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {stat.change}
            </div>
          </div>

          <h3 className="text-3xl font-bold text-slate-900 mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 transition-all">
            {stat.value}
          </h3>
          <p className="text-slate-600 font-medium">{stat.title}</p>

          {/* Decorative elements */}
          <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-tl from-white/20 to-transparent rounded-tl-full"></div>
          <div className="absolute top-0 left-0 w-8 h-8 bg-gradient-to-br from-white/30 to-transparent rounded-br-full"></div>
        </button>
      ))}
    </div>
  )
}
