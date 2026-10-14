import { useMemo } from 'react'
import { format, isSameMonth, isSameDay } from 'date-fns'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { useCalendar } from '../../contexts/CalendarContext.jsx'
import { useLectures } from '../../contexts/LecturesContext.jsx'
import { getMonthGrid, getLecturesForDay } from '../../utils/dateHelpers.js'

export default function MiniCalendar() {
  const { selectedDate, setSelectedDate, goNext, goPrev } = useCalendar()
  const { lectures } = useLectures()
  const grid = useMemo(() => getMonthGrid(selectedDate), [selectedDate])

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-800">{format(selectedDate, 'MMMM yyyy')}</span>
        <div className="flex gap-1">
          <button onClick={goPrev} className="p-1 hover:bg-gray-100 rounded text-gray-400"><FiChevronLeft size={14} /></button>
          <button onClick={goNext} className="p-1 hover:bg-gray-100 rounded text-gray-400"><FiChevronRight size={14} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px">
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-medium text-gray-400 py-1">{d}</div>
        ))}
        {grid.map(day => {
          const hasEvents = getLecturesForDay(lectures, day).length > 0
          const isSelected = isSameDay(day, selectedDate)
          const inMonth = isSameMonth(day, selectedDate)
          return (
            <button key={day.toISOString()} onClick={() => setSelectedDate(day)}
              className={`relative aspect-square flex items-center justify-center text-[11px] rounded-full transition ${
                isSelected ? 'bg-noun-500 text-white' : inMonth ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-300'
              }`}
            >
              {day.getDate()}
              {hasEvents && !isSelected && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-noun-400" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
