import { useState, useId } from 'react'
import { FiEye, FiEyeOff } from 'react-icons/fi'

export function Input({ label, error, hint, type = 'text', className = '', id: propId, name, ...rest }) {
  const [showPw, setShowPw] = useState(false)
  const uid = useId()
  const id = propId || name || uid

  const isPassword = type === 'password'
  const resolvedType = isPassword ? (showPw ? 'text' : 'password') : type

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          name={name}
          type={resolvedType}
          className={`w-full h-11.5 px-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-noun-500 focus:border-transparent transition-all duration-150 bg-white ${
            error ? 'border-red-400 bg-red-50' : 'border-gray-200'
          } ${isPassword ? 'pr-10' : ''} ${className}`}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPw(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPw ? <FiEyeOff size={15} /> : <FiEye size={15} />}
          </button>
        )}
      </div>
      {hint && !error && <p className="text-[11px] text-gray-400">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
