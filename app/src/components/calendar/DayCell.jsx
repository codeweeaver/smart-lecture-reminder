import { isSameMonth } from 'date-fns'
import { useCalendar } from '../../contexts/CalendarContext.jsx'
import { isToday } from '../../utils/dateHelpers.js'
import LectureBlock from './LectureBlock.jsx'
import TMABlock from './TMABlock.jsx'

export default function DayCell({ day, lectures = [], tmas = [], selectedMonth, onLectureClick, onTMAClick }) {
  const { setSelectedDate, setViewMode } = useCalendar()
  const today = isToday(day)
  const inMonth = isSameMonth(day, selectedMonth)

  function handleDayClick() {
    setSelectedDate(day)
    setViewMode('day')
  }

  return (
    <div className={`min-h-[80px] p-1 border-b border-r border-gray-100 dark:border-gray-800 ${!inMonth ? 'bg-gray-50/50 dark:bg-gray-900/40' : 'bg-white dark:bg-gray-900'}`}>
      <button
        onClick={handleDayClick}
        className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium mb-1 transition ${
          today ? 'bg-noun-500 text-white' : inMonth ? 'text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800' : 'text-gray-300 dark:text-gray-700'
        }`}
      >
        {day.getDate()}
      </button>
      <div className="space-y-0.5">
        {lectures.slice(0, 2).map(l => (
          <LectureBlock key={l.id} lecture={l} onClick={onLectureClick} compact />
        ))}
        {tmas.slice(0, 1).map(t => (
          <TMABlock key={t.id} tma={t} onClick={onTMAClick} compact />
        ))}
        {(lectures.length + tmas.length > 3) && (
          <p className="text-xs text-gray-400 pl-1">+{lectures.length + tmas.length - 3} more</p>
        )}
      </div>
    </div>
  )
}
