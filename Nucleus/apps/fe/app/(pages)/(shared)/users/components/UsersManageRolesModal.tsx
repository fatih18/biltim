'use client'

import type { RoleJSON } from '@monorepo/db-entities/schemas/default/role'
import type { UserRoleJSON } from '@monorepo/db-entities/schemas/default/user_role'
import { Check, Loader2, Search, Shield, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'

interface UsersManageRolesModalProps {
  isOpen: boolean
  userId: string | null
  onClose: () => void
}

export function UsersManageRolesModal({ isOpen, userId, onClose }: UsersManageRolesModalProps) {
  const actions = useGenericApiActions()
  const [search, setSearch] = useState('')
  const [roles, setRoles] = useState<RoleJSON[]>([])
  const [assignedRoleIds, setAssignedRoleIds] = useState<string[]>([])
  const [assignmentMap, setAssignmentMap] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [pendingRoleIds, setPendingRoleIds] = useState<string[]>([])

  useEffect(() => {
    if (!isOpen || !userId) {
      return
    }

    setIsLoading(true)
    setRoles([])
    setAssignedRoleIds([])
    setAssignmentMap({})
    setPendingRoleIds([])
    setSearch('')

    actions.GET_USER_ROLES?.start({
      payload: {
        page: 1,
        limit: 100,
        filters: { user_id: userId },
      },
      disableAutoRedirect: true,
      onAfterHandle: (userRolesData) => {
        const list = (userRolesData?.data ?? []) as UserRoleJSON[]
        const nextAssignedIds: string[] = []
        const nextMap: Record<string, string> = {}

        for (const item of list) {
          if (item.role_id) {
            nextAssignedIds.push(item.role_id)
            nextMap[item.role_id] = item.id
          }
        }

        actions.GET_ROLES?.start({
          payload: {
            page: 1,
            limit: 100,
          },
          disableAutoRedirect: true,
          onAfterHandle: (rolesData) => {
            setIsLoading(false)
            if (!rolesData) {
              return
            }
            setRoles(rolesData.data as RoleJSON[])
            setAssignedRoleIds(nextAssignedIds)
            setAssignmentMap(nextMap)
          },
          onErrorHandle: (error) => {
            setIsLoading(false)
            console.error('Get roles failed:', error)
          },
        })
      },
      onErrorHandle: (error) => {
        setIsLoading(false)
        console.error('Get user roles failed:', error)
      },
    })
  }, [isOpen, userId])

  const assignedSet = new Set(assignedRoleIds)

  const filteredRoles = (() => {
    const term = search.trim().toLowerCase()
    if (!term) {
      return roles
    }
    return roles.filter((role) => {
      const name = role.name?.toLowerCase() ?? ''
      const description = role.description?.toLowerCase() ?? ''
      return name.includes(term) || description.includes(term)
    })
  })()

  function isPending(roleId: string): boolean {
    return pendingRoleIds.includes(roleId)
  }

  function handleToggle(role: RoleJSON) {
    if (!userId) {
      return
    }

    const roleId = role.id
    const currentlyAssigned = assignedSet.has(roleId)

    setPendingRoleIds((prev) => (prev.includes(roleId) ? prev : [...prev, roleId]))

    if (currentlyAssigned) {
      const relationId = assignmentMap[roleId]
      if (!relationId) {
        setPendingRoleIds((prev) => prev.filter((id) => id !== roleId))
        return
      }

      actions.DELETE_USER_ROLE?.start({
        payload: { _id: relationId },
        disableAutoRedirect: true,
        onAfterHandle: () => {
          setAssignedRoleIds((prev) => prev.filter((id) => id !== roleId))
          setAssignmentMap((prev) => {
            const next = { ...prev }
            delete next[roleId]
            return next
          })
          setPendingRoleIds((prev) => prev.filter((id) => id !== roleId))
        },
        onErrorHandle: (error) => {
          console.error('Delete user role failed:', error)
          setPendingRoleIds((prev) => prev.filter((id) => id !== roleId))
        },
      })
    } else {
      actions.ADD_USER_ROLE?.start({
        payload: {
          user_id: userId,
          role_id: roleId,
        },
        disableAutoRedirect: true,
        onAfterHandle: (created) => {
          if (!created) {
            setPendingRoleIds((prev) => prev.filter((id) => id !== roleId))
            return
          }

          const createdRelation = created as unknown as UserRoleJSON

          setAssignedRoleIds((prev) => (prev.includes(roleId) ? prev : [...prev, roleId]))
          setAssignmentMap((prev) => ({
            ...prev,
            [roleId]: createdRelation.id,
          }))
          setPendingRoleIds((prev) => prev.filter((id) => id !== roleId))
        },
        onErrorHandle: (error) => {
          console.error('Add user role failed:', error)
          setPendingRoleIds((prev) => prev.filter((id) => id !== roleId))
        },
      })
    }
  }

  if (!isOpen || !userId) {
    return null
  }

  const isLoadingInitial = isLoading && roles.length === 0

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-6">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl">
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
                <h2 className="text-2xl font-bold">Manage Roles</h2>
                <p className="mt-2 text-sm text-slate-300">
                  Assign or remove roles for this user. Role permissions come from their claims.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Close role management"
                disabled={isLoading}
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
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search roles by name or description..."
                className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-sm text-white placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Search roles"
                disabled={isLoading}
              />
            </div>
          </header>

          <div className="max-h-[26rem] overflow-y-auto px-8 py-6">
            {isLoadingInitial ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-300">
                <Loader2 className="animate-spin" size={28} />
                <span>Loading roles...</span>
              </div>
            ) : filteredRoles.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-slate-300">
                No roles found with the current filters.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRoles.map((role) => {
                  const isAssigned = assignedSet.has(role.id)
                  const isBusy = isPending(role.id)

                  return (
                    <div
                      key={role.id}
                      className={`rounded-2xl border p-4 transition ${
                        isAssigned
                          ? 'border-emerald-400/60 bg-emerald-500/10 shadow-lg shadow-emerald-500/10'
                          : 'border-white/10 bg-white/5'
                      }`}
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
                            <Shield size={16} />
                            {role.is_system ? 'System Role' : 'Custom Role'}
                          </div>
                          <h3 className="text-lg font-semibold text-white">{role.name}</h3>
                          {role.description ? (
                            <p className="text-sm text-slate-300/80">{role.description}</p>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleToggle(role)}
                            disabled={isBusy}
                            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                              isAssigned
                                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                : 'border border-white/20 bg-white/10 text-white hover:bg-white/20'
                            }`}
                          >
                            {isBusy ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : isAssigned ? (
                              <>
                                <Check className="h-4 w-4" />
                                <span>Assigned</span>
                              </>
                            ) : (
                              <>Assign</>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
