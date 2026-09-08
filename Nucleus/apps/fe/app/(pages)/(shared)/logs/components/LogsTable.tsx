import type { AuditJSON } from '@monorepo/db-entities/schemas/default/audit'
import { Activity, AlertCircle, Edit, Eye, LogIn, Plus, Server, Trash2, User } from 'lucide-react'
import {
  type ActorLookup,
  actorLabel,
  entityLabel,
  operationLabel,
  operationTone,
  relativeTime,
} from '../labels'

interface LogsTableProps {
  logs: AuditJSON[]
  onLogSelect: (log: AuditJSON) => void
  /** id -> person, so the actor column can say a name instead of a uuid. */
  users?: ActorLookup
  /** Passed in rather than read here, so the whole table agrees on "now". */
  now?: Date
}

const TONE_STYLES: Record<string, string> = {
  create:
    'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800',
  update:
    'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950 dark:text-sky-200 dark:border-sky-800',
  delete:
    'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800',
  auth: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800',
  read: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
}

function toneIcon(tone: string) {
  if (tone === 'create') return <Plus size={13} aria-hidden />
  if (tone === 'update') return <Edit size={13} aria-hidden />
  if (tone === 'delete') return <Trash2 size={13} aria-hidden />
  if (tone === 'auth') return <LogIn size={13} aria-hidden />
  return <Activity size={13} aria-hidden />
}

function exactTime(value: string | Date | null | undefined): string {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString('tr-TR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
}

export function LogsTable({ logs, onLogSelect, users, now }: LogsTableProps) {
  const lookup: ActorLookup = users ?? new Map()
  const reference = now ?? new Date()

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

  const th =
    'px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400'

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
            <tr>
              <th className={th}>Kim</th>
              <th className={th}>Ne yaptı</th>
              <th className={th}>Neye</th>
              <th className={th}>Ne zaman</th>
              <th className={th}>Nereden</th>
              <th className={th}>
                <span className="sr-only">İşlemler</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
            {logs.map((log) => {
              const actor = actorLabel(log.user_id, lookup)
              const tone = operationTone(log.operation_type)
              const stamp = exactTime(log.timestamp)

              return (
                <tr
                  key={log.id}
                  className="transition-colors hover:bg-slate-50 hover:dark:bg-slate-800/60"
                >
                  <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100">
                    <div className="flex items-center gap-2">
                      {actor.isPerson ? (
                        <User size={14} className="shrink-0 text-slate-400" aria-hidden />
                      ) : (
                        <Server size={14} className="shrink-0 text-slate-400" aria-hidden />
                      )}
                      <span
                        className={
                          actor.isPerson
                            ? 'truncate font-medium'
                            : 'truncate text-slate-600 dark:text-slate-400'
                        }
                        title={actor.title}
                      >
                        {actor.text}
                      </span>
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONE_STYLES[tone]}`}
                    >
                      {toneIcon(tone)}
                      {operationLabel(log.operation_type)}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100">
                    <span className="font-medium">{entityLabel(log.entity_name)}</span>
                    {log.entity_id ? (
                      <span
                        className="ml-1 text-xs text-slate-500 dark:text-slate-400"
                        title={log.entity_id}
                      >
                        #{String(log.entity_id).slice(0, 8)}
                      </span>
                    ) : null}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                    <span title={stamp}>{relativeTime(log.timestamp, reference)}</span>
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                    {log.ip_address && log.ip_address !== 'unknown' ? log.ip_address : '—'}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                    <button
                      type="button"
                      onClick={() => onLogSelect(log)}
                      className="text-blue-600 transition-colors hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-200"
                      aria-label={`${actor.text} — ${operationLabel(log.operation_type)} — detayı gör`}
                      title="Detayı gör"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
