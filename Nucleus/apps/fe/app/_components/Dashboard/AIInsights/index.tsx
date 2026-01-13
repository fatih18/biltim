'use client'

import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { Brain, Sparkles, TrendingUp, Zap } from 'lucide-react'
import { useRef } from 'react'

gsap.registerPlugin(useGSAP)

export function AIInsights() {
  const insightsRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      gsap.fromTo(
        '.insight-card',
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.4, stagger: 0.1, ease: 'back.out(1.7)', delay: 0.6 }
      )
    },
    { scope: insightsRef }
  )

  return (
    <div ref={insightsRef} className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="insight-card bg-gradient-to-br from-slate-50 to-white p-6 rounded-2xl border border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-br from-slate-600 to-slate-700 p-3 rounded-xl shadow-lg">
                <Sparkles className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">AI Öneriler</h3>
                <p className="text-sm text-slate-600">Akıllı sistem önerileri</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="bg-white p-4 rounded-xl border border-slate-200/50 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-sm font-medium text-slate-900">
                  RFP-1 için 3 yeni teklif analiz edildi
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  TechCorp A.Ş. teklifinde %15 maliyet optimizasyonu fırsatı tespit edildi
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200/50 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-sm font-medium text-slate-900">Risk analizi tamamlandı</p>
                <p className="text-xs text-slate-600 mt-1">
                  2 RFP'de orta seviye risk faktörleri belirlendi
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200/50 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-sm font-medium text-slate-900">Yeni tedarikçi önerisi</p>
                <p className="text-xs text-slate-600 mt-1">
                  Sistem 3 yeni potansiyel tedarikçi tespit etti
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="insight-card bg-gradient-to-br from-slate-50 to-white p-6 rounded-2xl border border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-br from-slate-600 to-slate-700 p-3 rounded-xl shadow-lg">
                <TrendingUp className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Performans Analizi</h3>
                <p className="text-sm text-slate-600">Sistem performans metrikleri</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200/50">
                <span className="text-sm text-slate-600">Ortalama İşlem Süresi</span>
                <span className="font-semibold text-slate-900">2.3 gün</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200/50">
                <span className="text-sm text-slate-600">Otomasyon Oranı</span>
                <span className="font-semibold text-slate-900">78%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200/50">
                <span className="text-sm text-slate-600">Doğruluk Oranı</span>
                <span className="font-semibold text-slate-900">94%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="insight-card bg-gradient-to-br from-slate-50 to-white p-6 rounded-2xl border border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-br from-slate-600 to-slate-700 p-3 rounded-xl shadow-lg">
                <Brain className="text-white" size={20} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Akıllı Analiz</h3>
            </div>
            <div className="space-y-3">
              <div className="text-center">
                <div className="text-3xl font-bold text-slate-900">156</div>
                <div className="text-sm text-slate-600">Analiz edilen teklif</div>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-slate-600 to-slate-700 h-2 rounded-full"
                  style={{ width: '89%' }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="insight-card bg-gradient-to-br from-slate-50 to-white p-6 rounded-2xl border border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-br from-slate-600 to-slate-700 p-3 rounded-xl shadow-lg">
                <Zap className="text-white" size={20} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Hızlı İşlem</h3>
            </div>
            <div className="space-y-3">
              <div className="text-center">
                <div className="text-3xl font-bold text-slate-900">4.2s</div>
                <div className="text-sm text-slate-600">Ortalama yanıt süresi</div>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-slate-600 to-slate-700 h-2 rounded-full"
                  style={{ width: '95%' }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="insight-card bg-gradient-to-br from-slate-50 to-white p-6 rounded-2xl border border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-br from-slate-600 to-slate-700 p-3 rounded-xl shadow-lg">
                <TrendingUp className="text-white" size={20} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Trend Analizi</h3>
            </div>
            <div className="space-y-3">
              <div className="text-center">
                <div className="text-3xl font-bold text-slate-900">+23%</div>
                <div className="text-sm text-slate-600">Bu ayki artış</div>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-slate-600 to-slate-700 h-2 rounded-full"
                  style={{ width: '76%' }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
