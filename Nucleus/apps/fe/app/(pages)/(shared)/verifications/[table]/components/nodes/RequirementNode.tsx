'use client'

import { Handle, type NodeProps, Position } from '@xyflow/react'
import { PenTool, UserCheck, Users } from 'lucide-react'
import { memo } from 'react'

export type RequirementNodeData = {
  label: string
  verifierType: 'user' | 'role' | 'entity_creator' | null
  verifierId: string | null
  verifierRole: string | null
  isAllRequired: boolean
  isSignatureMandatory: boolean
  isNew?: boolean
  dbId?: string
}

function RequirementNodeComponent({ data, selected }: NodeProps & { data: RequirementNodeData }) {
  const getVerifierIcon = () => {
    switch (data.verifierType) {
      case 'user':
        return <UserCheck className="h-4 w-4" />
      case 'role':
        return <Users className="h-4 w-4" />
      default:
        return <UserCheck className="h-4 w-4" />
    }
  }

  const getVerifierLabel = () => {
    switch (data.verifierType) {
      case 'user':
        return 'User Approval'
      case 'role':
        return 'Role Approval'
      case 'entity_creator':
        return 'Creator Approval'
      default:
        return 'Approval Step'
    }
  }

  return (
    <div
      className={`
        group relative min-w-[160px] rounded-xl border-2 bg-white shadow-md transition-all duration-200
        ${selected ? 'border-indigo-500 shadow-indigo-200 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-indigo-300 hover:shadow-lg'}
        ${data.isNew ? 'animate-pulse' : ''}
      `}
    >
      <Handle
        id="left"
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-2 !border-white !bg-indigo-500 transition-transform group-hover:scale-110"
        style={{ top: '50%' }}
      />

      <div className="flex items-center gap-2 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50 px-3 py-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500 text-white shadow-sm">
          {getVerifierIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[9px] font-medium text-indigo-600">
            {data.verifierType === 'role' ? 'Role verifier' : 'User verifier'}
          </div>
          <div className="text-xs font-semibold text-slate-900 truncate">{getVerifierLabel()}</div>
        </div>
      </div>

      <div className="px-3 py-2 space-y-1">
        {data.isSignatureMandatory && (
          <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
            <PenTool className="h-3 w-3 text-amber-500 flex-shrink-0" />
            <span>Signature required</span>
          </div>
        )}
        {data.verifierType === 'role' && data.isAllRequired && (
          <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
            <Users className="h-3 w-3 text-blue-500 flex-shrink-0" />
            <span>All users with this role must approve</span>
          </div>
        )}
        {!data.isSignatureMandatory && !data.isAllRequired && (
          <div className="text-[10px] text-slate-400">Click to configure</div>
        )}
      </div>

      <Handle
        id="right-main"
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-2 !border-white !bg-indigo-500 transition-transform group-hover:scale-110"
        style={{ top: '35%' }}
      />
      <Handle
        id="right-notification"
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-2 !border-white !bg-amber-500 transition-transform group-hover:scale-110"
        style={{ top: '65%' }}
      />
    </div>
  )
}

export const RequirementNode = memo(RequirementNodeComponent)
