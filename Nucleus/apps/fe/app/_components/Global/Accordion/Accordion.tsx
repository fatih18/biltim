'use client'
import { useState } from 'react'
import { cn } from '@/app/_utils'
import type { AccordionItem, AccordionProps } from './types'

function resolveInitialState(
  items: AccordionItem[],
  defaultOpenIds?: string[],
  allowMultiple?: boolean
): string[] {
  if (!defaultOpenIds || defaultOpenIds.length === 0) {
    if (allowMultiple && items.length > 0) {
      const firstItem = items[0]
      if (firstItem) {
        return [firstItem.id]
      }
    }
    return []
  }
  const valid = (defaultOpenIds ?? []).filter((id) => items.some((item) => item.id === id))
  if (!allowMultiple && valid.length > 1) {
    const firstValid = valid[0]
    return firstValid ? [firstValid] : []
  }
  return valid
}

function toggleId(openIds: string[], id: string, allowMultiple?: boolean) {
  if (allowMultiple) {
    if (openIds.includes(id)) {
      return openIds.filter((openId) => openId !== id)
    }
    return [...openIds, id]
  }
  if (openIds.includes(id)) {
    return []
  }
  return [id]
}

export function Accordion({
  items,
  allowMultiple = false,
  defaultOpenIds,
  onChange,
  className,
  itemClassName,
  headerClassName,
  contentClassName,
  chevronClassName,
}: AccordionProps) {
  const [openIds, setOpenIds] = useState<string[]>(
    resolveInitialState(items, defaultOpenIds, allowMultiple)
  )

  function handleToggle(item: AccordionItem) {
    if (item.disabled) {
      return
    }
    const next = toggleId(openIds, item.id, allowMultiple)
    setOpenIds(next)
    if (onChange) {
      onChange(next)
    }
  }

  return (
    <div
      className={cn(
        'flex flex-col divide-y divide-slate-200 rounded-3xl border border-slate-200 bg-white',
        className
      )}
    >
      {items.map((item) => {
        const isOpen = openIds.includes(item.id)
        return (
          <section key={item.id} className={cn('overflow-hidden', itemClassName)}>
            <button
              className={cn(
                'flex cursor-pointer items-center justify-between gap-4 px-6 py-4 transition-colors',
                isOpen ? 'bg-slate-50' : '',
                item.disabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-slate-50',
                headerClassName
              )}
              type="button"
              disabled={item.disabled}
              onClick={() => {
                handleToggle(item)
              }}
              aria-expanded={isOpen}
            >
              <div className="flex flex-1 flex-col gap-1">
                <div className="flex items-center gap-3 text-left text-sm font-semibold text-slate-900">
                  {item.icon ? (
                    <span className="text-lg" aria-hidden="true">
                      {item.icon}
                    </span>
                  ) : null}
                  <span>{item.title}</span>
                </div>
                {item.description ? (
                  <p className="text-xs text-slate-500">{item.description}</p>
                ) : null}
              </div>
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-transform',
                  isOpen ? 'rotate-180' : '',
                  chevronClassName
                )}
                aria-hidden="true"
              >
                ⌄
              </span>
            </button>
            {isOpen ? (
              <div className={cn('px-6 py-4 text-sm text-slate-700', contentClassName)}>
                {item.content}
              </div>
            ) : null}
          </section>
        )
      })}
    </div>
  )
}
