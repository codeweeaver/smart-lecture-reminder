import { motion, useReducedMotion } from 'motion/react'

// Simple 7-bar (or N-bar) pill chart. Bars with `hasData: false` render as a
// diagonal-hash placeholder instead of a solid fill. No charting library.
export function BarChart({ data, max, tooltipIndex, formatValue }) {
  const reducedMotion = useReducedMotion()
  const maxValue = max ?? Math.max(1, ...data.map((d) => d.value))

  return (
    <div className="flex items-end justify-between gap-2 h-32">
      {data.map((d, i) => {
        const pct = maxValue > 0 ? Math.max((d.value / maxValue) * 100, 6) : 6
        const showTooltip = tooltipIndex === i
        return (
          <div key={d.label} className="flex flex-1 flex-col items-center gap-1.5 h-full">
            <div className="relative flex w-full flex-1 items-end justify-center">
              {showTooltip && (
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-2 py-1 text-[10px] font-semibold text-white dark:bg-gray-100 dark:text-gray-900">
                  {formatValue ? formatValue(d.value) : d.value}
                </div>
              )}
              <motion.div
                initial={reducedMotion ? false : { height: 0 }}
                animate={{ height: `${pct}%` }}
                transition={{ duration: reducedMotion ? 0 : 0.6, ease: 'easeOut', delay: reducedMotion ? 0 : i * 0.05 }}
                className={`w-5 max-w-full rounded-t ${
                  d.hasData === false
                    ? 'bg-[repeating-linear-gradient(135deg,#e5e7eb_0px,#e5e7eb_3px,transparent_3px,transparent_6px)] dark:opacity-20'
                    : 'bg-gradient-to-t from-noun-600 to-noun-400'
                }`}
              />
            </div>
            <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}
