import { useMemo } from 'react'
import { format } from 'date-fns'
import { useLectures } from '../../contexts/LecturesContext.jsx'
import { getWeekDays, getLecturesForDay } from '../../utils/dateHelpers.js'
import { BarChart } from '../ui/BarChart.jsx'
import { SectionLabel } from '../ui/SectionLabel.jsx'

// Additive analytics widget — does NOT replace WeekStrip (which is a day
// picker wired into CalendarContext). Aggregates the same lectures data
// already loaded by LecturesContext, zero new queries.
export default function WeekActivityChart() {
  const { lectures } = useLectures()

  const data = useMemo(() => {
    const days = getWeekDays(new Date())
    return days.map((day) => {
      const count = getLecturesForDay(lectures, day).filter((l) => l.status === 'scheduled').length
      return { label: format(day, 'EEE'), value: count, hasData: count > 0 }
    })
  }, [lectures])

  const total = data.reduce((sum, d) => sum + d.value, 0)
  if (total === 0) return null

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4">
      <SectionLabel className="mb-3">This Week's Lectures</SectionLabel>
      <BarChart data={data} />
    </div>
  )
}
