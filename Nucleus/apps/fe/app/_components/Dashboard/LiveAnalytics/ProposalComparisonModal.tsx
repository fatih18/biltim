'use client'

import {
  Award,
  BarChart3,
  Clock,
  DollarSign,
  Shield,
  Star,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Proposal } from './types'

interface ProposalComparisonModalProps {
  proposals: Proposal[]
  selectedIds: string[]
  isOpen: boolean
  onClose: () => void
}

export function ProposalComparisonModal({
  proposals,
  selectedIds,
  isOpen,
  onClose,
}: ProposalComparisonModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!isOpen || !mounted) return null

  const selectedProposals = proposals.filter((p) => selectedIds.includes(p.id))

  const handleSelectBest = () => {
    const bestProposal = selectedProposals.reduce((best, current) =>
      current.score > best.score ? current : best
    )
    alert(`✅ En iyi teklif seçildi: ${bestProposal.vendor} (${bestProposal.score} puan)`)
    onClose()
  }

  const handleSelectCheapest = () => {
    const cheapestProposal = selectedProposals.reduce((best, current) =>
      current.amount < best.amount ? current : best
    )
    alert(
      `💰 En ekonomik teklif seçildi: ${cheapestProposal.vendor} (${(cheapestProposal.amount / 1000000).toFixed(1)}M TL)`
    )
    onClose()
  }

  const handleSelectFastest = () => {
    const fastestProposal = selectedProposals.reduce((best, current) =>
      current.deliveryTime < best.deliveryTime ? current : best
    )
    alert(
      `⚡ En hızlı teslimat seçildi: ${fastestProposal.vendor} (${fastestProposal.deliveryTime} gün)`
    )
    onClose()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'under-review':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'pending':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'bg-green-100 text-green-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'high':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getBestValue = (field: keyof Proposal, proposals: Proposal[]) => {
    if (field === 'amount' || field === 'deliveryTime') {
      return Math.min(...proposals.map((p) => p[field] as number))
    }
    if (
      field === 'score' ||
      field === 'technicalScore' ||
      field === 'financialScore' ||
      field === 'complianceScore' ||
      field === 'warranty'
    ) {
      return Math.max(...proposals.map((p) => p[field] as number))
    }
    return null
  }

  const isBestValue = (value: number, field: keyof Proposal, proposals: Proposal[]) => {
    const bestValue = getBestValue(field, proposals)
    return bestValue !== null && value === bestValue
  }

  const modalContent = (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] overflow-y-auto">
      <div className="min-h-screen flex items-start justify-center p-4 pt-16 pb-16">
        <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-none overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BarChart3 size={28} />
                <div>
                  <h2 className="text-2xl font-bold">Detaylı Teklif Karşılaştırması</h2>
                  <p className="text-slate-300 mt-1">
                    {selectedProposals.length} teklif karşılaştırılıyor
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {selectedProposals.length === 0 ? (
              <div className="text-center py-12">
                <BarChart3 className="mx-auto text-slate-400 mb-4" size={64} />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  Karşılaştırılacak Teklif Seçilmedi
                </h3>
                <p className="text-slate-600">Karşılaştırma yapmak için en az 2 teklif seçin.</p>
              </div>
            ) : selectedProposals.length === 1 ? (
              <div className="text-center py-12">
                <BarChart3 className="mx-auto text-slate-400 mb-4" size={64} />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Tek Teklif Seçildi</h3>
                <p className="text-slate-600">Karşılaştırma yapmak için en az 2 teklif seçin.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Özet Karşılaştırma */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Award className="text-blue-600" size={20} />
                    Hızlı Karşılaştırma Özeti
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-blue-100">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {Math.max(...selectedProposals.map((p) => p.score))}
                        </div>
                        <div className="text-sm text-slate-600">En Yüksek Puan</div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-green-100">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {(Math.min(...selectedProposals.map((p) => p.amount)) / 1000000).toFixed(
                            1
                          )}
                          M
                        </div>
                        <div className="text-sm text-slate-600">En Düşük Fiyat</div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-orange-100">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {Math.min(...selectedProposals.map((p) => p.deliveryTime))}
                        </div>
                        <div className="text-sm text-slate-600">En Hızlı Teslimat</div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-purple-100">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {selectedProposals.filter((p) => p.riskLevel === 'low').length}
                        </div>
                        <div className="text-sm text-slate-600">Düşük Riskli</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detaylı Karşılaştırma Tablosu */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-4 text-left font-semibold text-slate-900 sticky left-0 bg-slate-50 z-10">
                            Kriter
                          </th>
                          {selectedProposals.map((proposal) => (
                            <th
                              key={proposal.id}
                              className="px-6 py-4 text-center font-semibold text-slate-900 min-w-[200px]"
                            >
                              <div className="space-y-1">
                                <div className="font-bold">{proposal.vendor}</div>
                                <div className="text-xs text-slate-600 font-normal">
                                  {proposal.rfpTitle}
                                </div>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {/* Genel Puan */}
                        <tr className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-medium text-slate-900 sticky left-0 bg-white z-10">
                            <div className="flex items-center gap-2">
                              <Star className="text-yellow-600" size={16} />
                              Genel Puan
                            </div>
                          </td>
                          {selectedProposals.map((proposal) => (
                            <td key={proposal.id} className="px-6 py-4 text-center">
                              <div
                                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-lg ${
                                  isBestValue(proposal.score, 'score', selectedProposals)
                                    ? 'bg-green-100 text-green-800 ring-2 ring-green-300'
                                    : 'bg-slate-100 text-slate-800'
                                }`}
                              >
                                {isBestValue(proposal.score, 'score', selectedProposals) && (
                                  <Award size={16} />
                                )}
                                {proposal.score}
                              </div>
                            </td>
                          ))}
                        </tr>

                        {/* Teklif Tutarı */}
                        <tr className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-medium text-slate-900 sticky left-0 bg-white z-10">
                            <div className="flex items-center gap-2">
                              <DollarSign className="text-green-600" size={16} />
                              Teklif Tutarı
                            </div>
                          </td>
                          {selectedProposals.map((proposal) => (
                            <td key={proposal.id} className="px-6 py-4 text-center">
                              <div
                                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg font-bold ${
                                  isBestValue(proposal.amount, 'amount', selectedProposals)
                                    ? 'bg-green-100 text-green-800 ring-2 ring-green-300'
                                    : 'bg-slate-100 text-slate-800'
                                }`}
                              >
                                {isBestValue(proposal.amount, 'amount', selectedProposals) && (
                                  <TrendingDown size={16} />
                                )}
                                {(proposal.amount / 1000000).toFixed(2)}M TL
                              </div>
                            </td>
                          ))}
                        </tr>

                        {/* Teslimat Süresi */}
                        <tr className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-medium text-slate-900 sticky left-0 bg-white z-10">
                            <div className="flex items-center gap-2">
                              <Clock className="text-orange-600" size={16} />
                              Teslimat Süresi
                            </div>
                          </td>
                          {selectedProposals.map((proposal) => (
                            <td key={proposal.id} className="px-6 py-4 text-center">
                              <div
                                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg font-bold ${
                                  isBestValue(
                                    proposal.deliveryTime,
                                    'deliveryTime',
                                    selectedProposals
                                  )
                                    ? 'bg-green-100 text-green-800 ring-2 ring-green-300'
                                    : 'bg-slate-100 text-slate-800'
                                }`}
                              >
                                {isBestValue(
                                  proposal.deliveryTime,
                                  'deliveryTime',
                                  selectedProposals
                                ) && <TrendingUp size={16} />}
                                {proposal.deliveryTime} gün
                              </div>
                            </td>
                          ))}
                        </tr>

                        {/* Risk Seviyesi */}
                        <tr className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-medium text-slate-900 sticky left-0 bg-white z-10">
                            <div className="flex items-center gap-2">
                              <Shield className="text-purple-600" size={16} />
                              Risk Seviyesi
                            </div>
                          </td>
                          {selectedProposals.map((proposal) => (
                            <td key={proposal.id} className="px-6 py-4 text-center">
                              <span
                                className={`px-3 py-2 rounded-lg text-sm font-medium ${getRiskColor(proposal.riskLevel)}`}
                              >
                                {proposal.riskLevel === 'low'
                                  ? 'Düşük'
                                  : proposal.riskLevel === 'medium'
                                    ? 'Orta'
                                    : 'Yüksek'}
                              </span>
                            </td>
                          ))}
                        </tr>

                        {/* Durum */}
                        <tr className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-medium text-slate-900 sticky left-0 bg-white z-10">
                            Durum
                          </td>
                          {selectedProposals.map((proposal) => (
                            <td key={proposal.id} className="px-6 py-4 text-center">
                              <span
                                className={`px-3 py-2 rounded-lg text-sm font-medium border ${getStatusColor(proposal.status)}`}
                              >
                                {proposal.status === 'pending'
                                  ? 'Beklemede'
                                  : proposal.status === 'under-review'
                                    ? 'İnceleniyor'
                                    : proposal.status === 'approved'
                                      ? 'Onaylandı'
                                      : 'Reddedildi'}
                              </span>
                            </td>
                          ))}
                        </tr>

                        {/* Teknik Puan */}
                        <tr className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-medium text-slate-900 sticky left-0 bg-white z-10">
                            Teknik Puan
                          </td>
                          {selectedProposals.map((proposal) => (
                            <td key={proposal.id} className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-16 bg-slate-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-500 h-2 rounded-full"
                                    style={{ width: `${proposal.technicalScore}%` }}
                                  ></div>
                                </div>
                                <span className="font-medium text-slate-900">
                                  {proposal.technicalScore}
                                </span>
                              </div>
                            </td>
                          ))}
                        </tr>

                        {/* Mali Puan */}
                        <tr className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-medium text-slate-900 sticky left-0 bg-white z-10">
                            Mali Puan
                          </td>
                          {selectedProposals.map((proposal) => (
                            <td key={proposal.id} className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-16 bg-slate-200 rounded-full h-2">
                                  <div
                                    className="bg-green-500 h-2 rounded-full"
                                    style={{ width: `${proposal.financialScore}%` }}
                                  ></div>
                                </div>
                                <span className="font-medium text-slate-900">
                                  {proposal.financialScore}
                                </span>
                              </div>
                            </td>
                          ))}
                        </tr>

                        {/* Uyumluluk Puanı */}
                        <tr className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-medium text-slate-900 sticky left-0 bg-white z-10">
                            Uyumluluk Puanı
                          </td>
                          {selectedProposals.map((proposal) => (
                            <td key={proposal.id} className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-16 bg-slate-200 rounded-full h-2">
                                  <div
                                    className="bg-purple-500 h-2 rounded-full"
                                    style={{ width: `${proposal.complianceScore}%` }}
                                  ></div>
                                </div>
                                <span className="font-medium text-slate-900">
                                  {proposal.complianceScore}
                                </span>
                              </div>
                            </td>
                          ))}
                        </tr>

                        {/* Garanti Süresi */}
                        <tr className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-medium text-slate-900 sticky left-0 bg-white z-10">
                            Garanti Süresi
                          </td>
                          {selectedProposals.map((proposal) => (
                            <td key={proposal.id} className="px-6 py-4 text-center">
                              <div
                                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg font-bold ${
                                  isBestValue(proposal.warranty, 'warranty', selectedProposals)
                                    ? 'bg-green-100 text-green-800 ring-2 ring-green-300'
                                    : 'bg-slate-100 text-slate-800'
                                }`}
                              >
                                {isBestValue(proposal.warranty, 'warranty', selectedProposals) && (
                                  <Award size={16} />
                                )}
                                {proposal.warranty} ay
                              </div>
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Öneriler */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <TrendingUp className="text-green-600" size={20} />
                    AI Önerileri
                  </h3>

                  <div className="space-y-3">
                    {selectedProposals.length > 0 && (
                      <>
                        <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-green-200">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-green-900">
                              En İyi Genel Performans
                            </h4>
                            <p className="text-green-800 text-sm mt-1">
                              <strong>
                                {
                                  selectedProposals.reduce((best, current) =>
                                    current.score > best.score ? current : best
                                  ).vendor
                                }
                              </strong>{' '}
                              en yüksek genel puana sahip (
                              {Math.max(...selectedProposals.map((p) => p.score))} puan)
                            </p>
                            <button
                              type="button"
                              onClick={handleSelectBest}
                              className="mt-2 px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors"
                            >
                              Bu Teklifi Seç
                            </button>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-green-200">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-blue-900">En Ekonomik Seçenek</h4>
                            <p className="text-blue-800 text-sm mt-1">
                              <strong>
                                {
                                  selectedProposals.reduce((best, current) =>
                                    current.amount < best.amount ? current : best
                                  ).vendor
                                }
                              </strong>{' '}
                              en düşük fiyat teklifi (
                              {(
                                Math.min(...selectedProposals.map((p) => p.amount)) / 1000000
                              ).toFixed(2)}
                              M TL)
                            </p>
                            <button
                              type="button"
                              onClick={handleSelectCheapest}
                              className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Bu Teklifi Seç
                            </button>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-green-200">
                          <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-orange-900">En Hızlı Teslimat</h4>
                            <p className="text-orange-800 text-sm mt-1">
                              <strong>
                                {
                                  selectedProposals.reduce((best, current) =>
                                    current.deliveryTime < best.deliveryTime ? current : best
                                  ).vendor
                                }
                              </strong>{' '}
                              en hızlı teslimat süresi (
                              {Math.min(...selectedProposals.map((p) => p.deliveryTime))} gün)
                            </p>
                            <button
                              type="button"
                              onClick={handleSelectFastest}
                              className="mt-2 px-3 py-1 bg-orange-600 text-white text-xs rounded-lg hover:bg-orange-700 transition-colors"
                            >
                              Bu Teklifi Seç
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
