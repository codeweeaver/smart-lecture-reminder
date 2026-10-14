import { motion } from 'motion/react'
import { FiBookOpen } from 'react-icons/fi'
import { isLiveLecture } from '../../utils/zoomHelpers.js'
import { formatTime } from '../../utils/formatters.js'

export default function LectureBlock({ lecture, onClick, compact = false, isNextUp = false }) {
  const isLive = isLiveLecture(lecture)
  const isCancelled = lecture.status === 'cancelled'
  const isRescheduled = lecture.status === 'rescheduled'

  const statusStyle = isCancelled
    ? 'opacity-60 line-through'
    : isRescheduled
    ? 'border-orange-300'
    : ''

  const bgColor = isCancelled ? '#ef4444' : lecture.color_hex || '#1a9a5c'

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={() => onClick?.(lecture)}
      className={`rounded-lg px-2 py-1 cursor-pointer select-none overflow-hidden ${statusStyle} ${lecture.announcement ? 'border-b-2 border-b-yellow-400' : ''} ${!compact ? 'flex items-start gap-1.5' : ''}`}
      style={{ backgroundColor: bgColor + '20', borderLeft: `${isNextUp ? '4px' : '3px'} solid ${bgColor}` }}
    >
      {!compact && (
        <div
          className="flex items-center justify-center w-5 h-5 rounded-full shrink-0 mt-0.5"
          style={{ backgroundColor: bgColor + '30' }}
        >
          <FiBookOpen size={10} style={{ color: bgColor }} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        {isNextUp && (
          <p className="text-[9px] font-bold uppercase tracking-wide mb-0.5" style={{ color: bgColor }}>NEXT UP</p>
        )}
        <div className="flex items-center gap-1">
          {isLive && (
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
          )}
          <p className="font-bold text-xs truncate" style={{ color: bgColor }}>{lecture.course_code}</p>
        </div>
        {!compact && (
          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{formatTime(lecture.start_time)}</p>
        )}
      </div>
    </motion.div>
  )
}
