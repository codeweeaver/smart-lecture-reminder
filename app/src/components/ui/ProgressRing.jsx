import { useId } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber.js'

// Hand-built SVG donut ring — no charting library. `value` is 0-100.
export function ProgressRing({
  value,
  size = 120,
  strokeWidth = 12,
  label,
  sublabel,
  gradientFrom = '#3db57a',
  gradientTo = '#0d5c34',
  animate = true,
}) {
  const gradientId = useId()
  const reducedMotion = useReducedMotion()
  const clamped = Math.max(0, Math.min(100, value ?? 0))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clamped / 100) * circumference
  const animatedValue = useAnimatedNumber(clamped)
  const displayLabel = label ?? `${animatedValue}%`
  const shouldAnimate = animate && !reducedMotion

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradientFrom} />
            <stop offset="100%" stopColor={gradientTo} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-gray-100 dark:text-gray-800"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={shouldAnimate ? { strokeDashoffset: circumference } : false}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: shouldAnimate ? 0.8 : 0, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-xl font-bold font-display text-gray-900 dark:text-gray-100">{displayLabel}</p>
        {sublabel && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 text-center px-2 leading-tight">{sublabel}</p>
        )}
      </div>
    </div>
  )
}
