'use client'

import { Handle, type NodeProps, Position } from '@xyflow/react'
import { Workflow } from 'lucide-react'
import { memo } from 'react'

export type VerificationNodeData = {
  label: string
  stepOrder: number
  isNew?: boolean
  dbId?: string
}

function VerificationNodeComponent({ data, selected }: NodeProps & { data: VerificationNodeData }) {
  return (
    <div
      className={`
        group relative min-w-[180px] rounded-xl border-2 bg-white shadow-md transition-all duration-200
        ${selected ? 'border-violet-500 shadow-violet-200 ring-2 ring-violet-100' : 'border-slate-200 hover:border-violet-300 hover:shadow-lg'}
        ${data.isNew ? 'animate-pulse' : ''}
      `}
    >
      <Handle
        id="left"
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-2 !border-white !bg-slate-400 transition-transform group-hover:scale-110"
        style={{ top: '50%' }}
      />

      <div className="flex items-center gap-2.5 rounded-t-[10px] bg-gradient-to-r from-violet-500 to-purple-500 px-3 py-2 text-white">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
          <Workflow className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[9px] font-medium uppercase tracking-wide text-violet-200">
            Verification Step
          </div>
          <div className="text-xs font-semibold">Step {data.stepOrder}</div>
        </div>
      </div>

      <div className="px-3 py-2">
        <div className="text-[10px] text-slate-400">Click to configure this step</div>
      </div>

      <Handle
        id="right-main"
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-2 !border-white !bg-violet-500 transition-transform group-hover:scale-110"
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

export const VerificationNode = memo(VerificationNodeComponent)
