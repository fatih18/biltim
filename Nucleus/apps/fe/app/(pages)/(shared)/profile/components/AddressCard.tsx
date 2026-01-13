import type { AddressJSON } from '@monorepo/db-entities/schemas/default/address'
import { Edit, Globe, MapPin, Trash2 } from 'lucide-react'
import { ADDRESS_TYPE_COLORS, ADDRESS_TYPE_ICONS, DEFAULT_ICONS } from '../utils/constants'

interface AddressCardProps {
  address: AddressJSON
  onEdit?: (address: AddressJSON) => void
  onDelete?: (address: AddressJSON) => void
}

export function AddressCard({ address, onEdit, onDelete }: AddressCardProps) {
  const getAddressIcon = (type?: string) => {
    if (type && ADDRESS_TYPE_ICONS[type.toLowerCase() as keyof typeof ADDRESS_TYPE_ICONS]) {
      const IconComponent =
        ADDRESS_TYPE_ICONS[type.toLowerCase() as keyof typeof ADDRESS_TYPE_ICONS]
      const colorClass =
        ADDRESS_TYPE_COLORS[type.toLowerCase() as keyof typeof ADDRESS_TYPE_COLORS] ||
        ADDRESS_TYPE_COLORS.default
      return <IconComponent size={20} className={colorClass} />
    }

    return <DEFAULT_ICONS.address size={20} className={ADDRESS_TYPE_COLORS.default} />
  }

  // Format full address
  const formatFullAddress = () => {
    const parts = []
    if (address.street) parts.push(address.street)
    if (address.neighborhood) parts.push(address.neighborhood)
    if (address.apartment) parts.push(`Apt: ${address.apartment}`)
    return parts.join(', ')
  }

  const formatLocationLine = () => {
    const parts = []
    if (address.district) parts.push(address.district)
    if (address.city) parts.push(address.city)
    if (address.state) parts.push(address.state)
    if (address.zip) parts.push(address.zip)
    return parts.join(', ')
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-all duration-300 group">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {getAddressIcon(address.type || undefined)}
          <div>
            <h3 className="font-semibold text-gray-800 text-lg">
              {address.name || 'Unnamed Address'}
            </h3>
            {address.type && (
              <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full mt-1 capitalize">
                {address.type}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons - show on hover */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(address)}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit Address"
            >
              <Edit size={16} />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(address)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete Address"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Address Content */}
      <div className="space-y-3">
        {/* Full Address */}
        {formatFullAddress() && (
          <div className="flex items-start gap-3">
            <MapPin size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-gray-800 font-medium">{formatFullAddress()}</p>
              {formatLocationLine() && (
                <p className="text-gray-600 text-sm mt-1">{formatLocationLine()}</p>
              )}
            </div>
          </div>
        )}

        {/* Country */}
        {address.country && (
          <div className="flex items-center gap-3">
            <Globe size={16} className="text-gray-400 flex-shrink-0" />
            <span className="text-gray-700 font-medium">{address.country}</span>
          </div>
        )}

        {/* Additional Details */}
        {(address.province || address.latitude || address.longitude) && (
          <div className="pt-3 border-t border-gray-100">
            <div className="grid grid-cols-1 gap-2 text-sm text-gray-600">
              {address.province && (
                <div className="flex justify-between">
                  <span className="font-medium">Province:</span>
                  <span>{address.province}</span>
                </div>
              )}
              {address.latitude && address.longitude && (
                <div className="flex justify-between">
                  <span className="font-medium">Coordinates:</span>
                  <span className="font-mono text-xs">
                    {parseFloat(address.latitude).toFixed(4)},{' '}
                    {parseFloat(address.longitude).toFixed(4)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
