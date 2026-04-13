'use client'

import type { RoleJSON } from '@monorepo/db-entities/schemas/default/role'
import type { UserJSON } from '@monorepo/db-entities/schemas/default/user'
import type { UserRoleJSON } from '@monorepo/db-entities/schemas/default/user_role'
import {
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  Crown,
  FileText,
  Key,
  Lock,
  Mail,
  MapPin,
  Phone,
  Shield,
  User,
  X,
  XCircle,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'
import { useUsersStore } from '@/app/_store/usersStore'
import { UsersManageRolesModal } from './UsersManageRolesModal'

interface UsersDetailsDrawerProps {
  isOpen: boolean
  user: UserJSON | undefined
  onClose: () => void
}

interface StatusBadgeProps {
  icon: ReactNode
  label: string
  variant: 'success' | 'error' | 'warning' | 'premium'
}

function StatusBadge({ icon, label, variant }: StatusBadgeProps) {
  const variants = {
    success: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/25',
    error: 'bg-rose-500/15 text-rose-200 border-rose-500/25',
    warning: 'bg-amber-500/15 text-amber-200 border-amber-500/25',
    premium: 'bg-purple-500/15 text-purple-200 border-purple-500/25',
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${variants[variant]}`}
    >
      {icon}
      {label}
    </div>
  )
}

export function UsersDetailsDrawer({ isOpen, user, onClose }: UsersDetailsDrawerProps) {
  const usersStore = useUsersStore()
  const actions = useGenericApiActions()
  const [isVisible, setIsVisible] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)
  const [rolesWithClaims, setRolesWithClaims] = useState<RoleJSON[]>([])
  const [isLoadingRoles, setIsLoadingRoles] = useState(false)
  const [rolesErrorCode, setRolesErrorCode] = useState<number | null>(null)

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true)
      setTimeout(() => setIsVisible(true), 10)
    } else {
      setIsVisible(false)
      setTimeout(() => setShouldRender(false), 300)
    }
  }, [isOpen])

  const isManageRolesOpen = usersStore.modals.manageClaims

  useEffect(() => {
    if (!isOpen || !user?.id) {
      setRolesWithClaims([])
      setRolesErrorCode(null)
      return
    }

    if (isManageRolesOpen) return

    setIsLoadingRoles(true)
    setRolesErrorCode(null)

    actions.GET_USER_ROLES?.start({
      payload: {
        page: 1,
        limit: 100,
        filters: { user_id: user.id },
      },
      disableAutoRedirect: true,
      onAfterHandle: (userRolesData) => {
        const list = (userRolesData?.data ?? []) as UserRoleJSON[]
        if (list.length === 0) {
          setRolesWithClaims([])
          setIsLoadingRoles(false)
          return
        }

        actions.GET_ROLES?.start({
          payload: {
            page: 1,
            limit: 100,
            relations: ['claims'],
          } as never,
          disableAutoRedirect: true,
          onAfterHandle: (rolesData) => {
            setIsLoadingRoles(false)
            if (!rolesData) {
              setRolesWithClaims([])
              return
            }
            const rolesList = rolesData.data as RoleJSON[]
            const roleIdSet = new Set(list.map((item) => item.role_id))
            const filtered = rolesList.filter((role) => roleIdSet.has(role.id))
            setRolesWithClaims(filtered)
          },
          onErrorHandle: (error, code) => {
            setIsLoadingRoles(false)
            setRolesWithClaims([])
            setRolesErrorCode(code ?? null)
            console.error('Get roles for user failed:', error)
          },
        })
      },
      onErrorHandle: (error, code) => {
        setIsLoadingRoles(false)
        setRolesWithClaims([])
        setRolesErrorCode(code ?? null)
        console.error('Get user roles failed:', error)
      },
    })
  }, [isOpen, user?.id, isManageRolesOpen])

  function handleClose() {
    setIsVisible(false)
    setTimeout(() => {
      usersStore.setModalVisibility('manageClaims', false)
      onClose()
    }, 300)
  }

  if (!shouldRender || !user) {
    return null
  }

  const fullName =
    `${user.profile?.first_name ?? ''} ${user.profile?.last_name ?? ''}`.trim() || '—'

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
        aria-label="Close drawer"
      />

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl transform flex-col border-l border-slate-800 bg-slate-950 text-slate-50 shadow-2xl shadow-slate-950/60 transition-all duration-300 ease-out ${
          isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        }`}
      >
        {/* Header */}
        <div className="relative px-6 py-6 text-white bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-800">
          <div className="absolute inset-0 opacity-5 bg-grid-pattern" />
          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg">
                    <User size={28} className="text-white" />
                  </div>
                  {user.verified_at ? (
                    <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 border-2 border-slate-950">
                      <CheckCircle2 size={12} className="text-white" />
                    </div>
                  ) : null}
                </div>

                <div>
                  <h2 className="text-2xl font-bold">{fullName}</h2>
                  <p className="mt-1 flex items-center gap-2 text-slate-200">
                    <Mail size={14} />
                    {user.email}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge
                      icon={user.is_active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      label={user.is_active ? 'Aktif' : 'Pasif'}
                      variant={user.is_active ? 'success' : 'error'}
                    />
                    {user.is_locked ? (
                      <StatusBadge icon={<Lock size={12} />} label="Kilitli" variant="warning" />
                    ) : null}
                    {user.is_god ? (
                      <StatusBadge icon={<Crown size={12} />} label="Yönetici" variant="premium" />
                    ) : null}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg p-2 transition-all duration-200 hover:scale-110 hover:bg-white/10"
                aria-label="Close user details"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div
          className={`flex-1 space-y-8 overflow-y-auto px-6 py-6 transition-all duration-500 delay-100 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          {/* Account Information */}
          <InfoSection
            title="Hesap Bilgileri"
            icon={<User size={16} className="text-slate-300" />}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <InfoCard icon={<Key size={16} />} label="Kullanıcı ID" value={user.id} />
              <InfoCard icon={<Mail size={16} />} label="E-posta" value={user.email || ''} />
              <InfoCard icon={<User size={16} />} label="Ad Soyad" value={fullName} />
              <InfoCard
                icon={<Calendar size={16} />}
                label="Oluşturulma"
                value={formatDate(user.created_at)}
              />
              <InfoCard
                icon={<Clock size={16} />}
                label="Güncelleme"
                value={formatDate(user.updated_at)}
              />
              <InfoCard
                icon={<Activity size={16} />}
                label="Son Giriş"
                value={formatDate(user.last_login_at)}
              />
            </div>
          </InfoSection>

          {/* Security */}
          <InfoSection
            title="Güvenlik ve Erişim"
            icon={<Shield size={16} className="text-slate-300" />}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <InfoCard
                icon={
                  user.verified_at ? (
                    <CheckCircle2 size={16} className="text-emerald-400" />
                  ) : (
                    <XCircle size={16} className="text-rose-400" />
                  )
                }
                label="E-posta Doğrulama"
                value={user.verified_at ? formatDate(user.verified_at) : 'Doğrulanmadı'}
              />
              <InfoCard
                icon={<Activity size={16} />}
                label="Giriş Sayısı"
                value={String(user.login_count ?? 0)}
              />
              <InfoCard
                icon={
                  user.is_locked ? (
                    <Lock size={16} className="text-rose-400" />
                  ) : (
                    <CheckCircle2 size={16} className="text-emerald-400" />
                  )
                }
                label="Hesap Durumu"
                value={user.is_locked ? 'Kilitli' : 'Açık'}
              />
              <InfoCard
                icon={<Clock size={16} />}
                label="Kilit Bitiş"
                value={formatDate(user.locked_until)}
              />
              <InfoCard
                icon={<XCircle size={16} />}
                label="Başarısız Deneme"
                value={String(user.failed_login_attempts ?? 0)}
              />
              <InfoCard
                icon={
                  user.is_god ? <Crown size={16} className="text-purple-400" /> : <User size={16} />
                }
                label="Yönetici Erişimi"
                value={user.is_god ? 'Aktif' : 'Pasif'}
              />
            </div>
          </InfoSection>

          {/* Addresses */}
          <InfoSection title="Adresler" icon={<MapPin size={16} className="text-slate-300" />}>
            <CollectionGrid
              emptyMessage="Kayıtlı adres yok"
              items={user.address}
              renderItem={(address) => (
                <div
                  key={address.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition-shadow hover:shadow-md hover:shadow-slate-950/40"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-slate-950/50 p-2">
                      <MapPin size={16} className="text-sky-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate font-semibold text-slate-100">{address.name}</h4>
                      {address.street ? (
                        <p className="mt-1 text-sm text-slate-300">{address.street}</p>
                      ) : null}
                      <p className="text-sm text-slate-300">
                        {[address.city, address.province, address.country]
                          .filter(Boolean)
                          .join(' / ') || '—'}
                      </p>
                      {address.zip ? (
                        <p className="mt-1 text-xs text-slate-400">Posta Kodu: {address.zip}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}
            />
          </InfoSection>

          {/* Phones */}
          <InfoSection title="Telefon Numaraları" icon={<Phone size={16} className="text-slate-300" />}>
            <CollectionGrid
              emptyMessage="Kayıtlı telefon yok"
              items={user.phone}
              renderItem={(phone) => (
                <div
                  key={phone.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition-shadow hover:shadow-md hover:shadow-slate-950/40"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-slate-950/50 p-2">
                      <Phone size={16} className="text-emerald-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate font-semibold text-slate-100">{phone.name}</h4>
                      <p className="mt-1 text-sm text-slate-300">
                        {[phone.country_code, phone.number].filter(Boolean).join(' ')}
                      </p>
                      {phone.type ? (
                        <p className="text-xs text-slate-400">Tür: {phone.type}</p>
                      ) : null}
                      {phone.extension ? (
                        <p className="text-xs text-slate-400">Dahili: {phone.extension}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}
            />
          </InfoSection>

          {/* Files */}
          <InfoSection title="Dosyalar" icon={<FileText size={16} className="text-slate-300" />}>
            <CollectionGrid
              emptyMessage="Kayıtlı dosya yok"
              items={user.files}
              renderItem={(file) => (
                <div
                  key={file.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition-shadow hover:shadow-md hover:shadow-slate-950/40"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-slate-950/50 p-2">
                      <FileText size={16} className="text-fuchsia-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate font-semibold text-slate-100">
                        {file.name ?? file.id}
                      </h4>
                      <p className="mt-1 text-xs text-slate-400">
                        Tür: {file.mime_type ?? 'Bilinmiyor'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            />
          </InfoSection>

          {/* Roles */}
          <InfoSection title="Roller" icon={<Key size={16} className="text-slate-300" />}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-300">
                Bu kullanıcıya atanan rolleri ve sağladıkları izinleri görüntüleyin.
              </p>

              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
                onClick={() => usersStore.setModalVisibility('manageClaims', true)}
                aria-label="Manage user roles and claims"
              >
                Rolleri ve İzinleri Yönet
              </button>
            </div>

            {isLoadingRoles ? (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-300">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-emerald-400" />
                Roller yükleniyor...
              </div>
            ) : rolesErrorCode === 403 ? (
              <div className="mt-4 text-sm text-rose-300">
                Bu kullanıcının rollerini görüntüleme izniniz yok.
              </div>
            ) : (
              <CollectionGrid
                emptyMessage="Atanmış rol yok"
                items={rolesWithClaims}
                renderItem={(role) => (
                  <div
                    key={role.id}
                    className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition-shadow hover:shadow-md hover:shadow-slate-950/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate font-semibold text-slate-100">{role.name}</h4>
                        {role.description ? (
                          <p className="mt-1 text-xs text-slate-400">{role.description}</p>
                        ) : null}
                      </div>

                      {role.is_system ? (
                        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                          Sistem
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 border-t border-slate-800 pt-3">
                      {role.claims && role.claims.length > 0 ? (
                        <ul className="space-y-1">
                          {role.claims.map((claim) => (
                            <li key={claim.id} className="text-xs text-slate-300">
                              <span className="font-semibold text-slate-200">{claim.action}</span>
                              {' · '}
                              <span className="text-slate-300">{claim.method}</span>{' '}
                              <span className="text-slate-400">{claim.path}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-400">Bu role atanmış izin yok.</p>
                      )}
                    </div>
                  </div>
                )}
              />
            )}
          </InfoSection>
        </div>

        <UsersManageRolesModal
          isOpen={usersStore.modals.manageClaims}
          userId={user.id}
          onClose={() => usersStore.setModalVisibility('manageClaims', false)}
        />
      </div>
    </>
  )
}

interface InfoSectionProps {
  title: string
  icon: ReactNode
  children: ReactNode
}

function InfoSection({ title, icon, children }: InfoSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        {icon}
        <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
      </div>
      {children}
    </section>
  )
}

interface InfoCardProps {
  icon: ReactNode
  label: string
  value: string
}

function InfoCard({ icon, label, value }: InfoCardProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition-shadow hover:shadow-md hover:shadow-slate-950/40">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-slate-950/50 p-2 text-slate-200">{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-100" title={value}>
            {value}
          </p>
        </div>
      </div>
    </div>
  )
}

interface CollectionGridProps<Item> {
  items: Item[] | undefined
  emptyMessage: string
  renderItem: (item: Item) => ReactNode
}

function CollectionGrid<Item>({ items, emptyMessage, renderItem }: CollectionGridProps<Item>) {
  if (!items || items.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-slate-400">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {items.map((item) => renderItem(item))}
    </div>
  )
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleString('tr-TR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
