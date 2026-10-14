import { ClipLoader } from 'react-spinners'

export function Button({ children, variant = 'primary', size = 'md', loading = false, className = '', ...props }) {
  const base = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-noun-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary:   'bg-noun-500 text-white hover:bg-noun-600 active:bg-noun-700',
    secondary: 'bg-noun-50 text-noun-700 hover:bg-noun-100',
    danger:    'bg-red-500 text-white hover:bg-red-600',
    ghost:     'text-noun-600 hover:bg-noun-50',
    outline:   'border border-noun-300 text-noun-700 hover:bg-noun-50',
  }
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2.5 text-sm', lg: 'px-6 py-3 text-base' }

  const spinnerColor = (variant === 'primary' || variant === 'danger') ? '#ffffff' : '#1a9a5c'

  return (
    <button
      className={`${base} ${variants[variant] ?? variants.primary} ${sizes[size] ?? sizes.md} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && (
        <span className="-ml-1 mr-1.5 flex items-center">
          <ClipLoader color={spinnerColor} size={14} />
        </span>
      )}
      {children}
    </button>
  )
}
