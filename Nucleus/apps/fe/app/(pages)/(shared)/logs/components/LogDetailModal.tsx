import type { AuditJSON } from '@monorepo/db-entities/schemas/default/audit'
import { Activity, Edit, Plus, Trash2, XCircle } from 'lucide-react'

interface LogDetailModalProps {
  log: AuditJSON | null
  onClose: () => void
}

export function LogDetailModal({ log, onClose }: LogDetailModalProps) {
  if (!log) return null

  const getOperationIcon = (operation: string) => {
    switch (operation.toLowerCase()) {
      case 'insert':
      case 'create':
        return <Plus size={16} className="text-green-600" />
      case 'update':
      case 'edit':
        return <Edit size={16} className="text-blue-600" />
      case 'delete':
      case 'soft_delete':
        return <Trash2 size={16} className="text-red-600" />
      default:
        return <Activity size={16} className="text-gray-600" />
    }
  }

  const getOperationColor = (operation: string) => {
    switch (operation.toLowerCase()) {
      case 'insert':
      case 'create':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'update':
      case 'edit':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'delete':
      case 'soft_delete':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Log Details</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XCircle size={24} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Timestamp</p>
                <p className="text-sm text-gray-900">{formatTimestamp(log.timestamp)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Operation</p>
                <span
                  className={`inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getOperationColor(log.operation_type)}`}
                >
                  {getOperationIcon(log.operation_type)}
                  {log.operation_type}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Entity Name</p>
                <p className="text-sm text-gray-900">{log.entity_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Entity ID</p>
                <p className="text-sm text-gray-900 font-mono">{log.entity_id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">User ID</p>
                <p className="text-sm text-gray-900 font-mono">{log.user_id ?? '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">IP Address</p>
                <p className="text-sm text-gray-900">{log.ip_address ?? '-'}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Summary</p>
                <p className="text-sm text-gray-900">{log.summary ?? '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">User Agent</p>
                <p className="text-sm text-gray-900 break-all">{log.user_agent ?? '-'}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {log.old_values != null && (
              <div>
                <p className="text-sm font-medium text-gray-700">Old Values</p>
                <pre className="bg-red-50 border border-red-200 rounded-lg p-4 text-xs overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(log.old_values ?? {}, null, 2)}
                </pre>
              </div>
            )}
            {log.new_values != null && (
              <div>
                <p className="text-sm font-medium text-gray-700">New Values</p>
                <pre className="bg-green-50 border border-green-200 rounded-lg p-4 text-xs overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(log.new_values ?? {}, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
