'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Filter,
  Mail,
  MailCheck,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  User,
  Users,
  X,
  XCircle,
} from 'lucide-react'
import React, { useState } from 'react'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'

type Status = 'pending' | 'confirmed' | 'completed' | 'cancelled'
type FormType = 'demo' | 'booking' | 'report'

type DemoBookingJSON = {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone_number: string
  additional_notes: string | null
  form_type: FormType
  status: Status
  subscribed: boolean
  created_at: string
  updated_at: string
}

type DemoRequestsState = {
  data: DemoBookingJSON[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasPrev: boolean
    hasNext: boolean
  }
}

type ModalType = 'create' | 'edit' | 'delete' | 'details' | null

const STATUS_CONFIG: Record<
  Status,
  { label: string; color: string; bg: string; icon: typeof Clock }
> = {
  pending: { label: 'Pending', color: 'text-amber-600', bg: 'bg-amber-100', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'text-blue-600', bg: 'bg-blue-100', icon: CheckCircle2 },
  completed: {
    label: 'Completed',
    color: 'text-emerald-600',
    bg: 'bg-emerald-100',
    icon: MailCheck,
  },
  cancelled: { label: 'Cancelled', color: 'text-rose-600', bg: 'bg-rose-100', icon: XCircle },
}

const FORM_TYPE_CONFIG: Record<FormType, { label: string; color: string }> = {
  demo: { label: 'Demo Request', color: 'text-purple-600 bg-purple-100' },
  booking: { label: 'Booking', color: 'text-cyan-600 bg-cyan-100' },
  report: { label: 'Report', color: 'text-orange-600 bg-orange-100' },
}

export default function DemoRequestsPage() {
  const actions = useGenericApiActions()

  const [requests, setRequests] = useState<DemoRequestsState | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all')
  const [formTypeFilter, setFormTypeFilter] = useState<FormType | 'all'>('all')
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [selectedRequest, setSelectedRequest] = useState<DemoBookingJSON | null>(null)
  const [activeModal, setActiveModal] = useState<ModalType>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const stats = React.useMemo(() => {
    if (!requests?.data) return { total: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0 }
    return {
      total: requests.pagination.total,
      pending: requests.data.filter((r) => r.status === 'pending').length,
      confirmed: requests.data.filter((r) => r.status === 'confirmed').length,
      completed: requests.data.filter((r) => r.status === 'completed').length,
      cancelled: requests.data.filter((r) => r.status === 'cancelled').length,
    }
  }, [requests])

  function fetchRequests() {
    setIsRefreshing(true)
    const filters: Record<string, string> = {}
    if (statusFilter !== 'all') filters.status = statusFilter
    if (formTypeFilter !== 'all') filters.form_type = formTypeFilter

    actions.GET_DEMO_BOOKINGS?.start({
      payload: {
        page,
        limit,
        search: search.trim() || undefined,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        orderBy: 'created_at',
        orderDirection: 'desc',
      },
      onAfterHandle: (data: DemoRequestsState | null) => {
        if (data) setRequests(data)
        setIsRefreshing(false)
      },
      onErrorHandle: () => {
        setIsRefreshing(false)
      },
    })
  }

  React.useEffect(() => {
    fetchRequests()
  }, [page, limit, search, statusFilter, formTypeFilter])

  function handleStatusChange(id: string, newStatus: Status) {
    actions.UPDATE_DEMO_BOOKING?.start({
      payload: { _id: id, status: newStatus },
      onAfterHandle: () => fetchRequests(),
      onErrorHandle: () => {},
    })
  }

  function handleDelete() {
    if (!selectedRequest) return
    actions.DELETE_DEMO_BOOKING?.start({
      payload: { _id: selectedRequest.id },
      onAfterHandle: () => {
        setActiveModal(null)
        setSelectedRequest(null)
        fetchRequests()
      },
      onErrorHandle: () => {},
    })
  }

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <aside className="fixed inset-0 overflow-hidden pointer-events-none">
        <figure className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-[100px] animate-pulse" />
        <figure className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500/20 rounded-full blur-[100px] animate-pulse delay-1000" />
        <figure className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] animate-pulse delay-500" />
      </aside>

      <article className="relative z-10 max-w-7xl mx-auto p-6 space-y-8">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <hgroup>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent">
              Demo Requests
            </h1>
            <p className="mt-1 text-slate-400">Manage and track all incoming demo requests</p>
          </hgroup>
          <nav className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={fetchRequests}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(168, 85, 247, 0.4)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveModal('create')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-medium shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all"
            >
              <Plus className="w-5 h-5" />
              New Request
            </motion.button>
          </nav>
        </motion.header>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-5 gap-4"
        >
          {[
            {
              label: 'Total',
              value: stats.total,
              icon: Users,
              color: 'from-slate-500 to-slate-600',
              iconBg: 'bg-slate-500/20',
            },
            {
              label: 'Pending',
              value: stats.pending,
              icon: Clock,
              color: 'from-amber-500 to-orange-500',
              iconBg: 'bg-amber-500/20',
            },
            {
              label: 'Confirmed',
              value: stats.confirmed,
              icon: CheckCircle2,
              color: 'from-blue-500 to-indigo-500',
              iconBg: 'bg-blue-500/20',
            },
            {
              label: 'Completed',
              value: stats.completed,
              icon: MailCheck,
              color: 'from-emerald-500 to-teal-500',
              iconBg: 'bg-emerald-500/20',
            },
            {
              label: 'Cancelled',
              value: stats.cancelled,
              icon: XCircle,
              color: 'from-rose-500 to-pink-500',
              iconBg: 'bg-rose-500/20',
            },
          ].map((stat, i) => (
            <motion.article
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              whileHover={{ scale: 1.02, y: -2 }}
              className="relative group overflow-hidden rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-5"
            >
              <figure
                className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity`}
              />
              <header className="flex items-center justify-between">
                <hgroup>
                  <p className="text-sm text-slate-400">{stat.label}</p>
                  <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
                </hgroup>
                <figure className={`p-3 rounded-xl ${stat.iconBg}`}>
                  <stat.icon className="w-6 h-6 text-white/80" />
                </figure>
              </header>
            </motion.article>
          ))}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <article className="flex flex-col md:flex-row gap-4">
            <figure className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, email, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
              />
            </figure>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl border transition-all ${
                showFilters
                  ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              <Filter className="w-5 h-5" />
              Filters
              <ChevronDown
                className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`}
              />
            </motion.button>
          </article>

          <AnimatePresence>
            {showFilters && (
              <motion.article
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <fieldset className="flex flex-wrap gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                  <label className="space-y-2">
                    <span className="text-sm text-slate-400">Status</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as Status | 'all')}
                      className="px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm text-slate-400">Form Type</span>
                    <select
                      value={formTypeFilter}
                      onChange={(e) => setFormTypeFilter(e.target.value as FormType | 'all')}
                      className="px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    >
                      <option value="all">All Types</option>
                      <option value="demo">Demo Request</option>
                      <option value="booking">Booking</option>
                      <option value="report">Report</option>
                    </select>
                  </label>

                  <nav className="flex items-end">
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter('all')
                        setFormTypeFilter('all')
                        setSearch('')
                      }}
                      className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                    >
                      Reset All
                    </button>
                  </nav>
                </fieldset>
              </motion.article>
            )}
          </AnimatePresence>
        </motion.section>

        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden"
        >
          <figure className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">
                    Contact
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Type</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">
                    Subscribed
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {requests?.data.map((request, i) => {
                  const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending
                  const formTypeConfig = FORM_TYPE_CONFIG[request.form_type] || FORM_TYPE_CONFIG.demo

                  return (
                    <motion.tr
                      key={request.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="group hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedRequest(request)
                        setActiveModal('details')
                      }}
                    >
                      <td className="px-6 py-4">
                        <article className="flex items-center gap-3">
                          <figure className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white font-medium">
                            {request.first_name?.[0]}
                            {request.last_name?.[0]}
                          </figure>
                          <hgroup>
                            <p className="font-medium text-white">
                              {request.first_name} {request.last_name}
                            </p>
                            <p className="text-sm text-slate-400">{request.email}</p>
                          </hgroup>
                        </article>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${formTypeConfig.color}`}
                        >
                          {formTypeConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <figure className="relative inline-block">
                          <select
                            value={request.status || 'pending'}
                            onChange={(e) => {
                              e.stopPropagation()
                              handleStatusChange(request.id, e.target.value as Status)
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className={`appearance-none pl-8 pr-8 py-1.5 rounded-full text-xs font-medium cursor-pointer ${statusConfig.bg} ${statusConfig.color} border-0 focus:outline-none focus:ring-2 focus:ring-purple-500/50`}
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                          <statusConfig.icon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" />
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" />
                        </figure>
                      </td>
                      <td className="px-6 py-4">
                        <article className="flex items-center gap-2 text-slate-400">
                          <Calendar className="w-4 h-4" />
                          <time className="text-sm">
                            {new Date(request.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </time>
                        </article>
                      </td>
                      <td className="px-6 py-4">
                        {request.subscribed ? (
                          <span className="flex items-center gap-1.5 text-emerald-400 text-sm">
                            <Sparkles className="w-4 h-4" />
                            Yes
                          </span>
                        ) : (
                          <span className="text-slate-500 text-sm">No</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <nav className="flex items-center justify-end gap-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation()
                              setSelectedRequest(request)
                              setActiveModal('delete')
                            }}
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </nav>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>

            {(!requests?.data || requests.data.length === 0) && (
              <article className="py-20 text-center">
                <figure className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
                  <Users className="w-8 h-8 text-slate-500" />
                </figure>
                <p className="text-slate-400">No demo requests found</p>
                <p className="text-sm text-slate-500 mt-1">
                  Try adjusting your filters or search query
                </p>
              </article>
            )}
          </figure>

          {requests && requests.pagination.totalPages > 1 && (
            <footer className="flex items-center justify-between px-6 py-4 border-t border-white/10">
              <p className="text-sm text-slate-400">
                Showing {(page - 1) * limit + 1} to{' '}
                {Math.min(page * limit, requests.pagination.total)} of {requests.pagination.total}
              </p>
              <nav className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!requests.pagination.hasPrev}
                  className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-all"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-white">
                  {page} / {requests.pagination.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!requests.pagination.hasNext}
                  className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-all"
                >
                  Next
                </button>
              </nav>
            </footer>
          )}
        </motion.article>
      </article>

      <AnimatePresence>
        {activeModal === 'details' && selectedRequest && (
          <DetailsModal
            request={selectedRequest}
            onClose={() => setActiveModal(null)}
            onStatusChange={handleStatusChange}
            onDelete={() => setActiveModal('delete')}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeModal === 'delete' && selectedRequest && (
          <DeleteModal
            request={selectedRequest}
            onClose={() => setActiveModal(null)}
            onConfirm={handleDelete}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeModal === 'create' && (
          <CreateModal
            onClose={() => setActiveModal(null)}
            onSuccess={() => {
              setActiveModal(null)
              fetchRequests()
            }}
          />
        )}
      </AnimatePresence>
    </section>
  )
}

function DetailsModal({
  request,
  onClose,
  onStatusChange,
  onDelete,
}: {
  request: DemoBookingJSON
  onClose: () => void
  onStatusChange: (id: string, status: Status) => void
  onDelete: () => void
}) {
  const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending

  return (
    <motion.aside
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.article
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 shadow-2xl overflow-hidden"
      >
        <figure className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-cyan-500 to-purple-500" />

        <section className="p-6">
          <header className="flex items-start justify-between mb-6">
            <article className="flex items-center gap-4">
              <figure className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white text-xl font-bold">
                {request.first_name?.[0]}
                {request.last_name?.[0]}
              </figure>
              <hgroup>
                <h3 className="text-xl font-bold text-white">
                  {request.first_name} {request.last_name}
                </h3>
                <p className="text-slate-400">
                  {FORM_TYPE_CONFIG[request.form_type]?.label || 'Demo Request'}
                </p>
              </hgroup>
            </article>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </header>

          <article className="space-y-4">
            <figure className="flex items-center gap-3 p-4 rounded-xl bg-white/5">
              <Mail className="w-5 h-5 text-purple-400" />
              <hgroup>
                <p className="text-xs text-slate-400">Email</p>
                <p className="text-white">{request.email || 'N/A'}</p>
              </hgroup>
            </figure>

            <figure className="flex items-center gap-3 p-4 rounded-xl bg-white/5">
              <Phone className="w-5 h-5 text-cyan-400" />
              <hgroup>
                <p className="text-xs text-slate-400">Phone</p>
                <p className="text-white">{request.phone_number}</p>
              </hgroup>
            </figure>

            <figure className="flex items-center gap-3 p-4 rounded-xl bg-white/5">
              <Calendar className="w-5 h-5 text-amber-400" />
              <hgroup>
                <p className="text-xs text-slate-400">Requested On</p>
                <p className="text-white">
                  {new Date(request.created_at).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </hgroup>
            </figure>

            {request.additional_notes && (
              <article className="p-4 rounded-xl bg-white/5">
                <p className="text-xs text-slate-400 mb-2">Additional Notes</p>
                <p className="text-white text-sm leading-relaxed">{request.additional_notes}</p>
              </article>
            )}

            <footer className="flex items-center justify-between pt-4">
              <article className="flex items-center gap-2">
                {request.subscribed && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 text-sm">
                    <Sparkles className="w-4 h-4" />
                    Subscribed to updates
                  </span>
                )}
              </article>
              <select
                value={request.status || 'pending'}
                onChange={(e) => onStatusChange(request.id, e.target.value as Status)}
                className={`px-4 py-2 rounded-xl text-sm font-medium cursor-pointer ${statusConfig.bg} ${statusConfig.color} border-0 focus:outline-none focus:ring-2 focus:ring-purple-500/50`}
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </footer>
          </article>

          <nav className="flex gap-3 mt-6 pt-6 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition-all"
            >
              Close
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="px-4 py-3 rounded-xl bg-rose-500/20 text-rose-400 font-medium hover:bg-rose-500/30 transition-all"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </nav>
        </section>
      </motion.article>
    </motion.aside>
  )
}

function DeleteModal({
  request,
  onClose,
  onConfirm,
}: {
  request: DemoBookingJSON
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <motion.aside
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.article
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 p-6 shadow-2xl"
      >
        <figure className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-500/20 flex items-center justify-center">
          <Trash2 className="w-8 h-8 text-rose-400" />
        </figure>
        <h3 className="text-xl font-bold text-white text-center mb-2">Delete Request?</h3>
        <p className="text-slate-400 text-center mb-6">
          Are you sure you want to delete the request from{' '}
          <span className="text-white font-medium">
            {request.first_name} {request.last_name}
          </span>
          ? This action cannot be undone.
        </p>
        <nav className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 px-4 py-3 rounded-xl bg-rose-500 text-white font-medium hover:bg-rose-600 transition-all"
          >
            Delete
          </button>
        </nav>
      </motion.article>
    </motion.aside>
  )
}

function CreateModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const actions = useGenericApiActions()
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    additional_notes: '',
    form_type: 'demo' as FormType,
    subscribed: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)

    actions.ADD_DEMO_BOOKING?.start({
      payload: form,
      onAfterHandle: () => {
        setIsSubmitting(false)
        onSuccess()
      },
      onErrorHandle: () => {
        setIsSubmitting(false)
      },
    })
  }

  return (
    <motion.aside
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.article
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 shadow-2xl overflow-hidden"
      >
        <figure className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-cyan-500 to-purple-500" />

        <form onSubmit={handleSubmit} className="p-6">
          <header className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">New Demo Request</h3>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </header>

          <fieldset className="space-y-4">
            <article className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-sm text-slate-400 mb-2">First Name *</span>
                <figure className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    placeholder="John"
                  />
                </figure>
              </label>
              <label className="block">
                <span className="block text-sm text-slate-400 mb-2">Last Name *</span>
                <input
                  type="text"
                  required
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  placeholder="Doe"
                />
              </label>
            </article>

            <label className="block">
              <span className="block text-sm text-slate-400 mb-2">Email</span>
              <figure className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  placeholder="john@example.com"
                />
              </figure>
            </label>

            <label className="block">
              <span className="block text-sm text-slate-400 mb-2">Phone Number *</span>
              <figure className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="tel"
                  required
                  value={form.phone_number}
                  onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  placeholder="+1 (555) 000-0000"
                />
              </figure>
            </label>

            <label className="block">
              <span className="block text-sm text-slate-400 mb-2">Form Type</span>
              <select
                value={form.form_type}
                onChange={(e) => setForm({ ...form, form_type: e.target.value as FormType })}
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                <option value="demo">Demo Request</option>
                <option value="booking">Booking</option>
                <option value="report">Report</option>
              </select>
            </label>

            <label className="block">
              <span className="block text-sm text-slate-400 mb-2">Additional Notes</span>
              <textarea
                value={form.additional_notes}
                onChange={(e) => setForm({ ...form, additional_notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                placeholder="Any additional information..."
              />
            </label>

            <label className="flex items-center gap-3 p-4 rounded-xl bg-white/5 cursor-pointer group">
              <input
                type="checkbox"
                checked={form.subscribed}
                onChange={(e) => setForm({ ...form, subscribed: e.target.checked })}
                className="w-5 h-5 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500/50"
              />
              <hgroup>
                <p className="text-white font-medium">Subscribe to updates</p>
                <p className="text-sm text-slate-400">Receive news and product updates</p>
              </hgroup>
            </label>
          </fieldset>

          <nav className="flex gap-3 mt-6 pt-6 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Request'}
            </button>
          </nav>
        </form>
      </motion.article>
    </motion.aside>
  )
}
