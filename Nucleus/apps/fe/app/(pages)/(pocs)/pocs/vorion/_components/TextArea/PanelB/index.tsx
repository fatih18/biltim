'use client'

import type { UserOAuthProvider } from '@monorepo/db-entities/schemas/default/user_oauth_provider'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { BiLogoGmail } from 'react-icons/bi'
import { FaCheck, FaGoogleDrive } from 'react-icons/fa'
import { FiChevronRight } from 'react-icons/fi'
import { GiArchiveResearch, GiDuration, GiFeather } from 'react-icons/gi'
import { GrOnedrive } from 'react-icons/gr'
import { IoMdGlobe } from 'react-icons/io'
import { IoCalendarNumberSharp } from 'react-icons/io5'
import {
  LuArrowLeft,
  LuExternalLink,
  LuLoader,
  LuPencil,
  LuPlus,
  LuSettings,
  LuWrench,
  LuX,
} from 'react-icons/lu'
import { PiDetectiveFill, PiUsersThreeFill } from 'react-icons/pi'
import { toast } from 'sonner'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'
import { useTextAreaStore } from '@/app/_store'
import { cn } from '@/app/_utils'
import type { VorionToolResponse } from '@/lib/api'
import { MiniSwitch } from '../../MiniSwitch'
import { DUMMY_STYLES } from '../../types'

// ============================================================================
// Types
// ============================================================================

interface ToggleItemProps {
  icon: React.ReactNode
  label: string
  isOn: boolean
  onToggle: () => void
  hasBorder?: boolean
}

interface IntegrationItemProps {
  id: string
  icon: React.ReactNode
  label: string
  status?: 'connect' | 'connected' | 'checking'
  onClick?: () => void
}

// ============================================================================
// Configuration
// ============================================================================

const INTEGRATIONS: IntegrationItemProps[] = [
  { id: 'gdrive', icon: <FaGoogleDrive size={14} />, label: 'Google Drive' },
  { id: 'onedrive', icon: <GrOnedrive size={14} />, label: 'OneDrive' },
  { id: 'calendar', icon: <IoCalendarNumberSharp size={14} />, label: 'Calendar' },
  { id: 'gmail', icon: <BiLogoGmail size={14} />, label: 'Gmail' },
]

// ============================================================================
// Sub-Components
// ============================================================================

function ToggleItem({ icon, label, isOn, onToggle, hasBorder }: ToggleItemProps) {
  return (
    <div
      className={cn(
        'relative flex items-center justify-between w-full p-2.5 sm:p-3 rounded-lg',
        'text-xs sm:text-sm',
        'text-zinc-600 dark:text-white/60',
        'hover:text-zinc-900 dark:hover:text-white',
        'hover:bg-zinc-100 dark:hover:bg-white/5',
        'transition-all duration-200',
        hasBorder && 'border-b border-zinc-100 dark:border-white/10 rounded-b-none'
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="absolute inset-0 z-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-inset rounded-lg"
        aria-label={`Toggle ${label}`}
      />
      <div className="flex items-center gap-2.5 pointer-events-none">
        <span className="text-zinc-500 dark:text-white/50">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="pointer-events-none">
        <MiniSwitch isOn={isOn} size="sm" />
      </div>
    </div>
  )
}

function IntegrationItem({ icon, label, status = 'connect', onClick }: IntegrationItemProps) {
  const statusLabel =
    status === 'checking' ? 'Checking...' : status === 'connected' ? 'Connected' : 'Connect'

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 w-full p-2.5 sm:p-3 rounded-lg',
        'text-xs sm:text-sm text-left',
        'text-zinc-600 dark:text-white/60',
        'hover:text-zinc-900 dark:hover:text-white',
        'hover:bg-zinc-100 dark:hover:bg-white/5',
        'transition-all duration-200'
      )}
    >
      <span className="text-zinc-500 dark:text-white/50">{icon}</span>
      <span className="flex-1">{label}</span>
      <span className="flex items-center gap-1 text-xs text-zinc-400 dark:text-white/40">
        {statusLabel}
        <LuExternalLink size={12} />
      </span>
    </button>
  )
}

function SearchHeader({
  onBack,
  placeholder,
  value,
  onChange,
}: {
  onBack: () => void
  placeholder: string
  value?: string
  onChange?: (value: string) => void
}) {
  return (
    <div className="flex items-center gap-2 p-2.5 border-b border-zinc-100 dark:border-white/10">
      <button
        type="button"
        onClick={onBack}
        aria-label="Go back"
        className={cn(
          'flex-shrink-0 p-1.5 rounded-lg',
          'text-zinc-600 dark:text-white',
          'hover:bg-zinc-100 dark:hover:bg-white/10',
          'transition-colors duration-200'
        )}
      >
        <LuArrowLeft size={16} />
      </button>
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'flex-1 bg-transparent text-sm',
          'text-zinc-900 dark:text-white',
          'placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
          'focus:outline-none'
        )}
      />
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function PanelB() {
  const actions = useGenericApiActions()
  const store = useTextAreaStore()
  const router = useRouter()
  const isOpen = store.isPanelBOpen
  const isAbove = store.panelPosition === 'above'
  const isMainView = store.panelBState === 'main'
  const isStylesView = store.panelBState === 'styles'
  const isToolsView = store.panelBState === 'tools'

  const [tools, setTools] = useState<VorionToolResponse[]>([])
  const [toolsSearchQuery, setToolsSearchQuery] = useState('')
  const [toolsPage, setToolsPage] = useState(1)
  const [toolsHasMore, setToolsHasMore] = useState(true)
  const [isToolsLoadingMore, setIsToolsLoadingMore] = useState(false)
  const toolsLoadMoreRef = useRef<HTMLDivElement | null>(null)

  const TOOLS_PAGE_SIZE = 20

  // OneDrive / Microsoft OAuth linked state (shared with PanelA behavior)
  const [isOneDriveLinked, setIsOneDriveLinked] = useState<boolean | null>(null)

  useEffect(() => {
    if (!isToolsView) return

    const aggregated: VorionToolResponse[] = []
    const maxPrefetchPages = 3

    const loadPage = (page: number) => {
      actions.VORION_LIST_TOOLS?.start({
        payload: { page, page_size: TOOLS_PAGE_SIZE },
        onAfterHandle: (data) => {
          const items = (data?.items as VorionToolResponse[] | undefined) ?? []
          const nonBuiltIn = items.filter((tool) => tool.tool_type !== 'built_in')

          const existingIds = new Set(aggregated.map((t) => t.id))
          const newItems = nonBuiltIn.filter((tool) => !existingIds.has(tool.id))
          aggregated.push(...newItems)

          const totalPages = (data?.total_pages as number | undefined) ?? data?.page ?? page

          let shouldLoadMore = false
          if (
            page === 1 &&
            aggregated.length < 10 &&
            page < totalPages &&
            page < maxPrefetchPages
          ) {
            shouldLoadMore = true
          } else if (
            page === 2 &&
            aggregated.length < 20 &&
            page < totalPages &&
            page < maxPrefetchPages
          ) {
            shouldLoadMore = true
          }

          if (shouldLoadMore) {
            loadPage(page + 1)
          } else {
            setTools(aggregated)
            setToolsPage(page)
            setToolsHasMore(page < totalPages)
          }
        },
      })
    }

    loadPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isToolsView])

  const loadMoreTools = useCallback(() => {
    if (isToolsLoadingMore || !toolsHasMore) return

    const nextPage = toolsPage + 1
    setIsToolsLoadingMore(true)

    actions.VORION_LIST_TOOLS?.start({
      payload: { page: nextPage, page_size: TOOLS_PAGE_SIZE },
      onAfterHandle: (data) => {
        if (data?.items && data.items.length > 0) {
          const nonBuiltIn = (data.items as VorionToolResponse[]).filter(
            (tool) => tool.tool_type !== 'built_in'
          )
          setTools((prev) => {
            const existingIds = new Set(prev.map((t) => t.id))
            const newItems = nonBuiltIn.filter((t) => !existingIds.has(t.id))
            return [...prev, ...newItems]
          })
          setToolsPage(nextPage)
          setToolsHasMore(data.page < (data.total_pages ?? data.page))
        } else {
          setToolsHasMore(false)
        }
        setIsToolsLoadingMore(false)
      },
      onErrorHandle: () => {
        setIsToolsLoadingMore(false)
      },
    })
  }, [isToolsLoadingMore, toolsHasMore, toolsPage])

  useEffect(() => {
    if (!isToolsView) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry?.isIntersecting && toolsHasMore && !isToolsLoadingMore) {
          loadMoreTools()
        }
      },
      { threshold: 0.1 }
    )

    const currentRef = toolsLoadMoreRef.current
    if (currentRef) observer.observe(currentRef)

    return () => {
      if (currentRef) observer.unobserve(currentRef)
    }
  }, [isToolsView, toolsHasMore, isToolsLoadingMore, loadMoreTools])

  // Check if Microsoft (OneDrive) account is linked when settings panel opens
  useEffect(() => {
    if (!isOpen || !isMainView) return
    if (isOneDriveLinked !== null) return

    actions.GET_OAUTH_ACCOUNTS?.start({
      onAfterHandle: (data) => {
        if (!data) {
          setIsOneDriveLinked(false)
          return
        }
        // Azure OAuth provider is stored as 'azure' in user_oauth_providers
        const hasMicrosoft = data.data.some(
          (account: UserOAuthProvider) => account.provider === 'azure'
        )
        setIsOneDriveLinked(hasMicrosoft)
      },
      onErrorHandle: () => {
        setIsOneDriveLinked(false)
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isMainView, isOneDriveLinked])

  return (
    <div
      className={cn(
        'absolute z-50 w-[260px] sm:w-[300px]',
        'rounded-xl overflow-hidden',
        'bg-white dark:bg-zinc-900',
        'border border-zinc-200 dark:border-white/10',
        'shadow-xl shadow-zinc-200/50 dark:shadow-black/30',
        'transition-all duration-300 ease-out',
        // Position
        isAbove ? 'bottom-full mb-2 left-8 sm:left-10' : 'top-full mt-2 left-8 sm:left-10',
        // Origin for animation
        isAbove ? 'origin-bottom-left' : 'origin-top-left',
        // Visibility
        isOpen
          ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
          : cn(
              'opacity-0 scale-95 pointer-events-none',
              isAbove ? 'translate-y-2' : '-translate-y-2'
            )
      )}
      role="menu"
      aria-hidden={!isOpen}
    >
      {/* Main Menu */}
      {isMainView && (
        <div className="p-1.5 sm:p-2 animate-in fade-in duration-200 max-h-[400px] overflow-y-auto">
          {/* Styles Submenu */}
          <button
            type="button"
            onClick={() => {
              store.panelBState = 'styles'
            }}
            className={cn(
              'flex items-center gap-2.5 w-full p-2.5 sm:p-3 rounded-lg',
              'text-xs sm:text-sm text-left',
              'text-zinc-600 dark:text-white/60',
              'hover:text-zinc-900 dark:hover:text-white',
              'hover:bg-zinc-100 dark:hover:bg-white/5',
              'transition-all duration-200',
              'border-b border-zinc-100 dark:border-white/10 rounded-b-none mb-1'
            )}
          >
            <GiFeather size={14} className="text-purple-500" />
            <span className="flex-1">Use style</span>
            <FiChevronRight size={14} className="text-zinc-400 dark:text-white/40" />
          </button>

          {/* Toggles Section */}
          <div className="space-y-0.5">
            <ToggleItem
              icon={<PiDetectiveFill size={14} />}
              label="Agentic Mode"
              isOn={store.isAgenticMode}
              onToggle={() => {
                store.isAgenticMode = !store.isAgenticMode
              }}
            />
            <ToggleItem
              icon={<PiUsersThreeFill size={14} />}
              label="Multi Model"
              isOn={store.isMultiModel}
              onToggle={() => {
                store.isMultiModel = !store.isMultiModel
              }}
            />
            <ToggleItem
              icon={<GiDuration size={14} />}
              label="Extended Thinking"
              isOn={store.isThinkingExtended}
              onToggle={() => {
                store.isThinkingExtended = !store.isThinkingExtended
              }}
              hasBorder
            />
            <ToggleItem
              icon={<IoMdGlobe size={14} />}
              label="Web Search"
              isOn={store.isWebSearchEnabled}
              onToggle={() => {
                store.isWebSearchEnabled = !store.isWebSearchEnabled
              }}
            />
            <ToggleItem
              icon={<GiArchiveResearch size={14} />}
              label="Research Mode"
              isOn={store.isResearchMode}
              onToggle={() => {
                store.isResearchMode = !store.isResearchMode
              }}
            />
          </div>

          {/* Integrations */}
          <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-white/10">
            {INTEGRATIONS.map((item) => {
              if (item.id === 'onedrive') {
                const status: 'connect' | 'connected' | 'checking' =
                  isOneDriveLinked === null
                    ? 'checking'
                    : isOneDriveLinked
                      ? 'connected'
                      : 'connect'

                return (
                  <IntegrationItem
                    key={item.id}
                    id={item.id}
                    icon={item.icon}
                    label={item.label}
                    status={status}
                    onClick={() => {
                      if (isOneDriveLinked) {
                        toast.info('OneDrive is already connected.')
                        return
                      }

                      if (!actions.GET_AZURE_AUTH_URL) {
                        toast.error('OneDrive integration is not available right now.')
                        return
                      }

                      actions.GET_AZURE_AUTH_URL.start({
                        payload: { returnUrl: window.location.origin },
                        onAfterHandle: (data) => {
                          const authUrl = (data as { authUrl?: string } | undefined)?.authUrl
                          if (authUrl) {
                            window.location.href = authUrl
                          } else {
                            toast.error('Failed to get Microsoft authorization URL')
                          }
                        },
                        onErrorHandle: (error) => {
                          console.error('Azure OAuth error:', error)
                          toast.error('Failed to connect OneDrive')
                        },
                      })
                    }}
                  />
                )
              }

              // Default integrations (Google Drive, Calendar, Gmail) - placeholder behavior
              return (
                <IntegrationItem
                  key={item.id}
                  id={item.id}
                  icon={item.icon}
                  label={item.label}
                  status="connect"
                  onClick={() => {
                    console.log(`Integration click: ${item.id}`)
                  }}
                />
              )
            })}
          </div>

          {/* Tools Submenu */}
          <button
            type="button"
            onClick={() => {
              store.panelBState = 'tools'
            }}
            className={cn(
              'flex items-center gap-2.5 w-full p-2.5 sm:p-3 rounded-lg',
              'text-xs sm:text-sm text-left',
              'text-zinc-600 dark:text-white/60',
              'hover:text-zinc-900 dark:hover:text-white',
              'hover:bg-zinc-100 dark:hover:bg-white/5',
              'transition-all duration-200',
              'border-t border-zinc-100 dark:border-white/10 mt-2 pt-3'
            )}
          >
            <LuSettings size={14} className="text-amber-500" />
            <span className="flex-1">Use tools</span>
            <FiChevronRight size={14} className="text-zinc-400 dark:text-white/40" />
          </button>
        </div>
      )}

      {/* Styles View */}
      {isStylesView && (
        <div className="animate-in fade-in slide-in-from-right-2 duration-200">
          <SearchHeader
            onBack={() => {
              store.panelBState = 'main'
            }}
            placeholder="Search styles..."
          />

          <div className="p-1.5 sm:p-2 max-h-[250px] overflow-y-auto">
            {DUMMY_STYLES.map((style) => {
              const isSelected = store.selectedStyle === style.name
              return (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => {
                    store.selectedStyle = isSelected ? null : style.name
                  }}
                  className={cn(
                    'flex items-center gap-2.5 w-full p-2.5 sm:p-3 rounded-lg',
                    'text-left text-xs sm:text-sm',
                    'transition-all duration-200',
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      : 'text-zinc-600 dark:text-white/60 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5'
                  )}
                >
                  <LuPencil size={14} className={isSelected ? 'text-blue-500' : 'text-zinc-400'} />
                  <span className="flex-1 truncate">{style.name}</span>
                  {isSelected && <FaCheck size={12} className="text-blue-500" />}
                </button>
              )
            })}

            <button
              type="button"
              className={cn(
                'flex items-center gap-2.5 w-full p-2.5 sm:p-3 rounded-lg',
                'text-xs sm:text-sm text-left',
                'text-zinc-600 dark:text-white/60',
                'hover:text-zinc-900 dark:hover:text-white',
                'hover:bg-zinc-100 dark:hover:bg-white/5',
                'transition-all duration-200',
                'border-t border-zinc-100 dark:border-white/10 mt-1 pt-3'
              )}
            >
              <LuPlus size={14} className="text-emerald-500" />
              <span>Create new style</span>
            </button>
          </div>
        </div>
      )}

      {/* Tools View */}
      {isToolsView && (
        <div className="animate-in fade-in slide-in-from-right-2 duration-200">
          <SearchHeader
            onBack={() => {
              store.panelBState = 'main'
            }}
            placeholder="Search tools..."
            value={toolsSearchQuery}
            onChange={setToolsSearchQuery}
          />

          <div className="p-1.5 sm:p-2 max-h-[250px] overflow-y-auto">
            {tools
              .filter((tool) => {
                if (!toolsSearchQuery.trim()) return true
                const q = toolsSearchQuery.trim().toLowerCase()
                return (
                  tool.name.toLowerCase().includes(q) ||
                  tool.slug.toLowerCase().includes(q) ||
                  tool.description?.toLowerCase().includes(q)
                )
              })
              .map((tool) => {
                const id = String(tool.id)
                const isSelected = store.selectedTools?.includes(id) ?? false
                const isActive = tool.status === 'active'
                return (
                  <button
                    key={tool.id}
                    type="button"
                    disabled={!isActive}
                    onClick={() => {
                      if (!isActive) return
                      if (isSelected) {
                        const next = store.selectedTools?.filter((t) => t !== id) ?? null
                        store.selectedTools = next && next.length > 0 ? next : null
                      } else {
                        store.selectedTools = [...(store.selectedTools ?? []), id]
                      }
                    }}
                    className={cn(
                      'flex items-center gap-2.5 w-full p-2.5 sm:p-3 rounded-lg',
                      'text-left text-xs sm:text-sm',
                      'transition-all duration-200',
                      !isActive
                        ? 'opacity-70 cursor-not-allowed text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-900'
                        : isSelected
                          ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          : 'text-zinc-600 dark:text-white/60 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5'
                    )}
                  >
                    <LuWrench
                      size={14}
                      className={cn(
                        isSelected ? 'text-blue-500' : 'text-zinc-400',
                        !isActive && 'opacity-60'
                      )}
                    />
                    <span className="flex-1 truncate flex items-center gap-1">
                      <span>{tool.name}</span>
                      {!isActive && (
                        <span
                          className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 text-amber-600 text-[10px]"
                          title="Draft tool"
                        >
                          !
                        </span>
                      )}
                    </span>
                    {isSelected && isActive && <FaCheck size={12} className="text-blue-500" />}
                  </button>
                )
              })}

            {toolsHasMore && (
              <div ref={toolsLoadMoreRef} className="flex justify-center py-3">
                {isToolsLoadingMore && (
                  <div className="flex items-center gap-2 text-zinc-400 text-xs">
                    <LuLoader size={16} className="animate-spin" />
                    <span>Loading more tools...</span>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              className={cn(
                'flex items-center gap-2.5 w-full p-2.5 sm:p-3 rounded-lg',
                'text-xs sm:text-sm text-left',
                'text-zinc-600 dark:text-white/60',
                'hover:text-zinc-900 dark:hover:text-white',
                'hover:bg-zinc-100 dark:hover:bg-white/5',
                'transition-all duration-200',
                'border-t border-zinc-100 dark:border-white/10 mt-1 pt-3'
              )}
              onClick={() => {
                router.push('/pocs/vorion/tools?create=true')
              }}
            >
              <LuPlus size={14} className="text-emerald-500" />
              <span>Create new tool</span>
            </button>

            {/* Selected Tools Summary */}
            {store.selectedTools && store.selectedTools.length > 0 && (
              <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-white/10">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-medium text-zinc-700 dark:text-white/80">
                    Selected ({store.selectedTools.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      store.selectedTools = null
                    }}
                    className="text-xs text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  >
                    Clear all
                  </button>
                </div>
                <div className="space-y-1">
                  {store.selectedTools.map((toolId) => {
                    const tool = tools.find((t) => String(t.id) === toolId)
                    const label = tool?.name ?? `Tool #${toolId}`
                    return (
                      <div
                        key={toolId}
                        className={cn(
                          'group flex items-center justify-between p-2 rounded-lg',
                          'bg-zinc-50 dark:bg-white/5',
                          'border border-zinc-100 dark:border-white/10'
                        )}
                      >
                        <span className="text-xs text-zinc-700 dark:text-white/80">{label}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const next = store.selectedTools?.filter((t) => t !== toolId) ?? null
                            store.selectedTools = next && next.length > 0 ? next : null
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-500/20 transition-all"
                        >
                          <LuX size={12} className="text-red-500" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
