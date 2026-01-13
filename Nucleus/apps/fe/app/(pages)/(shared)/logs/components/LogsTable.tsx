import type { AuditJSON } from '@monorepo/db-entities/schemas/default/audit'
import {
  Activity,
  AlertCircle,
  Calendar,
  Database,
  Edit,
  Eye,
  Plus,
  Trash2,
  User,
} from 'lucide-react'

interface LogsTableProps {
  logs: AuditJSON[]
  onLogSelect: (log: AuditJSON) => void
}

export function LogsTable({ logs, onLogSelect }: LogsTableProps) {
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

  if (logs.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="text-center py-12">
          <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No logs found</h3>
          <p className="text-gray-500">Try adjusting your search criteria or filters.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Operation
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Entity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Summary
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                IP Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-gray-400" />
                    {formatTimestamp(log.timestamp)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div
                    className={`inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getOperationColor(log.operation_type)}`}
                  >
                    {getOperationIcon(log.operation_type)}
                    {log.operation_type}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center gap-2">
                    <Database size={14} className="text-gray-400" />
                    <div>
                      <div className="font-medium">{log.entity_name}</div>
                      <div
                        className="text-xs text-gray-500 truncate max-w-32"
                        title={log.entity_id ?? undefined}
                      >
                        {log.entity_id ?? '-'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-gray-400" />
                    <div
                      className="text-xs text-gray-500 truncate max-w-24"
                      title={log.user_id ?? ''}
                    >
                      {log.user_id ?? '-'}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div className="max-w-48 truncate" title={log.summary ?? 'No summary'}>
                    {log.summary ?? '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {log.ip_address ?? '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button
                    type="button"
                    onClick={() => onLogSelect(log)}
                    className="text-blue-600 hover:text-blue-900 transition-colors"
                  >
                    <Eye size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
