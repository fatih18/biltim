'use client'

import type { PhoneJSON } from '@monorepo/db-entities/schemas/default/phone'
import type { UserJSON } from '@monorepo/db-entities/schemas/default/user'
import { Edit, Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'
import { useStore } from '@/app/_store'

interface AddPhoneModalProps {
  user: UserJSON
  isOpen: boolean
  onClose: () => void
  mode: 'create' | 'edit'
  existingPhone?: PhoneJSON
}

export function AddPhoneModal({ user, isOpen, onClose, mode, existingPhone }: AddPhoneModalProps) {
  const actions = useGenericApiActions()
  const store = useStore()

  const [phoneForm, setPhoneForm] = useState({
    name: '',
    type: 'mobile',
    number: '',
    country_code: '+90',
    extension: '',
  })

  function resetStore() {
    setPhoneForm({
      name: '',
      type: 'mobile',
      number: '',
      country_code: '+90',
      extension: '',
    })
  }

  // Form'u mevcut telefon ile doldur (edit mode'da)
  useEffect(() => {
    if (mode === 'edit' && existingPhone && isOpen) {
      setPhoneForm({
        name: existingPhone.name || '',
        type: existingPhone.type || 'mobile',
        number: existingPhone.number || '',
        country_code: existingPhone.country_code || '+90',
        extension: existingPhone.extension || '',
      })
    } else if (mode === 'create' && isOpen) {
      // Create mode'da form'u temizle
      resetStore()
    }
  }, [mode, existingPhone, isOpen])

  const handleInputChange = (field: string, value: string) => {
    setPhoneForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSavePhone = async () => {
    if (!user.id) return

    if (mode === 'create') {
      actions.ADD_PHONE?.start({
        payload: {
          owner_type: 'user',
          owner_id: user.id,
          name: phoneForm.name,
          type: phoneForm.type,
          number: phoneForm.number,
          country_code: phoneForm.country_code,
          extension: phoneForm.extension || null,
        },
        onAfterHandle: (data) => {
          console.log('addPhoneState', data)
          const phone = data
          if (!phone) {
            return
          }
          const oldUser = store.user
          if (!oldUser) {
            console.warn('No user found in store, cannot add phone')
            return
          }
          const newUser: UserJSON = {
            ...oldUser,
            phone: [...oldUser.phone, phone],
          }
          store.user = newUser
          resetStore()
          onClose()
        },
        onErrorHandle: (error) => {
          console.log('error', error)
        },
      })
    } else if (mode === 'edit' && existingPhone) {
      actions.UPDATE_PHONE?.start({
        payload: {
          _id: existingPhone.id,
          name: phoneForm.name,
          type: phoneForm.type,
          number: phoneForm.number,
          country_code: phoneForm.country_code,
          extension: phoneForm.extension || null,
        },
        onAfterHandle: (data) => {
          console.log('updatePhoneState', data)
          const phone = data
          if (!phone) {
            return
          }
          const oldUser = store.user
          if (!oldUser) {
            console.warn('No user found in store, cannot update phone')
            return
          }
          const newUser: UserJSON = {
            ...oldUser,
            phone: [...oldUser.phone.filter((existing) => existing.id !== phone.id), phone],
          }
          store.user = newUser
          resetStore()
          onClose()
        },
        onErrorHandle: (error) => {
          console.log('error', error)
        },
      })
    }
  }

  const handleClose = () => {
    // Reset form when closing
    resetStore()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">
            {mode === 'create' ? 'Add New Phone' : 'Edit Phone'}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="phone_name" className="block text-sm font-medium text-gray-700 mb-2">
              Phone Name *
            </label>
            <input
              id="phone_name"
              type="text"
              value={phoneForm.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Personal, Work, Emergency"
              required
            />
          </div>

          <div>
            <label htmlFor="phone_type" className="block text-sm font-medium text-gray-700 mb-2">
              Phone Type *
            </label>
            <select
              id="phone_type"
              value={phoneForm.type}
              onChange={(e) => handleInputChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="mobile">Mobile</option>
              <option value="home">Home</option>
              <option value="work">Work</option>
              <option value="fax">Fax</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="country_code"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Country Code *
              </label>
              <select
                id="country_code"
                value={phoneForm.country_code}
                onChange={(e) => handleInputChange('country_code', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="+90">🇹🇷 +90</option>
                <option value="+1">🇺🇸 +1</option>
                <option value="+44">🇬🇧 +44</option>
                <option value="+49">🇩🇪 +49</option>
                <option value="+33">🇫🇷 +33</option>
                <option value="+39">🇮🇹 +39</option>
                <option value="+34">🇪🇸 +34</option>
                <option value="+31">🇳🇱 +31</option>
              </select>
            </div>

            <div className="col-span-2">
              <label
                htmlFor="phone_number"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Phone Number *
              </label>
              <input
                id="phone_number"
                type="tel"
                value={phoneForm.number}
                onChange={(e) => handleInputChange('number', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="5xx xxx xx xx"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="extension" className="block text-sm font-medium text-gray-700 mb-2">
              Extension (Optional)
            </label>
            <input
              id="extension"
              type="text"
              value={phoneForm.extension}
              onChange={(e) => handleInputChange('extension', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 123, 4567"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSavePhone}
            disabled={
              (mode === 'create'
                ? actions.ADD_PHONE?.state?.isPending
                : actions.UPDATE_PHONE?.state?.isPending) ||
              !phoneForm.name ||
              !phoneForm.number
            }
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {(
              mode === 'create'
                ? actions.ADD_PHONE?.state?.isPending
                : actions.UPDATE_PHONE?.state?.isPending
            ) ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{mode === 'create' ? 'Adding...' : 'Updating...'}</span>
              </>
            ) : (
              <>
                {mode === 'create' ? <Plus size={16} /> : <Edit size={16} />}
                <span>{mode === 'create' ? 'Add Phone' : 'Update Phone'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
