'use client'

import type { ClaimJSON } from '@monorepo/db-entities/schemas/default/claim'
import { Check, ChevronDown, Loader2, Search, ShieldCheck, X } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'
import { useUsersStore } from '@/app/_store/usersStore'

interface UsersManageClaimsModalProps {
  isOpen: boolean
  userId: string | null
  currentAssignments: ClaimJSON[]
  onClose: () => void
}

function buildSearchPayload(
  page: number,
  limit: number,
  search: string
): { page: number; limit: number; search?: string } {
  const trimmed = search.trim()
  return {
    page,
    limit,
    search: trimmed.length > 0 ? trimmed : undefined,
  }
}

export function UsersManageClaimsModal({
  isOpen,
  userId,
  currentAssignments,
  onClose,
}: UsersManageClaimsModalProps) {
  const actions = useGenericApiActions()
  const usersStore = useUsersStore()
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const resetClaimModal = usersStore.resetClaimModal
  const manageClaimsModalOpen = usersStore.modals.manageClaims
  const claimModal = usersStore.claimModal
  const {
    search,
    limit,
    isLoading,
    isLoadingMore,
    hasNext,
    page: currentPage,
    claims,
    assignedClaimIds,
    assignmentMap,
  } = claimModal
  const pendingPageRef = useRef<number | null>(null)
  const skipNextSearchEffectRef = useRef(false)
  const lastInitializedUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isOpen || !userId) {
      lastInitializedUserIdRef.current = null
      return
    }

    if (lastInitializedUserIdRef.current === userId) {
      return
    }

    lastInitializedUserIdRef.current = userId

    const assignedIds: string[] = []
    const assignmentMapping: Record<string, string> = {}

    for (const claim of currentAssignments) {
      assignedIds.push(claim.id)
      const relationId = (claim as unknown as { relation?: { id?: string } }).relation?.id
      if (relationId) {
        assignmentMapping[claim.id] = relationId
      }
    }

    resetClaimModal({ assignedClaimIds: assignedIds, assignmentMap: assignmentMapping })
    skipNextSearchEffectRef.current = true
    pendingPageRef.current = null
    void loadClaims({ append: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, userId])

  useEffect(() => {
    if (!sentinelRef.current) {
      return
    }

    observerRef.current?.disconnect()
    observerRef.current = new IntersectionObserver((entries) => {
      const [entry] = entries
      if (!entry || !entry.isIntersecting) {
        return
      }
      if (!hasNext || isLoadingMore || isLoading) {
        return
      }
      void loadClaims({ append: true, page: currentPage + 1 })
    })

    observerRef.current.observe(sentinelRef.current)

    return () => {
      observerRef.current?.disconnect()
    }
  }, [hasNext, currentPage, isLoadingMore, isLoading])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    if (skipNextSearchEffectRef.current) {
      skipNextSearchEffectRef.current = false
      return
    }

    void loadClaims({ append: false })
  }, [search, isOpen])

  async function loadClaims({ append, page }: { append: boolean; page?: number }) {
    if (!userId) {
      return
    }

    const requestedPage = page ?? 1

    if (pendingPageRef.current === requestedPage) {
      return
    }

    if (append) {
      usersStore.setClaimModalLoadingMore(true)
    } else {
      usersStore.setClaimModalLoading(true)
    }

    pendingPageRef.current = requestedPage
    const payload = buildSearchPayload(requestedPage, limit, search)
    actions.GET_CLAIMS?.start({
      payload,
      onAfterHandle: (data) => {
        if (!data) {
          return
        }
      },
      onErrorHandle: (error) => {
        console.error('Get claims failed:', error)
      },
    })
  }

  function isFetchLocked(): boolean {
    return isLoading || isLoadingMore
  }

  function handleSearchChange(event: React.ChangeEvent<HTMLInputElement>) {
    usersStore.setClaimModalSearch(event.target.value)
  }

  const isLoadingInitial = isLoading && claims.length === 0
  const assignedSet = useMemo(() => new Set(assignedClaimIds), [assignedClaimIds])
  const isInteractionLocked = isFetchLocked()
  const shouldDisplayModal = manageClaimsModalOpen && isOpen && Boolean(userId)

  if (!shouldDisplayModal) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-6">
      <div
        className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl"
        aria-busy={isLoading || isLoadingMore}
        aria-live="polite"
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-grid-pattern" />
        </div>

        {isLoadingInitial ? (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-slate-900/70 backdrop-blur-sm">
            <Loader2 className="animate-spin" size={28} />
            <span className="text-sm text-slate-200">Processing, please wait...</span>
          </div>
        ) : null}

        <div className="relative z-10">
          <header className="flex flex-col gap-6 border-b border-white/10 px-8 py-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Manage Claims</h2>
                <p className="mt-2 text-sm text-slate-300">
                  Assign or remove authorization claims for this user. Scroll to load additional
                  entries.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  usersStore.clearClaimModalPendingIds()
                  onClose()
                }}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Close claim management"
                disabled={isInteractionLocked}
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="search"
                value={usersStore.claimModal.search}
                onChange={handleSearchChange}
                placeholder="Search claims by action or path..."
                className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-sm text-white placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Search claims"
                disabled={isInteractionLocked}
              />
            </div>
          </header>

          <div className="max-h-[26rem] overflow-y-auto px-8 py-6">
            {isLoadingInitial ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-300">
                <Loader2 className="animate-spin" size={28} />
                <span>Loading claims...</span>
              </div>
            ) : claims.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-slate-300">
                No claims found with the current filters.
              </div>
            ) : (
              <div className="space-y-4">
                {claims.map((claim) => {
                  const isAssigned = assignedSet.has(claim.id) || Boolean(assignmentMap[claim.id])

                  return (
                    <div
                      key={claim.id}
                      className={`rounded-2xl border p-4 transition ${
                        isAssigned
                          ? 'border-emerald-400/60 bg-emerald-500/10 shadow-lg shadow-emerald-500/10'
                          : 'border-white/10 bg-white/5'
                      }`}
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
                            <ShieldCheck size={16} />
                            {claim.mode === 'exact' ? 'Exact Match' : 'Starts With'}
                          </div>
                          <h3 className="text-lg font-semibold text-white">{claim.action}</h3>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                            <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 font-semibold uppercase tracking-wide">
                              {claim.method}
                            </span>
                            <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1">
                              {claim.path}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-3 py-1">
                              <ChevronDown size={14} /> {claim.mode}
                            </span>
                          </div>
                          {claim.description ? (
                            <p className="text-sm text-slate-300/80">{claim.description}</p>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-3"></div>
                      </div>
                    </div>
                  )
                })}

                <div ref={sentinelRef} className="h-1" />
                {usersStore.claimModal.isLoadingMore ? (
                  <div className="flex items-center justify-center gap-2 pb-4 text-sm text-slate-300">
                    <Loader2 className="animate-spin" size={16} />
                    Loading more claims...
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <footer className="flex flex-col gap-4 border-t border-white/10 bg-black/20 px-8 py-6">
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1">
                <Check size={14} /> Assigned
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-red-400/40 bg-red-500/10 px-3 py-1">
                <X size={14} /> Unassigned
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                <Loader2 className="animate-spin" size={14} /> Pending
              </span>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  usersStore.clearClaimModalPendingIds()
                  onClose()
                }}
                className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isInteractionLocked}
              >
                Close
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}
