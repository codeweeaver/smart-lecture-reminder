import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { useCalendar } from '../../contexts/CalendarContext.jsx'
import { format } from 'date-fns'

const VIEWS = [
  { id: 'month', label: 'Month' },
  { id: 'week',  label: 'Week' },
  { id: 'day',   label: 'Day' },
]

const STATUS_PILLS = [
  { id: 'all',         label: 'All' },
  { id: 'scheduled',   label: 'Scheduled' },
  { id: 'cancelled',   label: 'Cancelled' },
  { id: 'rescheduled', label: 'Rescheduled' },
]

export default function CalendarHeader() {
  const { selectedDate, viewMode, setViewMode, goToToday, goNext, goPrev, statusFilter, setStatusFilter } = useCalendar()

  const title = viewMode === 'month'
    ? format(selectedDate, 'MMMM yyyy')
    : viewMode === 'week'
    ? `Week of ${format(selectedDate, 'MMM d')}`
    : format(selectedDate, 'EEEE, MMMM d')

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
      {/* Navigation row */}
      <div className="flex items-center justify-between px-4 py-3 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="hidden sm:flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-noun-50 dark:bg-noun-950/40 shrink-0">
            <span className="text-[9px] font-bold text-noun-600 dark:text-noun-400 uppercase leading-none">
              {format(selectedDate, 'MMM')}
            </span>
            <span className="text-sm font-bold text-noun-700 dark:text-noun-300 leading-none mt-0.5">
              {format(selectedDate, 'd')}
            </span>
          </div>
          <button onClick={goPrev} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition shrink-0">
            <FiChevronLeft size={18} />
          </button>
          <button onClick={goToToday} className="px-3 py-1.5 rounded-xl text-sm font-medium bg-noun-50 dark:bg-noun-950/40 text-noun-700 dark:text-noun-400 hover:bg-noun-100 dark:hover:bg-noun-900/40 transition shrink-0">
            Today
          </button>
          <button onClick={goNext} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition shrink-0">
            <FiChevronRight size={18} />
          </button>
          <h2 className="font-display font-semibold text-gray-900 dark:text-gray-100 text-base ml-1 truncate">{title}</h2>
        </div>
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 shrink-0">
          {VIEWS.map(v => (
            <button key={v.id} onClick={() => setViewMode(v.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${viewMode === v.id ? 'bg-white dark:bg-gray-900 shadow-sm text-noun-700 dark:text-noun-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-1.5 px-4 pb-2.5 overflow-x-auto no-scrollbar">
        {STATUS_PILLS.map(pill => (
          <button
            key={pill.id}
            onClick={() => setStatusFilter(pill.id)}
            className={`px-3 py-1 rounded-lg text-xs font-medium border whitespace-nowrap transition-colors ${
              statusFilter === pill.id
                ? 'bg-noun-500 text-white border-noun-500'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>
    </div>
  )
}
