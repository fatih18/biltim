import type { ReactNode } from 'react'

export type TabOption = {
  id: string
  label: string
  icon?: ReactNode
  badge?: ReactNode
  disabled?: boolean
}

export type TabsProps = {
  tabs: TabOption[]
  defaultActiveId?: string
  onChange?: (tabId: string) => void
  renderContent: (activeTab: TabOption) => ReactNode
  className?: string
  tabListClassName?: string
  tabButtonClassName?: string
  panelClassName?: string
}

export type TabsState = {
  activeTabId: string
}
