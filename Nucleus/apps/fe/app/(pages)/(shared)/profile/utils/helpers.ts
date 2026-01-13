import type { FileJSON } from '@monorepo/db-entities/schemas/default/file'

export function getInitials(firstName?: string, lastName?: string): string {
  const first = firstName?.charAt(0)?.toUpperCase() || ''
  const last = lastName?.charAt(0)?.toUpperCase() || ''
  return `${first}${last}` || 'U'
}

export function getLatestProfilePicture(files?: FileJSON[]): FileJSON | null {
  if (!files || files.length === 0) return null

  const profilePictures = files
    .filter((file) => file.type === 'profile_picture')
    .sort((a, b) => {
      // Use updated_at if available, fallback to created_at
      const aDate = new Date(a.updated_at || a.created_at).getTime()
      const bDate = new Date(b.updated_at || b.created_at).getTime()
      return bDate - aDate
    })

  return profilePictures[0] || null
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return 'Not set'

  try {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return 'Invalid date'
  }
}
