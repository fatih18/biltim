import type { UserJSON } from '@monorepo/db-entities/schemas/default/user'
import { Calendar, Clock, Edit3, Mail } from 'lucide-react'
import { formatDate, getLatestProfilePicture } from '../utils/helpers'
import { ProfilePictureUpload } from './ProfilePictureUpload'

interface ProfileHeaderProps {
  user: UserJSON
  onEditClick: () => void
  onDeleteProfilePicture?: (imageId: string) => void
}

export function ProfileHeader({ user, onEditClick, onDeleteProfilePicture }: ProfileHeaderProps) {
  const profilePicture = getLatestProfilePicture(user.files)

  return (
    <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white rounded-xl shadow-xl p-8">
      <div className="flex flex-col md:flex-row items-center gap-6">
        <ProfilePictureUpload
          currentImageUrl={profilePicture?.id}
          currentImageId={profilePicture?.id}
          onDelete={onDeleteProfilePicture}
          firstName={user.profile?.first_name}
          lastName={user.profile?.last_name}
          className="mb-4"
        />

        <div className="text-center md:text-left flex-1">
          <h1 className="text-3xl font-bold mb-2">
            {user.profile?.first_name && user.profile?.last_name
              ? `${user.profile?.first_name} ${user.profile.last_name}`
              : 'User Profile'}
          </h1>

          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Mail size={16} />
              <span>{user.email}</span>
            </div>

            <div className="flex items-center gap-2">
              <Calendar size={16} />
              <span>Joined {formatDate(user.created_at)}</span>
            </div>

            {user.last_login_at && (
              <div className="flex items-center gap-2">
                <Clock size={16} />
                <span>Last login {formatDate(user.last_login_at)}</span>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onEditClick}
          className="bg-white/10 hover:bg-white/20 px-6 py-3 rounded-lg transition-all duration-300 flex items-center gap-2"
        >
          <Edit3 size={16} />
          <span>Edit Profile</span>
        </button>
      </div>
    </div>
  )
}
