'use client'

import { useGSAP } from '@gsap/react'
import { useStore } from '@store/globalStore'
import { useHeaderStore } from '@store/headerStore'
import { gsap } from 'gsap'
import {
  Bell,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  Search,
  Settings,
  Users,
  X,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type React from 'react'
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'
import { Endpoints, FactoryFunction } from '@/lib/api'
import { SkeletonHeader } from '../Skeleton'
import type {
  HeaderNavCategory,
  HeaderNavItem,
  HeaderProps,
  HeaderViewStateUpdates,
} from '../types'
import { useGetUserRole } from '@/app/_hooks/user/useGetUserRole'

gsap.registerPlugin(useGSAP)

function defaultLogout(): undefined {
  console.log('Logout')
  return undefined
}

// Notification Dropdown Component
type NotificationItem = {
  id: string
  user_id: string
  title: string
  body: string | null
  entity_name: string | null
  entity_id: string | null
  is_seen: boolean
  seen_at: string | null
  created_at: string
}

function NotificationDropdown({
  notifications: _initialCount,
}: {
  notifications: number
}): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [notificationList, setNotificationList] = useState<NotificationItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const globalStore = useStore()
  const router = useRouter()
  const actions = useGenericApiActions()

  const userId = globalStore.user?.id

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Load notifications when dropdown opens
  useEffect(() => {
    if (isOpen && userId) {
      loadNotifications()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, userId])

  // Initial unread count load
  useEffect(() => {
    if (userId) {
      loadUnreadCount()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const loadNotifications = () => {
    if (!userId) return
    setIsLoading(true)

    actions.GET_NOTIFICATIONS?.start({
      payload: {
        page: 1,
        limit: 20,
        orderBy: 'created_at',
        orderDirection: 'desc',
        filters: { user_id: userId },
      },
      onAfterHandle: (data) => {
        if (data?.data) {
          setNotificationList(data.data as NotificationItem[])
          setUnreadCount(data.data.filter((n: NotificationItem) => !n.is_seen).length)
        }
        setIsLoading(false)
      },
      onErrorHandle: () => {
        console.error('Failed to load notifications')
        setIsLoading(false)
      },
    })
  }

  const loadUnreadCount = () => {
    if (!userId) return

    actions.GET_NOTIFICATIONS?.start({
      payload: {
        page: 1,
        limit: 100,
        filters: { user_id: userId, is_seen: false },
      },
      onAfterHandle: (data) => {
        if (data?.data) {
          setUnreadCount(data.data.length)
        }
      },
    })
  }

  const markAsSeen = (notificationId: string) => {
    actions.UPDATE_NOTIFICATION?.start({
      payload: {
        _id: notificationId,
        is_seen: true,
        seen_at: new Date(),
      },
      onAfterHandle: () => {
        setNotificationList((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, is_seen: true, seen_at: new Date().toISOString() } : n
          )
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      },
    })
  }

  const markAllAsSeen = () => {
    const unseenIds = notificationList.filter((n) => !n.is_seen).map((n) => n.id)
    for (const id of unseenIds) {
      markAsSeen(id)
    }
  }

  const handleNotificationClick = (notif: NotificationItem) => {
    // Mark as seen
    if (!notif.is_seen) {
      markAsSeen(notif.id)
    }

    // Navigate based on entity
    if (notif.entity_name && notif.entity_id) {
      setIsOpen(false)
      router.push(`/${notif.entity_name}s/${notif.entity_id}`)
    }
  }

  const formatTime = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-white/10 rounded-lg transition-all duration-300 hover:scale-110"
        type="button"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-xs rounded-full w-5 h-5 flex items-center justify-center animate-bounce">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-4 py-3 flex items-center justify-between">
            <span className="text-white font-semibold">Notifications</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <>
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                  <button
                    type="button"
                    onClick={markAllAsSeen}
                    className="text-xs text-slate-300 hover:text-white"
                  >
                    Mark all read
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-8 text-center">
                <div className="h-6 w-6 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-slate-500">Loading...</p>
              </div>
            ) : notificationList.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notificationList.map((notif) => (
                  <button
                    key={notif.id}
                    type="button"
                    className={`w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors ${!notif.is_seen ? 'bg-indigo-50/50' : ''
                      }`}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-2">
                        <div
                          className={`h-2 w-2 rounded-full ${notif.is_seen ? 'bg-slate-300' : 'bg-indigo-500'
                            }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-sm text-slate-900 truncate ${!notif.is_seen ? 'font-semibold' : 'font-medium'
                              }`}
                          >
                            {notif.title}
                          </span>
                          <span className="text-[10px] text-slate-400 flex-shrink-0">
                            {formatTime(notif.created_at)}
                          </span>
                        </div>
                        {notif.body && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                            {notif.body}
                          </p>
                        )}
                        {notif.entity_name && (
                          <span className="inline-block mt-1 text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                            {notif.entity_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 px-4 py-2">
            <Link
              href="/notifications"
              className="block text-center text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              onClick={() => setIsOpen(false)}
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2)
}

function UserAvatar({
  src,
  alt,
  size,
  className = '',
}: {
  src?: string
  alt: string
  size: number
  className?: string
}): React.JSX.Element {
  const [imageError, setImageError] = useState(false)
  const initials = getInitials(alt)

  if (imageError || !src) {
    return (
      <div
        className={`bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center text-white font-semibold ${className}`}
        style={{ width: size, height: size }}
      >
        {initials}
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={className}
      onError={() => setImageError(true)}
      unoptimized
    />
  )
}

const pathsWithoutHeader = ['/login', '/register', '/not-found']

export function ClientSide({
  logo,
  notifications = 3,
  onLogout = defaultLogout,
  navItems,
  navCategories = [],
}: HeaderProps): React.JSX.Element | null {
  const path = usePathname()
  const router = useRouter()

  const globalStore = useStore()

  const headerStore = useHeaderStore()
  const { ui } = headerStore
  const { isExpanded, isProfileOpen, isSearchOpen, activeNav } = ui

  // role check
  const { roleName, roles, isLoading: isRoleLoading } = useGetUserRole()

  function normRole(v: string) {
    return (v ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
  }


  const canSeeMasterMenus = useMemo(() => {
    if (isRoleLoading) return false

    const allNames = [roleName ?? '', ...(roles ?? []).map((r) => r?.name ?? '')]
      .filter(Boolean)
      .map((x) => normRole(String(x)))

    return allNames.some((n) => {
      // manager
      if (n === 'manager') return true

      // "content manager core team" / "content manager and core team" gibi varyasyonlar
      const hasContentManager = n.includes('content manager')
      const hasCoreTeam = n.includes('core team')
      return hasContentManager && hasCoreTeam
    })
  }, [roleName, roles, isRoleLoading])

  const restrictedIds = useMemo(
    () => new Set(['ana-veri-yonetimi', 'iyilestirici-faaliyetler']),
    []
  )

  const visibleNavCategories = useMemo(() => {
    if (canSeeMasterMenus) return navCategories
    return navCategories.map((cat) => {
      if (cat.id !== 'system' || !cat.items?.length) return cat
      return {
        ...cat,
        items: cat.items.filter((it) => !restrictedIds.has(it.id)),
      }
    })
  }, [navCategories, canSeeMasterMenus, restrictedIds])

  const visibleNavItems = useMemo(() => {
    if (canSeeMasterMenus) return navItems
    return (navItems ?? []).filter((it) => !restrictedIds.has(it.id))
  }, [navItems, canSeeMasterMenus, restrictedIds])

  // to-do this part can be handled from middleware also
  useEffect(() => {
    if (isRoleLoading) return

    const restrictedPaths = ['/ana-veri-yonetimi', '/iyilestirici-faaliyetler']
    const isRestrictedRoute = restrictedPaths.some((p) => path === p || path.startsWith(`${p}/`))

    if (!canSeeMasterMenus && isRestrictedRoute) {
      router.replace('/')
    }
  }, [canSeeMasterMenus, isRoleLoading, path, router])

  // Track which category dropdown is open
  const [openCategory, setOpenCategory] = useState<string | null>(null)
  const [mobileExpandedCategory, setMobileExpandedCategory] = useState<string | null>(null)
  const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (openCategory) {
        const ref = categoryRefs.current[openCategory]
        if (ref && !ref.contains(event.target as Node)) {
          setOpenCategory(null)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openCategory])

  // Hide header for /lyrics and all its sub-routes
  // Show header on /pocs main listing page, hide on specific POC pages
  const shouldHideHeader =
    pathsWithoutHeader.includes(path) ||
    path.startsWith('/lyrics') ||
    (path.startsWith('/pocs/') && path !== '/pocs')

  function getProfileName(): string {
    const firstName = globalStore.user?.profile?.first_name ?? ''
    const lastName = globalStore.user?.profile?.last_name ?? ''
    const fullName = `${firstName} ${lastName}`.trim()
    return fullName.length > 0 ? fullName : 'Kullanıcı'
  }

  function pickLatestProfilePictureSrc(): string | undefined {
    const files = globalStore.user?.files
    if (!files || files.length === 0) {
      return undefined
    }

    const profilePictures = files.filter((file) => file.type === 'profile_picture')
    if (profilePictures.length === 0) {
      return undefined
    }

    const sortedPictures = profilePictures.slice().sort((a, b) => {
      const aTimestamp = typeof a.updated_at === 'string' ? Date.parse(a.updated_at) : 0
      const bTimestamp = typeof b.updated_at === 'string' ? Date.parse(b.updated_at) : 0

      if (Number.isNaN(bTimestamp) && Number.isNaN(aTimestamp)) return 0
      if (Number.isNaN(bTimestamp)) return 1
      if (Number.isNaN(aTimestamp)) return -1

      return bTimestamp - aTimestamp
    })

    const latestPicture = sortedPictures[0]
    if (!latestPicture) return undefined

    return `file-proxy/${latestPicture.id}`
  }

  const profileImageSrc = pickLatestProfilePictureSrc()
  const profileName = getProfileName()

  // Sync activeNav with current pathname
  useEffect(() => {
    // First check category items
    for (const category of visibleNavCategories) {
      if (category.href && !category.items) {
        if (category.href === '/' ? path === '/' : path.startsWith(category.href)) {
          if (activeNav !== category.id) {
            headerStore.updateUi({ activeNav: category.id })
          }
          return
        }
      }
      if (category.items) {
        const matchingItem = category.items.find((item) => {
          if (!item.href) return false
          if (item.href === '/') return path === '/'
          return path.startsWith(item.href)
        })
        if (matchingItem && activeNav !== matchingItem.id) {
          headerStore.updateUi({ activeNav: matchingItem.id })
          return
        }
      }
    }

    // Fallback to legacy navItems
    const matchingNav = visibleNavItems.find((item) => {
      if (!item.href) return false
      if (item.href === '/') return path === '/'
      return path.startsWith(item.href)
    })

    if (matchingNav && activeNav !== matchingNav.id) {
      headerStore.updateUi({ activeNav: matchingNav.id })
    }
  }, [path, visibleNavItems, visibleNavCategories, activeNav, headerStore])

  const headerRef = useRef<HTMLDivElement>(null)
  const menuItemsRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const logoRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      // Immediately hide nav elements before any render
      const navElement = navRef.current
      if (navElement) {
        gsap.set(navElement, { opacity: 0, visibility: 'hidden' })
        const navigationChildren = Array.from(navElement.children)
        if (navigationChildren.length > 0) {
          gsap.set(navigationChildren, { y: 20, opacity: 0, scale: 0.9 })
        }
      }

      runInitialAnimations()
    },
    { scope: headerRef }
  )

  useGSAP(animateMenuExpansion, { dependencies: [isExpanded], scope: headerRef })
  useGSAP(animateProfileDropdown, { dependencies: [isProfileOpen], scope: headerRef })
  useGSAP(animateSearchToggle, { dependencies: [isSearchOpen], scope: headerRef })

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isProfileOpen && profileRef.current && !profileRef.current.contains(event.target as Node)) {
        headerStore.updateUi({ isProfileOpen: false })
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isProfileOpen, headerStore])

  if (shouldHideHeader) {
    return null
  }

  function runInitialAnimations(): undefined {
    const logoElement = logoRef.current
    const navElement = navRef.current

    if (logoElement) {
      gsap.fromTo(
        logoElement,
        { x: -100, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }
      )

      gsap.to(logoElement, {
        y: -5,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut',
        delay: 0.8,
      })
    }

    if (navElement) {
      const navigationChildren = Array.from(navElement.children)

      if (navigationChildren.length > 0) {
        gsap.set(navigationChildren, { y: 20, opacity: 0, scale: 0.9 })
        gsap.set(navElement, { opacity: 1, visibility: 'visible' })

        gsap.to(navigationChildren, {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.6,
          stagger: 0.1,
          ease: 'power2.out',
          delay: 0.1,
        })
      }
    }

    return undefined
  }

  function animateMenuExpansion(): undefined {
    const menuContainer = menuItemsRef.current
    if (!menuContainer) return undefined

    if (isExpanded) {
      gsap.set(menuContainer, { display: 'block' })

      gsap.fromTo(
        menuContainer,
        { height: 0, opacity: 0 },
        { height: 'auto', opacity: 1, duration: 0.5, ease: 'power2.out' }
      )

      const menuChildren = Array.from(menuContainer.children)
      if (menuChildren.length > 0) {
        gsap.from(menuChildren, {
          x: -50,
          opacity: 0,
          duration: 0.4,
          stagger: 0.05,
          ease: 'power2.out',
          delay: 0.1,
        })
      }
    } else {
      gsap.to(menuContainer, {
        height: 0,
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: (): void => {
          gsap.set(menuContainer, { display: 'none' })
        },
      })
    }

    return undefined
  }

  function animateProfileDropdown(): undefined {
    const profileContainer = profileRef.current
    if (!profileContainer) return undefined

    if (isProfileOpen) {
      gsap.set(profileContainer, { display: 'block' })
      gsap.fromTo(
        profileContainer,
        { scale: 0.8, opacity: 0, y: -20 },
        { scale: 1, opacity: 1, y: 0, duration: 0.3, ease: 'back.out(1.7)' }
      )
    } else {
      gsap.to(profileContainer, {
        scale: 0.8,
        opacity: 0,
        y: -20,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: (): void => {
          gsap.set(profileContainer, { display: 'none' })
        },
      })
    }

    return undefined
  }

  function animateSearchToggle(): undefined {
    const searchContainer = searchRef.current
    if (!searchContainer) return undefined

    if (isSearchOpen) {
      gsap.set(searchContainer, { display: 'block' })
      gsap.fromTo(
        searchContainer,
        { width: 0, opacity: 0 },
        { width: 'auto', opacity: 1, duration: 0.4, ease: 'power2.out' }
      )
    } else {
      gsap.to(searchContainer, {
        width: 0,
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: (): void => {
          gsap.set(searchContainer, { display: 'none' })
        },
      })
    }

    return undefined
  }

  function toggleMenu(): undefined {
    headerStore.updateUi({ isExpanded: !isExpanded })
    return undefined
  }

  function toggleSearch(): undefined {
    headerStore.updateUi({ isSearchOpen: !isSearchOpen })
    return undefined
  }

  function toggleProfile(): undefined {
    headerStore.updateUi({ isProfileOpen: !isProfileOpen })
    return undefined
  }

  function animateActiveNav(navId: string): undefined {
    gsap.to(`.nav-item-${navId}`, {
      scale: 1.1,
      duration: 0.2,
      yoyo: true,
      repeat: 1,
      ease: 'power2.inOut',
    })
    return undefined
  }

  function createNavClickHandler(navId: string, navAction?: () => undefined) {
    function navClick(): undefined {
      const updates: HeaderViewStateUpdates = { activeNav: navId }
      if (isExpanded) updates.isExpanded = false

      headerStore.updateUi(updates)
      animateActiveNav(navId)
      if (navAction) navAction()

      return undefined
    }

    return navClick
  }

  async function handleLogout(): Promise<undefined> {
    try {
      await FactoryFunction(undefined, Endpoints.LOGOUT_V2)
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      onLogout()
      globalStore.user = undefined
      globalStore.isLoginChecked = false
      router.push('/login')
    }
    return undefined
  }

  function renderDesktopNavItem(item: HeaderNavItem): React.JSX.Element {
    const handleNav = createNavClickHandler(item.id, item.onClick)
    const baseClassName = `nav-item-${item.id} relative px-2 py-1 rounded-lg transition-all duration-300 flex items-center gap-2 group ${activeNav === item.id
      ? 'bg-slate-600/50 shadow-lg border border-slate-500/50'
      : 'hover:bg-slate-600/30'
      }`

    const iconElement = (
      <span className="group-hover:rotate-12 transition-transform duration-300">{item.icon}</span>
    )

    const labelElement = <span className="font-medium text-sm">{item.label}</span>

    const badgeElement = item.badge ? (
      <span className="absolute -top-1 -right-1 bg-red-500 text-xs rounded-full size-4 flex items-center justify-center animate-pulse">
        {item.badge}
      </span>
    ) : null

    if (item.href) {
      return (
        <Link key={item.id} href={item.href} onClick={handleNav} className={baseClassName}>
          {iconElement}
          {labelElement}
          {badgeElement}
        </Link>
      )
    }

    return (
      <button type="button" key={item.id} onClick={handleNav} className={baseClassName}>
        {iconElement}
        {labelElement}
        {badgeElement}
      </button>
    )
  }

  function renderMobileNavItem(item: HeaderNavItem): React.JSX.Element {
    const handleNav = createNavClickHandler(item.id, item.onClick)
    const baseClassName = `relative px-4 py-3 rounded-lg transition-all duration-300 flex items-center gap-3 ${activeNav === item.id
      ? 'bg-slate-600/50 shadow-lg border border-slate-500/50'
      : 'hover:bg-slate-600/30'
      }`

    const badgeElement = item.badge ? (
      <span className="ml-auto bg-red-500 text-xs rounded-full px-2 py-1">{item.badge}</span>
    ) : null

    if (item.href) {
      return (
        <Link key={item.id} href={item.href} onClick={handleNav} className={baseClassName}>
          {item.icon}
          <span className="font-medium">{item.label}</span>
          {badgeElement}
        </Link>
      )
    }

    return (
      <button type="button" key={item.id} onClick={handleNav} className={baseClassName}>
        {item.icon}
        <span className="font-medium">{item.label}</span>
        {badgeElement}
      </button>
    )
  }

  // Check if any item in category is active
  function isCategoryActive(category: HeaderNavCategory): boolean {
    if (category.href) {
      return category.href === '/' ? path === '/' : path.startsWith(category.href)
    }
    return (
      category.items?.some(
        (item) => item.href && (item.href === '/' ? path === '/' : path.startsWith(item.href))
      ) || false
    )
  }

  // Render desktop category navigation with dropdown
  function renderDesktopCategoryNav(category: HeaderNavCategory): React.JSX.Element {
    const isActive = isCategoryActive(category)
    const isOpen = openCategory === category.id
    const hasDropdown = category.items && category.items.length > 0

    if (!hasDropdown && category.href) {
      // Direct link without dropdown
      return (
        <Link
          key={category.id}
          href={category.href}
          className={`relative px-3 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 group
            ${isActive
              ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 shadow-lg shadow-indigo-500/10 border border-indigo-400/30'
              : 'hover:bg-white/10 hover:shadow-md'
            }`}
          onClick={() => {
            headerStore.updateUi({ activeNav: category.id })
            setOpenCategory(null)
          }}
        >
          <span
            className={`transition-all duration-300 ${isActive ? 'text-indigo-300' : 'group-hover:text-indigo-300 group-hover:scale-110'
              }`}
          >
            {category.icon}
          </span>
          <span className={`font-medium text-sm ${isActive ? 'text-indigo-200' : ''}`}>
            {category.label}
          </span>
          {isActive && (
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full" />
          )}
        </Link>
      )
    }

    // Category with dropdown
    return (
      <div
        key={category.id}
        ref={(el) => {
          categoryRefs.current[category.id] = el
        }}
        className="relative"
      >
        <button
          type="button"
          onClick={() => setOpenCategory(isOpen ? null : category.id)}
          className={`relative px-3 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 group
            ${isActive
              ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 shadow-lg shadow-indigo-500/10 border border-indigo-400/30'
              : 'hover:bg-white/10 hover:shadow-md'
            }
            ${isOpen ? 'bg-white/10' : ''}`}
        >
          <span
            className={`transition-all duration-300 ${isActive ? 'text-indigo-300' : 'group-hover:text-indigo-300 group-hover:scale-110'
              }`}
          >
            {category.icon}
          </span>
          <span className={`font-medium text-sm ${isActive ? 'text-indigo-200' : ''}`}>
            {category.label}
          </span>
          <ChevronDown
            size={14}
            className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} ${isActive ? 'text-indigo-300' : ''
              }`}
          />
          {isActive && (
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full" />
          )}
        </button>

        {/* Dropdown Menu */}
        {isOpen && category.items && (
          <div className="absolute top-full left-0 mt-2 min-w-[220px] py-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/20 border border-white/20 z-[9999] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-slate-100/80 -z-10" />
            {category.items.map((item, index) => {
              const isItemActive =
                item.href && (item.href === '/' ? path === '/' : path.startsWith(item.href))
              return (
                <Link
                  key={item.id}
                  href={item.href || '#'}
                  onClick={() => {
                    headerStore.updateUi({ activeNav: item.id })
                    setOpenCategory(null)
                  }}
                  className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl transition-all duration-200 group
                    ${isItemActive
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30'
                      : 'text-slate-700 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50'
                    }
                    ${index > 0 ? 'mt-1' : ''}`}
                >
                  <span
                    className={`transition-all duration-200 ${isItemActive
                      ? 'text-white'
                      : 'text-slate-500 group-hover:text-indigo-500 group-hover:scale-110'
                      }`}
                  >
                    {item.icon}
                  </span>
                  <span
                    className={`font-medium text-sm ${isItemActive ? '' : 'group-hover:text-indigo-600'
                      }`}
                  >
                    {item.label}
                  </span>
                  <ChevronRight
                    size={14}
                    className={`ml-auto transition-all duration-200 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0
                      ${isItemActive ? 'text-white/70' : 'text-indigo-400'}`}
                  />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Render mobile category navigation with collapsible sections
  function renderMobileCategoryNav(category: HeaderNavCategory): React.JSX.Element {
    const isActive = isCategoryActive(category)
    const isExpanded = mobileExpandedCategory === category.id
    const hasItems = category.items && category.items.length > 0

    if (!hasItems && category.href) {
      // Direct link
      return (
        <Link
          key={category.id}
          href={category.href}
          onClick={() => {
            headerStore.updateUi({ activeNav: category.id, isExpanded: false })
          }}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300
            ${isActive
              ? 'bg-gradient-to-r from-indigo-500/30 to-purple-500/30 border border-indigo-400/30'
              : 'hover:bg-white/10'
            }`}
        >
          <span className={`${isActive ? 'text-indigo-300' : ''}`}>{category.icon}</span>
          <span className={`font-medium ${isActive ? 'text-indigo-200' : ''}`}>
            {category.label}
          </span>
        </Link>
      )
    }

    // Collapsible category
    return (
      <div key={category.id} className="space-y-1">
        <button
          type="button"
          onClick={() => setMobileExpandedCategory(isExpanded ? null : category.id)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300
            ${isActive
              ? 'bg-gradient-to-r from-indigo-500/30 to-purple-500/30 border border-indigo-400/30'
              : 'hover:bg-white/10'
            }`}
        >
          <span className={`${isActive ? 'text-indigo-300' : ''}`}>{category.icon}</span>
          <span className={`font-medium flex-1 text-left ${isActive ? 'text-indigo-200' : ''}`}>
            {category.label}
          </span>
          <ChevronDown
            size={16}
            className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Collapsible content */}
        {isExpanded && category.items && (
          <div className="ml-4 pl-4 border-l-2 border-indigo-500/30 space-y-1 animate-in slide-in-from-top-2 duration-200">
            {category.items.map((item) => {
              const isItemActive =
                item.href && (item.href === '/' ? path === '/' : path.startsWith(item.href))
              return (
                <Link
                  key={item.id}
                  href={item.href || '#'}
                  onClick={() => {
                    headerStore.updateUi({ activeNav: item.id, isExpanded: false })
                    setMobileExpandedCategory(null)
                  }}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200
                    ${isItemActive
                      ? 'bg-gradient-to-r from-indigo-500/40 to-purple-500/40 text-white'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                >
                  <span className={`${isItemActive ? 'text-indigo-200' : 'text-slate-400'}`}>
                    {item.icon}
                  </span>
                  <span className="font-medium text-sm">{item.label}</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  if (!globalStore.isLoginChecked) return <SkeletonHeader />

  return (
    <header
      ref={headerRef}
      className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white shadow-xl relative border-b border-slate-600/50 z-[9998]"
    >
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0 bg-grid-pattern"></div>
      </div>

      <div className="relative z-10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={toggleMenu}
              className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-all duration-300 hover:scale-110"
              type="button"
            >
              {isExpanded ? <X size={24} /> : <Menu size={24} />}
            </button>

            <div ref={logoRef} className="flex items-center gap-3">
              {logo || (
                <div className="rounded-lg flex items-center justify-center shadow-lg p-1 size-16">
                  {/* logo */}
                </div>
              )}
            </div>
          </div>

          <nav ref={navRef} className="hidden lg:flex items-center gap-2">
            {visibleNavCategories.length > 0
              ? visibleNavCategories.map(renderDesktopCategoryNav)
              : visibleNavItems.map(renderDesktopNavItem)}
          </nav>

          <div className="flex items-center gap-3">
            <div className="flex items-center">
              <div ref={searchRef} className="hidden">
                <input
                  type="text"
                  placeholder="Search..."
                  className="px-4 py-2 rounded-lg bg-slate-700/50 backdrop-blur-sm text-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
              <button
                onClick={toggleSearch}
                className="p-2 hover:bg-white/10 rounded-lg transition-all duration-300 hover:scale-110"
                type="button"
              >
                <Search size={20} />
              </button>
            </div>

            <NotificationDropdown notifications={notifications} />

            <div className="relative">
              <button
                onClick={toggleProfile}
                className="flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg transition-all duration-300"
                type="button"
              >
                <UserAvatar
                  alt={profileName}
                  size={32}
                  className="rounded-full border-2 border-slate-300"
                  src={profileImageSrc}
                />
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium">{profileName}</p>
                </div>
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`}
                />
              </button>

              <div
                ref={profileRef}
                className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl z-50 hidden"
                style={{ display: isProfileOpen ? 'block' : 'none' }}
              >
                <div className="bg-gradient-to-r from-slate-600 to-slate-700 p-4">
                  <UserAvatar
                    alt={profileName}
                    size={64}
                    className="rounded-full border-4 border-white mx-auto mb-2"
                    src={profileImageSrc}
                  />
                  <p className="text-white font-semibold text-center">{profileName}</p>
                </div>
                <div className="p-2">
                  <Link
                    href="/profile"
                    className="w-full text-left px-4 py-2 text-gray-700 hover:bg-slate-50 rounded-lg transition-colors duration-200 flex items-center gap-3"
                  >
                    <Users size={16} />
                    <span>Profile</span>
                  </Link>
                  <button
                    className="w-full text-left px-4 py-2 text-gray-700 hover:bg-slate-50 rounded-lg transition-colors duration-200 flex items-center gap-3"
                    type="button"
                  >
                    <Settings size={16} />
                    <span>Settings</span>
                  </button>
                  <hr className="my-2" />
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 flex items-center gap-3"
                    type="button"
                  >
                    <LogOut size={16} />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          ref={menuItemsRef}
          className="lg:hidden mt-4 border-t border-white/20 pt-4 hidden"
          style={{ display: isExpanded ? 'block' : 'none' }}
        >
          <nav className="flex flex-col gap-2">
            {visibleNavCategories.length > 0
              ? visibleNavCategories.map(renderMobileCategoryNav)
              : visibleNavItems.map(renderMobileNavItem)}
          </nav>
        </div>
      </div>
    </header>
  )
}
