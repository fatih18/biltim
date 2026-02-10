'use client'

import type { RoleJSON } from '@monorepo/db-entities/schemas/default/role'
import React, { useEffect, useMemo, useState } from 'react'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'

interface UsersCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (payload: {
    email: string
    password: string
    firstName: string
    lastName: string
    roleIds: string[]
  }) => void
  isSubmitting: boolean
}

const normalize = (v: string) =>
  (v || '')
    .toLocaleLowerCase('tr-TR')
    .trim()

const isString = (v: unknown): v is string => typeof v === 'string'

// ✅ Birlikte seçilebilecek tek ikili: Denetçi + Saha Sorumlusu
// EN/TR alias destekli
const FIELD_MANAGER_ALIASES = new Set([
  normalize('Field Manager'),
  normalize('Saha Sorumlusu'),
  normalize('Saha Sorumlusu '),
])

const AUDITOR_ALIASES = new Set([
  normalize('Auditor'),
  normalize('Denetçi'),
  normalize('Denetci'),
])

function isFieldManagerAlias(alias: string) {
  return FIELD_MANAGER_ALIASES.has(normalize(alias))
}
function isAuditorAlias(alias: string) {
  return AUDITOR_ALIASES.has(normalize(alias))
}

export function UsersCreateModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: UsersCreateModalProps) {
  const actions = useGenericApiActions()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [availableRoles, setAvailableRoles] = useState<RoleJSON[]>([])
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([])
  const [isLoadingRoles, setIsLoadingRoles] = useState(false)

  const rolesById = useMemo(() => {
    return new Map(availableRoles.map((r) => [r.id, r]))
  }, [availableRoles])

  const selectedAliases = useMemo(() => {
    return selectedRoleIds.map((id) => rolesById.get(id)?.alias).filter(isString)
  }, [selectedRoleIds, rolesById])

  function isValidSelection(nextIds: string[]): boolean {
    // 0 veya 1 rol: her zaman serbest
    if (nextIds.length <= 1) return true

    // 3+ rol: yasak
    if (nextIds.length > 2) return false

    // 2 rol: sadece FM + Auditor serbest
    const nextAliases = nextIds.map((id) => rolesById.get(id)?.alias).filter(isString)
    const hasFM = nextAliases.some(isFieldManagerAlias)
    const hasAuditor = nextAliases.some(isAuditorAlias)

    return hasFM && hasAuditor
  }

  function canToggleOn(targetRoleId: string): boolean {
    // zaten seçiliyse (off için) her zaman izin
    if (selectedRoleIds.includes(targetRoleId)) return true

    // hiç seçim yoksa her rol seçilebilir
    if (selectedRoleIds.length === 0) return true

    // zaten 2 seçim varsa daha fazla seçilemez
    if (selectedRoleIds.length >= 2) return false

    // 1 seçim varsa ikinci seçimin kuralı:
    // sadece Field Manager <-> Auditor ikilisi
    const selectedAlias = selectedAliases[0] || ''
    const targetAlias = rolesById.get(targetRoleId)?.alias || ''

    if (isFieldManagerAlias(selectedAlias)) return isAuditorAlias(targetAlias)
    if (isAuditorAlias(selectedAlias)) return isFieldManagerAlias(targetAlias)

    // seçili rol bu ikiliden değilse ikinci hiçbir rol seçilemez
    return false
  }

  function toggleRole(roleId: string, nextChecked: boolean) {
    setSelectedRoleIds((prev) => {
      if (!nextChecked) return prev.filter((id) => id !== roleId)

      const next = prev.includes(roleId) ? prev : [...prev, roleId]
      if (isValidSelection(next)) return next

      window.alert(
        'Aynı anda yalnızca "Denetçi + Saha Sorumlusu" (Auditor + Field Manager) birlikte seçilebilir. Diğer roller yalnızca tek seçilebilir.'
      )
      return prev
    })
  }

  useEffect(() => {
    if (!isOpen) return

    setEmail('')
    setPassword('')
    setFirstName('')
    setLastName('')
    setSelectedRoleIds([])
    setAvailableRoles([])

    setIsLoadingRoles(true)
    actions.GET_ROLES?.start({
      payload: { page: 1, limit: 100 },
      onAfterHandle: (data) => {
        setIsLoadingRoles(false)
        if (!data) return
        setAvailableRoles(data.data)
      },
      onErrorHandle: (error) => {
        setIsLoadingRoles(false)
        console.error('Get roles failed:', error)
        window.alert('Roller getirilemedi.')
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onSubmit({
      email,
      password,
      firstName,
      lastName,
      roleIds: selectedRoleIds,
    })
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm
                 overflow-y-auto overscroll-contain
                 px-4 py-6
                 flex items-start justify-center"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/90
                   shadow-2xl shadow-slate-950/70
                   my-0"
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-6 px-6 py-6
                     max-h-[calc(100vh-3rem)] overflow-y-auto"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-100 md:text-xl">
                Create User
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Provide account details and assign roles for this user.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-700 bg-slate-950/40 px-2 py-1
                         text-slate-300 hover:bg-slate-950/70 hover:text-slate-100 transition-colors"
              aria-label="Close create user modal"
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="create-user-email"
                className="block text-xs font-medium text-slate-300"
              >
                Email
              </label>
              <input
                id="create-user-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 !bg-slate-950/70 px-3 py-2
                           text-sm text-slate-100 outline-none ring-sky-500/40 placeholder:text-slate-500
                           focus:border-sky-400 focus:ring-2"
              />
            </div>

            <div>
              <label
                htmlFor="create-user-password"
                className="block text-xs font-medium text-slate-300"
              >
                Temporary Password
              </label>
              <input
                id="create-user-password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 !bg-slate-950/70 px-3 py-2
                           text-sm text-slate-100 outline-none ring-sky-500/40 placeholder:text-slate-500
                           focus:border-sky-400 focus:ring-2"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Password must be at least 8 characters long.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="create-user-first-name"
                  className="block text-xs font-medium text-slate-300"
                >
                  First Name
                </label>
                <input
                  id="create-user-first-name"
                  type="text"
                  required
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2
                             text-sm text-slate-100 outline-none ring-sky-500/40 placeholder:text-slate-500
                             focus:border-sky-400 focus:ring-2"
                />
              </div>

              <div>
                <label
                  htmlFor="create-user-last-name"
                  className="block text-xs font-medium text-slate-300"
                >
                  Last Name
                </label>
                <input
                  id="create-user-last-name"
                  type="text"
                  required
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2
                             text-sm text-slate-100 outline-none ring-sky-500/40 placeholder:text-slate-500
                             focus:border-sky-400 focus:ring-2"
                />
              </div>
            </div>

            <div>
              <p className="block text-xs font-medium text-slate-300">Roles</p>

              <div className="mt-2 max-h-40 md:max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                {isLoadingRoles ? (
                  <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-sky-400" />
                    Loading roles...
                  </div>
                ) : availableRoles.length === 0 ? (
                  <p className="text-xs text-slate-500">No roles found.</p>
                ) : (
                  availableRoles.map((role) => {
                    const isSelected = selectedRoleIds.includes(role.id)
                    const disabled = !isSelected && !canToggleOn(role.id)

                    return (
                      <label
                        key={role.id}
                        className={[
                          'flex items-center justify-between gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm transition-colors',
                          disabled
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:border-slate-800 hover:bg-slate-900/60 cursor-pointer',
                        ].join(' ')}
                      >
                        <span className="flex-1 min-w-0">
                          <span className="block truncate text-xs font-semibold text-slate-100">
                            {role.alias}
                          </span>
                          {role.description ? (
                            <span className="block truncate text-[11px] text-slate-500">
                              {role.description}
                            </span>
                          ) : null}
                        </span>

                        <span className="flex items-center gap-2">
                          {role.is_system ? (
                            <span className="rounded-full border border-amber-800/50 bg-amber-950/25 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                              System
                            </span>
                          ) : null}

                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={disabled}
                            onChange={(event) => toggleRole(role.id, event.target.checked)}
                            className="h-4 w-4 rounded border-slate-600 bg-slate-950/70 text-sky-400 focus:ring-sky-500/40"
                          />
                        </span>
                      </label>
                    )
                  })
                )}
              </div>

              <p className="mt-1 text-[11px] text-slate-500">
                Tekli seçim serbesttir. Çoklu seçimde sadece Denetçi + Saha Sorumlusu birlikte seçilebilir.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 bg-slate-950/40 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-950/70 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-sky-500 px-5 py-2.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
