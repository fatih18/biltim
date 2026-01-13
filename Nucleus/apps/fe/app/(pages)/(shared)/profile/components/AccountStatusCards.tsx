import type { UserJSON } from '@monorepo/db-entities/schemas/default/user'
import { Calendar, Shield, UserCheck } from 'lucide-react'
import { formatDate } from '../utils/helpers'

interface AccountStatusCardsProps {
  user: UserJSON
}

export function AccountStatusCards({ user }: AccountStatusCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Account Status Card */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <UserCheck size={20} className="text-green-500" />
          <h3 className="font-semibold text-gray-800">Account Status</h3>
        </div>
        <div className="space-y-2 text-sm">
          <p className="flex justify-between">
            <span>Status:</span>
            <span
              className={`px-2 py-1 rounded-full text-xs ${
                user.is_active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
              }`}
            >
              {user.is_active ? 'Active' : 'Inactive'}
            </span>
          </p>
          <p className="flex justify-between">
            <span>Email Verified:</span>
            <span
              className={`px-2 py-1 rounded-full text-xs ${
                user.verified_at ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
              }`}
            >
              {user.verified_at ? 'Verified' : 'Pending'}
            </span>
          </p>
          <p className="flex justify-between">
            <span>Account Locked:</span>
            <span
              className={`px-2 py-1 rounded-full text-xs ${
                user.is_locked ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
              }`}
            >
              {user.is_locked ? 'Locked' : 'Unlocked'}
            </span>
          </p>
        </div>
      </div>

      {/* Security Card */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield size={20} className="text-blue-500" />
          <h3 className="font-semibold text-gray-800">Security</h3>
        </div>
        <div className="space-y-2 text-sm">
          <p className="flex justify-between">
            <span>Login Count:</span>
            <span className="font-semibold">{user.login_count || 0}</span>
          </p>
          <p className="flex justify-between">
            <span>Failed Attempts:</span>
            <span className="font-semibold">{user.failed_login_attempts || 0}</span>
          </p>
          <p className="flex justify-between">
            <span>Admin Access:</span>
            <span
              className={`px-2 py-1 rounded-full text-xs ${
                user.is_god ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {user.is_god ? 'Yes' : 'No'}
            </span>
          </p>
        </div>
      </div>

      {/* Timestamps Card */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Calendar size={20} className="text-purple-500" />
          <h3 className="font-semibold text-gray-800">Timestamps</h3>
        </div>
        <div className="space-y-2 text-sm">
          <p>
            <span className="font-medium">Created:</span>
            <br />
            <span className="text-gray-600">{formatDate(user.created_at)}</span>
          </p>
          <p>
            <span className="font-medium">Updated:</span>
            <br />
            <span className="text-gray-600">{formatDate(user.updated_at)}</span>
          </p>
        </div>
      </div>
    </div>
  )
}
