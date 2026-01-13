'use client'

import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { useMemo, useRef, useState } from 'react'
import { data } from './data'
import { ProposalComparison } from './ProposalComparison'
import { ProposalComparisonModal } from './ProposalComparisonModal'
import { ProposalFilters } from './ProposalFilters'
import { ProposalStats } from './ProposalStats'
import { ProposalTable } from './ProposalTable'
import type { Proposal } from './types'

gsap.registerPlugin(useGSAP)

export function LiveAnalytics() {
  const comparatorRef = useRef<HTMLDivElement>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<keyof Proposal>('score')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterRisk, setFilterRisk] = useState<string>('all')
  const [selectedProposals, setSelectedProposals] = useState<string[]>([])
  const [editingScore, setEditingScore] = useState<string | null>(null)
  const [customScores, setCustomScores] = useState<{ [key: string]: number }>({})
  const [proposals, setProposals] = useState<Proposal[]>(data)
  const [showComparisonModal, setShowComparisonModal] = useState(false)
  const [loadingStates, setLoadingStates] = useState<{ [key: string]: boolean }>({})
  const [processingAction, setProcessingAction] = useState<string | null>(null)

  useGSAP(
    () => {
      gsap.fromTo(
        '.comparator-card',
        { scale: 0, opacity: 0, y: 30 },
        { scale: 1, opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: 'back.out(1.7)' }
      )
    },
    { scope: comparatorRef }
  )

  const filteredAndSortedProposals = useMemo(() => {
    const filtered = proposals.filter((proposal) => {
      const matchesSearch =
        proposal.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        proposal.rfpTitle.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = filterStatus === 'all' || proposal.status === filterStatus
      const matchesRisk = filterRisk === 'all' || proposal.riskLevel === filterRisk

      return matchesSearch && matchesStatus && matchesRisk
    })

    return filtered.sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
      }

      return 0
    })
  }, [searchTerm, sortField, sortDirection, filterStatus, filterRisk, proposals])

  const handleSort = (field: keyof Proposal) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const toggleProposalSelection = (proposalId: string) => {
    setSelectedProposals((prev) =>
      prev.includes(proposalId) ? prev.filter((id) => id !== proposalId) : [...prev, proposalId]
    )
  }

  const updateCustomScore = async (proposalId: string, newScore: number) => {
    setLoadingStates((prev) => ({ ...prev, [`${proposalId}-score`]: true }))
    setProcessingAction(`${proposalId}-score`)

    // Simüle processing delay
    await new Promise((resolve) => setTimeout(resolve, 800))

    const validScore = Math.max(0, Math.min(100, newScore))
    setCustomScores((prev) => ({
      ...prev,
      [proposalId]: validScore,
    }))

    // Aynı zamanda ana proposal'daki score'u da güncelle
    setProposals((prev) => prev.map((p) => (p.id === proposalId ? { ...p, score: validScore } : p)))

    setEditingScore(null)
    setLoadingStates((prev) => ({ ...prev, [`${proposalId}-score`]: false }))
    setProcessingAction(null)

    // Success notification
    setTimeout(() => {
      alert(`✅ Puan başarıyla ${validScore} olarak güncellendi!`)
    }, 100)
  }

  const updateProposalStatus = async (proposalId: string, newStatus: Proposal['status']) => {
    setLoadingStates((prev) => ({ ...prev, [proposalId]: true }))
    setProcessingAction(`${proposalId}-status`)

    // Simüle processing delay
    await new Promise((resolve) => setTimeout(resolve, 1200))

    setProposals((prev) => prev.map((p) => (p.id === proposalId ? { ...p, status: newStatus } : p)))

    setLoadingStates((prev) => ({ ...prev, [proposalId]: false }))
    setProcessingAction(null)

    // Success notification
    const statusText =
      newStatus === 'approved'
        ? 'onaylandı'
        : newStatus === 'rejected'
          ? 'reddedildi'
          : newStatus === 'under-review'
            ? 'incelemeye alındı'
            : 'beklemeye alındı'

    // Toast notification simülasyonu
    setTimeout(() => {
      alert(`✅ Teklif başarıyla ${statusText}!`)
    }, 100)
  }

  return (
    <div ref={comparatorRef} className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 bg-clip-text text-transparent mb-4">
          📊 Akıllı Teklif Karşılaştırma Motoru
        </h2>
        <p className="text-xl text-slate-600 max-w-4xl mx-auto">
          Teklifleri gerçek zamanlı analiz edin, karşılaştırın ve puanlayın
        </p>
      </div>

      {/* Filtreler */}
      <ProposalFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterRisk={filterRisk}
        setFilterRisk={setFilterRisk}
        totalProposals={proposals.length}
        filteredCount={filteredAndSortedProposals.length}
      />

      {/* Seçili Teklifler */}
      <ProposalComparison
        selectedProposals={selectedProposals}
        proposals={proposals}
        onClearSelection={() => setSelectedProposals([])}
        onCompare={() => setShowComparisonModal(true)}
      />

      {/* Teklif Tablosu */}
      <ProposalTable
        proposals={filteredAndSortedProposals}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        selectedProposals={selectedProposals}
        onToggleSelection={toggleProposalSelection}
        onSelectAll={(selectAll) => {
          if (selectAll) {
            setSelectedProposals(filteredAndSortedProposals.map((p) => p.id))
          } else {
            setSelectedProposals([])
          }
        }}
        editingScore={editingScore}
        setEditingScore={setEditingScore}
        customScores={customScores}
        onUpdateScore={updateCustomScore}
        onUpdateStatus={updateProposalStatus}
        loadingStates={loadingStates}
        processingAction={processingAction}
      />

      {/* İstatistikler */}
      <ProposalStats proposals={proposals} />

      {/* Karşılaştırma Modal */}
      <ProposalComparisonModal
        proposals={proposals}
        selectedIds={selectedProposals}
        isOpen={showComparisonModal}
        onClose={() => setShowComparisonModal(false)}
      />
    </div>
  )
}
