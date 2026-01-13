'use client'

import type { FileJSON } from '@monorepo/db-entities/schemas/default/file'
import { Trash2, UserCheck } from 'lucide-react'
import Image from 'next/image'
import { formatDate } from '../utils/helpers'

interface ProfilePictureCardProps {
  file: FileJSON
  onDelete?: (file: FileJSON) => void
  onUseAsProfile?: (file: FileJSON) => void
  isActive?: boolean
}

export function ProfilePictureCard({
  file,
  onDelete,
  onUseAsProfile,
  isActive = false,
}: ProfilePictureCardProps) {
  return (
    <div className="relative">
      {/* Active Badge */}
      {isActive && (
        <div className="absolute -top-2 -right-2 z-20">
          <div className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 shadow-lg">
            <span>Active</span>
          </div>
        </div>
      )}

      <div
        className={`group relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-105 ${
          isActive
            ? 'ring-2 ring-blue-500 shadow-2xl shadow-blue-500/25'
            : 'hover:shadow-xl shadow-lg'
        }`}
      >
        {/* Main Image */}
        <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200">
          <Image
            src={`/file-proxy/${file.id}`}
            alt={file.original_name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
            width={128}
            height={128}
          />

          {/* Gradient Overlay */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Upload Date */}
          <div className="absolute bottom-3 left-3 right-3">
            <div className="bg-black/40 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-medium">
              {formatDate(file.updated_at || file.created_at)}
            </div>
          </div>

          {/* Actions Menu */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
            {!isActive && onUseAsProfile && (
              <button
                type="button"
                onClick={() => onUseAsProfile(file)}
                className="p-2 bg-white/90 hover:bg-blue-100 rounded-full shadow-lg transition-all duration-200 backdrop-blur-sm pointer-events-auto"
                title="Set as Profile Picture"
              >
                <UserCheck size={16} className="text-blue-600" />
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(file)}
                className="p-2 bg-white/90 hover:bg-red-100 rounded-full shadow-lg transition-all duration-200 backdrop-blur-sm pointer-events-auto"
                title="Delete Picture"
              >
                <Trash2 size={16} className="text-red-600" />
              </button>
            )}
          </div>

          {/* Hover Glow Effect */}
          <div
            className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ${
              isActive
                ? 'bg-gradient-to-t from-blue-500/20 to-purple-500/20'
                : 'bg-gradient-to-t from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/10 group-hover:to-purple-500/10'
            }`}
          />
        </div>
      </div>
    </div>
  )
}
