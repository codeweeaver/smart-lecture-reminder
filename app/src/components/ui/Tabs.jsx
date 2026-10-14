import { useId } from 'react'
import { motion, useReducedMotion } from 'motion/react'

export function Tabs({ tabs, activeTab, active, onTabChange, onChange, className = '' }) {
  const currentActive = activeTab ?? active
  const handleChange = onTabChange ?? onChange
  const normalised = tabs.map(t => typeof t === 'string' ? { id: t, label: t } : t)
  const layoutId = useId()
  const reducedMotion = useReducedMotion()

  return (
    <div className={`inline-flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-x-auto max-w-full ${className}`}>
      {normalised.map(tab => {
        const isActive = currentActive === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleChange(tab.id)}
            className={`relative px-4 py-1.5 text-sm font-medium whitespace-nowrap rounded-lg transition-colors shrink-0 ${
              isActive ? 'text-noun-700 dark:text-noun-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId={`tabs-active-pill-${layoutId}`}
                className="absolute inset-0 bg-white dark:bg-gray-900 rounded-lg shadow-sm"
                transition={reducedMotion ? { duration: 0 } : { type: 'spring', duration: 0.3, bounce: 0.15 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}
