'use client'

import { Filter, Search } from 'lucide-react'
import type { ProposalFiltersProps } from './types'

export function ProposalFilters({
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
  filterRisk,
  setFilterRisk,
  totalProposals,
  filteredCount,
}: ProposalFiltersProps) {
  return (
    <div className="comparator-card bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Tedarikçi veya proje ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
        >
          <option value="all">Tüm Durumlar</option>
          <option value="pending">Beklemede</option>
          <option value="under-review">İnceleniyor</option>
          <option value="approved">Onaylandı</option>
          <option value="rejected">Reddedildi</option>
        </select>

        <select
          value={filterRisk}
          onChange={(e) => setFilterRisk(e.target.value)}
          className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
        >
          <option value="all">Tüm Risk Seviyeleri</option>
          <option value="low">Düşük Risk</option>
          <option value="medium">Orta Risk</option>
          <option value="high">Yüksek Risk</option>
        </select>

        <div className="flex items-center gap-2">
          <Filter className="text-slate-600" size={20} />
          <span className="text-sm text-slate-600">
            <span className="font-semibold text-blue-600">{filteredCount}</span> / {totalProposals}{' '}
            teklif
          </span>
        </div>
      </div>

      {/* Hızlı Filtreler */}
      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-700">Hızlı Filtreler</h4>
          <span className="text-xs text-slate-500">Tek tıkla filtrele</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setFilterStatus('approved')
              setFilterRisk('low')
            }}
            className="group px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 rounded-lg text-sm font-medium hover:from-green-200 hover:to-emerald-200 transition-all duration-200 border border-green-200 hover:border-green-300 hover:shadow-md"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full group-hover:scale-125 transition-transform"></div>
              En İyi Teklifler
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterStatus('under-review')
              setFilterRisk('all')
            }}
            className="group px-4 py-2 bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 rounded-lg text-sm font-medium hover:from-yellow-200 hover:to-orange-200 transition-all duration-200 border border-yellow-200 hover:border-yellow-300 hover:shadow-md"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full group-hover:scale-125 transition-transform"></div>
              İnceleme Bekleyen
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterStatus('all')
              setFilterRisk('high')
            }}
            className="group px-4 py-2 bg-gradient-to-r from-red-100 to-pink-100 text-red-800 rounded-lg text-sm font-medium hover:from-red-200 hover:to-pink-200 transition-all duration-200 border border-red-200 hover:border-red-300 hover:shadow-md"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full group-hover:scale-125 transition-transform"></div>
              Yüksek Riskli
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterStatus('pending')
              setFilterRisk('all')
            }}
            className="group px-4 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 rounded-lg text-sm font-medium hover:from-blue-200 hover:to-indigo-200 transition-all duration-200 border border-blue-200 hover:border-blue-300 hover:shadow-md"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full group-hover:scale-125 transition-transform"></div>
              Bekleyen Teklifler
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setSearchTerm('')
              setFilterStatus('all')
              setFilterRisk('all')
            }}
            className="group px-4 py-2 bg-gradient-to-r from-gray-100 to-slate-100 text-gray-700 rounded-lg text-sm font-medium hover:from-gray-200 hover:to-slate-200 transition-all duration-200 border border-gray-200 hover:border-gray-300 hover:shadow-md"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-500 rounded-full group-hover:scale-125 transition-transform"></div>
              Tümünü Göster
            </div>
          </button>
        </div>

        {/* Aktif Filtre Göstergesi */}
        {(searchTerm || filterStatus !== 'all' || filterRisk !== 'all') && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <Filter size={16} />
              <span className="font-medium">Aktif filtreler:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {searchTerm && (
                <span className="px-2 py-1 bg-blue-200 text-blue-800 rounded text-xs font-medium">
                  Arama: "{searchTerm}"
                </span>
              )}
              {filterStatus !== 'all' && (
                <span className="px-2 py-1 bg-blue-200 text-blue-800 rounded text-xs font-medium">
                  Durum:{' '}
                  {filterStatus === 'pending'
                    ? 'Beklemede'
                    : filterStatus === 'under-review'
                      ? 'İnceleniyor'
                      : filterStatus === 'approved'
                        ? 'Onaylandı'
                        : 'Reddedildi'}
                </span>
              )}
              {filterRisk !== 'all' && (
                <span className="px-2 py-1 bg-blue-200 text-blue-800 rounded text-xs font-medium">
                  Risk:{' '}
                  {filterRisk === 'low' ? 'Düşük' : filterRisk === 'medium' ? 'Orta' : 'Yüksek'}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
