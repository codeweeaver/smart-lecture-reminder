import { useMemo, useRef, useEffect, useState } from 'react'
import { parseISO, isAfter, isToday, format } from 'date-fns'
import { useCalendar } from '../../contexts/CalendarContext.jsx'
import { useLectures } from '../../contexts/LecturesContext.jsx'
import { getLecturesForDay, getTMAForDay, getHourSlots } from '../../utils/dateHelpers.js'
import { isPastLecture, isLiveLecture } from '../../utils/zoomHelpers.js'
import TMABlock from './TMABlock.jsx'
import { FiBookOpen, FiCalendar } from 'react-icons/fi'

const HOUR_HEIGHT = 56 // min-h-14 = 56px

function getNowOffsetPx() {
  const now = new Date()
  const minutesFromSix = now.getHours() * 60 + now.getMinutes() - 6 * 60
  return (minutesFromSix / 60) * HOUR_HEIGHT
}

export default function DayView({ onLectureClick, onTMAClick }) {
  const { selectedDate, statusFilter } = useCalendar()
  const { lectures: allLectures, tmaDeadlines } = useLectures()
  const lectures = useMemo(
    () => statusFilter === 'all' ? allLectures : allLectures.filter(l => l.status === statusFilter),
    [allLectures, statusFilter]
  )
  const dayLectures = useMemo(() => getLecturesForDay(lectures, selectedDate), [lectures, selectedDate])
  const dayTMAs = useMemo(() => getTMAForDay(tmaDeadlines, selectedDate), [tmaDeadlines, selectedDate])
  const hours = getHourSlots(6, 22)

  const scrollRef = useRef(null)
  const [nowOffset, setNowOffset] = useState(getNowOffsetPx)

  useEffect(() => {
    const id = setInterval(() => setNowOffset(getNowOffsetPx()), 60000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!scrollRef.current) return
    const offset = getNowOffsetPx()
    if (offset <= 0) return
    scrollRef.current.scrollTop = Math.max(0, offset - scrollRef.current.clientHeight / 3)
  }, [selectedDate])

  const nextUpcomingId = useMemo(() =>
    allLectures
      .filter(l => l.status === 'scheduled' && !isPastLecture(l) && !isLiveLecture(l))
      .sort((a, b) => parseISO(a.start_time) - parseISO(b.start_time))[0]?.id
  , [allLectures])

  const dayHasScheduled = useMemo(() =>
    getLecturesForDay(allLectures, selectedDate).some(l => l.status === 'scheduled')
  , [allLectures, selectedDate])

  const nextBannerLecture = useMemo(() => {
    if (dayHasScheduled) return null
    return allLectures
      .filter(l => l.status === 'scheduled' && isAfter(parseISO(l.start_time), new Date()))
      .sort((a, b) => parseISO(a.start_time) - parseISO(b.start_time))[0] ?? null
  }, [allLectures, dayHasScheduled])

  const showNowLine = isToday(selectedDate) && nowOffset >= 0 && nowOffset <= 16 * HOUR_HEIGHT

  return (
    <div ref={scrollRef} className="h-full overflow-auto p-4">
      {/* No lectures today banner */}
      {nextBannerLecture && (
        <div className="bg-noun-50 dark:bg-noun-950/30 border border-noun-200 dark:border-noun-800 rounded-xl px-4 py-3 flex items-center gap-3 mb-4">
          <FiCalendar className="text-noun-500 shrink-0" size={16} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-noun-700 dark:text-noun-400">No lectures today</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
              Next: <span className="font-medium">{nextBannerLecture.course_code}</span>
              {' · '}{format(parseISO(nextBannerLecture.start_time), 'EEE, MMM d · h:mm a')}
            </p>
          </div>
        </div>
      )}

      {dayTMAs.length > 0 && (
        <div className="mb-3 space-y-1">
          {dayTMAs.map(t => <TMABlock key={t.id} tma={t} onClick={onTMAClick} />)}
        </div>
      )}

      <div className="relative">
        {/* Current time indicator — calm accent pill instead of alarm-red */}
        {showNowLine && (
          <div
            className="absolute left-15 right-0 z-20 pointer-events-none flex items-center gap-1.5"
            style={{ top: `${nowOffset}px` }}
          >
            <span className="text-[10px] font-semibold text-white bg-noun-500 px-1.5 py-0.5 rounded-full -ml-1 shrink-0">
              {format(new Date(), 'h:mm')}
            </span>
            <div className="flex-1 h-0.5 bg-noun-500" />
          </div>
        )}

        {hours.map(hour => {
          const hourLectures = dayLectures.filter(l => new Date(l.start_time).getHours() === hour)
          return (
            <div key={hour} className="flex gap-3 min-h-14 border-b border-gray-50 dark:border-gray-800">
              <div className="w-12 text-right text-xs text-gray-400 pt-2 shrink-0">
                {hour % 12 || 12}{hour < 12 ? 'am' : 'pm'}
              </div>
              <div className="flex-1 space-y-1 py-1">
                {hourLectures.map(l => {
                  const isPast = isPastLecture(l)
                  const isNextUp = l.id === nextUpcomingId
                  const color = l.color_hex || '#1a9a5c'
                  return (
                    <div
                      key={l.id}
                      className={`flex items-start gap-2 p-2 rounded-xl cursor-pointer hover:opacity-90 transition ${isPast ? 'opacity-50' : ''}`}
                      style={{ backgroundColor: color + '20', borderLeft: `${isNextUp ? '4px' : '3px'} solid ${color}` }}
                      onClick={() => onLectureClick?.(l)}
                    >
                      <div
                        className="flex items-center justify-center w-7 h-7 rounded-full shrink-0 mt-0.5"
                        style={{ backgroundColor: color + '30' }}
                      >
                        <FiBookOpen size={13} style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        {isNextUp && (
                          <p className="text-[9px] font-bold uppercase tracking-wide mb-0.5" style={{ color }}>NEXT UP</p>
                        )}
                        <p className="font-bold text-sm" style={{ color }}>{l.course_code}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{format(new Date(l.start_time), 'h:mm')}–{format(new Date(l.end_time), 'h:mm a')} · {l.facilitator_name}</p>
                        {l.announcement && <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-0.5 truncate">📢 {l.announcement}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
