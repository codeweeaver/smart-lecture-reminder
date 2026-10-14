import { createContext, useContext, useState } from 'react'
import { addMonths, addWeeks, addDays, subMonths, subWeeks, subDays, startOfToday } from 'date-fns'

const CalendarContext = createContext(null)

export function CalendarProvider({ children }) {
  const [selectedDate, setSelectedDate] = useState(startOfToday())
  const [viewMode, setViewMode] = useState('month')
  const [statusFilter, setStatusFilter] = useState('all')

  function goToToday() { setSelectedDate(startOfToday()) }

  function goNext() {
    setSelectedDate(d =>
      viewMode === 'month' ? addMonths(d, 1)
      : viewMode === 'week'  ? addWeeks(d, 1)
      : addDays(d, 1)
    )
  }

  function goPrev() {
    setSelectedDate(d =>
      viewMode === 'month' ? subMonths(d, 1)
      : viewMode === 'week'  ? subWeeks(d, 1)
      : subDays(d, 1)
    )
  }

  return (
    <CalendarContext.Provider value={{ selectedDate, viewMode, setSelectedDate, goToToday, goNext, goPrev, setViewMode, statusFilter, setStatusFilter }}>
      {children}
    </CalendarContext.Provider>
  )
}

export function useCalendar() {
  const ctx = useContext(CalendarContext)
  if (!ctx) throw new Error('useCalendar must be used inside CalendarProvider')
  return ctx
}
