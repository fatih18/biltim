'use client'

import { useModal } from '@/app/_hooks/UseModal'
import { containsTr } from '@/app/_utils/textSearch'
import type { RoleJSON } from '@monorepo/db-entities/schemas/default/role'
import type { UserRoleJSON } from '@monorepo/db-entities/schemas/default/user_role'
import { Check, Loader2, Search, Shield, X } from 'lucide-react'
import { confirmDialog } from '@/app/_components/Global/ConfirmDialog'
import { useEffect, useState } from 'react'
import { useGenericApiActions } from '@/app/_hooks/UseNucleusApi'

interface UsersManageRolesModalProps {
  isOpen: boolean
  userId: string | null
  onClose: () => void
}

export function UsersManageRolesModal({ isOpen, userId, onClose }: UsersManageRolesModalProps) {
  const modal = useModal(onClose, { enabled: isOpen })

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

  /*
   * Filtered here, not on the server, and deliberately: the modal has to show
   * every role to say which are assigned, so it already holds the complete
   * set — this is a search within what is on screen, not a page of a larger
   * list.
   *
   * The comparison is the Turkish one. `toLowerCase()` maps I to i, so a role
   * called "İdari İşler" could not be found by typing "idari".
   */
  const filteredRoles = (() => {
    const term = search.trim()
    if (!term) {
      return roles
    }
    return roles.filter(
      (role) => containsTr(role.name, term) || containsTr(role.description, term)
    )
  })()

  function isPending(roleId: string): boolean {
    return pendingRoleIds.includes(roleId)
  }

  async function handleToggle(role: RoleJSON) {
    if (!userId) {
      return
    }

    const roleId = role.id
    const currentlyAssigned = assignedSet.has(roleId)

    /*
     * Taking a role away is destructive and silent: the person keeps their
     * account but loses the screens that role opened, and nothing else on this
     * modal says it happened. Deleting a location asks first; removing the only
     * role a user has must ask too.
     */
    if (currentlyAssigned) {
      const isLastRole = assignedRoleIds.length === 1
      const confirmed = await confirmDialog({
        title: 'Rol kaldırılsın mı?',
        message: isLastRole
          ? `"${role.name}" bu kullanıcının tek rolü. Kaldırılırsa uygulamada hiçbir ekranı açamaz.`
          : `"${role.name}" rolünün açtığı ekranlar ve yetkiler bu kullanıcıdan alınır.`,
        confirmLabel: 'Rolü kaldır',
        cancelLabel: 'Vazgeç',
        tone: 'danger',
      })
      if (!confirmed) {
        return
      }
    }

    setPendingRoleIds((prev) => (prev.includes(roleId) ? prev : [...prev, roleId]))

    if (currentlyAssigned) {
      const relationId = assignmentMap[roleId]
      if (!relationId) {
        setPendingRoleIds((prev) => prev.filter((id) => id !== roleId))
        return
      }

      actions.DELETE_USER_ROLE?.start({
        payload: { _id: relationId },
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
      <div {...modal} className="bg-white relative w-full max-w-3xl overflow-hidden rounded-3xl dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 text-slate-900 dark:text-white shadow-2xl">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-grid-pattern" />
        </div>

        {isLoadingInitial ? (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white dark:bg-slate-900/70 backdrop-blur-sm">
            <Loader2 className="animate-spin" size={28} />
            <span className="text-sm text-slate-800 dark:text-slate-200">İşleniyor, lütfen bekleyin...</span>
          </div>
        ) : null}

        <div className="relative z-10">
          <header className="flex flex-col gap-6 border-b border-slate-300 dark:border-white/10 px-8 py-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Rolleri Yönet</h2>
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                  Bu kullanıcı için rol atayın veya kaldırın. Rol izinleri claim'lerden gelir.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-white/5 p-2 text-slate-900 dark:text-white transition hover:bg-slate-300 hover:dark:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Close role management"
                disabled={isLoading}
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400"
                size={18}
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="İsim veya açıklamaya göre rol ara..."
                className="w-full rounded-2xl border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-white/5 py-3 pl-12 pr-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-600 placeholder:dark:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Search roles"
                disabled={isLoading}
              />
            </div>
          </header>

          <div className="max-h-[26rem] overflow-y-auto px-8 py-6">
            {isLoadingInitial ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-700 dark:text-slate-300">
                <Loader2 className="animate-spin" size={28} />
                <span>Roller yükleniyor...</span>
              </div>
            ) : filteredRoles.length === 0 ? (
              <div className="rounded-2xl border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-white/5 p-10 text-center text-slate-700 dark:text-slate-300">
                Mevcut filtrelerle rol bulunamadı.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRoles.map((role) => {
                  const isAssigned = assignedSet.has(role.id)
                  const isBusy = isPending(role.id)

                  return (
                    <div
                      key={role.id}
                      className={`rounded-2xl border p-4 transition ${ isAssigned ?'border-emerald-400/60 bg-emerald-100 dark:bg-emerald-500/10 shadow-lg shadow-emerald-500/10'
                          : 'border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-white/5'
                      }`}
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                            <Shield size={16} />
                            {role.is_system ? 'Sistem Rolü' : 'Özel Rol'}
                          </div>
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{role.name}</h3>
                          {role.description ? (
                            <p className="text-sm text-slate-600 dark:text-slate-300">{role.description}</p>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleToggle(role)}
                            disabled={isBusy}
                            aria-label={
                              isAssigned
                                ? `${role.name} rolünü kaldır`
                                : `${role.name} rolünü ata`
                            }
                            title={
                              isAssigned
                                ? `${role.name} rolünü kaldır`
                                : `${role.name} rolünü ata`
                            }
                            className={`group inline-flex w-32 cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                              isAssigned
                                ? 'bg-emerald-500 text-white hover:bg-rose-600'
                                : 'border border-slate-300 bg-slate-200 text-slate-900 hover:bg-slate-300 dark:border-white/20 dark:bg-white/10 dark:text-white hover:dark:bg-white/20'
                            }`}
                          >
                            {isBusy ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : isAssigned ? (
                              <>
                                {/*
                                 * The assigned pill is the only way to take a
                                 * role back, but "Atandı" reads as a status, so
                                 * it was removing roles on a click nobody
                                 * expected to be one. On hover it now says what
                                 * the click does.
                                 */}
                                <Check className="h-4 w-4 group-hover:hidden" />
                                <X className="hidden h-4 w-4 group-hover:block" />
                                <span className="group-hover:hidden">Atandı</span>
                                <span className="hidden group-hover:inline">Kaldır</span>
                              </>
                            ) : (
                              <>Ata</>
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
