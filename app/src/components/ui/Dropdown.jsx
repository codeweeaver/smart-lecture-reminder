import { useState, useRef, useEffect } from 'react'

export function Dropdown({ trigger, items, align = 'right' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function handler(e) { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function handleSelect(item) {
    setOpen(false)
    item.onClick?.()
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
      >
        {trigger}
      </button>

      {open && (
        <div
          className={`absolute z-50 mt-1.5 w-44 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden py-1 ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          {items.map((item, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(item)}
              className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                item.variant === 'danger' ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {item.icon && <item.icon size={14} className="shrink-0" />}
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
