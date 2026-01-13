'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  Calendar,
  ChevronDown,
  Filter,
  Globe,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import React, { useState } from 'react'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'

type NewsletterSubscriptionJSON = {
  id: string
  email: string
  source: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

type SubscribersState = {
  data: NewsletterSubscriptionJSON[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasPrev: boolean
    hasNext: boolean
  }
}

type ModalType = 'create' | 'delete' | 'details' | null

const SOURCE_CONFIG: Record<string, { label: string; color: string }> = {
  footer: { label: 'Footer', color: 'text-blue-600 bg-blue-100' },
  popup: { label: 'Popup', color: 'text-purple-600 bg-purple-100' },
  landing: { label: 'Landing Page', color: 'text-emerald-600 bg-emerald-100' },
  demo: { label: 'Demo Form', color: 'text-amber-600 bg-amber-100' },
}

export default function SubscribersPage() {
  const actions = useGenericApiActions()

  const [subscribers, setSubscribers] = useState<SubscribersState | null>(null)
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string | 'all'>('all')
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [selectedSubscriber, setSelectedSubscriber] = useState<NewsletterSubscriptionJSON | null>(
    null
  )
  const [activeModal, setActiveModal] = useState<ModalType>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  function fetchSubscribers() {
    setIsRefreshing(true)
    const filters: Record<string, string> = {}
    if (sourceFilter !== 'all') filters.source = sourceFilter

    actions.GET_NEWSLETTER_SUBSCRIPTIONS?.start({
      payload: {
        page,
        limit,
        search: search.trim() || undefined,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        orderBy: 'created_at',
        orderDirection: 'desc',
      },
      onAfterHandle: (data: SubscribersState | null) => {
        if (data) setSubscribers(data)
        setIsRefreshing(false)
      },
      onErrorHandle: () => {
        setIsRefreshing(false)
      },
    })
  }

  React.useEffect(() => {
    fetchSubscribers()
  }, [page, limit, search, sourceFilter])

  function handleDelete() {
    if (!selectedSubscriber) return
    actions.DELETE_NEWSLETTER_SUBSCRIPTION?.start({
      payload: { _id: selectedSubscriber.id },
      onAfterHandle: () => {
        setActiveModal(null)
        setSelectedSubscriber(null)
        fetchSubscribers()
      },
      onErrorHandle: () => {},
    })
  }

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <aside className="fixed inset-0 overflow-hidden pointer-events-none">
        <figure className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/20 rounded-full blur-[100px] animate-pulse" />
        <figure className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-[100px] animate-pulse delay-1000" />
        <figure className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] animate-pulse delay-500" />
      </aside>

      <article className="relative z-10 max-w-7xl mx-auto p-6 space-y-8">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <hgroup>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-emerald-200 to-blue-200 bg-clip-text text-transparent">
              Newsletter Subscribers
            </h1>
            <p className="mt-1 text-slate-400">Manage all newsletter subscriptions</p>
          </hgroup>
          <nav className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={fetchSubscribers}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(16, 185, 129, 0.4)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveModal('create')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-blue-600 text-white font-medium shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all"
            >
              <Plus className="w-5 h-5" />
              Add Subscriber
            </motion.button>
          </nav>
        </motion.header>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            {
              label: 'Total Subscribers',
              value: subscribers?.pagination.total || 0,
              icon: Users,
              color: 'from-slate-500 to-slate-600',
              iconBg: 'bg-slate-500/20',
            },
            {
              label: 'Footer',
              value: subscribers?.data.filter((s) => s.source === 'footer').length || 0,
              icon: Globe,
              color: 'from-blue-500 to-indigo-500',
              iconBg: 'bg-blue-500/20',
            },
            {
              label: 'Landing Page',
              value: subscribers?.data.filter((s) => s.source === 'landing').length || 0,
              icon: Globe,
              color: 'from-emerald-500 to-teal-500',
              iconBg: 'bg-emerald-500/20',
            },
            {
              label: 'Demo Form',
              value: subscribers?.data.filter((s) => s.source === 'demo').length || 0,
              icon: Mail,
              color: 'from-amber-500 to-orange-500',
              iconBg: 'bg-amber-500/20',
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
                placeholder="Search by email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              />
            </figure>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl border transition-all ${
                showFilters
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
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
                    <span className="text-sm text-slate-400">Source</span>
                    <select
                      value={sourceFilter}
                      onChange={(e) => setSourceFilter(e.target.value)}
                      className="px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    >
                      <option value="all">All Sources</option>
                      <option value="footer">Footer</option>
                      <option value="popup">Popup</option>
                      <option value="landing">Landing Page</option>
                      <option value="demo">Demo Form</option>
                    </select>
                  </label>

                  <nav className="flex items-end">
                    <button
                      type="button"
                      onClick={() => {
                        setSourceFilter('all')
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
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Source</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">
                    Subscribed On
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Status</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {subscribers?.data.map((subscriber, i) => {
                  const sourceConfig = SOURCE_CONFIG[subscriber.source || 'footer'] || {
                    label: subscriber.source || 'Unknown',
                    color: 'text-slate-600 bg-slate-100',
                  }

                  return (
                    <motion.tr
                      key={subscriber.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="group hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedSubscriber(subscriber)
                        setActiveModal('details')
                      }}
                    >
                      <td className="px-6 py-4">
                        <article className="flex items-center gap-3">
                          <figure className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white font-medium">
                            {subscriber.email?.[0]?.toUpperCase()}
                          </figure>
                          <p className="font-medium text-white">{subscriber.email}</p>
                        </article>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${sourceConfig.color}`}
                        >
                          {sourceConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <article className="flex items-center gap-2 text-slate-400">
                          <Calendar className="w-4 h-4" />
                          <time className="text-sm">
                            {new Date(subscriber.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </time>
                        </article>
                      </td>
                      <td className="px-6 py-4">
                        {subscriber.is_active ? (
                          <span className="flex items-center gap-1.5 text-emerald-400 text-sm">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-slate-500 text-sm">
                            <span className="w-2 h-2 rounded-full bg-slate-500" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <nav className="flex items-center justify-end gap-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation()
                              setSelectedSubscriber(subscriber)
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

            {(!subscribers?.data || subscribers.data.length === 0) && (
              <article className="py-20 text-center">
                <figure className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
                  <Users className="w-8 h-8 text-slate-500" />
                </figure>
                <p className="text-slate-400">No subscribers found</p>
                <p className="text-sm text-slate-500 mt-1">
                  Try adjusting your filters or search query
                </p>
              </article>
            )}
          </figure>

          {subscribers && subscribers.pagination.totalPages > 1 && (
            <footer className="flex items-center justify-between px-6 py-4 border-t border-white/10">
              <p className="text-sm text-slate-400">
                Showing {(page - 1) * limit + 1} to{' '}
                {Math.min(page * limit, subscribers.pagination.total)} of{' '}
                {subscribers.pagination.total}
              </p>
              <nav className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!subscribers.pagination.hasPrev}
                  className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-all"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-white">
                  {page} / {subscribers.pagination.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!subscribers.pagination.hasNext}
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
        {activeModal === 'details' && selectedSubscriber && (
          <DetailsModal
            subscriber={selectedSubscriber}
            onClose={() => setActiveModal(null)}
            onDelete={() => setActiveModal('delete')}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeModal === 'delete' && selectedSubscriber && (
          <DeleteModal
            subscriber={selectedSubscriber}
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
              fetchSubscribers()
            }}
          />
        )}
      </AnimatePresence>
    </section>
  )
}

function DetailsModal({
  subscriber,
  onClose,
  onDelete,
}: {
  subscriber: NewsletterSubscriptionJSON
  onClose: () => void
  onDelete: () => void
}) {
  const sourceConfig = SOURCE_CONFIG[subscriber.source || 'footer'] || {
    label: subscriber.source || 'Unknown',
    color: 'text-slate-600 bg-slate-100',
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
        <figure className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-emerald-500" />

        <section className="p-6">
          <header className="flex items-start justify-between mb-6">
            <article className="flex items-center gap-4">
              <figure className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white text-xl font-bold">
                {subscriber.email?.[0]?.toUpperCase()}
              </figure>
              <hgroup>
                <h3 className="text-xl font-bold text-white">{subscriber.email}</h3>
                <p className="text-slate-400">Newsletter Subscriber</p>
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
              <Mail className="w-5 h-5 text-emerald-400" />
              <hgroup>
                <p className="text-xs text-slate-400">Email</p>
                <p className="text-white">{subscriber.email}</p>
              </hgroup>
            </figure>

            <figure className="flex items-center gap-3 p-4 rounded-xl bg-white/5">
              <Globe className="w-5 h-5 text-blue-400" />
              <hgroup>
                <p className="text-xs text-slate-400">Source</p>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${sourceConfig.color}`}>
                  {sourceConfig.label}
                </span>
              </hgroup>
            </figure>

            <figure className="flex items-center gap-3 p-4 rounded-xl bg-white/5">
              <Calendar className="w-5 h-5 text-amber-400" />
              <hgroup>
                <p className="text-xs text-slate-400">Subscribed On</p>
                <p className="text-white">
                  {new Date(subscriber.created_at).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </hgroup>
            </figure>

            <footer className="flex items-center justify-between pt-4">
              <article className="flex items-center gap-2">
                {subscriber.is_active ? (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 text-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Active Subscription
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-500/20 text-slate-400 text-sm">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    Inactive
                  </span>
                )}
              </article>
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
  subscriber,
  onClose,
  onConfirm,
}: {
  subscriber: NewsletterSubscriptionJSON
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
        <h3 className="text-xl font-bold text-white text-center mb-2">Remove Subscriber?</h3>
        <p className="text-slate-400 text-center mb-6">
          Are you sure you want to remove{' '}
          <span className="text-white font-medium">{subscriber.email}</span> from the newsletter?
          This action cannot be undone.
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
            Remove
          </button>
        </nav>
      </motion.article>
    </motion.aside>
  )
}

function CreateModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const actions = useGenericApiActions()
  const [form, setForm] = useState({
    email: '',
    source: 'footer',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)

    actions.ADD_NEWSLETTER_SUBSCRIPTION?.start({
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
        <figure className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-emerald-500" />

        <form onSubmit={handleSubmit} className="p-6">
          <header className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Add Subscriber</h3>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </header>

          <fieldset className="space-y-4">
            <label className="block">
              <span className="block text-sm text-slate-400 mb-2">Email *</span>
              <figure className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="subscriber@example.com"
                />
              </figure>
            </label>

            <label className="block">
              <span className="block text-sm text-slate-400 mb-2">Source</span>
              <select
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="footer">Footer</option>
                <option value="popup">Popup</option>
                <option value="landing">Landing Page</option>
                <option value="demo">Demo Form</option>
              </select>
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
              className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-blue-600 text-white font-medium hover:shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Adding...' : 'Add Subscriber'}
            </button>
          </nav>
        </form>
      </motion.article>
    </motion.aside>
  )
}
