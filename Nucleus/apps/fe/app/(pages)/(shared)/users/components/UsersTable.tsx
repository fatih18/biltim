import type { ListReturn } from '@monorepo/db-entities/schemas/default/user'
import {
  AlertCircle,
  CheckCircle2,
  Info,
  MailCheck,
  ShieldBan,
  ShieldCheck,
  Trash2,
  User,
} from 'lucide-react'

interface UsersTableProps {
  users: ListReturn | undefined
  onSelectDetails: (userId: string) => void
  onValidateEmail: (userId: string) => void
  onDelete: (userId: string) => void
}

export function UsersTable({ users, onSelectDetails, onValidateEmail, onDelete }: UsersTableProps) {
  if (!users) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-grid-pattern" />
        </div>

        <div className="relative flex items-center justify-center gap-3 py-12 text-slate-200">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          Loading users...
        </div>
      </div>
    )
  }

  if (users.data.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-grid-pattern" />
        </div>

        <div className="relative py-12 text-center">
          <AlertCircle className="mx-auto mb-4 text-slate-500" size={48} />
          <h3 className="mb-2 text-lg font-semibold text-white">No users found</h3>
          <p className="text-slate-300">Adjust your search criteria or filters and try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-grid-pattern" />
      </div>

      <div className="relative overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-white/10 bg-white/5">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Verification
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Access
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Last Login
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/10">
            {users.data.map((user) => {
              const lastLogin = user.last_login_at
                ? new Date(user.last_login_at).toLocaleString('tr-TR', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })
                : '—'

              const verificationBadge = user.verified_at ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-300">
                  <CheckCircle2 size={14} /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-300">
                  <MailCheck size={14} /> Pending
                </span>
              )

              const accessBadge = user.is_locked ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/40 bg-rose-500/10 px-2 py-1 text-xs font-semibold text-rose-300">
                  <ShieldBan size={14} /> Locked
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-300">
                  <ShieldCheck size={14} /> Active
                </span>
              )

              return (
                <tr key={user.id} className="transition-colors hover:bg-white/5">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-emerald-300">
                        <User size={18} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">
                          {user.profile?.first_name ?? '—'} {user.profile?.last_name ?? ''}
                        </div>
                        <div className="text-xs text-slate-400">{user.id}</div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">
                    {user.email}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm">{verificationBadge}</td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm">{accessBadge}</td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                    {lastLogin}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-sm font-semibold text-slate-200 hover:text-white transition-colors"
                        onClick={() => onSelectDetails(user.id)}
                      >
                        <Info size={14} aria-hidden="true" /> Details
                      </button>

                      {!user.verified_at ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-300 hover:text-emerald-200 transition-colors"
                          onClick={() => onValidateEmail(user.id)}
                        >
                          <MailCheck size={14} aria-hidden="true" /> Verify Email
                        </button>
                      ) : null}

                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-sm font-semibold text-rose-300 hover:text-rose-200 transition-colors"
                        onClick={() => onDelete(user.id)}
                      >
                        <Trash2 size={14} aria-hidden="true" /> Delete
                      </button>
                    </div>
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
