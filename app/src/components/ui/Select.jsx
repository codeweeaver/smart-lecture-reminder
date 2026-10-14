import { useState, useRef, useEffect, useId, Children } from 'react'
import { FiChevronDown, FiCheck } from 'react-icons/fi'

export function Select({ label, error, hint, children, className = '', size = 'md', id: propId, name, value, onChange, disabled, ...rest }) {
  const [open, setOpen] = useState(false)
  const sizeClass = size === 'sm' ? 'px-3 py-1.5' : 'h-11.5 px-3'
  const uid = useId()
  const id = propId || name || uid
  const ref = useRef(null)

  // Parse <option> children into flat list
  const options = []
  Children.forEach(children, child => {
    if (!child) return
    if (child.type === 'option') {
      options.push({ value: child.props.value ?? '', label: child.props.children })
    }
  })

  const selected = options.find(o => String(o.value) === String(value ?? ''))

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e) { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function handleSelect(optValue) {
    onChange?.({ target: { value: optValue, name } })
    setOpen(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') { setOpen(false); return }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(v => !v) }
  }

  const isPlaceholder = !selected || selected.value === ''

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      <div ref={ref} className="relative">
        <button
          type="button"
          id={id}
          disabled={disabled}
          onClick={() => !disabled && setOpen(v => !v)}
          onKeyDown={handleKeyDown}
          className={`w-full ${sizeClass} border rounded-xl text-sm text-left flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-noun-500 focus:border-transparent transition-all duration-150 bg-white disabled:opacity-50 disabled:cursor-not-allowed ${
            open ? 'border-noun-500 ring-2 ring-noun-500' : error ? 'border-red-400' : 'border-gray-200'
          } ${className}`}
          {...rest}
        >
          <span className={`truncate ${isPlaceholder ? 'text-gray-400' : 'text-gray-900'}`}>
            {selected?.label ?? 'Select…'}
          </span>
          <FiChevronDown
            size={14}
            className={`text-gray-400 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {open && (
          <div className="absolute z-50 w-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            <ul className="max-h-52 overflow-y-auto no-scrollbar py-1">
              {options.map((opt, i) => {
                const isSelected = String(opt.value) === String(value ?? '')
                return (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      className={`w-full text-left px-3 py-2.5 text-sm flex items-center justify-between gap-2 transition-colors ${
                        isSelected
                          ? 'bg-noun-50 text-noun-700 font-medium'
                          : opt.value === ''
                          ? 'text-gray-400 hover:bg-gray-50'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="truncate">{opt.label}</span>
                      {isSelected && opt.value !== '' && (
                        <FiCheck size={14} className="text-noun-500 shrink-0" />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>

      {hint && !error && <p className="text-[11px] text-gray-400">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
