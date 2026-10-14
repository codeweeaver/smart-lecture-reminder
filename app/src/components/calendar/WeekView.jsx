import { useMemo, useRef, useEffect, useState } from 'react'
import { parseISO, isAfter, format } from 'date-fns'
import { useCalendar } from '../../contexts/CalendarContext.jsx'
import { useLectures } from '../../contexts/LecturesContext.jsx'
import { getWeekDays, getLecturesForDay, getTMAForDay, formatDayHeader, isToday, getHourSlots } from '../../utils/dateHelpers.js'
import { isPastLecture, isLiveLecture } from '../../utils/zoomHelpers.js'
import LectureBlock from './LectureBlock.jsx'
import TMABlock from './TMABlock.jsx'
import { FiCalendar } from 'react-icons/fi'

// 1 minute = 1 pixel since each hour row is min-h-15
function getNowOffsetPx() {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes() - 6 * 60
}

export default function WeekView({ onLectureClick, onTMAClick }) {
  const { selectedDate, statusFilter } = useCalendar()
  const { lectures: allLectures, tmaDeadlines } = useLectures()
  const lectures = useMemo(
    () => statusFilter === 'all' ? allLectures : allLectures.filter(l => l.status === statusFilter),
    [allLectures, statusFilter]
  )
  const days = useMemo(() => getWeekDays(selectedDate), [selectedDate])
  const hours = getHourSlots(6, 22)

  const scrollRef = useRef(null)
  const [nowOffset, setNowOffset] = useState(getNowOffsetPx)

  // Update red "now" line every minute
  useEffect(() => {
    const id = setInterval(() => setNowOffset(getNowOffsetPx()), 60000)
    return () => clearInterval(id)
  }, [])

  // Auto-scroll to current time when navigating
  useEffect(() => {
    if (!scrollRef.current) return
    const offset = getNowOffsetPx()
    if (offset <= 0) return
    scrollRef.current.scrollTop = Math.max(0, offset - scrollRef.current.clientHeight / 3)
  }, [selectedDate])

  // The single globally-next upcoming lecture (for NEXT UP badge)
  const nextUpcomingId = useMemo(() =>
    allLectures
      .filter(l => l.status === 'scheduled' && !isPastLecture(l) && !isLiveLecture(l))
      .sort((a, b) => parseISO(a.start_time) - parseISO(b.start_time))[0]?.id
  , [allLectures])

  // Banner: shown when this week has no scheduled lectures
  const weekHasScheduled = useMemo(() =>
    days.some(d => getLecturesForDay(allLectures, d).some(l => l.status === 'scheduled'))
  , [allLectures, days])

  const nextBannerLecture = useMemo(() => {
    if (weekHasScheduled) return null
    return allLectures
      .filter(l => l.status === 'scheduled' && isAfter(parseISO(l.start_time), new Date()))
      .sort((a, b) => parseISO(a.start_time) - parseISO(b.start_time))[0] ?? null
  }, [allLectures, weekHasScheduled])

  // Only show now-line when the current week contains today
  const viewingCurrentWeek = days.some(d => isToday(d))
  const showNowLine = viewingCurrentWeek && nowOffset >= 0 && nowOffset <= 16 * 60

  return (
    <div className="h-full flex flex-col">
      {/* No lectures this week banner */}
      {nextBannerLecture && (
        <div className="mx-1 mt-2 mb-1 bg-noun-50 dark:bg-noun-950/30 border border-noun-200 dark:border-noun-800 rounded-xl px-4 py-3 flex items-center gap-3 shrink-0">
          <FiCalendar className="text-noun-500 shrink-0" size={16} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-noun-700 dark:text-noun-400">No lectures this week</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
              Next: <span className="font-medium">{nextBannerLecture.course_code}</span>
              {' · '}{format(parseISO(nextBannerLecture.start_time), 'EEE, MMM d · h:mm a')}
            </p>
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-auto">
        {/* Day headers (sticky) */}
        <div className="sticky top-0 grid bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 z-10" style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}>
          <div className="border-r border-gray-100 dark:border-gray-800" />
          {days.map(d => (
            <div key={d.toISOString()} className={`text-center py-2 text-xs font-semibold border-r border-gray-100 dark:border-gray-800 ${isToday(d) ? 'text-noun-600 dark:text-noun-400' : 'text-gray-600 dark:text-gray-400'}`}>
              {formatDayHeader(d)}
            </div>
          ))}
        </div>

        {/* Hourly grid */}
        <div className="relative">
          {/* Current time indicator — calm accent pill instead of alarm-red */}
          {showNowLine && (
            <div
              className="absolute left-12 right-0 z-20 pointer-events-none flex items-center gap-1.5"
              style={{ top: `${nowOffset}px` }}
            >
              <span className="text-[10px] font-semibold text-white bg-noun-500 px-1.5 py-0.5 rounded-full -ml-1 shrink-0">
                {format(new Date(), 'h:mm')}
              </span>
              <div className="flex-1 h-0.5 bg-noun-500" />
            </div>
          )}

          {hours.map(hour => (
            <div key={hour} className="grid border-b border-gray-50 dark:border-gray-800 min-h-15" style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}>
              <div className="text-right pr-2 pt-1 text-xs text-gray-400 border-r border-gray-100 dark:border-gray-800">
                {hour % 12 || 12}{hour < 12 ? 'am' : 'pm'}
              </div>
              {days.map(d => {
                const dayLectures = getLecturesForDay(lectures, d).filter(l => new Date(l.start_time).getHours() === hour)
                const dayTMAs = getTMAForDay(tmaDeadlines, d)
                return (
                  <div key={d.toISOString()} className="p-0.5 border-r border-gray-100 dark:border-gray-800 space-y-0.5 min-h-15">
                    {hour === 0 && dayTMAs.map(t => <TMABlock key={t.id} tma={t} onClick={onTMAClick} compact />)}
                    {dayLectures.map(l => (
                      <div key={l.id} className={isPastLecture(l) ? 'opacity-50' : ''}>
                        <LectureBlock lecture={l} onClick={onLectureClick} isNextUp={l.id === nextUpcomingId} />
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
