export default function AttendanceSummary({ attendance = [], total = 0 }) {
  if (total === 0) return null
  const attended = attendance.filter(a => a.status === 'attended').length
  const missed = attendance.filter(a => a.status === 'missed').length
  const pct = total > 0 ? Math.round((attended / total) * 100) : 0

  return (
    <div>
      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
        <span>{attended} attended · {missed} missed · {total} total</span>
        <span className="font-semibold text-noun-700 dark:text-noun-400">{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full bg-noun-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
