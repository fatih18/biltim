'use client'

import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { Award, Clock, Shield } from 'lucide-react'
import { useRef } from 'react'

gsap.registerPlugin(useGSAP)

interface MetricsData {
  successRate: number
  avgResponseTime: number
  complianceRate: number
}

interface PerformanceMetricsProps {
  data: MetricsData
}

export function PerformanceMetrics({ data }: PerformanceMetricsProps) {
  const metricsRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      gsap.fromTo(
        '.metric-card',
        { x: -50, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.6, stagger: 0.05, ease: 'power2.out', delay: 0.2 }
      )
    },
    { scope: metricsRef }
  )

  return (
    <div ref={metricsRef} className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="metric-card bg-white p-6 rounded-2xl shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent"></div>
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Başarı Oranı</h3>
            <div className="bg-gradient-to-br from-slate-600 to-slate-700 p-3 rounded-xl shadow-lg">
              <Award className="text-white" size={20} />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-slate-900">{data.successRate}%</span>
              <span className="text-sm text-green-600 font-medium">+5% geçen aya göre</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-slate-600 to-slate-700 h-3 rounded-full transition-all duration-1000"
                style={{ width: `${data.successRate}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div className="metric-card bg-white p-6 rounded-2xl shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent"></div>
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Ortalama Yanıt Süresi</h3>
            <div className="bg-gradient-to-br from-slate-600 to-slate-700 p-3 rounded-xl shadow-lg">
              <Clock className="text-white" size={20} />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-slate-900">{data.avgResponseTime} gün</span>
              <span className="text-sm text-green-600 font-medium">-0.8 gün</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-slate-600 to-slate-700 h-3 rounded-full transition-all duration-1000"
                style={{ width: '75%' }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div className="metric-card bg-white p-6 rounded-2xl shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent"></div>
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Uyum Oranı</h3>
            <div className="bg-gradient-to-br from-slate-600 to-slate-700 p-3 rounded-xl shadow-lg">
              <Shield className="text-white" size={20} />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-slate-900">{data.complianceRate}%</span>
              <span className="text-sm text-green-600 font-medium">+3% bu ay</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-slate-600 to-slate-700 h-3 rounded-full transition-all duration-1000"
                style={{ width: `${data.complianceRate}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
