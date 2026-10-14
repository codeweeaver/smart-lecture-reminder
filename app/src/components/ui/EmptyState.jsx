export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="w-16 h-16 bg-noun-50 rounded-full flex items-center justify-center mb-4">
        <Icon size={28} className="text-noun-400" />
      </div>
      <h3 className="text-gray-900 font-semibold text-base mb-1">{title}</h3>
      <p className="text-gray-500 text-sm mb-4 max-w-xs">{description}</p>
      {action}
    </div>
  )
}
