'use client'

import { Bell, ChevronRight, UserCheck, Workflow } from 'lucide-react'
import type { DragEvent } from 'react'

type NodeType = 'verification' | 'verifier' | 'notification'

type PaletteItem = {
  type: NodeType
  label: string
  description: string
  icon: React.ReactNode
  color: string
  bgColor: string
}

const paletteItems: PaletteItem[] = [
  {
    type: 'verification',
    label: 'Verification',
    description: 'Represents a single verification step',
    icon: <Workflow className="h-5 w-5" />,
    color: 'text-violet-600',
    bgColor: 'bg-violet-500',
  },
  {
    type: 'verifier',
    label: 'Verifier',
    description: 'Who must verify in this step',
    icon: <UserCheck className="h-5 w-5" />,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-500',
  },
  {
    type: 'notification',
    label: 'Notification',
    description: 'Send notifications before or after a step',
    icon: <Bell className="h-5 w-5" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-500',
  },
]

type NodePaletteProps = {
  isCollapsed: boolean
  onToggle: () => void
}

export function NodePalette({ isCollapsed, onToggle }: NodePaletteProps) {
  const onDragStart = (event: DragEvent<HTMLElement>, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      className={`
        flex flex-col border-r border-slate-200 bg-white transition-all duration-300 flex-shrink-0
        ${isCollapsed ? 'w-14' : 'w-56'}
      `}
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
        {!isCollapsed && (
          <div>
            <h3 className="text-xs font-semibold text-slate-900">Components</h3>
            <p className="text-[10px] text-slate-400">Drag to canvas</p>
          </div>
        )}
        <button
          type="button"
          onClick={onToggle}
          className={`flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 ${isCollapsed ? 'mx-auto' : ''}`}
        >
          <ChevronRight
            className={`h-4 w-4 transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180'}`}
          />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1.5">
          {paletteItems.map((item) => (
            <button
              key={item.type}
              type="button"
              draggable
              onDragStart={(e) => onDragStart(e, item.type)}
              className={`
                group w-full cursor-grab rounded-lg border border-dashed border-slate-200 bg-slate-50/80 
                transition-all duration-200 hover:border-slate-300 hover:bg-white hover:shadow-sm
                active:cursor-grabbing active:scale-[0.98] active:shadow-md
                ${isCollapsed ? 'p-2.5' : 'p-2.5'}
              `}
            >
              {isCollapsed ? (
                <div className={`flex items-center justify-center ${item.color}`}>{item.icon}</div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-white shadow-sm ${item.bgColor}`}
                  >
                    {item.icon}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-xs font-semibold text-slate-800 truncate">
                      {item.label}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{item.description}</div>
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {!isCollapsed && (
        <div className="border-t border-slate-100 p-2.5">
          <div className="rounded-md bg-gradient-to-r from-indigo-50/80 to-purple-50/80 p-2.5">
            <div className="text-[10px] font-medium text-indigo-800">Pro tip</div>
            <div className="mt-0.5 text-[10px] leading-relaxed text-indigo-600">
              Connect nodes by dragging from right handles to left handles
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
