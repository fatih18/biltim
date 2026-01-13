'use client'

import { Handle, type NodeProps, Position } from '@xyflow/react'
import { Bell, CheckCircle, Flag, Play, XCircle } from 'lucide-react'
import { memo } from 'react'

export type NotificationRuleNodeData = {
  label: string
  trigger: 'on_flow_started' | 'on_approved' | 'on_rejected' | 'on_flow_completed'
  recipientType: 'user' | 'role' | 'all_verifiers' | 'step_verifier'
  recipientId: string | null
  channel: 'portal' | 'email' | 'both'
  isNew?: boolean
  dbId?: string
  recipientDbId?: string
}

function NotificationRuleNodeComponent({
  data,
  selected,
}: NodeProps & { data: NotificationRuleNodeData }) {
  const getTriggerIcon = () => {
    switch (data.trigger) {
      case 'on_flow_started':
        return <Play className="h-4 w-4" />
      case 'on_approved':
      case 'on_flow_completed':
        return <CheckCircle className="h-4 w-4" />
      case 'on_rejected':
        return <XCircle className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getTriggerLabel = () => {
    switch (data.trigger) {
      case 'on_flow_started':
        return 'Flow Started'
      case 'on_approved':
        return 'Approved'
      case 'on_rejected':
        return 'Rejected'
      case 'on_flow_completed':
        return 'Flow Completed'
      default:
        return 'Trigger'
    }
  }

  const getTriggerColor = () => {
    switch (data.trigger) {
      case 'on_flow_started':
        return 'from-blue-50 to-cyan-50 border-blue-200'
      case 'on_approved':
      case 'on_flow_completed':
        return 'from-emerald-50 to-green-50 border-emerald-200'
      case 'on_rejected':
        return 'from-rose-50 to-red-50 border-rose-200'
      default:
        return 'from-amber-50 to-yellow-50 border-amber-200'
    }
  }

  const getIconBg = () => {
    switch (data.trigger) {
      case 'on_flow_started':
        return 'bg-blue-500'
      case 'on_approved':
      case 'on_flow_completed':
        return 'bg-emerald-500'
      case 'on_rejected':
        return 'bg-rose-500'
      default:
        return 'bg-amber-500'
    }
  }

  return (
    <div
      className={`
        group relative min-w-[150px] rounded-xl border-2 bg-white shadow-md transition-all duration-200
        ${selected ? 'border-amber-400 shadow-amber-200 ring-2 ring-amber-100' : 'border-slate-200 hover:border-amber-300 hover:shadow-lg'}
        ${data.isNew ? 'animate-pulse' : ''}
      `}
    >
      <Handle
        id="left"
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-2 !border-white !bg-amber-500 transition-transform group-hover:scale-110"
      />

      <div
        className={`flex items-center gap-2 rounded-t-[10px] bg-gradient-to-r px-3 py-2 ${getTriggerColor()}`}
      >
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-md text-white shadow-sm ${getIconBg()}`}
        >
          {getTriggerIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <Bell className="h-2.5 w-2.5 text-amber-600" />
            <span className="text-[9px] font-medium text-amber-700">Notification</span>
          </div>
          <div className="text-xs font-semibold text-slate-900 truncate">{getTriggerLabel()}</div>
        </div>
      </div>

      <div className="px-3 py-1.5 space-y-0.5">
        <div className="flex items-center gap-1.5">
          <Flag className="h-2.5 w-2.5 text-amber-500 flex-shrink-0" />
          <span className="text-[10px] text-slate-600">
            {data.recipientType === 'role' ? 'Role recipient' : 'User recipient'}
          </span>
        </div>
        <div className="text-[9px] text-slate-400">Channel: Platform</div>
      </div>

      <Handle
        id="right"
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-2 !border-white !bg-amber-500 transition-transform group-hover:scale-110"
      />
    </div>
  )
}

export const NotificationRuleNode = memo(NotificationRuleNodeComponent)
