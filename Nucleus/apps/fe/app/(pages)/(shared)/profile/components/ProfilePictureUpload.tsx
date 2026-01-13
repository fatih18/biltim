'use client'

import { Trash2, Upload } from 'lucide-react'
import Image from 'next/image'
import { useRef, useState } from 'react'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'
import { useStore } from '@/app/_store'

interface ProfilePictureUploadProps {
  currentImageUrl?: string
  currentImageId?: string
  onDelete?: (imageId: string) => void
  firstName?: string
  lastName?: string
  className?: string
}

export function ProfilePictureUpload({
  currentImageUrl,
  currentImageId,
  onDelete,
  firstName,
  lastName,
  className = '',
}: ProfilePictureUploadProps) {
  const actions = useGenericApiActions()
  const store = useStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const handleFileSelect = (file: File) => {
    if (!file) return

    // File type validation
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png']
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a JPG or PNG image file.')
      return
    }

    // File size validation (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      alert('File size must be less than 5MB.')
      return
    }

    uploadFile(file)
  }

  const uploadFile = async (file: File) => {
    const formData = new FormData()
    formData.append('files', file)
    formData.append('type', 'profile_picture')
    actions.ADD_FILE?.start({
      payload: formData,
      onAfterHandle: (data) => {
        if (!data) {
          console.error('No file data returned')
          return
        }

        console.log('Upload successful:', data)

        // Update user store with new file
        const oldUser = store.user
        if (!oldUser) {
          console.warn('No user found in store, cannot add file')
          return
        }

        store.user = {
          ...oldUser,
          files: [...oldUser.files, data],
        }
      },
      onErrorHandle: (error) => {
        console.error('Upload failed:', error)
        alert('Failed to upload image. Please try again.')
      },
    })
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
    // Reset input value to allow selecting the same file again
    event.target.value = ''
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setDragOver(false)

    const files = event.dataTransfer.files
    const file = files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const isUploading = actions.ADD_FILE?.state?.isPending

  // Generate initials from first and last name
  const getInitials = () => {
    if (!firstName && !lastName) return '?'
    const first = firstName?.charAt(0)?.toUpperCase() || ''
    const last = lastName?.charAt(0)?.toUpperCase() || ''
    return `${first}${last}` || '?'
  }

  return (
    <div className={`relative group ${className}`}>
      {/* Profile Image */}
      <button
        type="button"
        className={`relative w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl cursor-pointer transition-all duration-300 ${
          isHovered || dragOver ? 'transform scale-105' : ''
        } ${dragOver ? 'border-blue-500' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        disabled={isUploading}
        aria-label="Upload profile picture"
      >
        {currentImageUrl ? (
          <Image
            src={`/file-proxy/${currentImageUrl}`}
            alt="Profile"
            className="w-full h-full object-cover"
            width={128}
            height={128}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white text-3xl font-bold">{getInitials()}</span>
          </div>
        )}

        {/* Upload Overlay */}
        <div
          className={`absolute inset-0 bg-black/60 flex flex-col items-center justify-center transition-opacity duration-300 ${
            isHovered || dragOver || isUploading ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span className="text-white text-xs font-medium">Uploading...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload size={24} className="text-white" />
              <span className="text-white text-xs font-medium text-center px-2">
                {dragOver ? 'Drop image here' : 'Change Photo'}
              </span>
            </div>
          )}
        </div>

        {/* Loading Ring */}
        {isUploading && (
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 animate-spin" />
        )}
      </button>

      {/* Delete Button - Outside upload button, positioned absolutely */}
      {currentImageUrl && currentImageId && onDelete && (
        <div
          className={`absolute -bottom-0 -right-0 size-8 flex items-end justify-end transition-opacity duration-200 z-10 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <button
            type="button"
            onClick={() => onDelete(currentImageId)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="size-full bg-red-300 hover:bg-red-400 text-red-800 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center"
            title="Delete profile picture"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={isUploading}
      />

      {/* Upload Instructions */}
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
        <p className="text-xs text-gray-500 text-center">Click or drag to upload</p>
        <p className="text-xs text-gray-400 text-center">JPG, PNG (max 5MB)</p>
      </div>
    </div>
  )
}
