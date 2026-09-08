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
        return <Activity size={16} className="text-slate-500 dark:text-slate-400" />
    }
  }

  const getOperationColor = (operation: string) => {
    switch (operation.toLowerCase()) {
      case 'insert':
      case 'create':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800'
      case 'update':
      case 'edit':
        return 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950 dark:text-sky-200 dark:border-sky-800'
      case 'delete':
      case 'soft_delete':
        return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800'
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm dark:bg-slate-950/75"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="log-detail-title"
        className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-200 p-6 dark:border-slate-800">
          <h2 id="log-detail-title" className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Log Detayı
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Log detayını kapat"
          >
            <XCircle size={24} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Zaman Damgası</p>
                <p className="text-sm text-slate-900 dark:text-slate-100">{formatTimestamp(log.timestamp)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">İşlem</p>
                <span
                  className={`inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getOperationColor(log.operation_type)}`}
                >
                  {getOperationIcon(log.operation_type)}
                  {log.operation_type}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Varlık Adı</p>
                <p className="text-sm text-slate-900 dark:text-slate-100">{log.entity_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Varlık ID</p>
                <p className="font-mono text-sm text-slate-900 dark:text-slate-100">{log.entity_id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Kullanıcı ID</p>
                <p className="font-mono text-sm text-slate-900 dark:text-slate-100">{log.user_id ?? '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">IP Adresi</p>
                <p className="text-sm text-slate-900 dark:text-slate-100">{log.ip_address ?? '-'}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Özet</p>
                <p className="text-sm text-slate-900 dark:text-slate-100">{log.summary ?? '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Kullanıcı Ajanı</p>
                <p className="break-all text-sm text-slate-900 dark:text-slate-100">{log.user_agent ?? '-'}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {log.old_values != null && (
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Eski Değerler</p>
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs text-rose-950 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-100">
                  {JSON.stringify(log.old_values ?? {}, null, 2)}
                </pre>
              </div>
            )}
            {log.new_values != null && (
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Yeni Değerler</p>
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100">
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
