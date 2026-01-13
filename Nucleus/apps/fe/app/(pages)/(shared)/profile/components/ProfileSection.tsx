import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface ProfileSectionProps {
  icon: LucideIcon
  title: string
  children: ReactNode
  onAddClick?: () => void
  addButtonText?: string
}

export function ProfileSection({
  icon: Icon,
  title,
  children,
  onAddClick,
  addButtonText = 'Add New',
}: ProfileSectionProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <Icon size={24} />
          {title}
        </h2>
        {onAddClick && (
          <button
            type="button"
            onClick={onAddClick}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Icon size={16} />
            <span>{addButtonText}</span>
          </button>
        )}
      </div>
      {children}
    </div>
  )
}
