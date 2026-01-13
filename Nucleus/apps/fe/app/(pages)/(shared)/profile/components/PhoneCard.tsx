import type { PhoneJSON } from '@monorepo/db-entities/schemas/default/phone'
import { CheckCircle, Edit, Phone, Shield, Trash2 } from 'lucide-react'
import { DEFAULT_ICONS, PHONE_TYPE_COLORS, PHONE_TYPE_ICONS } from '../utils/constants'

interface PhoneCardProps {
  phone: PhoneJSON
  onEdit?: (phone: PhoneJSON) => void
  onDelete?: (phone: PhoneJSON) => void
}

export function PhoneCard({ phone, onEdit, onDelete }: PhoneCardProps) {
  const getPhoneIcon = (type?: string) => {
    if (type && PHONE_TYPE_ICONS[type.toLowerCase() as keyof typeof PHONE_TYPE_ICONS]) {
      const IconComponent = PHONE_TYPE_ICONS[type.toLowerCase() as keyof typeof PHONE_TYPE_ICONS]
      const colorClass =
        PHONE_TYPE_COLORS[type.toLowerCase() as keyof typeof PHONE_TYPE_COLORS] ||
        PHONE_TYPE_COLORS.default
      return <IconComponent size={16} className={colorClass} />
    }

    return <DEFAULT_ICONS.phone size={16} className={PHONE_TYPE_COLORS.default} />
  }

  const fullNumber = `${phone.country_code || '+1'} ${phone.number}${phone.extension ? ` ext. ${phone.extension}` : ''}`

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-all duration-300 group">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {getPhoneIcon(phone.type || undefined)}
          <div>
            <h3 className="font-semibold text-gray-800 text-lg">{phone.name || 'Unnamed Phone'}</h3>
            {phone.type && (
              <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full mt-1 capitalize">
                {phone.type}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons - show on hover */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(phone)}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit Phone"
            >
              <Edit size={16} />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(phone)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete Phone"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Phone Content */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Phone size={16} className="text-gray-400 flex-shrink-0" />
          <div>
            <p className="text-lg font-mono text-gray-800 font-medium">{fullNumber}</p>
            {phone.extension && (
              <p className="text-sm text-gray-600 mt-1">Extension: {phone.extension}</p>
            )}
          </div>
        </div>

        {/* Status indicators */}
        <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-gray-400" />
            <span className="text-sm text-gray-600">
              Status: <span className="font-medium text-green-600">Active</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <CheckCircle size={14} className="text-gray-400" />
            <span className="text-sm text-gray-600">
              Verified: <span className="font-medium text-gray-800">No</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
