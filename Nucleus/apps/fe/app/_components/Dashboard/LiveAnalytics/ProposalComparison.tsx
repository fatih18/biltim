'use client'

import {
  AlertCircle,
  BarChart3,
  CheckCircle,
  Download,
  Eye,
  FileText,
  TrendingUp,
} from 'lucide-react'
import { useState } from 'react'
import { ProposalDetailModal } from './ProposalDetailModal'
import type { Proposal, ProposalComparisonProps } from './types'

export function ProposalComparison({
  selectedProposals,
  proposals,
  onClearSelection,
  onCompare,
}: ProposalComparisonProps) {
  const [showQuickView, setShowQuickView] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  if (selectedProposals.length === 0) return null

  // Seçili teklifleri bul
  const selectedProposalData = proposals.filter((p) => selectedProposals.includes(p.id))

  // İstatistikleri hesapla
  const averageScore =
    selectedProposalData.length > 0
      ? Math.round(
          selectedProposalData.reduce((acc, p) => acc + p.score, 0) / selectedProposalData.length
        )
      : 0

  const totalAmount = selectedProposalData.reduce((acc, p) => acc + p.amount, 0)

  const bestScore =
    selectedProposalData.length > 0 ? Math.max(...selectedProposalData.map((p) => p.score)) : 0

  const handleViewDetails = (proposal: Proposal) => {
    setSelectedProposal(proposal)
    setShowDetailModal(true)
  }

  const handleExportReport = async () => {
    setIsExporting(true)
    // Simüle export işlemi
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsExporting(false)
    alert(`${selectedProposals.length} teklif için rapor oluşturuldu!`)
  }

  const handleQuickView = () => {
    setShowQuickView(!showQuickView)
  }

  return (
    <div className="comparator-card bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-2xl p-6 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-slate-600 to-slate-700 rounded-xl flex items-center justify-center shadow-lg">
            <CheckCircle className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">
              {selectedProposals.length} teklif seçildi
            </h3>
            <p className="text-sm text-slate-600">
              Seçili teklifleri karşılaştırabilir veya toplu işlem yapabilirsiniz
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCompare}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg hover:from-slate-700 hover:to-slate-800 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105"
          >
            <BarChart3 size={16} />
            Detaylı Karşılaştır
          </button>

          <button
            type="button"
            onClick={handleQuickView}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 ${
              showQuickView
                ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-white'
                : 'bg-gradient-to-r from-slate-500 to-slate-600 text-white hover:from-slate-600 hover:to-slate-700'
            }`}
          >
            <Eye size={16} />
            {showQuickView ? 'Görünümü Kapat' : 'Hızlı Görünüm'}
          </button>

          <button
            type="button"
            onClick={handleExportReport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-500 to-slate-600 text-white rounded-lg hover:from-slate-600 hover:to-slate-700 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Hazırlanıyor...
              </>
            ) : (
              <>
                <Download size={16} />
                Rapor Al
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClearSelection}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200 hover:scale-105"
          >
            Temizle
          </button>
        </div>
      </div>

      {/* Hızlı İstatistikler */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-blue-200">
          <div className="text-xs text-blue-600 font-medium">Seçili Teklifler</div>
          <div className="text-lg font-bold text-blue-900">{selectedProposals.length}</div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-green-200">
          <div className="text-xs text-green-600 font-medium">Ortalama Puan</div>
          <div className="text-lg font-bold text-green-900">{averageScore}</div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-purple-200">
          <div className="text-xs text-purple-600 font-medium">Toplam Tutar</div>
          <div className="text-lg font-bold text-purple-900">
            {totalAmount > 0 ? `${(totalAmount / 1000000).toFixed(1)}M TL` : '0M TL'}
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-orange-200">
          <div className="text-xs text-orange-600 font-medium">En İyi Puan</div>
          <div className="text-lg font-bold text-orange-900">{bestScore}</div>
        </div>
      </div>

      {/* Hızlı Görünüm Modal */}
      {showQuickView && (
        <div className="mt-6 bg-white rounded-xl border border-blue-200 shadow-lg">
          <div className="p-4 border-b border-blue-100">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Eye className="text-blue-600" size={20} />
                Seçili Teklifler - Hızlı Görünüm
              </h4>
              <button
                type="button"
                onClick={() => setShowQuickView(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <AlertCircle className="text-gray-500" size={16} />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedProposalData.map((proposal, index) => (
                <div
                  key={proposal.id}
                  className="bg-slate-50 rounded-lg p-4 border border-slate-200"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-slate-600">{proposal.vendor}</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                      #{index + 1}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Durum:</span>
                      <span className="font-medium text-slate-900">
                        {proposal.status === 'pending'
                          ? 'Beklemede'
                          : proposal.status === 'under-review'
                            ? 'İnceleniyor'
                            : proposal.status === 'approved'
                              ? 'Onaylandı'
                              : 'Reddedildi'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Puan:</span>
                      <span className="font-medium text-slate-900">{proposal.score}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Risk:</span>
                      <span className="font-medium text-slate-900">
                        {proposal.riskLevel === 'low'
                          ? 'Düşük'
                          : proposal.riskLevel === 'medium'
                            ? 'Orta'
                            : 'Yüksek'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Tutar:</span>
                      <span className="font-medium text-slate-900">
                        {(proposal.amount / 1000000).toFixed(1)}M TL
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => handleViewDetails(proposal)}
                      className="w-full px-3 py-2 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg hover:from-slate-700 hover:to-slate-800 transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg hover:scale-105"
                    >
                      Detayları Görüntüle
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {selectedProposals.length > 3 && (
              <div className="text-center py-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
                  <TrendingUp size={16} />
                  <span className="text-sm font-medium">
                    {selectedProposals.length - 3} teklif daha var
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-4 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onCompare}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105"
              >
                <BarChart3 size={18} />
                Detaylı Karşılaştırmaya Git
              </button>

              <button
                type="button"
                onClick={handleExportReport}
                disabled={isExporting}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Hazırlanıyor...
                  </>
                ) : (
                  <>
                    <FileText size={18} />
                    Rapor Oluştur
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedProposal && (
        <ProposalDetailModal
          proposal={selectedProposal}
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false)
            setSelectedProposal(null)
          }}
        />
      )}
    </div>
  )
}
