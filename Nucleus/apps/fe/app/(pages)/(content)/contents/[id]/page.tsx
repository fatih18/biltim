'use client'

import type { ContentJSON } from '@monorepo/db-entities/schemas/default/content'
import type { VerificationRequirementJSON } from '@monorepo/db-entities/schemas/default/verification_requirement'
import { useStore } from '@store/globalStore'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  MessageSquare,
  PenTool,
  Send,
  Shield,
  User,
  Users,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { use, useCallback, useEffect, useState } from 'react'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'

type ContentStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'published'

const statusConfig: Record<
  ContentStatus,
  { label: string; color: string; bgColor: string; icon: React.ReactNode }
> = {
  draft: {
    label: 'Draft',
    color: 'text-slate-600',
    bgColor: 'bg-slate-100',
    icon: <FileText className="h-4 w-4" />,
  },
  pending_approval: {
    label: 'Pending Approval',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    icon: <Clock className="h-4 w-4" />,
  },
  approved: {
    label: 'Approved',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-100',
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  rejected: {
    label: 'Rejected',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    icon: <XCircle className="h-4 w-4" />,
  },
  published: {
    label: 'Published',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100',
    icon: <Send className="h-4 w-4" />,
  },
}

type Verification = {
  id: string
  requirement_id: string
  verifier_id: string
  status: 'approved' | 'rejected' | 'pending'
  reason?: string
  signature?: string
  created_at: string
  verifier?: {
    profile?: {
      first_name?: string
      last_name?: string
    }
    email?: string
  }
}

export default function ContentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const actions = useGenericApiActions()
  const globalStore = useStore()

  const [content, setContent] = useState<ContentJSON | null>(null)
  const [requirements, setRequirements] = useState<VerificationRequirementJSON[]>([])
  const [verifications] = useState<Verification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Approval modal state
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [approvalForm, setApprovalForm] = useState({
    requirementId: '',
    status: 'approved' as 'approved' | 'rejected',
    reason: '',
    signature: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadContent = useCallback(() => {
    actions.GET_CONTENTS?.start({
      payload: {
        page: 1,
        limit: 1,
        filters: { id },
      },
      onAfterHandle: (data) => {
        const firstContent = data?.data?.[0]
        if (firstContent) {
          setContent(firstContent)
        }
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const loadRequirements = useCallback(() => {
    actions.GET_VERIFICATION_REQUIREMENTS?.start({
      payload: {
        page: 1,
        limit: 100,
        filters: { entity_name: 'content' },
      },
      onAfterHandle: (data) => {
        if (data?.data) {
          // Filter requirements for this specific content or general (no entity_id)
          const relevantReqs = data.data.filter(
            (r: VerificationRequirementJSON) => !r.entity_id || r.entity_id === id
          )
          setRequirements(relevantReqs)
        }
        setIsLoading(false)
      },
      onErrorHandle: () => {
        setIsLoading(false)
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    loadContent()
    loadRequirements()
  }, [loadContent, loadRequirements])

  const currentUserId = globalStore.user?.id
  const userRoles = globalStore.user?.roles || []

  // Check if user can approve a specific requirement
  const canApproveRequirement = (req: VerificationRequirementJSON) => {
    if (req.verifier_type === 'user') {
      return req.verifier_id === currentUserId
    }
    if (req.verifier_type === 'role') {
      return userRoles.some((role) => role.id === req.verifier_id)
    }
    return false
  }

  // Get verification status for a requirement
  const getVerificationForRequirement = (reqId: string) => {
    return verifications.find((v) => v.requirement_id === reqId)
  }

  // Group requirements by step_order
  const requirementsByStep = requirements.reduce(
    (acc, req) => {
      const step = req.step_order || 1
      if (!acc[step]) acc[step] = []
      acc[step].push(req)
      return acc
    },
    {} as Record<number, VerificationRequirementJSON[]>
  )

  const handleOpenApproval = (req: VerificationRequirementJSON) => {
    setApprovalForm({
      requirementId: req.id,
      status: 'approved',
      reason: '',
      signature: '',
    })
    setShowApprovalModal(true)
  }

  // Trigger notifications using actions
  const triggerFlowNotifications = (contentId: string, trigger: string, onDone: () => void) => {
    actions.GET_VERIFICATION_NOTIFICATION_RULES?.start({
      payload: { page: 1, limit: 100, filters: { trigger, entity_name: 'content' } },
      onAfterHandle: (rulesData) => {
        if (!rulesData?.data?.length) {
          onDone()
          return
        }

        let ruleIdx = 0
        const processRule = () => {
          if (ruleIdx >= rulesData.data.length) {
            onDone()
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
                if (!recipient?.recipient_user_id) {
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
                    body:
                      trigger === 'on_flow_started'
                        ? 'A content needs your review.'
                        : trigger === 'on_approved'
                          ? 'Content has been approved.'
                          : trigger === 'on_rejected'
                            ? 'Content was rejected.'
                            : 'All steps completed.',
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
      onErrorHandle: () => onDone(),
    })
  }

  const handleSubmitApproval = () => {
    if (!content) return
    setIsSubmitting(true)

    const trigger = approvalForm.status === 'approved' ? 'on_approved' : 'on_rejected'
    const maxStep = Math.max(...requirements.map((r) => r.step_order || 1), 1)
    const currentReq = requirements.find((r) => r.id === approvalForm.requirementId)
    const currentStep = currentReq?.step_order || 1

    // Trigger notification for this action
    triggerFlowNotifications(content.id, trigger, () => {
      if (approvalForm.status === 'approved' && currentStep >= maxStep) {
        // Last step approved - trigger flow_completed and update content
        triggerFlowNotifications(content.id, 'on_flow_completed', () => {
          actions.UPDATE_CONTENT?.start({
            payload: { _id: content.id, status: 'approved', verified_at: new Date() },
            onAfterHandle: () => {
              setIsSubmitting(false)
              setShowApprovalModal(false)
              loadContent()
            },
            onErrorHandle: () => setIsSubmitting(false),
          })
        })
      } else if (approvalForm.status === 'rejected') {
        // Rejected
        actions.UPDATE_CONTENT?.start({
          payload: { _id: content.id, status: 'rejected' },
          onAfterHandle: () => {
            setIsSubmitting(false)
            setShowApprovalModal(false)
            loadContent()
          },
          onErrorHandle: () => setIsSubmitting(false),
        })
      } else {
        // More steps to go
        setIsSubmitting(false)
        setShowApprovalModal(false)
        loadContent()
      }
    })
  }

  const handleSubmitForApproval = () => {
    if (!content) return
    // Trigger on_flow_started notifications first
    triggerFlowNotifications(content.id, 'on_flow_started', () => {
      actions.UPDATE_CONTENT?.start({
        payload: { _id: content.id, status: 'pending_approval' },
        onAfterHandle: () => loadContent(),
      })
    })
  }

  if (isLoading) {
    return (
      <div
        style={{ width: '100%', height: 'calc(100vh - 88px)', overflow: 'hidden' }}
        className="flex items-center justify-center bg-slate-50"
      >
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (!content) {
    return (
      <div
        style={{ width: '100%', height: 'calc(100vh - 88px)', overflow: 'hidden' }}
        className="flex flex-col items-center justify-center bg-slate-50"
      >
        <FileText className="h-16 w-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold text-slate-900">Content not found</h2>
        <Link href="/contents" className="mt-4 text-indigo-600 hover:underline">
          Back to contents
        </Link>
      </div>
    )
  }

  const status = statusConfig[content.status as ContentStatus] || statusConfig.draft

  return (
    <div
      style={{ width: '100%', height: 'calc(100vh - 88px)', overflow: 'auto' }}
      className="bg-slate-50"
    >
      {/* Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/contents"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-slate-900 truncate">{content.title}</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Created{' '}
                {new Date(content.created_at).toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div
              className={`flex items-center gap-2 rounded-full px-4 py-2 ${status.bgColor} ${status.color}`}
            >
              {status.icon}
              <span className="font-medium">{status.label}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="grid grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="col-span-2 space-y-6">
            {/* Content Body */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
                Content
              </h3>
              <div className="prose prose-slate max-w-none">
                <p className="whitespace-pre-wrap text-slate-700">{content.body}</p>
              </div>
            </div>

            {/* Actions */}
            {content.status === 'draft' && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                    <Send className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-900">Ready to submit?</h3>
                    <p className="text-sm text-amber-700 mt-1">
                      Submit this content for approval to start the verification process.
                    </p>
                    <button
                      type="button"
                      onClick={handleSubmitForApproval}
                      className="mt-3 flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
                    >
                      <Send className="h-4 w-4" />
                      Submit for Approval
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Verification Flow */}
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-indigo-500" />
                  <h3 className="font-semibold text-slate-900">Verification Flow</h3>
                </div>
              </div>

              <div className="p-4 max-h-[500px] overflow-auto">
                {requirements.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">
                      No verification requirements configured
                    </p>
                    <Link
                      href="/verifications/content"
                      className="mt-2 inline-block text-sm text-indigo-600 hover:underline"
                    >
                      Configure verification flow
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(requirementsByStep)
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(([step, reqs]) => (
                        <div key={step}>
                          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                            Step {step}
                          </div>
                          <div className="space-y-2">
                            {reqs.map((req) => {
                              const verification = getVerificationForRequirement(req.id)
                              const canApprove =
                                canApproveRequirement(req) && content.status === 'pending_approval'
                              const isApproved = verification?.status === 'approved'
                              const isRejected = verification?.status === 'rejected'

                              return (
                                <div
                                  key={req.id}
                                  className={`rounded-lg border p-3 ${
                                    isApproved
                                      ? 'border-emerald-200 bg-emerald-50'
                                      : isRejected
                                        ? 'border-red-200 bg-red-50'
                                        : 'border-slate-200 bg-white'
                                  }`}
                                >
                                  <div className="flex items-start gap-3">
                                    <div
                                      className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                        isApproved
                                          ? 'bg-emerald-100 text-emerald-600'
                                          : isRejected
                                            ? 'bg-red-100 text-red-600'
                                            : 'bg-slate-100 text-slate-500'
                                      }`}
                                    >
                                      {req.verifier_type === 'user' ? (
                                        <User className="h-4 w-4" />
                                      ) : (
                                        <Users className="h-4 w-4" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium text-slate-900">
                                        {req.verifier_type === 'user' ? 'User' : 'Role'} Approval
                                      </div>
                                      <div className="text-xs text-slate-500 mt-0.5">
                                        {req.is_signature_mandatory && (
                                          <span className="inline-flex items-center gap-1 text-amber-600">
                                            <PenTool className="h-3 w-3" />
                                            Signature required
                                          </span>
                                        )}
                                        {req.is_all_required && req.verifier_type === 'role' && (
                                          <span className="text-indigo-600">
                                            All users must approve
                                          </span>
                                        )}
                                      </div>

                                      {/* Status */}
                                      {isApproved && (
                                        <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
                                          <CheckCircle2 className="h-3 w-3" />
                                          Approved
                                        </div>
                                      )}
                                      {isRejected && (
                                        <div className="mt-2">
                                          <div className="flex items-center gap-1 text-xs text-red-600">
                                            <XCircle className="h-3 w-3" />
                                            Rejected
                                          </div>
                                          {verification?.reason && (
                                            <div className="mt-1 text-xs text-red-500 italic">
                                              "{verification.reason}"
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {/* Action button */}
                                      {canApprove && !isApproved && !isRejected && (
                                        <button
                                          type="button"
                                          onClick={() => handleOpenApproval(req)}
                                          className="mt-2 flex items-center gap-1 rounded bg-indigo-500 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-600"
                                        >
                                          <CheckCircle2 className="h-3 w-3" />
                                          Review & Approve
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Verified Badge */}
            {content.verified_at && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-emerald-800">Verified</div>
                    <div className="text-xs text-emerald-600">
                      {new Date(content.verified_at).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Review & Approve</h2>
            </div>
            <div className="p-6 space-y-4">
              {/* Status */}
              <div>
                <span className="block text-sm font-medium text-slate-700 mb-2">Decision</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setApprovalForm({ ...approvalForm, status: 'approved' })}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 transition-colors ${
                      approvalForm.status === 'approved'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setApprovalForm({ ...approvalForm, status: 'rejected' })}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 transition-colors ${
                      approvalForm.status === 'rejected'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <XCircle className="h-5 w-5" />
                    Reject
                  </button>
                </div>
              </div>

              {/* Reason */}
              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-slate-700 mb-1">
                  <MessageSquare className="h-4 w-4 inline mr-1" />
                  {approvalForm.status === 'rejected' ? 'Reason (required)' : 'Comments (optional)'}
                </label>
                <textarea
                  id="reason"
                  value={approvalForm.reason}
                  onChange={(e) => setApprovalForm({ ...approvalForm, reason: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                  placeholder={
                    approvalForm.status === 'rejected'
                      ? 'Please provide a reason...'
                      : 'Add any comments...'
                  }
                />
              </div>

              {/* Signature */}
              <div>
                <label
                  htmlFor="signature"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  <PenTool className="h-4 w-4 inline mr-1" />
                  Digital Signature
                </label>
                <input
                  id="signature"
                  type="text"
                  value={approvalForm.signature}
                  onChange={(e) => setApprovalForm({ ...approvalForm, signature: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="Type your full name as signature"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setShowApprovalModal(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitApproval}
                disabled={
                  isSubmitting ||
                  (approvalForm.status === 'rejected' && !approvalForm.reason.trim())
                }
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                  approvalForm.status === 'approved'
                    ? 'bg-emerald-500 hover:bg-emerald-600'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {approvalForm.status === 'approved' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
