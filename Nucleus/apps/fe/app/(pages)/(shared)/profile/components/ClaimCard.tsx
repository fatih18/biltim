import type { ClaimJSON } from '@monorepo/db-entities/schemas/default/claim'
import { Shield } from 'lucide-react'

interface ClaimCardProps {
  claim: ClaimJSON
}

export function ClaimCard({ claim }: ClaimCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-all duration-300">
      <div className="flex items-center gap-3 mb-4">
        <Shield size={16} className="text-purple-500" />
        <h3 className="font-semibold text-gray-800">{claim.action}</h3>
        <span className="px-2 py-1 bg-purple-100 text-purple-600 text-xs rounded-full">
          {claim.method}
        </span>
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        {claim.description && <p className="text-gray-700">{claim.description}</p>}

        <div className="flex flex-wrap gap-4 pt-2">
          <p className="flex items-center gap-2">
            <span className="font-medium">Route:</span>
            <code className="bg-gray-100 px-2 py-1 rounded text-xs">{claim.path}</code>
          </p>
          <p className="flex items-center gap-2">
            <span className="font-medium">Mode:</span>
            <span className="capitalize">{claim.mode}</span>
          </p>
        </div>
      </div>
    </div>
  )
}
