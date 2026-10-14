export function Avatar({ name = '', size = 'md', className = '' }) {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' }
  return (
    <div className={`${sizes[size]} rounded-full bg-noun-500 text-white flex items-center justify-center font-semibold shrink-0 ${className}`}>
      {initials || '?'}
    </div>
  )
}
