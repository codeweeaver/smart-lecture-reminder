import { useMemo } from 'react'
import { useCalendar } from '../../contexts/CalendarContext.jsx'
import { useLectures } from '../../contexts/LecturesContext.jsx'
import { getWeekDays, getLecturesForDay, getTMAForDay, isToday } from '../../utils/dateHelpers.js'
import { format, isSameDay } from 'date-fns'

export default function WeekStrip() {
  const { selectedDate, setSelectedDate } = useCalendar()
  const { lectures, tmaDeadlines } = useLectures()
  const days = useMemo(() => getWeekDays(selectedDate), [selectedDate])

  const dayData = useMemo(() => {
    const raw = days.map((day) => ({
      day,
      lectureCount: getLecturesForDay(lectures, day).length,
      tmaCount: getTMAForDay(tmaDeadlines, day).length,
    }))
    const maxCount = Math.max(...raw.map((d) => d.lectureCount), 1)
    return raw.map((d) => ({ ...d, barPct: Math.round((d.lectureCount / maxCount) * 100) }))
  }, [days, lectures, tmaDeadlines])

  return (
    <div className="grid grid-cols-7 gap-1">
      {dayData.map(({ day, lectureCount, tmaCount, barPct }) => {
        const today = isToday(day)
        const selected = isSameDay(day, selectedDate)

        return (
          <button
            key={day.toISOString()}
            onClick={() => setSelectedDate(day)}
            className={`flex flex-col items-center gap-1.5 py-2 px-1 rounded-xl transition ${
              selected
                ? 'bg-noun-500'
                : today
                  ? 'bg-noun-100 dark:bg-noun-900/40'
                  : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800'
            } border ${selected ? 'border-noun-500' : 'border-gray-100 dark:border-gray-800'}`}
          >
            <span
              className={`text-[10px] font-medium ${
                selected ? 'text-white' : today ? 'text-noun-700 dark:text-noun-400' : 'text-gray-500'
              }`}
            >
              {format(day, 'EEE')}
            </span>
            <span
              className={`text-sm font-bold ${
                selected ? 'text-white' : today ? 'text-noun-700 dark:text-noun-400' : 'text-gray-800 dark:text-gray-200'
              }`}
            >
              {format(day, 'd')}
            </span>
            <div className="flex items-end gap-0.5 h-3">
              {lectureCount > 0 && (
                <span
                  className={`w-1 rounded-full ${selected ? 'bg-white' : 'bg-noun-400'}`}
                  style={{ height: `${Math.max(barPct, 30)}%` }}
                />
              )}
              {tmaCount > 0 && (
                <span className={`w-1 h-1.5 rounded-full ${selected ? 'bg-yellow-200' : 'bg-yellow-400'}`} />
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
