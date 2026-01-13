import type React from 'react'

type HeaderNavItem = {
  id: string
  label: string
  icon: React.ReactNode
  href?: string
  onClick?: () => undefined
  badge?: number
}

type HeaderNavCategory = {
  id: string
  label: string
  icon: React.ReactNode
  href?: string // Direct link (no dropdown)
  items?: HeaderNavItem[] // Dropdown items
}

type HeaderProps = {
  logo?: React.ReactNode
  companyName?: string
  userName?: string
  userRole?: string
  userAvatar?: string
  notifications?: number
  onLogout?: () => undefined
  navItems: HeaderNavItem[]
  navCategories?: HeaderNavCategory[]
}

type HeaderViewState = {
  isExpanded: boolean
  isProfileOpen: boolean
  isSearchOpen: boolean
  isDarkMode: boolean
  activeNav: string
}

type HeaderViewStateUpdates = Partial<HeaderViewState>

export type {
  HeaderNavCategory,
  HeaderNavItem,
  HeaderProps,
  HeaderViewState,
  HeaderViewStateUpdates,
}
