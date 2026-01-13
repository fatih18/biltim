'use client'

import { Handle, type NodeProps, Position } from '@xyflow/react'
import { Mail, User, UserCog, Users } from 'lucide-react'
import { memo } from 'react'

export type RecipientNodeData = {
  label: string
  recipientType: 'user' | 'role' | 'all_verifiers' | 'step_verifier'
  channel: 'portal'
  isNew?: boolean
}

function RecipientNodeComponent({ data, selected }: NodeProps & { data: RecipientNodeData }) {
  const getRecipientIcon = () => {
    switch (data.recipientType) {
      case 'user':
        return <User className="h-4 w-4" />
      case 'role':
        return <Users className="h-4 w-4" />
      case 'all_verifiers':
        return <Users className="h-4 w-4" />
      case 'step_verifier':
        return <UserCog className="h-4 w-4" />
      default:
        return <User className="h-4 w-4" />
    }
  }

  const getRecipientLabel = () => {
    switch (data.recipientType) {
      case 'user':
        return 'Specific User'
      case 'role':
        return 'Role Members'
      case 'all_verifiers':
        return 'All Verifiers'
      case 'step_verifier':
        return 'Step Verifier'
      default:
        return 'Recipient'
    }
  }

  return (
    <div
      className={`
        group relative min-w-[160px] rounded-xl border-2 bg-white shadow-lg transition-all duration-200
        ${selected ? 'border-teal-500 shadow-teal-200 ring-4 ring-teal-100' : 'border-slate-200 hover:border-teal-300 hover:shadow-xl'}
        ${data.isNew ? 'animate-pulse' : ''}
      `}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-white !bg-teal-500 transition-transform group-hover:scale-125"
      />

      <div className="flex items-center gap-3 rounded-t-xl bg-gradient-to-r from-teal-50 to-cyan-50 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500 text-white shadow-md">
          {getRecipientIcon()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <Mail className="h-3 w-3 text-teal-600" />
            <span className="text-xs font-medium text-teal-600">Recipient</span>
          </div>
          <div className="text-sm font-semibold text-slate-900">{getRecipientLabel()}</div>
        </div>
      </div>

      <div className="px-4 py-2">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Portal
        </div>
      </div>
    </div>
  )
}

export const RecipientNode = memo(RecipientNodeComponent)
