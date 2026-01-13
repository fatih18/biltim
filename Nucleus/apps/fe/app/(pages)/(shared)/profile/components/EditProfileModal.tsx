'use client'

import type { UserJSON } from '@monorepo/db-entities/schemas/default/user'
import { Save, X } from 'lucide-react'
import { useState } from 'react'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'
import { useStore } from '@/app/_store'

interface EditProfileModalProps {
  user: UserJSON
  isOpen: boolean
  onClose: () => void
}

export function EditProfileModal({ user, isOpen, onClose }: EditProfileModalProps) {
  const actions = useGenericApiActions()
  const store = useStore()

  const [editForm, setEditForm] = useState({
    first_name: user.profile?.first_name || '',
    last_name: user.profile?.last_name || '',
  })

  const handleInputChange = (field: string, value: string) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSaveProfile = () => {
    // If profile exists, update it
    if (user.profile?.id) {
      actions.UPDATE_PROFILE?.start({
        payload: {
          _id: user.profile.id,
          first_name: editForm.first_name,
          last_name: editForm.last_name,
        },
        onAfterHandle: (data) => {
          const profile = data
          if (!profile) return

          const oldUser = store.user
          if (!oldUser) return

          const newUser: UserJSON = {
            ...oldUser,
            profile,
          }
          store.user = newUser
          onClose()
        },
        onErrorHandle: (error: unknown) => {
          console.error('Error updating profile:', error)
        },
      })
    } else {
      // Create new profile
      actions.ADD_PROFILE?.start({
        payload: {
          user_id: user.id,
          first_name: editForm.first_name,
          last_name: editForm.last_name,
        },
        onAfterHandle: (data) => {
          const profile = data
          if (!profile) return

          const oldUser = store.user
          if (!oldUser) return

          const newUser: UserJSON = {
            ...oldUser,
            profile,
          }
          store.user = newUser
          onClose()
        },
        onErrorHandle: (error: unknown) => {
          console.error('Error creating profile:', error)
        },
      })
    }
  }

  const handleOpen = () => {
    // Reset form with current user data when modal opens
    if (user.profile) {
      setEditForm({
        first_name: user.profile?.first_name || '',
        last_name: user.profile?.last_name || '',
      })
    }
  }

  // Reset form when modal opens
  if (isOpen && editForm?.first_name === '' && user.profile?.first_name) {
    handleOpen()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Edit Profile</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-2">
              First Name
            </label>
            <input
              id="first_name"
              type="text"
              value={editForm?.first_name}
              onChange={(e) => handleInputChange('first_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter first name"
            />
          </div>

          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-2">
              Last Name
            </label>
            <input
              id="last_name"
              type="text"
              value={editForm.last_name}
              onChange={(e) => handleInputChange('last_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter last name"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={actions.UPDATE_PROFILE?.state?.isPending}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actions.UPDATE_PROFILE?.state?.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
