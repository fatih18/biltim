'use client'
import { useState } from 'react'
import { cn } from '@/app/_utils'
import type { TabOption, TabsProps } from './types'

function resolveInitialTabId(tabs: TabOption[], defaultActiveId?: string): string {
  if (tabs.length === 0) {
    throw new Error('Tabs component requires at least one tab option.')
  }
  if (defaultActiveId) {
    const match = tabs.find((tab) => tab.id === defaultActiveId)
    if (match) {
      return match.id
    }
  }
  return tabs[0]?.id || ''
}

function findTabById(tabs: TabOption[], tabId: string): TabOption | undefined {
  return tabs.find((tab) => tab.id === tabId)
}

export function Tabs({
  tabs,
  defaultActiveId,
  onChange,
  renderContent,
  className,
  tabListClassName,
  tabButtonClassName,
  panelClassName,
}: TabsProps) {
  const initialActiveId = resolveInitialTabId(tabs, defaultActiveId)
  const [activeTabId, setActiveTabId] = useState(initialActiveId)
  const fallbackActiveId = resolveInitialTabId(tabs, defaultActiveId)
  const activeTab = findTabById(tabs, activeTabId) ?? findTabById(tabs, fallbackActiveId) ?? tabs[0]

  if (!activeTab) {
    return null
  }

  function handleSelect(tab: TabOption) {
    if (tab.disabled) {
      return
    }
    setActiveTabId(tab.id)
    if (onChange) {
      onChange(tab.id)
    }
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <nav
        className={cn(
          'flex flex-wrap items-center gap-2 rounded-2xl bg-slate-100 p-2',
          tabListClassName
        )}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab?.id
          return (
            <button
              key={tab.id}
              type="button"
              className={cn(
                'group inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all',
                isActive ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:bg-white/80',
                tab.disabled ? 'cursor-not-allowed opacity-60' : '',
                tabButtonClassName
              )}
              onClick={() => {
                handleSelect(tab)
              }}
              role="tab"
              aria-selected={isActive}
              aria-disabled={tab.disabled}
            >
              <span>{tab.label}</span>
              {tab.badge ? <span>{tab.badge}</span> : null}
            </button>
          )
        })}
      </nav>
      <div
        className={cn('rounded-3xl border border-slate-200 bg-white p-6', panelClassName)}
        role="tabpanel"
      >
        {renderContent(activeTab)}
      </div>
    </div>
  )
}
