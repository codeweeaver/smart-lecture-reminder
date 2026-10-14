import { useMemo } from 'react'
import { useCalendar } from '../../contexts/CalendarContext.jsx'
import { useLectures } from '../../contexts/LecturesContext.jsx'
import { getMonthGrid, getLecturesForDay, getTMAForDay } from '../../utils/dateHelpers.js'
import DayCell from './DayCell.jsx'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function MonthView({ onLectureClick, onTMAClick }) {
  const { selectedDate, statusFilter } = useCalendar()
  const { lectures: allLectures, tmaDeadlines } = useLectures()

  const lectures = useMemo(
    () => statusFilter === 'all' ? allLectures : allLectures.filter(l => l.status === statusFilter),
    [allLectures, statusFilter]
  )
  const grid = useMemo(() => getMonthGrid(selectedDate), [selectedDate])

  return (
    <div className="h-full flex flex-col">
      <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        {DAYS.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-gray-500 py-2">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 flex-1">
        {grid.map(day => (
          <DayCell
            key={day.toISOString()}
            day={day}
            lectures={getLecturesForDay(lectures, day)}
            tmas={getTMAForDay(tmaDeadlines, day)}
            selectedMonth={selectedDate}
            onLectureClick={onLectureClick}
            onTMAClick={onTMAClick}
          />
        ))}
      </div>
    </div>
  )
}
