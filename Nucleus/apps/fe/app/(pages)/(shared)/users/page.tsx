'use client'
import { InfiniteScroll } from '@/app/_components/Global/InfiniteScroll'
import { isGodminUser } from '@/app/_utils/currentUser'
import { ADMIN_ROLES, hasPrivilege } from '@/app/_utils/routeAccess'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '@store/globalStore'
import { useGenericApiActions } from '@/app/_hooks/UseNucleusApi'
import { readServerReasons } from '@/app/_components/Global/PasswordRules'
import { confirmDialog } from '@/app/_components/Global/ConfirmDialog'
import { useUsersStore } from '@/app/_store/usersStore'
import type { StoreProps } from '@/app/_store/usersStore/types'
import { Pagination } from '../logs/components/Pagination'
import { UsersCreateModal } from './components/UsersCreateModal'
import { UsersDeleteModal } from './components/UsersDeleteModal'
import { UsersDetailsDrawer } from './components/UsersDetailsDrawer'
import { UsersFilters } from './components/UsersFilters'
import { UsersHeader } from './components/UsersHeader'
import { UsersSetPasswordModal } from './components/UsersSetPasswordModal'
import { UsersTable } from './components/UsersTable'
import { toast } from "sonner";
// import { UsersValidateModal } from './components/UsersValidateModal' // dosyada kullanılmıyor, istersen geri aç

export default function UsersPage() {
  const actions = useGenericApiActions()
  const store = useStore()

  const usersStore = useUsersStore()
  const [areFiltersVisible, setFiltersVisible] = useState(false)
  // Hangi satırın kilidi açılıyor: buton "Açılıyor…" derken diğer satırlar
  // tıklanabilir kalsın diye tek bir boolean değil, id tutuluyor.
  const [unlockingUserId, setUnlockingUserId] = useState<string | null>(null)
  const [lockingUserId, setLockingUserId] = useState<string | null>(null)

  // GET_USERS'i aynı anda 2 kez tetiklemeyi önlemek için
  const isFetchingRef = useRef(false)

  const hasUsers = usersStore.users && usersStore.users.data.length > 0

  /*
   * Hesap yönetimi Merkez Ekip, Super Admin ve godmin'e açık (#20/#21).
   *
   * nucleus'un ekle/sil/kilitle/şifre uçları yalnız godmin'e açıktı; Merkez
   * Ekip bu ekranı açıp hiçbir şey yapamıyordu ve her yeni denetçi godmin
   * hesabını bekliyordu. Artık hepsi Biltim'in kendi uçlarından
   * (be-nucleus/src/routes/biltim.ts) gidiyor; yetki orada da aynı.
   */
  const callerRoleNames = useMemo((): string[] => {
    const u: any = store.user
    return ((u?.data ?? u)?.roles ?? []).map((r: any) => String(r?.name ?? ''))
  }, [store.user])
  const callerIsGod = useMemo(() => isGodminUser(store.user), [store.user])

  const canManageAccess = useMemo(
    () => callerIsGod || hasPrivilege(callerRoleNames, ADMIN_ROLES),
    [callerIsGod, callerRoleNames]
  )

  /*
   * Rütbe: godmin > Super Admin > Merkez Ekip > diğerleri — sunucunun kuralının
   * aynısı (be-nucleus/src/routes/biltim.ts, `mayAssignRole` / `mayTarget`).
   *
   * Sunucu Merkez Ekip'in bir Super Admin'e dokunmasını ve yeni hesaba Super
   * Admin rolü vermesini reddediyor. Ekran yine de düğmeleri ve rolü sunuyordu:
   * tıklayan 403 görüyordu, yani ekran yapılamayacak bir işi öneriyordu. Gizleme
   * yetki kontrolü DEĞİL — o sunucuda — ama önerilen her düğme çalışmalı.
   */
  const caller = useMemo<Ranked>(
    () => ({ isGod: callerIsGod, roles: callerRoleNames }),
    [callerIsGod, callerRoleNames]
  )

  /*
   * Rütbe bilgisi sunucudan, tek uçtan (GET /biltim/users/ranks): bu kişinin
   * verebileceği roller ve değiştiremeyeceği hesaplar. Ekran önceden GET
   * /roles ve /user_roles okuyordu; Merkez Ekip'in ikisine de yetkisi yok —
   * rol listesi hiç yüklenmiyor (kullanıcı eklerken rol seçilemiyordu) ve
   * Super Admin satırlarında sunucunun reddedeceği düğmeler görünüyordu.
   */
  const [rankInfo, setRankInfo] = useState<{
    roles: Array<{ id: string; name: string; alias: string | null; description: string | null; is_system: boolean }>
    protectedIds: Set<string>
  } | null>(null)
  const rankRequestRef = useRef(0)
  const rankStartedRef = useRef(false)
  useEffect(() => {
    if (!canManageAccess) return
    // İlk açılışta bir kez, sonra her "Yenile"de (ve oluşturma/silme sonrası).
    if (rankStartedRef.current && !usersStore.needsRefresh) return
    rankStartedRef.current = true
    const requestId = ++rankRequestRef.current
    ;(actions as any).BILTIM_USER_RANKS?.start({
      payload: {},
      onAfterHandle: (data: unknown) => {
        if (rankRequestRef.current !== requestId) return
        const d = (data ?? {}) as { roles?: unknown; protected?: unknown }
        setRankInfo({
          roles: Array.isArray(d.roles)
            ? (d.roles as Array<Record<string, unknown>>).map((r) => ({
                id: String(r.id ?? ''),
                name: String(r.name ?? ''),
                alias: r.alias == null ? null : String(r.alias),
                description: r.description == null ? null : String(r.description),
                is_system: r.is_system === true || r.isSystem === true,
              }))
            : [],
          protectedIds: new Set(Array.isArray(d.protected) ? (d.protected as unknown[]).map(String) : []),
        })
      },
      // Okunamazsa önceki bilgi korunur; son sözü yine sunucu söyler.
      onErrorHandle: (error: unknown) => console.error('User ranks failed', error),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManageAccess, usersStore.needsRefresh])

  const canManageUser = (userId: string): boolean => {
    if (!canManageAccess) return false
    const row = usersStore.users?.data.find((u) => u.id === userId)
    // Satır rolleri taşıyorsa onlar da sayılır; bugün taşımıyor (null ya da yok).
    const rawRoles: unknown = row?.roles
    const rowRoles = Array.isArray(rawRoles)
      ? rawRoles.map((r) => String((r as { name?: unknown } | null)?.name ?? ''))
      : []
    const target: Ranked = { isGod: row?.is_god === true, roles: rowRoles }
    if (rankInfo?.protectedIds.has(userId)) return false
    return mayTarget(caller, target)
  }

  // Sabit kimlikli: oluşturma modalı rol listesini bununla süzüyor.
  const canAssignRole = useCallback(
    (role: { name: string }) => mayAssignRole(caller, role.name),
    [caller]
  )

  /** Sunucunun reddedeceği bir hesaba dokunmadan önce, aynı sözle. */
  const refuseOutranked = (userId: string): boolean => {
    if (canManageUser(userId)) return false
    toast.error('Sizden üst yetkideki bir hesap (ör. Super Admin) bu ekrandan değiştirilemez.')
    return true
  }

  const selectedUser = useMemo(() => {
    if (!usersStore.selectedUserId || !usersStore.users) return undefined
    return usersStore.users.data.find((u) => u.id === usersStore.selectedUserId)
  }, [usersStore.users, usersStore.selectedUserId])

  // Tek bir effect: page/limit/search/order/filters/needsRefresh ile listeyi getir
  useEffect(() => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true

    const payload = {
      page: usersStore.page,
      limit: usersStore.limit,
      search: usersStore.search.length > 0 ? usersStore.search : undefined,
      orderBy: usersStore.orderBy,
      orderDirection: usersStore.orderDirection,
      filters: buildFilters(usersStore.filters),
    }

    actions.GET_USERS?.start({
      payload,
      onAfterHandle: (data) => {
        if (data) {
          /*
           * Page 2 and beyond EXTEND the list rather than replacing it: the
           * screen scrolls now, so a new page is more rows, not a new screenful.
           * Page 1 always replaces — that is what a changed filter produces.
           */
          const incoming = data as NonNullable<typeof usersStore.users>
          const isFirstPage = (incoming.pagination?.page ?? 1) <= 1
          const previous = usersStore.users
          /*
           * Zaten listede olan bir satırın YENİ kopyası eskisinin yerine
           * geçiyor. Önceden eskisi tutuluyordu: 2. sayfadayken yapılan bir
           * yenileme aynı satırları getirip atıyordu, yani kilidi açılan
           * hesabın "Kilitli" rozeti ekranda kalıyordu.
           */
          const fresh = new Map(incoming.data.map((row) => [row.id, row]))
          usersStore.users =
            isFirstPage || !previous
              ? incoming
              : {
                  ...incoming,
                  data: [
                    ...previous.data.map((held) => fresh.get(held.id) ?? held),
                    ...incoming.data.filter(
                      (row) => !previous.data.some((held) => held.id === row.id)
                    ),
                  ],
                }
        }
        usersStore.setNeedsRefresh(false)
        isFetchingRef.current = false
      },
      onErrorHandle: (error) => {
        console.error('Get users failed:', error)
        usersStore.setNeedsRefresh(false)
        isFetchingRef.current = false
        toast.error(getErrorMessage(error) || 'Kullanıcı listesi getirilemedi.')
      },
    })

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    usersStore.page,
    usersStore.limit,
    usersStore.search,
    usersStore.orderBy,
    usersStore.orderDirection,
    usersStore.filters.status,
    usersStore.filters.locked,
    usersStore.needsRefresh,
  ])

  async function handleCreate(payload: {
    email: string
    password: string
    firstName: string
    lastName: string
    roleIds: string[]
  }) {
    /*
     * Tek çağrı: kullanıcı, roller ve profil birlikte.
     *
     * Eskiden üç ayrı istekti (POST /users → /profiles → /userRoles). Kurulu
     * nucleus (0.10.115) ilkini HERKESE reddediyor — "users cannot be created
     * through the generic entity API — it would create an account with no
     * password" — yani ekrandan hiçbir kullanıcı açılamıyordu (canlı günlük:
     * POST /users 403, 30 Eylül). `/auth/admin/create-user` şifreyi kurulumun
     * politikasıyla kontrol edip özetler, rolleri ve profili aynı istekte yazar.
     * Uç godmin'e açık; godmin olmayana sunucu 403 döner, ekran da düğmeyi
     * yalnız godmin'e gösteriyor.
     */
    return await new Promise<void>((resolve) => {
      ;(actions as any).BILTIM_CREATE_USER?.start({
        payload: {
          email: payload.email.trim(),
          password: payload.password,
          roleIds: payload.roleIds,
          firstName: payload.firstName.trim(),
          lastName: payload.lastName.trim(),
        },
        onAfterHandle: () => {
          // Yeni kişi listenin başka bir sayfasında kalmasın.
          if (usersStore.page !== 1) usersStore.setPage(1)
          usersStore.setNeedsRefresh(true)
          usersStore.setModalVisibility('create', false)
          usersStore.setSelectedUserId(null)
          toast.success('Kullanıcı oluşturuldu.')
          resolve()
        },
        onErrorHandle: (error: unknown) => {
          console.error('Create user failed:', error)

          if (isDuplicateEmailError(error)) {
            toast.error('Aynı mail adresiyle iki kere kayıt yapılamaz.')
            resolve()
            return
          }

          const reasons = readServerReasons(error)
          toast.error(reasons.length > 0 ? reasons.join(' ') : 'Kullanıcı oluşturulamadı.')
          resolve()
        },
      })
    })
  }

  function handleDeleteUser() {
    if (!canManageAccess) return
    if (!usersStore.selectedUserId) return
    const userIdToDelete = usersStore.selectedUserId

    // ✅ FE tarafında kendini silmeyi engelle
    const meId = (store as any)?.user?.id
    if (meId && userIdToDelete === meId) {
      toast.error('Kendi hesabını silemezsin. Başka bir admin ile silmeyi dene.')
      usersStore.setModalVisibility('delete', false)
      usersStore.setSelectedUserId(null)
      return
    }

    /*
     * Kalıcı silme, bağlı kayıtlarıyla birlikte.
     *
     * Jenerik `DELETE /users/:id` yalnız `users` satırını silmeye çalışıyordu;
     * her kullanıcının bir `profiles` satırı olduğu için Postgres reddediyordu
     * ve ekran "Cannot delete: records in 'profiles' still reference this one"
     * gösteriyordu (canlı günlük: 409, 30 Eylül). nucleus'un kendi ucu
     * `hard-delete` profili, rolleri, oturumları ve kişisel kayıtları tek
     * işlemde siler; biri takılırsa hepsi geri alınır. Uç yalnız godmin'e açık.
     *
     * 401/403'te bir kez daha deneme kaldırıldı: 403 burada "godmin değilsin"
     * demek, oturum yenilemeyle düzelmez; ikinci deneme yalnız aynı reddi
     * tekrarlıyordu.
     */
    ;(actions as any).BILTIM_DELETE_USER?.start({
      payload: { userId: userIdToDelete },
      onAfterHandle: () => {
        usersStore.removeUser(userIdToDelete)
        usersStore.setModalVisibility('delete', false)
        usersStore.setSelectedUserId(null)
        usersStore.setNeedsRefresh(true)
        toast.success('Kullanıcı silindi.')
      },
      onErrorHandle: (error: unknown) => {
        console.error('Delete user failed:', error)
        usersStore.setModalVisibility('delete', false)
        usersStore.setSelectedUserId(null)
        const reasons = readServerReasons(error)
        toast.error(reasons.length > 0 ? reasons.join(' ') : 'Kullanıcı silinemedi.')
      },
    })
  }

  /*
   * Kilidi AÇMAK, `users` satırına `is_locked: false` yazmak değil.
   *
   * Jenerik varlık ucu bu kolonları yazmaya kapalı: PATCH 200 döner ve hiçbir
   * şey değişmez — panel işi bitmiş sanır, kullanıcı hâlâ giremez. Ayrıca kilit
   * bayrağını temizlemek tek başına yeterli de değil; giriş rotası hatalı deneme
   * sayacını şifreyi KONTROL ETMEDEN önce okuyor ve o sayaç yalnız başarılı bir
   * girişte sıfırlanıyor. `unlock-user` üçünü (bayrak, süre, sayaç) birlikte
   * temizlediği için tek doğru yol o.
   */
  /*
   * Hesabı kilitlemek: silinemeyen ya da ayrılan biri için.
   *
   * Onay akışında karar vermiş ya da akış başlatmış bir kullanıcı kalıcı
   * silinemiyor (verifications kayıtları ona bağlı; nucleus hard-delete bunları
   * temizlemiyor). Kilit girişi süresiz kapatır ve açık oturumlarını hemen
   * sonlandırır; denetim geçmişi yerinde kalır, "Kilidi Aç" ile geri alınır.
   */
  async function handleLockUser(userId: string) {
    if (!canManageAccess) return
    if (refuseOutranked(userId)) return
    const target = usersStore.users?.data.find((u) => u.id === userId)
    const confirmed = await confirmDialog({
      title: 'Hesap kilitlensin mi?',
      message: `${target?.email ?? 'Bu kullanıcı'} artık giriş yapamaz ve açık oturumları hemen kapanır. Kayıtları silinmez; "Kilidi Aç" ile geri alınır.`,
      confirmLabel: 'Kilitle',
      cancelLabel: 'Vazgeç',
      tone: 'danger',
    })
    if (!confirmed) return
    setLockingUserId(userId)
    ;(actions as any).BILTIM_LOCK_USER?.start({
      payload: { userId },
      onAfterHandle: () => {
        setLockingUserId(null)
        usersStore.setNeedsRefresh(true)
        toast.success('Hesap kilitlendi; kullanıcının açık oturumları kapatıldı.')
      },
      onErrorHandle: (error: unknown) => {
        setLockingUserId(null)
        const reasons = readServerReasons(error)
        toast.error(reasons.length > 0 ? reasons.join(' ') : 'Hesap kilitlenemedi.')
      },
    })
  }

  function handleUnlockUser(userId: string) {
    if (!canManageAccess) return
    if (refuseOutranked(userId)) return
    setUnlockingUserId(userId)

    ;(actions as any).BILTIM_UNLOCK_USER?.start({
      payload: { userId },
      onAfterHandle: () => {
        setUnlockingUserId(null)
        // Satır hangi sayfadan gelmiş olursa olsun hemen düzelsin; yenileme
        // de filtreye göre listenin kendisini toparlasın.
        usersStore.clearUserLockout(userId)
        usersStore.setNeedsRefresh(true)
        toast.success('Hesabın kilidi açıldı.')
      },
      onErrorHandle: (error: unknown) => {
        setUnlockingUserId(null)
        toast.error(readServerReasons(error).join(' ') || 'Kilit açılamadı.')
      },
    })
  }

  /*
   * Sunucunun reddetme SEBEBİ modalda kalmalı, toast'ta değil.
   *
   * "Şifre çok zayıf" bir toast olarak çıkıp kaybolursa, yönetici yazdığı
   * şifrenin neden kabul edilmediğini göremeden formla baş başa kalıyor. O
   * yüzden bu akış hatayı modala geri döndürüyor; modal açık kalıyor ve yazılan
   * şifre kutuda duruyor.
   */
  function handleSetUserPassword(password: string): Promise<string[] | null> {
    const userId = usersStore.selectedUserId
    if (!userId) return Promise.resolve(['Kullanıcı seçili değil.'])

    return new Promise((resolve) => {
      ;(actions as any).BILTIM_SET_USER_PASSWORD?.start({
        payload: { userId, password },
        onAfterHandle: (data: unknown) => {
          const result = (data ?? {}) as { signedOut?: unknown; lockoutCleared?: unknown }
          // Modal yalnız bu kullanıcı için hâlâ açıksa kapansın; bu arada
          // başka biri seçildiyse onun modalı ve seçimi yerinde kalmalı.
          if (usersStore.modals.setPassword && usersStore.selectedUserId === userId) {
            usersStore.setModalVisibility('setPassword', false)
            usersStore.setSelectedUserId(null)
          }
          // Sunucu şifreyle birlikte kilidi ve hatalı giriş sayacını da
          // temizliyor; satır bunu hemen göstersin.
          if (result.lockoutCleared !== false) usersStore.clearUserLockout(userId)
          usersStore.setNeedsRefresh(true)
          toast.success(passwordSetMessage(result.signedOut))
          resolve(null)
        },
        onErrorHandle: (error: unknown) => {
          const reasons = readServerReasons(error)
          resolve(reasons.length > 0 ? reasons : ['Şifre değiştirilemedi.'])
        },
      })
    })
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-50 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-4 md:p-6 shadow-xl shadow-slate-950/60">
          <div className="space-y-6">
            <UsersHeader
              onCreate={
                canManageAccess ? () => usersStore.setModalVisibility('create', true) : undefined
              }
              onRefresh={() => usersStore.setNeedsRefresh(true)}
              isRefreshing={
                Boolean(usersStore.needsRefresh) ||
                Boolean(actions.GET_USERS?.state?.isPending)
              }
            />

            <UsersFilters
              search={usersStore.search}
              onSearchChange={(value) => usersStore.setSearch(value)}
              filters={usersStore.filters}
              onFiltersChange={(nextFilters) => usersStore.setFilters(nextFilters)}
              onResetFilters={() => usersStore.resetFilters()}
              isFiltersVisible={areFiltersVisible}
              onToggleFilters={() => setFiltersVisible((prev) => !prev)}
            />

            <UsersTable
              users={usersStore.users}
              onSelectDetails={(userId) => {
                usersStore.setSelectedUserId(userId)
                usersStore.setModalVisibility('details', true)
              }}
              onValidateEmail={(userId) => {
                usersStore.setSelectedUserId(userId)
                usersStore.setModalVisibility('validateEmail', true)
              }}
              onDelete={(userId) => {
                const meId = (store as any)?.user?.id
                if (meId && userId === meId) {
                  toast.error('Kendi hesabını silemezsin.')
                  return
                }
                if (refuseOutranked(userId)) return
                usersStore.setSelectedUserId(userId)
                usersStore.setModalVisibility('delete', true)
              }}
              onUnlock={handleUnlockUser}
              onLock={(userId) => void handleLockUser(userId)}
              lockingUserId={lockingUserId}
              onSetPassword={(userId) => {
                if (!canManageAccess) return
                if (refuseOutranked(userId)) return
                usersStore.setSelectedUserId(userId)
                usersStore.setModalVisibility('setPassword', true)
              }}
              unlockingUserId={unlockingUserId}
              showGodminActions={canManageAccess}
              canManageUser={canManageUser}
            />

            {hasUsers ? (
              <InfiniteScroll
                hasMore={Boolean(usersStore.users?.pagination.hasNext)}
                isLoadingMore={Boolean(actions.GET_USERS?.state?.isPending)}
                onLoadMore={() => usersStore.setPage(usersStore.page + 1)}
                endLabel={`${usersStore.users?.data.length ?? 0} kullanıcının tamamı gösteriliyor`}
              />
            ) : null}
          </div>
        </div>

        <UsersCreateModal
          isOpen={usersStore.modals.create}
          onClose={() => usersStore.setModalVisibility('create', false)}
          onSubmit={handleCreate}
          isSubmitting={Boolean((actions as any).BILTIM_CREATE_USER?.state?.isPending)}
          canAssignRole={canAssignRole}
          assignableRoles={rankInfo?.roles}
        />

        <UsersDeleteModal
          isOpen={usersStore.modals.delete}
          userEmail={selectedUser?.email || ''}
          onConfirm={handleDeleteUser}
          onClose={() => {
            usersStore.setModalVisibility('delete', false)
            usersStore.setSelectedUserId(null)
          }}
          isSubmitting={Boolean((actions as any).BILTIM_DELETE_USER?.state?.isPending)}
        />

        <UsersSetPasswordModal
          isOpen={usersStore.modals.setPassword}
          userEmail={selectedUser?.email || ''}
          onConfirm={handleSetUserPassword}
          onClose={() => {
            usersStore.setModalVisibility('setPassword', false)
            usersStore.setSelectedUserId(null)
          }}
          isSubmitting={Boolean((actions as any).BILTIM_SET_USER_PASSWORD?.state?.isPending)}
        />

        <UsersDetailsDrawer
          isOpen={usersStore.modals.details}
          user={selectedUser}
          onClose={() => {
            usersStore.setModalVisibility('details', false)
            usersStore.setSelectedUserId(null)
          }}
        />

        {/*
          UsersValidateModal kullanıyorsan:
          <UsersValidateModal
            isOpen={usersStore.modals.validateEmail}
            userEmail={selectedUser?.email || ''}
            onConfirm={handleValidateEmail}
            onClose={handleCloseValidateModal}
            isSubmitting={Boolean(actions.VERIFY_USER?.state?.isPending)}
          />
        */}
      </div>
    </div>
  )
}


/*
 * Oturum kapanıp kapanmadığını sunucu söylüyor (`signedOut`, silinen oturum
 * kaydı sayısı); mesaj onu okuyor. Önceden her seferinde "açık oturumları
 * kapatıldı" deniyordu — kapanacak oturum olmasa da. Sayının kendisi
 * yazılmıyor: eski, zaten geçersiz kayıtları da sayıyor.
 *
 * 0 "oturumu yoktu" demek DEĞİL: sunucu (revokeUserSessions) silme hata
 * verdiğinde de 0 dönüyor. O yüzden 0'da oturumlar hakkında hiçbir şey
 * söylenmiyor; ele geçirilmiş bir hesabı sıfırlayan yöneticiye "kapatılacak
 * oturum yoktu" demek, eski oturumlar açıkken yanlış bir güvence olurdu.
 */
function passwordSetMessage(signedOut: unknown): string {
  if (typeof signedOut === 'number' && signedOut > 0) {
    return 'Şifre değiştirildi. Kullanıcının oturumları kapatıldı.'
  }
  return 'Şifre değiştirildi.'
}

/* ───────────────────────── rütbe ───────────────────────── */

/*
 * Sunucunun tablosunun aynısı (be-nucleus/src/routes/biltim.ts `RANK`). Burada
 * adı geçmeyen roller (Müdür, Saha Sorumlusu, Denetçi) Merkez Ekip'in altında.
 * İkisi ayrışırsa ekran ya çalışmayan düğme gösterir ya da çalışanı gizler;
 * değiştirirken ikisini birlikte değiştirin.
 */
const ACCOUNT_RANK: Record<string, number> = {
  godmin: 3,
  'super admin': 2,
  'content manager core team': 1,
}
const GODMIN_RANK = 3

type Ranked = { isGod: boolean; roles: string[] }

function roleRank(name: unknown): number {
  return ACCOUNT_RANK[String(name ?? '').trim().toLowerCase()] ?? 0
}

function highestRank(who: Ranked): number {
  if (who.isGod) return GODMIN_RANK
  return who.roles.reduce((max, r) => Math.max(max, roleRank(r)), 0)
}

/** godmin her rolü verir; başkası godmin'i asla, kendi rolünü ya da altını verir. */
function mayAssignRole(caller: Ranked, roleName: unknown): boolean {
  if (caller.isGod) return true
  const name = String(roleName ?? '').trim().toLowerCase()
  if (name === 'godmin') return false
  if (caller.roles.some((r) => r.trim().toLowerCase() === name)) return true
  return roleRank(name) < highestRank(caller)
}

/** Akranına evet, üstüne hayır; godmin hesabına yalnız godmin. */
function mayTarget(caller: Ranked, target: Ranked): boolean {
  if (caller.isGod) return true
  return highestRank(target) <= highestRank(caller)
}

function buildFilters(filters: StoreProps['filters']) {
  const result: Record<string, unknown> = {}
  if (filters.status === 'active') result.is_active = true
  else if (filters.status === 'inactive') result.is_active = false

  if (filters.locked === 'locked') result.is_locked = true
  else if (filters.locked === 'unlocked') result.is_locked = false

  return Object.keys(result).length > 0 ? result : undefined
}

function getErrorMessage(error: unknown): string | '' {
  if (!error) return ''
  if (typeof error === 'string') return error

  if (typeof error === 'object') {
    const anyErr = error as any

    if (typeof anyErr.message === 'string') return anyErr.message
    if (typeof anyErr.error === 'string') return anyErr.error

    const respMsg = anyErr?.response?.data?.message
    if (typeof respMsg === 'string') return respMsg

    const firstNested =
      anyErr?.errors?.[0]?.message ||
      anyErr?.response?.data?.errors?.[0]?.message ||
      anyErr?.data?.errors?.[0]?.message

    if (typeof firstNested === 'string') return firstNested

    const status = anyErr?.status ?? anyErr?.response?.status
    if (status) return `Hata: ${status}`
  }

  try {
    return JSON.stringify(error)
  } catch {
    return ''
  }
}

function getStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined
  const e: any = error
  return e?.status ?? e?.response?.status ?? e?.response?.data?.status ?? e?.data?.status
}

function getBackendCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined
  const e: any = error
  return (
    e?.code ??
    e?.response?.data?.code ??
    e?.response?.data?.errorCode ??
    e?.response?.data?.error?.code
  )
}

function isDuplicateEmailError(error: unknown): boolean {
  const status = getStatus(error)
  const code = (getBackendCode(error) || '').toLowerCase()
  const msg = (getErrorMessage(error) || '').toLowerCase()

  // ideal: backend 409 / 422 döndürür
  if (status === 409 || status === 422) {
    if (
      msg.includes('email') &&
      (msg.includes('already') || msg.includes('exists') || msg.includes('unique') || msg.includes('duplicate'))
    ) return true

    if (code.includes('unique') || code.includes('duplicate') || code.includes('email_exists')) return true
  }

  // backend yanlışlıkla 500 dönse bile unique violation ipuçlarını yakala
  if (status === 500 || status === 400) {
    if (code === '23505' || msg.includes('23505')) return true // postgres unique_violation
    if (msg.includes('unique') || msg.includes('duplicate') || msg.includes('already exists')) return true
    if (msg.includes('email') && (msg.includes('mevcut') || msg.includes('kayıt') || msg.includes('registered')))
      return true
  }

  // sadece mesajdan (fallback)
  if (
    msg.includes('email') &&
    (msg.includes('already') ||
      msg.includes('exists') ||
      msg.includes('unique') ||
      msg.includes('duplicate') ||
      msg.includes('constraint') ||
      msg.includes('violates') ||
      msg.includes('registered') ||
      msg.includes('kayıt') ||
      msg.includes('mevcut'))
  ) {
    return true
  }

  return false
}
