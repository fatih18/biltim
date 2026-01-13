'use client'

import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import {
  Award,
  BarChart3,
  Brain,
  CheckCircle,
  Clock,
  DollarSign,
  Lightbulb,
  MessageSquare,
  Send,
  Target,
  TrendingUp,
  User,
} from 'lucide-react'
import { useRef, useState } from 'react'

gsap.registerPlugin(useGSAP)

type Sender = 'vendor' | 'ai' | 'admin'
type MessageType = 'proposal' | 'analysis' | 'message'

type NegotiationMessage = {
  id: number
  sender: Sender
  message: string
  timestamp: string
  type: MessageType
}

export function SmartNegotiator() {
  const negotiatorRef = useRef<HTMLDivElement>(null)
  const [currentMessage, setCurrentMessage] = useState('')
  const [proposalAmount, _setProposalAmount] = useState(4250000)
  const [targetAmount, _setTargetAmount] = useState(4000000)
  const [messages, setMessages] = useState<NegotiationMessage[]>([
    {
      id: 1,
      sender: 'vendor',
      message: 'Merhaba, akıllı sayaç projesi için teklifimizi 4.250.000 TL olarak sunuyoruz.',
      timestamp: '14:30',
      type: 'proposal',
    },
    {
      id: 2,
      sender: 'ai',
      message:
        'Analiz tamamlandı. Rakip teklifler 3.8M-4.5M aralığında. Müzakere stratejisi: Kalite vurgusu ile 4.1M hedefleyin.',
      timestamp: '14:31',
      type: 'analysis',
    },
  ])

  useGSAP(
    () => {
      gsap.fromTo(
        '.negotiator-card',
        { scale: 0, opacity: 0, y: 50 },
        { scale: 1, opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'back.out(1.7)' }
      )
    },
    { scope: negotiatorRef }
  )

  const sendMessage = () => {
    if (!currentMessage.trim()) return

    const newMessage: NegotiationMessage = {
      id: messages.length + 1,
      sender: 'admin',
      message: currentMessage,
      timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      type: 'message',
    }

    setMessages([...messages, newMessage])
    setCurrentMessage('')

    // AI response simulation
    setTimeout(() => {
      const aiResponse: NegotiationMessage = {
        id: messages.length + 2,
        sender: 'ai',
        message: generateAIResponse(currentMessage),
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        type: 'analysis',
      }
      setMessages((prev) => [...prev, aiResponse])
    }, 1500)
  }

  const generateAIResponse = (_userMessage: string): string => {
    const responses: string[] = [
      'Bu yaklaşım %73 başarı oranına sahip. Alternatif: Ödeme planı esnekliği önerisi.',
      'Piyasa analizi: Bu fiyat %15 üzerinde. Teknik avantajları vurgulayın.',
      'Önerilen strateji: Uzun vadeli ortaklık vurgusu ile %8 indirim kabul edilebilir.',
      'Risk analizi: Bu teklif orta riskli. SLA garantilerini artırarak güven oluşturun.',
    ]
    const randomIndex = Math.floor(Math.random() * responses.length)
    const candidate = responses[randomIndex]
    return candidate ?? ''
  }

  const mockNegotiationData = {
    currentOffer: proposalAmount,
    targetPrice: targetAmount,
    marketAverage: 4100000,
    competitorRange: { min: 3800000, max: 4500000 },
    successProbability: 78,
    recommendedStrategy: 'Kalite ve SLA vurgusu',
    timeRemaining: '3 gün 14 saat',
  }

  const negotiationTactics = [
    {
      title: 'Değer Odaklı Yaklaşım',
      description: 'Fiyat yerine sağladığınız değeri vurgulayın',
      successRate: 85,
      icon: Award,
      color: 'from-green-500 to-emerald-600',
    },
    {
      title: 'Rekabetçi Analiz',
      description: 'Rakip teklifleri analiz ederek pozisyon alın',
      successRate: 72,
      icon: BarChart3,
      color: 'from-blue-500 to-cyan-600',
    },
    {
      title: 'Uzun Vadeli Ortaklık',
      description: 'Gelecekteki projeler için stratejik ortaklık önerisi',
      successRate: 68,
      icon: Target,
      color: 'from-purple-500 to-indigo-600',
    },
    {
      title: 'Esnek Ödeme Planı',
      description: 'Nakit akışı avantajı ile müzakere gücü',
      successRate: 79,
      icon: DollarSign,
      color: 'from-orange-500 to-red-600',
    },
  ]

  return (
    <div ref={negotiatorRef} className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-4">
          🧠 Akıllı Müzakere Asistanı
        </h2>
        <p className="text-xl text-slate-600 max-w-4xl mx-auto">
          AI destekli müzakere stratejileri ile daha iyi anlaşmalar yapın
        </p>
      </div>

      {/* Ana Müzakere Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sol Panel - Müzakere Bilgileri */}
        <div className="lg:col-span-1 space-y-6">
          {/* Mevcut Durum */}
          <div className="negotiator-card bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <TrendingUp className="text-blue-600" size={24} />
              Müzakere Durumu
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Mevcut Teklif:</span>
                <span className="font-bold text-slate-900">
                  {(mockNegotiationData.currentOffer / 1000000).toFixed(2)}M TL
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-600">Hedef Fiyat:</span>
                <span className="font-bold text-green-600">
                  {(mockNegotiationData.targetPrice / 1000000).toFixed(2)}M TL
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-600">Piyasa Ortalaması:</span>
                <span className="font-bold text-blue-600">
                  {(mockNegotiationData.marketAverage / 1000000).toFixed(2)}M TL
                </span>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex justify-between text-sm text-slate-600 mb-2">
                  <span>Başarı Olasılığı</span>
                  <span>{mockNegotiationData.successProbability}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${mockNegotiationData.successProbability}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Clock className="text-orange-500" size={16} />
                <span className="text-slate-600">
                  Kalan Süre: {mockNegotiationData.timeRemaining}
                </span>
              </div>
            </div>
          </div>

          {/* Önerilen Stratejiler */}
          <div className="negotiator-card bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Lightbulb className="text-yellow-600" size={24} />
              Önerilen Taktikler
            </h3>

            <div className="space-y-3">
              {negotiationTactics.map((tactic, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border border-slate-200 hover:border-slate-300 transition-all duration-300 cursor-pointer hover:shadow-md"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className={`w-8 h-8 rounded-lg bg-gradient-to-r ${tactic.color} p-2 flex items-center justify-center`}
                    >
                      <tactic.icon className="text-white" size={16} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900 text-sm">{tactic.title}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-600">
                          Başarı: {tactic.successRate}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{tactic.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sağ Panel - Canlı Müzakere Chat */}
        <div className="lg:col-span-2">
          <div className="negotiator-card bg-white rounded-2xl shadow-xl border border-slate-200 h-[600px] flex flex-col">
            {/* Chat Header */}
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="text-blue-600" size={24} />
                Canlı Müzakere Asistanı
              </h3>
              <p className="text-slate-600 text-sm mt-1">
                AI size gerçek zamanlı müzakere önerileri sunuyor
              </p>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.sender === 'admin' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.sender !== 'admin' && (
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        message.sender === 'ai' ? 'bg-purple-100' : 'bg-blue-100'
                      }`}
                    >
                      {message.sender === 'ai' ? (
                        <Brain className="text-purple-600" size={16} />
                      ) : (
                        <User className="text-blue-600" size={16} />
                      )}
                    </div>
                  )}

                  <div
                    className={`max-w-xs lg:max-w-md ${
                      message.sender === 'admin' ? 'order-first' : ''
                    }`}
                  >
                    <div
                      className={`rounded-2xl p-4 ${
                        message.sender === 'admin'
                          ? 'bg-blue-600 text-white'
                          : message.sender === 'ai'
                            ? 'bg-purple-50 text-purple-900 border border-purple-200'
                            : 'bg-slate-50 text-slate-900 border border-slate-200'
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{message.message}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span
                          className={`text-xs ${
                            message.sender === 'admin' ? 'text-blue-100' : 'text-slate-500'
                          }`}
                        >
                          {message.timestamp}
                        </span>
                        {message.type === 'analysis' && (
                          <div className="flex items-center gap-1">
                            <Brain size={12} className="text-purple-500" />
                            <span className="text-xs text-purple-600">AI Analiz</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {message.sender === 'admin' && (
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="text-blue-600" size={16} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <div className="p-6 border-t border-slate-200">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Müzakere mesajınızı yazın..."
                  className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={sendMessage}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all duration-300 flex items-center gap-2"
                >
                  <Send size={16} />
                  Gönder
                </button>
              </div>

              <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  AI Asistan Aktif
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle size={12} className="text-green-500" />
                  Güvenli Bağlantı
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alt Panel - Hızlı Aksiyonlar */}
      <div className="negotiator-card bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 rounded-2xl p-8 text-white">
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold mb-2">🎯 Hızlı Müzakere Aksiyonları</h3>
          <p className="text-slate-300">Tek tıkla profesyonel müzakere stratejilerini uygulayın</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            type="button"
            className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 hover:bg-white/20 transition-all duration-300 text-left"
          >
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="text-green-400" size={20} />
              <span className="font-semibold">Karşı Teklif Oluştur</span>
            </div>
            <p className="text-sm text-slate-300">AI ile optimal karşı teklif hesapla</p>
          </button>

          <button
            type="button"
            className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 hover:bg-white/20 transition-all duration-300 text-left"
          >
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="text-blue-400" size={20} />
              <span className="font-semibold">Piyasa Analizi</span>
            </div>
            <p className="text-sm text-slate-300">Güncel piyasa verilerini analiz et</p>
          </button>

          <button
            type="button"
            className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 hover:bg-white/20 transition-all duration-300 text-left"
          >
            <div className="flex items-center gap-3 mb-2">
              <Brain className="text-purple-400" size={20} />
              <span className="font-semibold">Strateji Öner</span>
            </div>
            <p className="text-sm text-slate-300">Duruma özel müzakere stratejisi</p>
          </button>
        </div>
      </div>
    </div>
  )
}
