'use client'

import type { AddressJSON } from '@monorepo/db-entities/schemas/default/address'
import type { UserJSON } from '@monorepo/db-entities/schemas/default/user'
import { Edit, Map as MapIcon, Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'
import { useStore } from '@/app/_store'
import { MapPicker } from './MapPicker'

interface AddAddressModalProps {
  user: UserJSON
  isOpen: boolean
  onClose: () => void
  mode: 'create' | 'edit'
  existingAddress?: AddressJSON
}

export function AddAddressModal({
  user,
  isOpen,
  onClose,
  mode,
  existingAddress,
}: AddAddressModalProps) {
  const actions = useGenericApiActions()
  const store = useStore()

  const [showMapPicker, setShowMapPicker] = useState(false)
  const [addressForm, setAddressForm] = useState({
    name: '',
    type: 'home',
    street: '',
    neighborhood: '',
    apartment: '',
    city: '',
    district: '',
    state: '',
    province: '',
    postal_code: '',
    country: '',
    latitude: '',
    longitude: '',
  })

  function resetForm() {
    setAddressForm({
      name: '',
      type: 'home',
      street: '',
      neighborhood: '',
      apartment: '',
      city: '',
      district: '',
      state: '',
      province: '',
      postal_code: '',
      country: '',
      latitude: '',
      longitude: '',
    })
  }

  // Form'u mevcut adres ile doldur (edit mode'da)
  useEffect(() => {
    if (mode === 'edit' && existingAddress && isOpen) {
      setAddressForm({
        name: existingAddress.name || '',
        type: existingAddress.type || 'home',
        street: existingAddress.street || '',
        neighborhood: existingAddress.neighborhood || '',
        apartment: existingAddress.apartment || '',
        city: existingAddress.city || '',
        district: existingAddress.district || '',
        state: existingAddress.state || '',
        province: existingAddress.province || '',
        postal_code: existingAddress.zip || '',
        country: existingAddress.country || '',
        latitude: existingAddress.latitude || '',
        longitude: existingAddress.longitude || '',
      })
    } else if (mode === 'create' && isOpen) {
      // Create mode'da form'u temizle
      resetForm()
    }
  }, [mode, existingAddress, isOpen])

  const handleInputChange = (field: string, value: string) => {
    setAddressForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleLocationSelect = (lat: number, lng: number) => {
    setAddressForm((prev) => ({
      ...prev,
      latitude: lat.toString(),
      longitude: lng.toString(),
    }))
  }

  const handleSaveAddress = async () => {
    if (!user.id) return

    if (mode === 'create') {
      actions.ADD_ADDRESS?.start({
        payload: {
          name: addressForm.name,
          owner_type: 'user',
          owner_id: user.id,
          type: addressForm.type,
          street: addressForm.street,
          city: addressForm.city,
          state: addressForm.state || null,
          zip: addressForm.postal_code || null,
          country: addressForm.country,
          neighborhood: addressForm.neighborhood || null,
          apartment: addressForm.apartment || null,
          province: addressForm.province || null,
          district: addressForm.district || null,
          latitude: addressForm.latitude || null,
          longitude: addressForm.longitude || null,
        },
        onAfterHandle: (data) => {
          console.log('addAddressState', data)
          const address = data
          if (!address) {
            return
          }
          const oldUser = store.user
          if (!oldUser) {
            console.warn('No user found in store, cannot add address')
            return
          }
          const newUser: UserJSON = {
            ...oldUser,
            address: [...oldUser.address, address],
          }
          store.user = newUser
          resetForm()
          onClose()
        },
        onErrorHandle: (error) => {
          console.log('error', error)
        },
      })
    } else if (mode === 'edit' && existingAddress) {
      actions.UPDATE_ADDRESS?.start({
        payload: {
          _id: existingAddress.id,
          name: addressForm.name,
          type: addressForm.type,
          street: addressForm.street,
          city: addressForm.city,
          state: addressForm.state || null,
          zip: addressForm.postal_code || null,
          country: addressForm.country,
          neighborhood: addressForm.neighborhood || null,
          apartment: addressForm.apartment || null,
          province: addressForm.province || null,
          district: addressForm.district || null,
          latitude: addressForm.latitude || null,
          longitude: addressForm.longitude || null,
        },
        onAfterHandle: (data) => {
          console.log('updateAddressState', data)
          const address = data
          if (!address) {
            return
          }
          const oldUser = store.user
          if (!oldUser) {
            console.warn('No user found in store, cannot update address')
            return
          }
          const newUser: UserJSON = {
            ...oldUser,
            address: [...oldUser.address.filter((existing) => existing.id !== address.id), address],
          }
          store.user = newUser
          resetForm()
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
    resetForm()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">
            {mode === 'create' ? 'Add New Address' : 'Edit Address'}
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
            <label htmlFor="address_name" className="block text-sm font-medium text-gray-700 mb-2">
              Address Name *
            </label>
            <input
              id="address_name"
              type="text"
              value={addressForm.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Home, Work, Office"
              required
            />
          </div>

          <div>
            <label htmlFor="address_type" className="block text-sm font-medium text-gray-700 mb-2">
              Address Type *
            </label>
            <select
              id="address_type"
              value={addressForm.type}
              onChange={(e) => handleInputChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="home">Home</option>
              <option value="work">Work</option>
              <option value="office">Office</option>
              <option value="billing">Billing</option>
              <option value="shipping">Shipping</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-2">
              Street Address *
            </label>
            <input
              id="street"
              type="text"
              value={addressForm.street}
              onChange={(e) => handleInputChange('street', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter street address"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="neighborhood"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Neighborhood
              </label>
              <input
                id="neighborhood"
                type="text"
                value={addressForm.neighborhood}
                onChange={(e) => handleInputChange('neighborhood', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter neighborhood"
              />
            </div>

            <div>
              <label htmlFor="apartment" className="block text-sm font-medium text-gray-700 mb-2">
                Apartment/Unit
              </label>
              <input
                id="apartment"
                type="text"
                value={addressForm.apartment}
                onChange={(e) => handleInputChange('apartment', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter apartment/unit"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                City *
              </label>
              <input
                id="city"
                type="text"
                value={addressForm.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter city"
                required
              />
            </div>

            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                State/Province
              </label>
              <input
                id="state"
                type="text"
                value={addressForm.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter state"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-2">
                District
              </label>
              <input
                id="district"
                type="text"
                value={addressForm.district}
                onChange={(e) => handleInputChange('district', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter district"
              />
            </div>

            <div>
              <label htmlFor="province" className="block text-sm font-medium text-gray-700 mb-2">
                Province
              </label>
              <input
                id="province"
                type="text"
                value={addressForm.province}
                onChange={(e) => handleInputChange('province', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter province"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700 mb-2">
                Postal Code
              </label>
              <input
                id="postal_code"
                type="text"
                value={addressForm.postal_code}
                onChange={(e) => handleInputChange('postal_code', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter postal code"
              />
            </div>

            <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                Country *
              </label>
              <input
                id="country"
                type="text"
                value={addressForm.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter country"
                required
              />
            </div>
          </div>

          {/* Location/Coordinates Section */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-800 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <title>Location</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Location Coordinates (Optional)
              </h3>
              <button
                type="button"
                onClick={() => setShowMapPicker(!showMapPicker)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
              >
                <MapIcon size={16} />
                {showMapPicker ? 'Hide Map' : 'Show Map'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="latitude" className="block text-sm font-medium text-gray-700 mb-2">
                  Latitude
                </label>
                <input
                  id="latitude"
                  type="number"
                  step="any"
                  value={addressForm.latitude}
                  onChange={(e) => handleInputChange('latitude', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 41.0082"
                />
              </div>

              <div>
                <label htmlFor="longitude" className="block text-sm font-medium text-gray-700 mb-2">
                  Longitude
                </label>
                <input
                  id="longitude"
                  type="number"
                  step="any"
                  value={addressForm.longitude}
                  onChange={(e) => handleInputChange('longitude', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 28.9784"
                />
              </div>
            </div>

            {/* Map Picker */}
            {showMapPicker && (
              <div className="mt-4">
                <MapPicker
                  latitude={addressForm.latitude}
                  longitude={addressForm.longitude}
                  onLocationSelect={handleLocationSelect}
                  height="250px"
                />
              </div>
            )}

            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-blue-600 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <title>Information</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-800">Location Tips</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Click "Show Map" to use the interactive map picker, or manually enter
                    coordinates below.
                  </p>
                  <p className="text-sm text-blue-600 mt-2">
                    <strong>Tip:</strong> You can also get coordinates from Google Maps by
                    right-clicking on a location.
                  </p>
                </div>
              </div>
            </div>
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
            onClick={handleSaveAddress}
            disabled={
              (mode === 'create'
                ? actions.ADD_ADDRESS?.state?.isPending
                : actions.UPDATE_ADDRESS?.state?.isPending) ||
              !addressForm.name ||
              !addressForm.street ||
              !addressForm.city ||
              !addressForm.country
            }
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {(
              mode === 'create'
                ? actions.ADD_ADDRESS?.state?.isPending
                : actions.UPDATE_ADDRESS?.state?.isPending
            ) ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{mode === 'create' ? 'Adding...' : 'Updating...'}</span>
              </>
            ) : (
              <>
                {mode === 'create' ? <Plus size={16} /> : <Edit size={16} />}
                <span>{mode === 'create' ? 'Add Address' : 'Update Address'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
