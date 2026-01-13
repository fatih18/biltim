interface EmptyStateProps {
  icon: React.ComponentType<{ size?: number; className?: string }>
  title: string
  description: string
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 text-center">
      <Icon size={48} className="text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-600 mb-2">{title}</h3>
      <p className="text-gray-500">{description}</p>
    </div>
  )
}
