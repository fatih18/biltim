'use client'

import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import {
  Award,
  BarChart3,
  Bot,
  Clock,
  FileText,
  Play,
  Sparkles,
  Star,
  Target,
  TrendingUp,
} from 'lucide-react'
import { useRef, useState } from 'react'

gsap.registerPlugin(useGSAP)

export function AdvancedFeatures() {
  const featuresRef = useRef<HTMLDivElement>(null)
  const [activeDemo, setActiveDemo] = useState<string>('ai-writer')
  const [aiText, setAiText] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState('TechCorp A.Ş.')

  useGSAP(
    () => {
      gsap.fromTo(
        '.demo-card',
        { scale: 0, opacity: 0, y: 50 },
        { scale: 1, opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'back.out(1.7)' }
      )
    },
    { scope: featuresRef }
  )

  const generateAIText = () => {
    setIsGenerating(true)
    setAiText('')

    const sampleText =
      'Sayın Müşteri Temsilcisi,\n\nAkıllı sayaç donanım alımı projeniz için hazırladığımız teklifimizi sunmaktan memnuniyet duyarız. 15 yıllık deneyimimiz ve ISO 27001 sertifikamız ile size en kaliteli hizmeti sunmaya hazırız.\n\n• 10,000 adet akıllı sayaç\n• %99.9 SLA garantisi\n• 24/7 teknik destek\n• 90 gün teslim süresi\n\nToplam Tutar: 4.250.000 TL (KDV Hariç)\n\nDetaylı teklifimiz ekte yer almaktadır. Görüşme talebinizi bekliyoruz.\n\nSaygılarımızla,\nTechCorp A.Ş.'

    let currentIndex = 0
    const interval = setInterval(() => {
      if (currentIndex < sampleText.length) {
        setAiText(sampleText.slice(0, currentIndex + 1))
        currentIndex++
      } else {
        clearInterval(interval)
        setIsGenerating(false)
      }
    }, 30)
  }

  const mockVendors = [
    { name: 'TechCorp A.Ş.', score: 94, risk: 'Düşük', projects: 15 },
    { name: 'SmartMeter Ltd.', score: 87, risk: 'Orta', projects: 8 },
    { name: 'Dijital Çözümler', score: 91, risk: 'Düşük', projects: 12 },
  ]

  const mockAnalytics = {
    totalRFPs: 156,
    activeProposals: 89,
    avgResponseTime: 4.2,
    successRate: 87,
  }

  return (
    <div ref={featuresRef} className="space-y-12">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-4">
          🚀 İleri Seviye Özellikler
        </h2>
        <p className="text-xl text-slate-600 max-w-4xl mx-auto">
          Gerçek zamanlı demo alanlarımızla platformun gücünü deneyimleyin
        </p>
      </div>

      {/* Demo Tabs */}
      <div className="flex flex-wrap justify-center gap-4 mb-8">
        <button
          type="button"
          onClick={() => setActiveDemo('ai-writer')}
          className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 ${
            activeDemo === 'ai-writer'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Bot size={20} />
          AI Teklif Yazıcı
        </button>
        <button
          type="button"
          onClick={() => setActiveDemo('analytics')}
          className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 ${
            activeDemo === 'analytics'
              ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <BarChart3 size={20} />
          Canlı Analitik
        </button>
        <button
          type="button"
          onClick={() => setActiveDemo('vendor-scoring')}
          className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 ${
            activeDemo === 'vendor-scoring'
              ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Target size={20} />
          Tedarikçi Puanlama
        </button>
      </div>

      {/* AI Teklif Yazıcı Demo */}
      {activeDemo === 'ai-writer' && (
        <div className="demo-card bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Bot className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900">AI Destekli Teklif Yazıcı</h3>
              <p className="text-slate-600">GPT-4 ile profesyonel teklifler oluşturun</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="rfp-subject"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  RFP Konusu
                </label>
                <input
                  id="rfp-subject"
                  type="text"
                  defaultValue="Akıllı Sayaç Donanım Alımı"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label
                  htmlFor="company-name"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  Şirket Adı
                </label>
                <input
                  id="company-name"
                  type="text"
                  defaultValue="TechCorp A.Ş."
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label
                  htmlFor="proposal-amount"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  Teklif Tutarı
                </label>
                <input
                  id="proposal-amount"
                  type="text"
                  defaultValue="4.250.000 TL"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <button
                type="button"
                onClick={generateAIText}
                disabled={isGenerating}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-lg font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    AI Yazıyor...
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    AI ile Teklif Oluştur
                  </>
                )}
              </button>
            </div>

            <div className="bg-slate-50 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="text-slate-600" size={20} />
                <span className="font-medium text-slate-700">Oluşturulan Teklif</span>
              </div>
              <div className="bg-white rounded-lg p-4 min-h-[300px] border border-slate-200">
                <pre className="whitespace-pre-wrap text-sm text-slate-700 font-mono">
                  {aiText || 'AI teklif metnini burada göreceksiniz...'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Canlı Analitik Demo */}
      {activeDemo === 'analytics' && (
        <div className="demo-card bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
              <BarChart3 className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900">
                Gerçek Zamanlı Analitik Dashboard
              </h3>
              <p className="text-slate-600">Canlı verilerle RFP performansınızı izleyin</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <FileText className="text-white" size={20} />
                </div>
                <span className="text-xs text-blue-600 font-medium">+12% bu ay</span>
              </div>
              <h4 className="text-2xl font-bold text-blue-900">{mockAnalytics.totalRFPs}</h4>
              <p className="text-blue-700 text-sm">Toplam RFP</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                  <TrendingUp className="text-white" size={20} />
                </div>
                <span className="text-xs text-green-600 font-medium">+8% bu ay</span>
              </div>
              <h4 className="text-2xl font-bold text-green-900">{mockAnalytics.activeProposals}</h4>
              <p className="text-green-700 text-sm">Aktif Teklif</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                  <Clock className="text-white" size={20} />
                </div>
                <span className="text-xs text-purple-600 font-medium">-0.3 gün</span>
              </div>
              <h4 className="text-2xl font-bold text-purple-900">
                {mockAnalytics.avgResponseTime}
              </h4>
              <p className="text-purple-700 text-sm">Ort. Yanıt Süresi (gün)</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                  <Award className="text-white" size={20} />
                </div>
                <span className="text-xs text-orange-600 font-medium">+5% bu ay</span>
              </div>
              <h4 className="text-2xl font-bold text-orange-900">{mockAnalytics.successRate}%</h4>
              <p className="text-orange-700 text-sm">Başarı Oranı</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-6">
            <h4 className="text-lg font-semibold text-slate-900 mb-4">Risk Seviyesi Dağılımı</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-700">Düşük Risk</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-slate-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '65%' }}></div>
                  </div>
                  <span className="text-sm font-medium text-slate-600">65%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700">Orta Risk</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-slate-200 rounded-full h-2">
                    <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '25%' }}></div>
                  </div>
                  <span className="text-sm font-medium text-slate-600">25%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700">Yüksek Risk</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-slate-200 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: '10%' }}></div>
                  </div>
                  <span className="text-sm font-medium text-slate-600">10%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tedarikçi Puanlama Demo */}
      {activeDemo === 'vendor-scoring' && (
        <div className="demo-card bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl flex items-center justify-center">
              <Target className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900">AI Destekli Tedarikçi Puanlama</h3>
              <p className="text-slate-600">Otomatik risk analizi ve performans değerlendirmesi</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="vendor-select"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  Tedarikçi Seçin
                </label>
                <select
                  id="vendor-select"
                  value={selectedVendor}
                  onChange={(e) => setSelectedVendor(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  {mockVendors.map((vendor) => (
                    <option key={vendor.name} value={vendor.name}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-slate-50 rounded-lg p-6 space-y-4">
                <h4 className="font-semibold text-slate-900">Puanlama Kriterleri</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700">Finansal Durum</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: '90%' }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">90</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700">Geçmiş Performans</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: '85%' }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">85</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700">Teknik Yeterlilik</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full"
                          style={{ width: '95%' }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">95</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700">Compliance</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-yellow-500 h-2 rounded-full"
                          style={{ width: '78%' }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">78</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {mockVendors.map((vendor) => (
                <div
                  key={vendor.name}
                  className={`p-6 rounded-xl border-2 transition-all duration-300 ${
                    selectedVendor === vendor.name
                      ? 'border-green-500 bg-green-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-slate-900">{vendor.name}</h4>
                    <div className="flex items-center gap-2">
                      <Star className="text-yellow-500" size={16} />
                      <span className="font-bold text-slate-900">{vendor.score}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-600">Risk Seviyesi:</span>
                      <div
                        className={`inline-block ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                          vendor.risk === 'Düşük'
                            ? 'bg-green-100 text-green-800'
                            : vendor.risk === 'Orta'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {vendor.risk}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-600">Tamamlanan Proje:</span>
                      <span className="ml-2 font-medium">{vendor.projects}</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                      <span>Genel Puan</span>
                      <span>{vendor.score}/100</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${vendor.score}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Call to Action */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 rounded-2xl p-8 text-center text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative z-10">
          <h3 className="text-3xl font-bold mb-4">🎯 Bu Özellikleri Deneyimleyin!</h3>
          <p className="text-xl text-slate-300 mb-6 max-w-2xl mx-auto">
            Gerçek çalışan demo'larımızla platformun gücünü hemen test edin
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              type="button"
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-2xl transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
            >
              <Play size={20} />
              Canlı Demo İzle
            </button>
            <button
              type="button"
              className="bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/20 transition-all duration-300 border border-white/20"
            >
              Ücretsiz Deneme
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
