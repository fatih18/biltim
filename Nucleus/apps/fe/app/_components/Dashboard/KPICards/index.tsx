'use client'

import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import {
  ArrowUpRight,
  Briefcase,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useRef } from 'react'

gsap.registerPlugin(useGSAP)

interface KPIData {
  totalProjects: number
  activeRFPs: number
  totalProposals: number
  costSavings: number
}

interface KPICardsProps {
  data: KPIData
  userRole: 'admin' | 'vendor'
}

export function KPICards({ data, userRole }: KPICardsProps) {
  const cardsRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      gsap.fromTo(
        '.kpi-card',
        { y: 60, opacity: 0, scale: 0.8, rotationX: 15 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          rotationX: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: 'power3.out',
        }
      )
    },
    { scope: cardsRef }
  )

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  function formatNumber(num: number) {
    return new Intl.NumberFormat('tr-TR').format(num)
  }

  if (userRole === 'admin') {
    return (
      <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="kpi-card bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6 rounded-2xl shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                Aktif Projeler
              </p>
              <p className="text-4xl font-bold text-slate-900 mt-2">
                {formatNumber(data.totalProjects)}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <ArrowUpRight className="text-green-500" size={16} />
                <span className="text-sm font-medium text-green-600">+12% bu ay</span>
              </div>
            </div>
            <div className="bg-gradient-to-br from-slate-600 to-slate-700 p-4 rounded-xl shadow-lg">
              <Briefcase className="text-white" size={28} />
            </div>
          </div>
        </div>

        <div className="kpi-card bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6 rounded-2xl shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                Aktif RFP'ler
              </p>
              <p className="text-4xl font-bold text-slate-900 mt-2">
                {formatNumber(data.activeRFPs)}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <ArrowUpRight className="text-green-500" size={16} />
                <span className="text-sm font-medium text-green-600">+8 bu hafta</span>
              </div>
            </div>
            <div className="bg-gradient-to-br from-slate-600 to-slate-700 p-4 rounded-xl shadow-lg">
              <FileText className="text-white" size={28} />
            </div>
          </div>
        </div>

        <div className="kpi-card bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6 rounded-2xl shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                Toplam Teklifler
              </p>
              <p className="text-4xl font-bold text-slate-900 mt-2">
                {formatNumber(data.totalProposals)}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <ArrowUpRight className="text-green-500" size={16} />
                <span className="text-sm font-medium text-green-600">+23 bu hafta</span>
              </div>
            </div>
            <div className="bg-gradient-to-br from-slate-600 to-slate-700 p-4 rounded-xl shadow-lg">
              <Users className="text-white" size={28} />
            </div>
          </div>
        </div>

        <div className="kpi-card bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6 rounded-2xl shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                Maliyet Tasarrufu
              </p>
              <p className="text-4xl font-bold text-slate-900 mt-2">
                {formatCurrency(data.costSavings)}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <ArrowUpRight className="text-green-500" size={16} />
                <span className="text-sm font-medium text-green-600">Bu yıl</span>
              </div>
            </div>
            <div className="bg-gradient-to-br from-slate-600 to-slate-700 p-4 rounded-xl shadow-lg">
              <Target className="text-white" size={28} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Vendor KPI Cards
  return (
    <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="kpi-card bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6 rounded-2xl shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent"></div>
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
              Davetli RFP'ler
            </p>
            <p className="text-4xl font-bold text-slate-900 mt-2">5</p>
            <div className="flex items-center gap-2 mt-3">
              <Clock className="text-slate-500" size={16} />
              <span className="text-sm font-medium text-slate-600">2 beklemede</span>
            </div>
          </div>
          <div className="bg-gradient-to-br from-slate-600 to-slate-700 p-4 rounded-xl shadow-lg">
            <FileText className="text-white" size={28} />
          </div>
        </div>
      </div>

      <div className="kpi-card bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6 rounded-2xl shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent"></div>
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
              Gönderilen Teklifler
            </p>
            <p className="text-4xl font-bold text-slate-900 mt-2">8</p>
            <div className="flex items-center gap-2 mt-3">
              <CheckCircle className="text-green-500" size={16} />
              <span className="text-sm font-medium text-green-600">6 onaylandı</span>
            </div>
          </div>
          <div className="bg-gradient-to-br from-slate-600 to-slate-700 p-4 rounded-xl shadow-lg">
            <CheckCircle className="text-white" size={28} />
          </div>
        </div>
      </div>

      <div className="kpi-card bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6 rounded-2xl shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent"></div>
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
              Kazanma Oranı
            </p>
            <p className="text-4xl font-bold text-slate-900 mt-2">75%</p>
            <div className="flex items-center gap-2 mt-3">
              <TrendingUp className="text-green-500" size={16} />
              <span className="text-sm font-medium text-green-600">+5% bu ay</span>
            </div>
          </div>
          <div className="bg-gradient-to-br from-slate-600 to-slate-700 p-4 rounded-xl shadow-lg">
            <TrendingUp className="text-white" size={28} />
          </div>
        </div>
      </div>

      <div className="kpi-card bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6 rounded-2xl shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent"></div>
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
              Toplam Değer
            </p>
            <p className="text-4xl font-bold text-slate-900 mt-2">{formatCurrency(3200000)}</p>
            <div className="flex items-center gap-2 mt-3">
              <DollarSign className="text-slate-500" size={16} />
              <span className="text-sm font-medium text-slate-600">Bu yıl</span>
            </div>
          </div>
          <div className="bg-gradient-to-br from-slate-600 to-slate-700 p-4 rounded-xl shadow-lg">
            <DollarSign className="text-white" size={28} />
          </div>
        </div>
      </div>
    </div>
  )
}
