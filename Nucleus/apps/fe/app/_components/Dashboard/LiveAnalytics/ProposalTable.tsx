'use client'

import {
  ArrowUpDown,
  Clock,
  DollarSign,
  Edit,
  Eye,
  MoreHorizontal,
  Save,
  Settings,
  Shield,
  Star,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { ProposalDetailModal } from './ProposalDetailModal'
import type { Proposal, ProposalTableProps } from './types'

export function ProposalTable({
  proposals,
  sortField,
  sortDirection,
  onSort,
  selectedProposals,
  onToggleSelection,
  onSelectAll,
  editingScore,
  setEditingScore,
  customScores,
  onUpdateScore,
  onUpdateStatus,
  loadingStates,
  processingAction,
}: ProposalTableProps) {
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null)

  const handleViewDetails = (proposal: Proposal) => {
    setSelectedProposal(proposal)
    setIsEditMode(false)
    setShowDetailModal(true)
  }

  const handleEditProposal = (proposal: Proposal) => {
    // Düzenleme modal'ını aç
    setSelectedProposal(proposal)
    setIsEditMode(true)
    setShowDetailModal(true)
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

  const getDisplayScore = (proposal: Proposal) => {
    return customScores[proposal.id] ?? proposal.score
  }

  const getSortIcon = (field: keyof Proposal) => {
    if (sortField !== field) return <ArrowUpDown size={16} className="text-slate-400" />
    return sortDirection === 'asc' ? (
      <TrendingUp size={16} className="text-blue-600" />
    ) : (
      <TrendingDown size={16} className="text-blue-600" />
    )
  }

  return (
    <div className="comparator-card bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px] table-fixed">
          <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-left w-12">
                <input
                  type="checkbox"
                  onChange={(e) => onSelectAll(e.target.checked)}
                  checked={selectedProposals.length === proposals.length && proposals.length > 0}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th
                className="px-6 py-4 text-left font-semibold text-slate-900 cursor-pointer hover:bg-slate-200/50 transition-colors group w-64"
                onClick={() => onSort('vendor')}
              >
                <div className="flex items-center gap-2">
                  Tedarikçi
                  {getSortIcon('vendor')}
                </div>
              </th>
              <th
                className="px-6 py-4 text-left font-semibold text-slate-900 cursor-pointer hover:bg-slate-200/50 transition-colors group w-32"
                onClick={() => onSort('amount')}
              >
                <div className="flex items-center gap-2">
                  Tutar
                  {getSortIcon('amount')}
                </div>
              </th>
              <th
                className="px-6 py-4 text-left font-semibold text-slate-900 cursor-pointer hover:bg-slate-200/50 transition-colors group w-24"
                onClick={() => onSort('score')}
              >
                <div className="flex items-center gap-2">
                  Puan
                  {getSortIcon('score')}
                </div>
              </th>
              <th className="px-6 py-4 text-left font-semibold text-slate-900 w-40">
                Detay Puanlar
              </th>
              <th className="px-6 py-4 text-left font-semibold text-slate-900 w-32">Durum</th>
              <th className="px-6 py-4 text-center font-semibold text-slate-900 w-24">Risk</th>
              <th
                className="px-6 py-4 text-left font-semibold text-slate-900 cursor-pointer hover:bg-slate-200/50 transition-colors group w-32"
                onClick={() => onSort('deliveryTime')}
              >
                <div className="flex items-center gap-2">
                  Teslimat
                  {getSortIcon('deliveryTime')}
                </div>
              </th>
              <th className="px-6 py-4 text-center font-semibold text-slate-900 w-32">
                Aksiyonlar
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {proposals.map((proposal, index) => (
              <tr
                key={proposal.id}
                className={`hover:bg-slate-50 transition-all duration-200 ${
                  selectedProposals.includes(proposal.id)
                    ? 'bg-blue-50 border-l-4 border-l-blue-500'
                    : ''
                } ${index % 2 === 0 ? 'bg-white' : 'bg-slate-25'}`}
              >
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedProposals.includes(proposal.id)}
                    onChange={() => onToggleSelection(proposal.id)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>

                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {proposal.vendor.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{proposal.vendor}</div>
                      <div className="text-sm text-slate-600">{proposal.rfpTitle}</div>
                    </div>
                  </div>
                </td>

                <td className="px-6 py-4 min-w-[140px]">
                  <div className="flex items-center gap-2">
                    <DollarSign className="text-green-600 flex-shrink-0" size={16} />
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 whitespace-nowrap">
                        {(proposal.amount / 1000000).toFixed(1)}M TL
                      </div>
                      <div className="text-xs text-slate-500 truncate">{proposal.currency}</div>
                    </div>
                  </div>
                </td>

                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {editingScore === proposal.id ? (
                      <div className="flex items-center gap-2">
                        {loadingStates[`${proposal.id}-score`] ? (
                          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            <span className="text-sm text-blue-700 font-medium">
                              Güncelleniyor...
                            </span>
                          </div>
                        ) : (
                          <>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              defaultValue={getDisplayScore(proposal)}
                              className="w-16 px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  const newScore = parseInt(
                                    (e.target as HTMLInputElement).value,
                                    10
                                  )
                                  onUpdateScore(proposal.id, newScore)
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const input = document.querySelector(
                                  `input[defaultValue="${getDisplayScore(proposal)}"]`
                                ) as HTMLInputElement
                                if (input) {
                                  onUpdateScore(proposal.id, parseInt(input.value, 10))
                                }
                              }}
                              className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors hover:scale-110"
                            >
                              <Save size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingScore(null)}
                              className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors hover:scale-110"
                            >
                              <X size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Star className="text-yellow-500" size={16} />
                          <span className="font-bold text-slate-900 text-lg">
                            {getDisplayScore(proposal)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingScore(proposal.id)}
                          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                        >
                          <Edit size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </td>

                <td className="px-6 py-4 min-w-[160px]">
                  <div className="space-y-2">
                    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 text-xs">
                      <span className="text-slate-600 w-11">Teknik:</span>
                      <div className="w-16 bg-slate-200 rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${proposal.technicalScore}%` }}
                        ></div>
                      </div>
                      <span className="font-medium text-slate-900 w-6 text-right tabular-nums">
                        {proposal.technicalScore}
                      </span>
                    </div>
                    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 text-xs">
                      <span className="text-slate-600 w-11">Mali:</span>
                      <div className="w-16 bg-slate-200 rounded-full h-1.5">
                        <div
                          className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${proposal.financialScore}%` }}
                        ></div>
                      </div>
                      <span className="font-medium text-slate-900 w-6 text-right tabular-nums">
                        {proposal.financialScore}
                      </span>
                    </div>
                    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 text-xs">
                      <span className="text-slate-600 w-11">Uyum:</span>
                      <div className="w-16 bg-slate-200 rounded-full h-1.5">
                        <div
                          className="bg-purple-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${proposal.complianceScore}%` }}
                        ></div>
                      </div>
                      <span className="font-medium text-slate-900 w-6 text-right tabular-nums">
                        {proposal.complianceScore}
                      </span>
                    </div>
                  </div>
                </td>

                <td className="px-6 py-4">
                  {loadingStates[proposal.id] ? (
                    <div className="flex items-center gap-2 px-3 py-1 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600"></div>
                      <span className="text-xs text-yellow-700 font-medium">İşleniyor...</span>
                    </div>
                  ) : (
                    <select
                      value={proposal.status}
                      onChange={(e) =>
                        onUpdateStatus(proposal.id, e.target.value as Proposal['status'])
                      }
                      disabled={processingAction === `${proposal.id}-status`}
                      className={`px-3 py-1 rounded-lg text-xs font-medium border ${getStatusColor(proposal.status)} focus:ring-2 focus:ring-blue-500 transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <option value="pending">Beklemede</option>
                      <option value="under-review">İnceleniyor</option>
                      <option value="approved">Onaylandı</option>
                      <option value="rejected">Reddedildi</option>
                    </select>
                  )}
                </td>

                <td className="px-6 py-4">
                  <div className="flex justify-center">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border ${getRiskColor(proposal.riskLevel)} whitespace-nowrap`}
                    >
                      <Shield size={12} className="flex-shrink-0" />
                      {proposal.riskLevel === 'low'
                        ? 'Düşük'
                        : proposal.riskLevel === 'medium'
                          ? 'Orta'
                          : 'Yüksek'}
                    </span>
                  </div>
                </td>

                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Clock className="text-slate-500" size={14} />
                    <div>
                      <span className="font-medium text-slate-900">{proposal.deliveryTime}</span>
                      <span className="text-xs text-slate-600 ml-1">gün</span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{proposal.warranty} ay garanti</div>
                </td>

                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleViewDetails(proposal)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors hover:scale-110"
                      title="Detayları Görüntüle"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditProposal(proposal)}
                      className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors hover:scale-110"
                      title="Düzenle"
                    >
                      <Edit size={16} />
                    </button>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setShowActionMenu(showActionMenu === proposal.id ? null : proposal.id)
                        }
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors hover:scale-110"
                        title="Daha Fazla"
                      >
                        <MoreHorizontal size={16} />
                      </button>

                      {showActionMenu === proposal.id && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[160px]">
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateStatus(proposal.id, 'approved')
                              setShowActionMenu(null)
                            }}
                            disabled={loadingStates[proposal.id]}
                            className="w-full px-4 py-2 text-left text-sm text-green-700 hover:bg-green-50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loadingStates[proposal.id] ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600"></div>
                            ) : (
                              <Star size={14} />
                            )}
                            Onayla
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateStatus(proposal.id, 'under-review')
                              setShowActionMenu(null)
                            }}
                            disabled={loadingStates[proposal.id]}
                            className="w-full px-4 py-2 text-left text-sm text-yellow-700 hover:bg-yellow-50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loadingStates[proposal.id] ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600"></div>
                            ) : (
                              <Clock size={14} />
                            )}
                            İncelemeye Al
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateStatus(proposal.id, 'rejected')
                              setShowActionMenu(null)
                            }}
                            disabled={loadingStates[proposal.id]}
                            className="w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loadingStates[proposal.id] ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                            ) : (
                              <X size={14} />
                            )}
                            Reddet
                          </button>
                          <hr className="my-1" />
                          <button
                            type="button"
                            onClick={() => {
                              alert(`${proposal.vendor} için rapor oluşturuluyor...`)
                              setShowActionMenu(null)
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                          >
                            <Settings size={14} />
                            Rapor Oluştur
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      <ProposalDetailModal
        proposal={selectedProposal}
        isOpen={showDetailModal}
        isEditMode={isEditMode}
        onClose={() => {
          setShowDetailModal(false)
          setSelectedProposal(null)
          setIsEditMode(false)
        }}
      />
    </div>
  )
}
