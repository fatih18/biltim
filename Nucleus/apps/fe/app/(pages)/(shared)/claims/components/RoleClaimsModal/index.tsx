'use client'

import type { ClaimJSON } from '@monorepo/db-entities/schemas/default/claim'
import type { RoleJSON } from '@monorepo/db-entities/schemas/default/role'
import type { RoleClaimJSON } from '@monorepo/db-entities/schemas/default/role_claim'
import { Check, Loader2, Search, X } from 'lucide-react'
import type React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'
import type { PaginationInfo } from '../../types'

type RoleClaimsModalProps = {
  isOpen: boolean
  role: RoleJSON | null
  onClose: () => void
}

export function RoleClaimsModal({ isOpen, role, onClose }: RoleClaimsModalProps) {
  const actions = useGenericApiActions()
  const [claims, setClaims] = useState<ClaimJSON[]>([])
  const [assignedClaimIds, setAssignedClaimIds] = useState<string[]>([])
  const [assignmentMap, setAssignmentMap] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [pendingClaimIds, setPendingClaimIds] = useState<string[]>([])
  const [claimsPage, setClaimsPage] = useState(1)
  const [claimsHasNext, setClaimsHasNext] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  function loadClaimsPage(page: number, append: boolean) {
    const limit = 50

    if (append) {
      setIsLoadingMore(true)
    } else {
      setIsLoading(true)
    }

    actions.GET_CLAIMS?.start({
      payload: {
        page,
        limit,
        orderBy: 'created_at',
        orderDirection: 'desc',
      },
      onAfterHandle: (claimsData) => {
        const list = (claimsData?.data ?? []) as ClaimJSON[]
        const pagination = (claimsData?.pagination ?? undefined) as PaginationInfo | undefined

        setClaims((prev) => (append ? [...prev, ...list] : list))

        if (pagination) {
          setClaimsPage(pagination.page)
          setClaimsHasNext(pagination.hasNext)
        } else {
          setClaimsPage(page)
          setClaimsHasNext(false)
        }

        setIsLoading(false)
        setIsLoadingMore(false)
      },
      onErrorHandle: (error) => {
        console.error('Get claims for role failed:', error)
        setIsLoading(false)
        setIsLoadingMore(false)
      },
    })
  }

  useEffect(() => {
    if (!isOpen || !role?.id) {
      return
    }

    setIsLoading(true)
    setClaims([])
    setAssignedClaimIds([])
    setAssignmentMap({})
    setPendingClaimIds([])
    setClaimsPage(1)
    setClaimsHasNext(false)
    setIsLoadingMore(false)

    actions.GET_ROLE_CLAIMS?.start({
      payload: {
        page: 1,
        limit: 500,
        filters: { role_id: role.id },
        relations: ['claim'],
      } as never,
      onAfterHandle: (data) => {
        const list = (data?.data ?? []) as RoleClaimJSON[]
        const nextAssignedIds: string[] = []
        const nextMap: Record<string, string> = {}

        for (const item of list) {
          if (item.claim_id && item.claim_id.length > 0) {
            nextAssignedIds.push(item.claim_id)
            nextMap[item.claim_id] = item.id
          } else if (item.claim?.id) {
            nextAssignedIds.push(item.claim.id)
            nextMap[item.claim.id] = item.id
          }
        }

        setAssignedClaimIds(nextAssignedIds)
        setAssignmentMap(nextMap)
        loadClaimsPage(1, false)
      },
      onErrorHandle: (error) => {
        setIsLoading(false)
        console.error('Get role_claims failed:', error)
      },
    })
  }, [isOpen, role?.id])

  const assignedSet = useMemo(() => new Set(assignedClaimIds), [assignedClaimIds])

  const filteredClaims = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) {
      return claims
    }

    return claims.filter((claim) => {
      const action = claim.action?.toLowerCase() ?? ''
      const path = claim.path?.toLowerCase() ?? ''
      const method = claim.method?.toLowerCase() ?? ''
      return action.includes(term) || path.includes(term) || method.includes(term)
    })
  }, [claims, search])

  function isPending(claimId: string): boolean {
    return pendingClaimIds.includes(claimId)
  }

  function handleToggle(claim: ClaimJSON) {
    if (!role?.id) {
      return
    }

    const claimId = claim.id
    const currentlyAssigned = assignedSet.has(claimId)

    setPendingClaimIds((prev) => (prev.includes(claimId) ? prev : [...prev, claimId]))

    if (currentlyAssigned) {
      const relationId = assignmentMap[claimId]
      if (!relationId) {
        setPendingClaimIds((prev) => prev.filter((id) => id !== claimId))
        return
      }

      actions.DELETE_ROLE_CLAIM?.start({
        payload: { _id: relationId },
        onAfterHandle: () => {
          setAssignedClaimIds((prev) => prev.filter((id) => id !== claimId))
          setAssignmentMap((prev) => {
            const next = { ...prev }
            delete next[claimId]
            return next
          })
          setPendingClaimIds((prev) => prev.filter((id) => id !== claimId))
        },
        onErrorHandle: (error) => {
          console.error('Delete role_claim failed:', error)
          setPendingClaimIds((prev) => prev.filter((id) => id !== claimId))
        },
      })
    } else {
      actions.ADD_ROLE_CLAIM?.start({
        payload: {
          role_id: role.id,
          claim_id: claimId,
        },
        onAfterHandle: (created) => {
          const createdRelation = created as RoleClaimJSON | undefined
          if (!createdRelation) {
            setPendingClaimIds((prev) => prev.filter((id) => id !== claimId))
            return
          }

          setAssignedClaimIds((prev) => (prev.includes(claimId) ? prev : [...prev, claimId]))
          setAssignmentMap((prev) => ({
            ...prev,
            [claimId]: createdRelation.id,
          }))
          setPendingClaimIds((prev) => prev.filter((id) => id !== claimId))
        },
        onErrorHandle: (error) => {
          console.error('Add role_claim failed:', error)
          setPendingClaimIds((prev) => prev.filter((id) => id !== claimId))
        },
      })
    }
  }

  const renderClaimRow = (claim: ClaimJSON) => {
    const isAssigned = assignedSet.has(claim.id)
    const busy = isPending(claim.id)

    return (
      <div
        key={claim.id}
        className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-emerald-400/70 hover:bg-emerald-500/10"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              {claim.action}
            </div>
            <div className="text-xs text-slate-300/90">
              <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                {claim.method}
              </span>
              <span className="ml-2 text-slate-200">{claim.path}</span>
            </div>
            <div className="text-[11px] text-slate-400">
              Matching mode: <span className="font-semibold">{claim.mode}</span>
            </div>
            {claim.description ? (
              <div className="text-[11px] text-slate-300/80">{claim.description}</div>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleToggle(claim)}
              disabled={busy}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${isAssigned
                ? 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400'
                : 'border border-white/30 bg-white/10 text-white hover:bg-white/20'
                }`}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isAssigned ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Assigned</span>
                </>
              ) : (
                <span>Assign</span>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!isOpen || !role) {
    return null
  }

  const isLoadingInitial = isLoading && claims.length === 0

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-6">
      <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl">
        {isLoadingInitial ? (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-slate-900/70 backdrop-blur-sm">
            <Loader2 className="animate-spin" size={28} />
            <span className="text-sm text-slate-200">Loading claims...</span>
          </div>
        ) : null}

        <div className="relative z-10">
          <header className="flex flex-col gap-4 border-b border-white/10 px-8 py-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Manage Claims for {role.name}</h2>
                <p className="mt-1 text-sm text-slate-300">
                  Attach or detach low-level claims that this role will provide to users.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-white transition hover:bg-white/20"
                aria-label="Close role claims management"
              >
                <X size={18} />
              </button>
            </div>

            <div className="text-xs text-slate-300">
              Assigned <span className="font-semibold">{assignedClaimIds.length}</span> of{' '}
              <span className="font-semibold">{claims.length}</span> claims
            </div>

            <div className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search claims by action, path or method..."
                className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-sm text-white placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
                aria-label="Search claims"
              />
            </div>
          </header>

          <div
            className="max-h-[28rem] overflow-y-auto px-8 py-6"
            onScroll={(event: React.UIEvent<HTMLDivElement>) => {
              if (isLoadingInitial || isLoadingMore || !claimsHasNext) {
                return
              }

              const target = event.currentTarget
              if (target.scrollTop + target.clientHeight >= target.scrollHeight - 80) {
                loadClaimsPage(claimsPage + 1, true)
              }
            }}
          >
            {isLoadingInitial ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-300">
                <Loader2 className="animate-spin" size={28} />
                <span>Loading claims...</span>
              </div>
            ) : filteredClaims.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-slate-300">
                No claims found with the current filters.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredClaims.map(renderClaimRow)}

                {isLoadingMore && (
                  <div className="flex items-center justify-center gap-2 py-4 text-xs text-slate-300">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading more claims...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
