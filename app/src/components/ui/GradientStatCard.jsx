import { motion } from 'motion/react'
import { FiArrowDownRight, FiArrowUpRight } from 'react-icons/fi'
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber.js'
import { GRADIENT_HERO, GRADIENT_HERO_TEXT } from '../../utils/gradientPresets.js'

const FLAT_COLORS = {
  noun: { bg: 'bg-noun-50 dark:bg-noun-950/30', icon: 'text-noun-600 dark:text-noun-400' },
  blue: { bg: 'bg-blue-50 dark:bg-blue-950/30', icon: 'text-blue-600 dark:text-blue-400' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-950/30', icon: 'text-purple-600 dark:text-purple-400' },
  red: { bg: 'bg-red-50 dark:bg-red-950/30', icon: 'text-red-600 dark:text-red-400' },
  yellow: { bg: 'bg-yellow-50 dark:bg-yellow-950/30', icon: 'text-yellow-600 dark:text-yellow-400' },
}

// A stat card in two flavors: `gradient` (one hero per view) or `flat`
// (tinted background + optional trend pill). The whole card is the click
// target when `onClick` is provided — the corner icon is purely decorative.
export function GradientStatCard({
  icon: Icon,
  label,
  value,
  trend,
  trendDirection = 'up',
  onClick,
  variant = 'gradient',
  color = 'noun',
  className = '',
  hideArrow = false,
}) {
  const numericValue = typeof value === 'number' ? value : null
  const animatedValue = useAnimatedNumber(numericValue ?? 0)
  const displayValue = numericValue != null ? animatedValue : value
  const isGradient = variant === 'gradient'
  const flatColor = FLAT_COLORS[color] ?? FLAT_COLORS.noun
  const Wrapper = onClick ? motion.button : motion.div

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      whileTap={onClick ? { scale: 0.97 } : undefined}
      className={`rounded-3xl p-4 text-left transition-all duration-150 ${
        isGradient
          ? `${GRADIENT_HERO} ${GRADIENT_HERO_TEXT} shadow-lg shadow-noun-900/10`
          : `${flatColor.bg} text-gray-900 dark:text-gray-100`
      } ${onClick ? 'w-full cursor-pointer hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-noun-500 focus:ring-offset-2' : ''} ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className={`flex items-center justify-center w-9 h-9 rounded-full ${
            isGradient ? 'bg-white/15' : 'bg-white dark:bg-gray-900'
          }`}
        >
          <Icon size={16} className={isGradient ? 'text-white' : flatColor.icon} />
        </div>
        {onClick && !hideArrow && (
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full ${
              isGradient ? 'bg-white/15' : 'border border-gray-200 dark:border-gray-700'
            }`}
          >
            <FiArrowUpRight size={14} className={isGradient ? 'text-white' : 'text-gray-400'} />
          </div>
        )}
      </div>

      <p className={`text-2xl font-bold font-display ${isGradient ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
        {displayValue}
      </p>
      <p className={`text-xs mt-0.5 ${isGradient ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>{label}</p>

      {trend != null && (
        <div
          className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[11px] font-medium ${
            isGradient
              ? 'bg-white/15 text-white'
              : trendDirection === 'up'
                ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400'
          }`}
        >
          {trendDirection === 'up' ? <FiArrowUpRight size={11} /> : <FiArrowDownRight size={11} />}
          {trend}
        </div>
      )}
    </Wrapper>
  )
}
