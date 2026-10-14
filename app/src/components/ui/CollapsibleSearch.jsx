import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { FiSearch, FiX } from 'react-icons/fi'

export function CollapsibleSearch({ value, onChange, placeholder = 'Search…', ariaLabel = 'Search', className = '', size = 'md' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const inputRef = useRef(null)
  const reducedMotion = useReducedMotion()
  const isSm = size === 'sm'

  useEffect(() => {
    if (!open) return
    function handler(e) {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  function clear() {
    onChange({ target: { value: '' } })
    setOpen(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') clear()
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <AnimatePresence mode="wait" initial={false}>
        {open ? (
          <motion.div
            key="input"
            layout={!reducedMotion}
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.15 }}
            className="relative"
          >
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={onChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              aria-label={ariaLabel}
              className={`w-full sm:w-56 ${isSm ? 'py-1.5' : 'h-11.5'} pl-9 pr-9 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-noun-500 focus:border-transparent transition-all duration-150`}
            />
            <button
              type="button"
              onClick={clear}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <FiX size={14} />
            </button>
          </motion.div>
        ) : (
          <motion.button
            key="icon"
            layout={!reducedMotion}
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.15 }}
            type="button"
            onClick={() => setOpen(true)}
            aria-label={ariaLabel}
            className={`relative flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${isSm ? 'p-2' : 'w-11 h-11.5'}`}
          >
            <FiSearch size={16} />
            {value && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-noun-500 rounded-full" />}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
