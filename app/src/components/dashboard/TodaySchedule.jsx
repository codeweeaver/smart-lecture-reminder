import { useMemo } from 'react'
import { useLectures } from '../../contexts/LecturesContext.jsx'
import { getLecturesForDay, getTMAForDay } from '../../utils/dateHelpers.js'
import { formatTime } from '../../utils/formatters.js'
import { isLiveLecture } from '../../utils/zoomHelpers.js'
import { FiBookOpen, FiFileText } from 'react-icons/fi'
import { motion } from 'motion/react'

export default function TodaySchedule({ onLectureClick, onTMAClick }) {
  const { lectures, tmaDeadlines } = useLectures()
  const today = new Date()

  const todayLectures = useMemo(() => getLecturesForDay(lectures, today), [lectures])
  const todayTMAs = useMemo(() => getTMAForDay(tmaDeadlines, today), [tmaDeadlines])

  const items = useMemo(() => {
    const all = [
      ...todayLectures.map(l => ({ ...l, _type: 'lecture', _sortKey: l.start_time })),
      ...todayTMAs.map(t => ({ ...t, _type: 'tma', _sortKey: t.due_date })),
    ]
    return all.sort((a, b) => new Date(a._sortKey) - new Date(b._sortKey))
  }, [todayLectures, todayTMAs])

  if (items.length === 0) return (
    <div className="text-center py-8 text-gray-400 text-sm">No lectures or deadlines today 🎉</div>
  )

  return (
    <div className="space-y-2">
      <h2 className="font-display font-semibold text-gray-800 dark:text-gray-200 text-sm px-1">Today's Schedule</h2>
      {items.map((item, i) => item._type === 'tma' ? (
        <motion.div key={item.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
          onClick={() => onTMAClick?.(item)}
          className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-xl border border-yellow-200 dark:border-yellow-900 cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-950/50 transition">
          <div className="w-8 h-8 rounded-full bg-yellow-200 dark:bg-yellow-900/60 flex items-center justify-center shrink-0">
            <FiFileText size={14} className="text-yellow-700 dark:text-yellow-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">TMA {item.tma_number} Due</p>
            <p className="text-xs text-gray-500">{item.course_code} · {formatTime(item.due_date)}</p>
          </div>
          <span className="text-xs font-medium text-yellow-700 dark:text-yellow-400 bg-yellow-200 dark:bg-yellow-900/60 px-2 py-0.5 rounded-full">TMA</span>
        </motion.div>
      ) : (
        <motion.div key={item.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
          onClick={() => onLectureClick?.(item)}
          className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm cursor-pointer hover:shadow-md transition">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: (item.color_hex || '#1a9a5c') + '20' }}
          >
            <FiBookOpen size={14} style={{ color: item.color_hex || '#1a9a5c' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{item.course_code}</p>
            <p className="text-xs text-gray-500">{formatTime(item.start_time)} · {item.facilitator_name}</p>
          </div>
          {isLiveLecture(item) && (
            <span className="flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />LIVE
            </span>
          )}
        </motion.div>
      ))}
    </div>
  )
}
