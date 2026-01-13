'use client'

import type { FileJSON } from '@monorepo/db-entities/schemas/default/file'
import Image from 'next/image'
import { useState } from 'react'
import { getInitials } from '../utils/helpers'

interface UserAvatarProps {
  firstName?: string
  lastName?: string
  profilePicture?: FileJSON | null
  size?: number
  className?: string
}

export function UserAvatar({
  firstName,
  lastName,
  profilePicture,
  size = 128,
  className = '',
}: UserAvatarProps) {
  const initials = getInitials(firstName, lastName)
  const [imageError, setImageError] = useState(false)

  if (profilePicture && !imageError) {
    const imageUrl = `/file-proxy/${profilePicture.id}`
    return (
      <div
        className={`relative rounded-full overflow-hidden ${className}`}
        style={{ width: size, height: size }}
      >
        <Image
          src={imageUrl}
          alt={`${firstName} ${lastName}` || 'Profile Picture'}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
          width={size}
          height={size}
        />
      </div>
    )
  }

  return (
    <div
      className={`bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center text-white font-semibold rounded-full ${className}`}
      style={{ width: size, height: size, fontSize: size / 3 }}
    >
      {initials}
    </div>
  )
}
