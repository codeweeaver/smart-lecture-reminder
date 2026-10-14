import { useId } from 'react'

export function Textarea({ label, error, hint, maxLength, rows = 3, className = '', value, id: propId, name, ...rest }) {
  const uid = useId()
  const id = propId || name || uid
  const charCount = value !== undefined ? String(value).length : 0

  return (
    <div className="flex flex-col gap-1">
      {(label || maxLength) && (
        <div className="flex items-center justify-between">
          {label && <label htmlFor={id} className="text-sm font-medium text-gray-700">{label}</label>}
          {maxLength && (
            <span className={`text-[11px] ${charCount >= maxLength ? 'text-red-500' : charCount >= maxLength * 0.85 ? 'text-orange-400' : 'text-gray-400'}`}>
              {charCount}/{maxLength}
            </span>
          )}
        </div>
      )}
      <textarea
        id={id}
        name={name}
        rows={rows}
        maxLength={maxLength}
        value={value}
        className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-noun-500 focus:border-transparent resize-none transition-all duration-150 bg-white ${
          error ? 'border-red-400 bg-red-50' : 'border-gray-200'
        } ${className}`}
        {...rest}
      />
      {hint && !error && <p className="text-[11px] text-gray-400">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
