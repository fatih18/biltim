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
        return <Activity size={16} className="text-slate-600 dark:text-slate-400" />
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
        return 'bg-gray-100 text-slate-800 dark:text-slate-200 border-gray-200'
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
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="text-center py-12">
          <AlertCircle className="mx-auto text-slate-400 dark:text-slate-400 mb-4" size={48} />
          <h3 className="mb-2 text-lg font-medium text-slate-900 dark:text-slate-100">Log kaydı bulunamadı</h3>
          <p className="text-slate-500 dark:text-slate-400">Arama kriterlerinizi veya filtrelerinizi düzenleyin.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-slate-900 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Zaman Damgası
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                İşlem
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Varlık
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Kullanıcı
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Özet
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                IP Adresi
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                İşlemler
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50 hover:dark:bg-slate-800/60 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400 dark:text-slate-400" />
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
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                  <div className="flex items-center gap-2">
                    <Database size={14} className="text-slate-400 dark:text-slate-400" />
                    <div>
                      <div className="font-medium">{log.entity_name}</div>
                      <div
                        className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-32"
                        title={log.entity_id ?? undefined}
                      >
                        {log.entity_id ?? '-'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-slate-400 dark:text-slate-400" />
                    <div
                      className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-24"
                      title={log.user_id ?? ''}
                    >
                      {log.user_id ?? '-'}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-100">
                  <div className="max-w-48 truncate" title={log.summary ?? 'Özet yok'}>
                    {log.summary ?? '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                  {log.ip_address ?? '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                  <button
                    type="button"
                    onClick={() => onLogSelect(log)}
                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-200 transition-colors"
                    aria-label="Log kaydı detayını gör"
                    title="Detayı gör"
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
