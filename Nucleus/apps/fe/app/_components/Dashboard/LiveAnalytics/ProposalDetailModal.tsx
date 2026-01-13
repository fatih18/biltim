'use client'

import { Award, Clock, DollarSign, FileText, Shield, Star, Users, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Proposal } from './types'

interface ProposalDetailModalProps {
  proposal: Proposal | null
  isOpen: boolean
  isEditMode?: boolean
  onClose: () => void
}

export function ProposalDetailModal({
  proposal,
  isOpen,
  isEditMode = false,
  onClose,
}: ProposalDetailModalProps) {
  const [mounted, setMounted] = useState(false)
  const [editData, setEditData] = useState<Proposal | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (proposal && isEditMode) {
      setEditData({ ...proposal })
    } else {
      setEditData(null)
    }
  }, [proposal, isEditMode])

  if (!isOpen || !proposal || !mounted) return null

  const handleApprove = () => {
    alert(`✅ ${proposal.vendor} teklifi onaylandı!`)
    onClose()
  }

  const handleReview = () => {
    alert(`🔍 ${proposal.vendor} teklifi incelemeye alındı!`)
    onClose()
  }

  const handleReject = () => {
    alert(`❌ ${proposal.vendor} teklifi reddedildi!`)
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
        return 'bg-green-100 text-green-800 border-green-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const modalContent = (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] overflow-y-auto">
      <div className="min-h-screen flex items-start justify-center p-4 pt-16 pb-16">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-none overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  {isEditMode ? '✏️ ' : ''}
                  {proposal.vendor}
                </h2>
                <p className="text-slate-300 mt-1">
                  {isEditMode ? 'Düzenleme Modu - ' : ''}
                  {proposal.rfpTitle}
                </p>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Sol Kolon */}
              <div className="space-y-6">
                {/* Temel Bilgiler */}
                <div className="bg-slate-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <FileText className="text-blue-600" size={20} />
                    Temel Bilgiler
                  </h3>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Teklif Tutarı:</span>
                      <div className="flex items-center gap-2">
                        <DollarSign className="text-green-600" size={16} />
                        {isEditMode && editData ? (
                          <input
                            type="number"
                            value={editData.amount}
                            onChange={(e) =>
                              setEditData({ ...editData, amount: Number(e.target.value) })
                            }
                            className="font-bold text-slate-900 bg-white border border-slate-300 rounded px-2 py-1 w-32 text-right"
                          />
                        ) : (
                          <span className="font-bold text-slate-900">
                            {(proposal.amount / 1000000).toFixed(2)}M TL
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Durum:</span>
                      {isEditMode && editData ? (
                        <select
                          value={editData.status}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              status: e.target.value as
                                | 'pending'
                                | 'under-review'
                                | 'approved'
                                | 'rejected',
                            })
                          }
                          className="px-3 py-1 rounded-lg text-sm font-medium border border-slate-300 bg-white"
                        >
                          <option value="pending">Beklemede</option>
                          <option value="under-review">İnceleniyor</option>
                          <option value="approved">Onaylandı</option>
                          <option value="rejected">Reddedildi</option>
                        </select>
                      ) : (
                        <span
                          className={`px-3 py-1 rounded-lg text-sm font-medium border ${getStatusColor(proposal.status)}`}
                        >
                          {proposal.status === 'pending'
                            ? 'Beklemede'
                            : proposal.status === 'under-review'
                              ? 'İnceleniyor'
                              : proposal.status === 'approved'
                                ? 'Onaylandı'
                                : 'Reddedildi'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Risk Seviyesi:</span>
                      {isEditMode && editData ? (
                        <select
                          value={editData.riskLevel}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              riskLevel: e.target.value as 'low' | 'medium' | 'high',
                            })
                          }
                          className="px-3 py-1 rounded-lg text-sm font-medium border border-slate-300 bg-white"
                        >
                          <option value="low">Düşük</option>
                          <option value="medium">Orta</option>
                          <option value="high">Yüksek</option>
                        </select>
                      ) : (
                        <span
                          className={`px-3 py-1 rounded-lg text-sm font-medium border ${getRiskColor(proposal.riskLevel)}`}
                        >
                          <div className="flex items-center gap-1">
                            <Shield size={12} />
                            {proposal.riskLevel === 'low'
                              ? 'Düşük'
                              : proposal.riskLevel === 'medium'
                                ? 'Orta'
                                : 'Yüksek'}
                          </div>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Teslimat Süresi:</span>
                      <div className="flex items-center gap-2">
                        <Clock className="text-orange-600" size={16} />
                        {isEditMode && editData ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={editData.deliveryTime}
                              onChange={(e) =>
                                setEditData({ ...editData, deliveryTime: Number(e.target.value) })
                              }
                              className="font-medium text-slate-900 bg-white border border-slate-300 rounded px-2 py-1 w-20 text-right"
                            />
                            <span className="text-slate-600">gün</span>
                          </div>
                        ) : (
                          <span className="font-medium text-slate-900">
                            {proposal.deliveryTime} gün
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Garanti Süresi:</span>
                      <div className="flex items-center gap-2">
                        <Award className="text-purple-600" size={16} />
                        {isEditMode && editData ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={editData.warranty}
                              onChange={(e) =>
                                setEditData({ ...editData, warranty: Number(e.target.value) })
                              }
                              className="font-medium text-slate-900 bg-white border border-slate-300 rounded px-2 py-1 w-20 text-right"
                            />
                            <span className="text-slate-600">ay</span>
                          </div>
                        ) : (
                          <span className="font-medium text-slate-900">{proposal.warranty} ay</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Puan Detayları */}
                <div className="bg-slate-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Star className="text-yellow-600" size={20} />
                    Puan Detayları
                  </h3>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Genel Puan:</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                            style={{ width: `${proposal.score}%` }}
                          ></div>
                        </div>
                        <span className="font-bold text-slate-900 text-lg">{proposal.score}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Teknik Puan:</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${proposal.technicalScore}%` }}
                          ></div>
                        </div>
                        <span className="font-medium text-slate-900">
                          {proposal.technicalScore}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Mali Puan:</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${proposal.financialScore}%` }}
                          ></div>
                        </div>
                        <span className="font-medium text-slate-900">
                          {proposal.financialScore}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Uyumluluk Puanı:</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-purple-500 h-2 rounded-full"
                            style={{ width: `${proposal.complianceScore}%` }}
                          ></div>
                        </div>
                        <span className="font-medium text-slate-900">
                          {proposal.complianceScore}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sağ Kolon */}
              <div className="space-y-6">
                {/* Özet Kartı */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Teklif Özeti</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-white rounded-lg border border-blue-100">
                      <div className="text-2xl font-bold text-blue-600">{proposal.score}</div>
                      <div className="text-sm text-slate-600">Genel Puan</div>
                    </div>

                    <div className="text-center p-4 bg-white rounded-lg border border-green-100">
                      <div className="text-2xl font-bold text-green-600">
                        {(proposal.amount / 1000000).toFixed(1)}M
                      </div>
                      <div className="text-sm text-slate-600">Teklif Tutarı</div>
                    </div>

                    <div className="text-center p-4 bg-white rounded-lg border border-orange-100">
                      <div className="text-2xl font-bold text-orange-600">
                        {proposal.deliveryTime}
                      </div>
                      <div className="text-sm text-slate-600">Gün Teslimat</div>
                    </div>

                    <div className="text-center p-4 bg-white rounded-lg border border-purple-100">
                      <div className="text-2xl font-bold text-purple-600">{proposal.warranty}</div>
                      <div className="text-sm text-slate-600">Ay Garanti</div>
                    </div>
                  </div>
                </div>

                {/* Aksiyon Butonları */}
                <div className="bg-slate-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    {isEditMode ? 'Düzenleme Aksiyonları' : 'Hızlı Aksiyonlar'}
                  </h3>

                  <div className="grid grid-cols-1 gap-3">
                    {isEditMode ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            if (editData) {
                              alert(
                                `💾 ${editData.vendor} teklifi kaydedildi!\n\nDeğişiklikler:\n- Tutar: ${(editData.amount / 1000000).toFixed(1)}M TL\n- Durum: ${editData.status}\n- Risk: ${editData.riskLevel}\n- Teslimat: ${editData.deliveryTime} gün\n- Garanti: ${editData.warranty} ay`
                              )
                            }
                            onClose()
                          }}
                          className="flex items-center gap-3 p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 hover:scale-105 hover:shadow-lg"
                        >
                          <FileText size={20} />
                          <div className="text-left">
                            <div className="font-medium">Değişiklikleri Kaydet</div>
                            <div className="text-sm text-blue-100">Düzenlemeleri kaydet</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={onClose}
                          className="flex items-center gap-3 p-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200 hover:scale-105 hover:shadow-lg"
                        >
                          <X size={20} />
                          <div className="text-left">
                            <div className="font-medium">İptal Et</div>
                            <div className="text-sm text-gray-100">Değişiklikleri kaydetme</div>
                          </div>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={handleApprove}
                          className="flex items-center gap-3 p-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 hover:scale-105 hover:shadow-lg"
                        >
                          <Award size={20} />
                          <div className="text-left">
                            <div className="font-medium">Teklifi Onayla</div>
                            <div className="text-sm text-green-100">Bu teklifi kabul et</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={handleReview}
                          className="flex items-center gap-3 p-4 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-all duration-200 hover:scale-105 hover:shadow-lg"
                        >
                          <Clock size={20} />
                          <div className="text-left">
                            <div className="font-medium">İncelemeye Al</div>
                            <div className="text-sm text-yellow-100">Detaylı değerlendirme yap</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={handleReject}
                          className="flex items-center gap-3 p-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 hover:scale-105 hover:shadow-lg"
                        >
                          <X size={20} />
                          <div className="text-left">
                            <div className="font-medium">Teklifi Reddet</div>
                            <div className="text-sm text-red-100">Bu teklifi kabul etme</div>
                          </div>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Ek Bilgiler */}
                <div className="bg-slate-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Users className="text-indigo-600" size={20} />
                    Ek Bilgiler
                  </h3>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Teklif ID:</span>
                      <span className="font-medium text-slate-900">{proposal.id}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-600">Para Birimi:</span>
                      <span className="font-medium text-slate-900">{proposal.currency}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-600">Son Güncelleme:</span>
                      <span className="font-medium text-slate-900">
                        {new Date().toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
