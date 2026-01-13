'use client'

import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { Activity, Bell, Brain, Shield, Users } from 'lucide-react'
import { useRef, useState } from 'react'
import { AIInsights } from '@/app/_components/Dashboard/AIInsights'
import { KPICards } from '@/app/_components/Dashboard/KPICards'
import { LiveAnalytics } from '@/app/_components/Dashboard/LiveAnalytics'
import { PerformanceMetrics } from '@/app/_components/Dashboard/PerformanceMetrics'
import { ProposalTable } from '@/app/_components/Dashboard/ProposalTable'
import { RFPTable } from '@/app/_components/Dashboard/RFPTable'

gsap.registerPlugin(useGSAP)

// Mock Data

const mockRFPs = [
  {
    id: 'rfp-1',
    projectId: 'prj-1',
    title: 'Akıllı Sayaç Donanım Alımı - Faz 1',
    status: 'active',
    deadline: '2024-02-15',
    proposals: 12,
    budget: 4500000,
    category: 'Cihaz',
    customerType: 'Yeni',
    currency: 'TRY',
    aiScore: 94,
    complianceRate: 87,
    riskLevel: 'low',
    estimatedSavings: 450000,
    requirements: [
      'ISO 27001 sertifikası',
      'SLA %99.9 garanti',
      '90 gün teslim süresi',
      'Detaylı parça listesi',
      'Kapsamlı eğitim programı',
    ],
    invitedVendors: ['TechCorp A.Ş.', 'SmartMeter Ltd.', 'Dijital Çözümler A.Ş.'],
    createdDate: '2024-01-10',
    lastActivity: '2024-01-20',
  },
  {
    id: 'rfp-2',
    projectId: 'prj-1',
    title: 'Sayaç Kurulum ve Bakım Hizmetleri',
    status: 'review',
    deadline: '2024-02-20',
    proposals: 8,
    budget: 2800000,
    category: 'Hizmet',
    customerType: 'Mevcut',
    currency: 'TRY',
    aiScore: 88,
    complianceRate: 92,
    riskLevel: 'medium',
    estimatedSavings: 280000,
    requirements: [
      'Saha ekip planı',
      '24 ay garanti',
      'Acil müdahale 4 saat',
      'Eğitim ve dokümantasyon',
    ],
    invitedVendors: ['ServisPro A.Ş.', 'TechCorp A.Ş.', 'Bakım Uzmanları Ltd.'],
    createdDate: '2024-01-12',
    lastActivity: '2024-01-22',
  },
  {
    id: 'rfp-3',
    projectId: 'prj-2',
    title: 'Bulut Altyapı Migrasyonu',
    status: 'completed',
    deadline: '2024-01-30',
    proposals: 6,
    budget: 3200000,
    category: 'Proje',
    customerType: 'Yeni',
    currency: 'TRY',
    aiScore: 96,
    complianceRate: 95,
    riskLevel: 'low',
    estimatedSavings: 640000,
    requirements: [
      'AWS/Azure sertifikası',
      'Zero-downtime migration',
      'Güvenlik audit raporu',
      'Performans optimizasyonu',
    ],
    invitedVendors: ['CloudTech A.Ş.', 'Azure Partners', 'Bulut Çözümleri Ltd.'],
    createdDate: '2024-01-05',
    lastActivity: '2024-01-25',
  },
]

const mockProposals = [
  {
    id: 'pp-1',
    rfpId: 'rfp-1',
    rfpTitle: 'Akıllı Sayaç Donanım Alımı - Faz 1',
    vendor: 'TechCorp A.Ş.',
    vendorLogo: '/api/placeholder/40/40',
    amount: 4250000,
    currency: 'TRY',
    status: 'under-review',
    submittedDate: '2024-01-18',
    lastUpdated: '2024-01-22',
    score: 89,
    aiAnalysis: {
      summary: 'Güçlü teknik kapasiteye sahip, rekabetçi fiyatlama. Risk seviyesi düşük.',
      risks: ['Tedarik zinciri bağımlılığı', 'Proje takım kapasitesi'],
      strengths: ['Güçlü referanslar', 'Detaylı teknik dokümantasyon', 'Rekabetçi fiyat'],
      compliance: 94,
      recommendation: 'Önerilen',
    },
    timeline: {
      start: '2024-03-01',
      end: '2024-08-30',
      milestones: [
        { title: 'Tasarım Onayı', date: '2024-03-15' },
        { title: 'Prototip Teslimi', date: '2024-05-01' },
        { title: 'Seri Üretim', date: '2024-06-15' },
        { title: 'Final Teslim', date: '2024-08-30' },
      ],
    },
    versions: 2,
    lastVersion: 'v2.1',
    files: ['teklif-v2.1.pdf', 'teknik-spec.pdf', 'referans-listesi.pdf'],
  },
  {
    id: 'pp-2',
    rfpId: 'rfp-1',
    rfpTitle: 'Akıllı Sayaç Donanım Alımı - Faz 1',
    vendor: 'SmartMeter Ltd.',
    vendorLogo: '/api/placeholder/40/40',
    amount: 4680000,
    currency: 'TRY',
    status: 'needs-revision',
    submittedDate: '2024-01-16',
    lastUpdated: '2024-01-20',
    score: 76,
    aiAnalysis: {
      summary: 'İyi teknik çözüm ancak maliyet yüksek. Bazı gereksinimler net değil.',
      risks: ['Yüksek maliyet', 'Teslim süresi belirsizliği', 'Eğitim planı eksik'],
      strengths: ['İnovatif teknoloji', 'Uluslararası deneyim'],
      compliance: 78,
      recommendation: 'Revizyon Gerekli',
    },
    timeline: {
      start: '2024-04-01',
      end: '2024-10-15',
      milestones: [
        { title: 'Planlama', date: '2024-04-15' },
        { title: 'Geliştirme', date: '2024-07-01' },
        { title: 'Test', date: '2024-09-01' },
        { title: 'Teslim', date: '2024-10-15' },
      ],
    },
    versions: 1,
    lastVersion: 'v1.0',
    files: ['smartmeter-proposal.pdf'],
  },
]

export default function Dashboard() {
  const [userRole, setUserRole] = useState<'admin' | 'vendor'>('admin')
  const [activeTab, setActiveTab] = useState<'overview' | 'ai-insights' | 'live-analytics'>(
    'overview'
  )

  const dashboardRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      gsap.fromTo(
        '.dashboard-header',
        { y: -50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }
      )
    },
    { scope: dashboardRef }
  )

  const handleRoleSwitch = (role: 'admin' | 'vendor') => {
    setUserRole(role)
  }

  // Mock data
  const kpiData = {
    totalProjects: 24,
    activeRFPs: 18,
    totalProposals: 156,
    costSavings: 12500000,
  }

  const metricsData = {
    successRate: 87,
    avgResponseTime: 4.2,
    complianceRate: 91,
  }

  const renderAdminDashboard = () => {
    if (activeTab === 'overview') {
      return (
        <div className="space-y-8">
          <KPICards data={kpiData} userRole={userRole} />
          <PerformanceMetrics data={metricsData} />
          <RFPTable rfps={mockRFPs} />
        </div>
      )
    }

    if (activeTab === 'ai-insights') {
      return <AIInsights />
    }

    if (activeTab === 'live-analytics') {
      return <LiveAnalytics />
    }

    return null
  }

  const renderVendorDashboard = () => {
    return (
      <div className="space-y-8">
        <KPICards data={kpiData} userRole={userRole} />
        <ProposalTable proposals={mockProposals} />
      </div>
    )
  }

  return (
    <div
      ref={dashboardRef}
      className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50"
    >
      <div className="max-w-7xl mx-auto p-6">
        {/* Header with Header component styling */}
        <div className="dashboard-header bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white shadow-xl relative border-b border-slate-600/50 rounded-2xl mb-8 overflow-hidden">
          <div className="absolute inset-0 opacity-5 pointer-events-none">
            <div className="absolute inset-0 bg-grid-pattern"></div>
          </div>

          <div className="relative z-10 px-6 py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-white">RFP Yönetim Merkezi</h1>
                <p className="text-slate-300 mt-1">Akıllı teklif yönetimi ve analiz platformu</p>
              </div>

              {/* Role Switcher with Header styling */}
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm p-1 rounded-xl border border-white/20">
                <button
                  type="button"
                  onClick={() => handleRoleSwitch('admin')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                    userRole === 'admin'
                      ? 'bg-white/20 text-white shadow-lg'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Shield size={16} />
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleSwitch('vendor')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                    userRole === 'vendor'
                      ? 'bg-white/20 text-white shadow-lg'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Users size={16} />
                  Tedarikçi
                </button>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm p-1 rounded-xl border border-white/20 mb-6">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                  activeTab === 'overview'
                    ? 'bg-white/20 text-white shadow-lg'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Activity size={16} />
                Genel Bakış
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ai-insights')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                  activeTab === 'ai-insights'
                    ? 'bg-white/20 text-white shadow-lg'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Brain size={16} />
                AI İçgörüler
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('live-analytics')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                  activeTab === 'live-analytics'
                    ? 'bg-white/20 text-white shadow-lg'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Activity size={16} />
                Canlı Analitik
              </button>
            </div>

            {/* Notifications */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 flex items-center gap-3">
              <Bell className="text-white" size={20} />
              <div className="flex-1">
                <p className="text-white font-medium">Sistem Bildirimleri</p>
                <p className="text-slate-300 text-sm mt-1">
                  {userRole === 'admin'
                    ? '3 yeni teklif AI analizi tamamlandı • 2 RFP için optimizasyon önerisi hazır'
                    : '2 RFP davetiniz son tarihe yaklaşıyor • 1 teklifiniz onay bekliyor'}
                </p>
              </div>
              <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                5
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        {userRole === 'admin' ? renderAdminDashboard() : renderVendorDashboard()}
      </div>
    </div>
  )
}
