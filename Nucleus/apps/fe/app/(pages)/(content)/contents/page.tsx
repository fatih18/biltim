'use client'

import type { ContentJSON } from '@monorepo/db-entities/schemas/default/content'
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit,
  Eye,
  FileText,
  Loader2,
  Plus,
  Search,
  Send,
  Trash2,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'

type ContentStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'published'

const statusConfig: Record<ContentStatus, { label: string; color: string; icon: React.ReactNode }> =
  {
    draft: {
      label: 'Draft',
      color: 'bg-slate-100 text-slate-600',
      icon: <FileText className="h-3 w-3" />,
    },
    pending_approval: {
      label: 'Pending',
      color: 'bg-amber-100 text-amber-700',
      icon: <Clock className="h-3 w-3" />,
    },
    approved: {
      label: 'Approved',
      color: 'bg-emerald-100 text-emerald-700',
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    rejected: {
      label: 'Rejected',
      color: 'bg-red-100 text-red-700',
      icon: <XCircle className="h-3 w-3" />,
    },
    published: {
      label: 'Published',
      color: 'bg-indigo-100 text-indigo-700',
      icon: <Send className="h-3 w-3" />,
    },
  }

export default function Contents() {
  const actions = useGenericApiActions()

  const [contents, setContents] = useState<ContentJSON[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({ title: '', body: '' })
  const [isCreating, setIsCreating] = useState(false)

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({ id: '', title: '', body: '' })
  const [isEditing, setIsEditing] = useState(false)

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadContents = useCallback(() => {
    setIsLoading(true)
    actions.GET_CONTENTS?.start({
      payload: {
        page: 1,
        limit: 100,
        search: search.trim() || undefined,
      },
      onAfterHandle: (data) => {
        setIsLoading(false)
        if (data?.data) {
          setContents(data.data)
        }
      },
      onErrorHandle: () => {
        setIsLoading(false)
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  useEffect(() => {
    loadContents()
  }, [loadContents])

  const handleCreate = () => {
    if (!createForm.title.trim()) return

    setIsCreating(true)
    actions.ADD_CONTENT?.start({
      payload: {
        title: createForm.title,
        body: createForm.body,
        status: 'draft',
      },
      onAfterHandle: (data) => {
        setIsCreating(false)
        if (data) {
          setShowCreateModal(false)
          setCreateForm({ title: '', body: '' })
          loadContents()
        }
      },
      onErrorHandle: () => {
        setIsCreating(false)
      },
    })
  }

  const handleEdit = () => {
    if (!editForm.title.trim()) return

    setIsEditing(true)
    actions.UPDATE_CONTENT?.start({
      payload: {
        _id: editForm.id,
        title: editForm.title,
        body: editForm.body,
      },
      onAfterHandle: (data) => {
        setIsEditing(false)
        if (data) {
          setShowEditModal(false)
          setEditForm({ id: '', title: '', body: '' })
          loadContents()
        }
      },
      onErrorHandle: () => {
        setIsEditing(false)
      },
    })
  }

  const handleDelete = (id: string) => {
    setDeletingId(id)
    actions.DELETE_CONTENT?.start({
      payload: { _id: id },
      onAfterHandle: () => {
        setDeletingId(null)
        if (selectedId === id) setSelectedId(null)
        loadContents()
      },
      onErrorHandle: () => {
        setDeletingId(null)
      },
    })
  }

  const handleSubmitForApproval = (content: ContentJSON) => {
    actions.UPDATE_CONTENT?.start({
      payload: {
        _id: content.id,
        status: 'pending_approval',
      },
      onAfterHandle: () => {
        // Trigger on_flow_started notifications
        triggerFlowNotifications(content.id, 'on_flow_started')
        loadContents()
      },
    })
  }

  // Trigger notifications using actions (server actions handle backend communication)
  const triggerFlowNotifications = (contentId: string, trigger: string): Promise<void> => {
    return new Promise((resolve) => {
      actions.GET_VERIFICATION_NOTIFICATION_RULES?.start({
        payload: { page: 1, limit: 100, filters: { trigger, entity_name: 'content' } },
        onAfterHandle: (rulesData) => {
          if (!rulesData?.data?.length) {
            resolve()
            return
          }

          let ruleIdx = 0
          const processRule = () => {
            if (ruleIdx >= rulesData.data.length) {
              resolve()
              return
            }
            const rule = rulesData.data[ruleIdx]
            if (!rule) {
              ruleIdx++
              processRule()
              return
            }

            actions.GET_VERIFICATION_NOTIFICATION_RECIPIENTS?.start({
              payload: { page: 1, limit: 100, filters: { rule_id: rule.id } },
              onAfterHandle: (recipientsData) => {
                if (!recipientsData?.data?.length) {
                  ruleIdx++
                  processRule()
                  return
                }

                let recIdx = 0
                const processRecipient = () => {
                  if (recIdx >= recipientsData.data.length) {
                    ruleIdx++
                    processRule()
                    return
                  }
                  const recipient = recipientsData.data[recIdx]
                  if (!recipient || !recipient.recipient_user_id) {
                    recIdx++
                    processRecipient()
                    return
                  }

                  actions.ADD_NOTIFICATION?.start({
                    payload: {
                      user_id: recipient.recipient_user_id as string,
                      title:
                        trigger === 'on_flow_started'
                          ? 'New content awaiting approval'
                          : trigger === 'on_approved'
                            ? 'Content approved'
                            : trigger === 'on_rejected'
                              ? 'Content rejected'
                              : 'Verification completed',
                      body: trigger === 'on_flow_started' ? 'A content needs your review.' : '',
                      entity_name: 'content',
                      entity_id: contentId,
                      is_seen: false,
                    },
                    onAfterHandle: () => {
                      recIdx++
                      processRecipient()
                    },
                    onErrorHandle: () => {
                      recIdx++
                      processRecipient()
                    },
                  })
                }
                processRecipient()
              },
              onErrorHandle: () => {
                ruleIdx++
                processRule()
              },
            })
          }
          processRule()
        },
        onErrorHandle: () => resolve(),
      })
    })
  }

  const selectedContent = contents.find((c) => c.id === selectedId)

  return (
    <div className="flex h-[calc(100vh-80px)] bg-slate-50">
      {/* Left Panel - List */}
      <div className="w-96 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col">
        {/* Header */}
        <div className="border-b border-slate-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              <h1 className="text-lg font-bold text-slate-900">Contents</h1>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              New
            </button>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contents..."
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : contents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <FileText className="h-12 w-12 text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">No contents found</p>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="mt-3 text-sm text-indigo-600 hover:underline"
              >
                Create your first content
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {contents.map((content) => {
                const status = statusConfig[content.status as ContentStatus] || statusConfig.draft
                const isSelected = selectedId === content.id
                const isDeleting = deletingId === content.id

                return (
                  <button
                    key={content.id}
                    type="button"
                    onClick={() => setSelectedId(content.id)}
                    disabled={isDeleting}
                    className={`w-full text-left p-4 transition-colors ${
                      isSelected ? 'bg-indigo-50 border-l-2 border-indigo-500' : 'hover:bg-slate-50'
                    } ${isDeleting ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-slate-900 truncate">
                          {content.title}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{content.body}</p>
                      </div>
                      <div
                        className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${status.color}`}
                      >
                        {status.icon}
                        {status.label}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400">
                      <span>
                        {new Date(content.created_at).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      {content.verified_at && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-600">Verified</span>
                        </>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Detail */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedContent ? (
          <>
            {/* Detail Header */}
            <div className="border-b border-slate-200 bg-white px-6 py-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-slate-900 truncate">
                      {selectedContent.title}
                    </h2>
                    {(() => {
                      const status =
                        statusConfig[selectedContent.status as ContentStatus] || statusConfig.draft
                      return (
                        <span
                          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${status.color}`}
                        >
                          {status.icon}
                          {status.label}
                        </span>
                      )
                    })()}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    Created{' '}
                    {new Date(selectedContent.created_at).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedContent.status === 'draft' && (
                    <button
                      type="button"
                      onClick={() => handleSubmitForApproval(selectedContent)}
                      className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600"
                    >
                      <Send className="h-4 w-4" />
                      Submit for Approval
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setEditForm({
                        id: selectedContent.id,
                        title: selectedContent.title,
                        body: selectedContent.body,
                      })
                      setShowEditModal(true)
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(selectedContent.id)}
                    disabled={deletingId === selectedContent.id}
                    className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingId === selectedContent.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Delete
                  </button>
                  <Link
                    href={`/contents/${selectedContent.id}`}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <Eye className="h-4 w-4" />
                    Full View
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Detail Content */}
            <div className="flex-1 overflow-auto p-6">
              <div className="max-w-3xl">
                {/* Verification Status */}
                {selectedContent.status === 'pending_approval' && (
                  <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-amber-800">Awaiting Approval</h4>
                        <p className="text-sm text-amber-700 mt-1">
                          This content is waiting for verification. Check the full view for approval
                          status.
                        </p>
                        <Link
                          href={`/contents/${selectedContent.id}`}
                          className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-amber-700 hover:text-amber-800"
                        >
                          View approval progress
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                )}

                {selectedContent.verified_at && (
                  <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-emerald-800">Verified</h4>
                        <p className="text-sm text-emerald-700 mt-1">
                          This content was verified on{' '}
                          {new Date(selectedContent.verified_at).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Body */}
                <div className="prose prose-slate max-w-none">
                  <div className="rounded-lg border border-slate-200 bg-white p-6">
                    <p className="whitespace-pre-wrap text-slate-700">{selectedContent.body}</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText className="h-16 w-16 text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">No content selected</h3>
              <p className="text-sm text-slate-500 mt-1">
                Select a content from the list to view details
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Create Content</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label
                  htmlFor="create-title"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Title
                </label>
                <input
                  id="create-title"
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="Enter title..."
                />
              </div>
              <div>
                <label
                  htmlFor="create-body"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Body
                </label>
                <textarea
                  id="create-body"
                  value={createForm.body}
                  onChange={(e) => setCreateForm({ ...createForm, body: e.target.value })}
                  rows={6}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                  placeholder="Enter content body..."
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false)
                  setCreateForm({ title: '', body: '' })
                }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={isCreating || !createForm.title.trim()}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Edit Content</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label
                  htmlFor="edit-title"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Title
                </label>
                <input
                  id="edit-title"
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label
                  htmlFor="edit-body"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Body
                </label>
                <textarea
                  id="edit-body"
                  value={editForm.body}
                  onChange={(e) => setEditForm({ ...editForm, body: e.target.value })}
                  rows={6}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false)
                  setEditForm({ id: '', title: '', body: '' })
                }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEdit}
                disabled={isEditing || !editForm.title.trim()}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {isEditing && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
