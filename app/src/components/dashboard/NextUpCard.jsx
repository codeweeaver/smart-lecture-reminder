import { useMemo } from 'react'
import { parseISO, isAfter, isToday, isTomorrow, differenceInDays, differenceInHours, format } from 'date-fns'
import { useLectures } from '../../contexts/LecturesContext.jsx'
import { useCountdown } from '../../hooks/useCountdown.js'
import { isLiveLecture, isUpcomingLecture, isPastLecture } from '../../utils/zoomHelpers.js'
import { formatTimeRange, formatDate } from '../../utils/formatters.js'
import { GRADIENT_HERO, GRADIENT_HERO_TEXT } from '../../utils/gradientPresets.js'
import { FiVideo, FiClock } from 'react-icons/fi'
import { motion } from 'motion/react'

function NextLectureCard({ lecture, onClick }) {
  const isLive = isLiveLecture(lecture)
  const countdown = useCountdown(lecture.start_time)
  return (
    <motion.div whileTap={{ scale: 0.98 }} onClick={() => onClick?.(lecture)}
      className={`rounded-3xl shadow-lg shadow-noun-900/10 p-4 cursor-pointer ${GRADIENT_HERO} ${GRADIENT_HERO_TEXT}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/15 text-white">
          {lecture.course_code}
        </span>
        {isLive ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-white">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
            </span>
            LIVE NOW
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-white/80"><FiClock size={11} /> {countdown}</span>
        )}
      </div>
      <h3 className="font-semibold text-white text-sm mb-1 line-clamp-1">{lecture.course_title}</h3>
      <p className="text-xs text-white/80">{formatTimeRange(lecture.start_time, lecture.end_time)}</p>
      <p className="text-xs text-white/60">{lecture.facilitator_name}</p>
      {(isLive || isUpcomingLecture(lecture, 30)) && lecture.meeting_web_url && (
        <a href={lecture.meeting_deep_link || lecture.meeting_web_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
          className="mt-3 flex items-center justify-center gap-2 w-full bg-white hover:bg-gray-50 text-noun-700 text-sm font-semibold py-2 rounded-xl transition">
          <FiVideo size={14} /> Join Zoom
        </a>
      )}
    </motion.div>
  )
}

function CompactLectureRow({ lecture, onClick }) {
  const color = lecture.color_hex || '#1a9a5c'
  const startDate = parseISO(lecture.start_time)
  let dateLabel
  if (isToday(startDate)) dateLabel = 'Today'
  else if (isTomorrow(startDate)) dateLabel = 'Tomorrow'
  else if (differenceInDays(startDate, new Date()) < 7) dateLabel = format(startDate, 'EEE')
  else dateLabel = format(startDate, 'MMM d')
  const timeLabel = format(startDate, 'h:mm a')

  return (
    <div onClick={() => onClick?.(lecture)} className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{lecture.course_code} · {lecture.course_title}</p>
        <p className="text-xs text-gray-400">{dateLabel} · {timeLabel}</p>
      </div>
    </div>
  )
}

function NextTMACard({ tma }) {
  const countdown = useCountdown(tma.due_date)
  return (
    <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-yellow-200 dark:bg-yellow-900/60 text-yellow-800 dark:text-yellow-300">
          TMA {tma.tma_number}
        </span>
        <span className="text-xs text-yellow-700 dark:text-yellow-400 font-semibold">{countdown}</span>
      </div>
      <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">{tma.course_code}: TMA {tma.tma_number}</h3>
      <p className="text-xs text-gray-500">Due: {formatDate(tma.due_date, 'EEE, MMM d · h:mm a')}</p>
      <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-2">Submit on NOUN eLearn portal</p>
    </div>
  )
}

export default function NextUpCard({ onLectureClick }) {
  const { lectures, tmaDeadlines } = useLectures()
  const now = new Date()

  const upcomingLectures = useMemo(() =>
    lectures
      .filter(l => l.status === 'scheduled' && !isPastLecture(l))
      .sort((a, b) => parseISO(a.start_time) - parseISO(b.start_time))
      .slice(0, 5)
  , [lectures])

  const nextTMA = useMemo(() =>
    tmaDeadlines
      .filter(t => isAfter(parseISO(t.due_date), now) && differenceInHours(parseISO(t.due_date), now) <= 48)
      .sort((a, b) => parseISO(a.due_date) - parseISO(b.due_date))[0]
  , [tmaDeadlines])

  if (upcomingLectures.length === 0 && !nextTMA) return null

  const [primary, ...rest] = upcomingLectures

  return (
    <div className="space-y-3">
      <h2 className="font-display font-semibold text-gray-800 dark:text-gray-200 text-sm px-1">Coming Up</h2>

      {primary && <NextLectureCard lecture={primary} onClick={onLectureClick} />}

      {rest.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 py-1">
          {rest.map(l => (
            <CompactLectureRow key={l.id} lecture={l} onClick={onLectureClick} />
          ))}
        </div>
      )}

      {upcomingLectures.length === 0 && nextTMA && <NextTMACard tma={nextTMA} />}
    </div>
  )
}
