'use client'

import { useModal } from '@/app/_hooks/UseModal'
import { containsTr } from '@/app/_utils/textSearch'
import { Check, Loader2, Search, Shield, X } from 'lucide-react'
import { confirmDialog } from '@/app/_components/Global/ConfirmDialog'
import { readServerReasons } from '@/app/_components/Global/PasswordRules'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useGenericApiActions } from '@/app/_hooks/UseNucleusApi'

interface UsersManageRolesModalProps {
  isOpen: boolean
  userId: string | null
  onClose: () => void
}

/** One role as GET /biltim/users/roles describes it for this account. */
export type AccountRole = {
  id: string
  name: string
  description: string | null
  is_system: boolean
  assigned: boolean
  /** Whether THIS caller may give or take this role on this account. */
  assignable: boolean
  claims: Array<{ id: string; action: string; method: string; path: string }>
}

export function readAccountRoles(data: unknown): { editable: boolean; roles: AccountRole[] } {
  const d = (data ?? {}) as { editable?: unknown; roles?: unknown }
  const roles = Array.isArray(d.roles) ? (d.roles as Array<Record<string, unknown>>) : []
  return {
    editable: d.editable === true,
    roles: roles.map((r) => ({
      id: String(r.id ?? ''),
      name: String(r.name ?? ''),
      description: r.description == null ? null : String(r.description),
      is_system: r.is_system === true || r.isSystem === true,
      assigned: r.assigned === true,
      assignable: r.assignable === true,
      claims: Array.isArray(r.claims)
        ? (r.claims as Array<Record<string, unknown>>).map((c) => ({
            id: String(c.id ?? ''),
            action: String(c.action ?? ''),
            method: String(c.method ?? ''),
            path: String(c.path ?? ''),
          }))
        : [],
    })),
  }
}

/*
 * Reads and writes through /biltim/users/roles. The generic /userRoles routes
 * this used write only for the godmin, and Merkez Ekip cannot read /roles or
 * /userRoles, so for Merkez Ekip the modal opened empty. The server now also
 * says which roles this caller may change on this account, and the buttons
 * follow it instead of offering what would be refused.
 */
export function UsersManageRolesModal({ isOpen, userId, onClose }: UsersManageRolesModalProps) {
  const modal = useModal(onClose, { enabled: isOpen })

  const actions = useGenericApiActions()
  const [search, setSearch] = useState('')
  const [roles, setRoles] = useState<AccountRole[]>([])
  const [editable, setEditable] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [pendingRoleIds, setPendingRoleIds] = useState<string[]>([])

  useEffect(() => {
    if (!isOpen || !userId) {
      return
    }

    setIsLoading(true)
    setRoles([])
    setEditable(false)
    setLoadError(null)
    setPendingRoleIds([])
    setSearch('')

    // biome-ignore lint/suspicious/noExplicitAny: custom endpoint, untyped payload
    ;(actions as any).BILTIM_USER_ROLES?.start({
      payload: { userId },
      onAfterHandle: (data: unknown) => {
        setIsLoading(false)
        const result = readAccountRoles(data)
        setRoles(result.roles)
        setEditable(result.editable)
      },
      onErrorHandle: (error: unknown) => {
        setIsLoading(false)
        const reasons = readServerReasons(error)
        setLoadError(reasons.length > 0 ? reasons.join(' ') : 'Roller yüklenemedi.')
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, userId])

  const assignedCount = roles.filter((role) => role.assigned).length

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

  async function handleToggle(role: AccountRole) {
    if (!userId || !role.assignable) {
      return
    }

    const roleId = role.id
    const currentlyAssigned = role.assigned

    /*
     * Taking a role away is destructive and silent: the person keeps their
     * account but loses the screens that role opened, and nothing else on this
     * modal says it happened. Deleting a location asks first; removing the only
     * role a user has must ask too.
     */
    if (currentlyAssigned) {
      const isLastRole = assignedCount === 1
      const confirmed = await confirmDialog({
        title: 'Rol kaldırılsın mı?',
        message: `${
          isLastRole
            ? `"${role.name}" bu kullanıcının tek rolü. Kaldırılırsa uygulamada hiçbir ekranı açamaz.`
            : `"${role.name}" rolünün açtığı ekranlar ve yetkiler bu kullanıcıdan alınır.`
        } Kullanıcının açık oturumları kapatılır.`,
        confirmLabel: 'Rolü kaldır',
        cancelLabel: 'Vazgeç',
        tone: 'danger',
      })
      if (!confirmed) {
        return
      }
    }

    setPendingRoleIds((prev) => (prev.includes(roleId) ? prev : [...prev, roleId]))
    const done = () => setPendingRoleIds((prev) => prev.filter((id) => id !== roleId))

    // biome-ignore lint/suspicious/noExplicitAny: custom endpoint, untyped payload
    ;(actions as any).BILTIM_SET_USER_ROLE?.start({
      payload: { userId, roleId, assigned: !currentlyAssigned },
      onAfterHandle: (data: unknown) => {
        done()
        const d = (data ?? {}) as { assigned?: unknown }
        const assigned = typeof d.assigned === 'boolean' ? d.assigned : !currentlyAssigned
        setRoles((prev) => prev.map((r) => (r.id === roleId ? { ...r, assigned, claims: assigned ? r.claims : [] } : r)))
        toast.success(
          assigned
            ? `"${role.name}" rolü verildi; yeni ekranlar kullanıcının sayfayı yenilemesiyle görünür.`
            : `"${role.name}" rolü kaldırıldı; kullanıcının açık oturumları kapatıldı.`
        )
      },
      onErrorHandle: (error: unknown) => {
        done()
        const reasons = readServerReasons(error)
        toast.error(reasons.length > 0 ? reasons.join(' ') : 'Rol değiştirilemedi.')
      },
    })
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
            ) : loadError ? (
              <div className="rounded-2xl border border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 p-10 text-center text-rose-700 dark:text-rose-200">
                {loadError}
              </div>
            ) : filteredRoles.length === 0 ? (
              <div className="rounded-2xl border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-white/5 p-10 text-center text-slate-700 dark:text-slate-300">
                Mevcut filtrelerle rol bulunamadı.
              </div>
            ) : (
              <div className="space-y-4">
                {!editable ? (
                  <div className="rounded-2xl border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
                    Bu hesabın rollerini değiştiremezsiniz (kendi hesabınız ya da sizden üst yetkideki bir hesap).
                  </div>
                ) : null}
                {filteredRoles.map((role) => {
                  const isAssigned = role.assigned
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
                            disabled={isBusy || !role.assignable}
                            aria-label={
                              isAssigned
                                ? `${role.name} rolünü kaldır`
                                : `${role.name} rolünü ata`
                            }
                            title={
                              !role.assignable
                                ? 'Bu rolü bu hesapta değiştirme yetkiniz yok'
                                : isAssigned
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
