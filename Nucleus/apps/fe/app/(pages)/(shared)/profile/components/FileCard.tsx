'use client'

import type { FileJSON } from '@monorepo/db-entities/schemas/default/file'
import { Download, File, FileImage, Trash2, User, UserCheck } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import {
  DEFAULT_ICONS,
  FILE_TYPE_COLORS,
  FILE_TYPE_ICONS,
  MIME_TYPE_ICONS,
} from '../utils/constants'
import { formatDate, formatFileSize } from '../utils/helpers'

interface FileCardProps {
  file: FileJSON
  onDelete?: (file: FileJSON) => void
  onUseAsProfile?: (file: FileJSON) => void
  showUseAsProfile?: boolean
}

export function FileCard({ file, onDelete, onUseAsProfile, showUseAsProfile }: FileCardProps) {
  const [showPreview, setShowPreview] = useState(false)

  const getFileIcon = (type?: string, mimeType?: string) => {
    // First check file type
    if (type && FILE_TYPE_ICONS[type as keyof typeof FILE_TYPE_ICONS]) {
      const IconComponent = FILE_TYPE_ICONS[type as keyof typeof FILE_TYPE_ICONS]
      const colorClass =
        FILE_TYPE_COLORS[type as keyof typeof FILE_TYPE_COLORS] || FILE_TYPE_COLORS.default
      return <IconComponent size={16} className={colorClass} />
    }

    // Then check MIME type
    if (mimeType) {
      const mimePrefix = Object.keys(MIME_TYPE_ICONS).find((prefix) => mimeType.startsWith(prefix))
      if (mimePrefix) {
        const IconComponent = MIME_TYPE_ICONS[mimePrefix as keyof typeof MIME_TYPE_ICONS]
        const colorClass =
          FILE_TYPE_COLORS[mimePrefix.replace('/', '') as keyof typeof FILE_TYPE_COLORS] ||
          FILE_TYPE_COLORS.default
        return <IconComponent size={16} className={colorClass} />
      }
    }

    // Default fallback
    return <DEFAULT_ICONS.file size={16} className={FILE_TYPE_COLORS.default} />
  }

  const isImage =
    file.type === 'image' || file.type === 'profile_picture' || file.mime_type?.startsWith('image/')
  const isVideo = file.type === 'video' || file.mime_type?.startsWith('video/')
  const isAudio = file.type === 'audio' || file.mime_type?.startsWith('audio/')

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-all duration-300">
      <div className="flex items-center gap-3 mb-4">
        {getFileIcon(file.type || undefined, file.mime_type)}
        <h3 className="font-semibold text-gray-800 truncate flex-1" title={file.original_name}>
          {file.original_name}
        </h3>
        {file.type && (
          <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full">
            {file.type}
          </span>
        )}
      </div>

      {/* Preview Section */}
      {showPreview && (
        <div className="mb-4 rounded-lg overflow-hidden bg-gray-50">
          {isImage && (
            <Image
              src={`/file-proxy/${file.id}`}
              alt={file.original_name}
              className="w-full max-h-64 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
              width={128}
              height={128}
            />
          )}
          {isVideo && (
            <video
              src={`/file-proxy/${file.id}`}
              controls
              className="w-full max-h-64"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            >
              <track kind="captions" srcLang="en" label="English captions" />
              Your browser does not support the video tag.
            </video>
          )}
          {isAudio && (
            <div className="p-4">
              <audio
                src={`/file-proxy/${file.id}`}
                controls
                className="w-full"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              >
                <track kind="captions" srcLang="en" label="English captions" />
                Your browser does not support the audio tag.
              </audio>
            </div>
          )}
          {!isImage && !isVideo && !isAudio && (
            <div className="p-8 text-center text-gray-500">
              <File size={48} className="mx-auto mb-2" />
              <p>Preview not available for this file type</p>
            </div>
          )}
        </div>
      )}

      {/* Metadata */}
      <div className="space-y-3 text-sm text-gray-600">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="font-medium text-gray-700">File Name:</span>
            <p className="truncate text-xs" title={file.name}>
              {file.name}
            </p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Size:</span>
            <p className="text-xs">{formatFileSize(file.size)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="font-medium text-gray-700">Extension:</span>
            <p className="uppercase text-xs">{file.extension}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Type:</span>
            <p className="text-xs">{file.type || 'Unknown'}</p>
          </div>
        </div>

        <div>
          <span className="font-medium text-gray-700">MIME Type:</span>
          <p className="text-xs bg-gray-100 px-2 py-1 rounded mt-1">
            {file.mime_type || 'Unknown'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="font-medium text-gray-700">Created:</span>
            <p className="text-xs">{formatDate(file.created_at)}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Updated:</span>
            <p className="text-xs">{formatDate(file.updated_at)}</p>
          </div>
        </div>

        <div>
          <span className="font-medium text-gray-700">File ID:</span>
          <p className="text-xs font-mono bg-gray-100 px-2 py-1 rounded mt-1 break-all">
            {file.id}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="w-full bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
        >
          {showPreview ? (
            <>
              <User size={16} />
              <span>Hide Preview</span>
            </>
          ) : (
            <>
              <FileImage size={16} />
              <span>Show Preview</span>
            </>
          )}
        </button>

        {showUseAsProfile && onUseAsProfile && (
          <button
            type="button"
            onClick={() => onUseAsProfile(file)}
            className="w-full bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <UserCheck size={16} />
            <span>Use as Profile Photo</span>
          </button>
        )}

        <button
          type="button"
          className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
        >
          <Download size={16} />
          <span>Download</span>
        </button>

        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(file)}
            className="w-full bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <Trash2 size={16} />
            <span>Delete</span>
          </button>
        )}
      </div>
    </div>
  )
}
