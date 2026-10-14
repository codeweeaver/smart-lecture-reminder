export function Badge({ children, color = 'noun' }) {
  const colors = {
    noun:   'bg-noun-100 text-noun-700',
    red:    'bg-red-100 text-red-700',
    orange: 'bg-orange-100 text-orange-700',
    green:  'bg-green-100 text-green-700',
    gray:   'bg-gray-100 text-gray-600',
    gold:   'bg-yellow-100 text-yellow-700',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color] ?? colors.gray}`}>
      {children}
    </span>
  )
}
