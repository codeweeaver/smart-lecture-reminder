import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, format, getHours, getMinutes, differenceInMinutes, startOfDay, addHours, parseISO, addDays } from 'date-fns'

// Groups lectures into per-day buckets for the next `days` days (label:
// "Today" / "Tomorrow" / "EEEE, MMM d"), skipping days with nothing
// scheduled. Anything beyond that window is returned separately as `later`
// for a single collapsible section, so 30+ near-identical cards don't all
// render flat at once.
export function bucketUpcomingLectures(lectures, days = 7) {
  const today = startOfDay(new Date())
  const buckets = []
  for (let i = 0; i < days; i++) {
    const day = addDays(today, i)
    const dayLectures = lectures
      .filter(l => isSameDay(parseISO(l.start_time), day))
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    if (dayLectures.length === 0) continue
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : format(day, 'EEEE, MMM d')
    buckets.push({ label, date: day, lectures: dayLectures })
  }
  const cutoff = addDays(today, days)
  const later = lectures
    .filter(l => parseISO(l.start_time) >= cutoff)
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
  return { days: buckets, later }
}

export function getMonthGrid(date) {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 0 })
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: 0 })
  return eachDayOfInterval({ start, end })
}

export function getWeekDays(date) {
  const start = startOfWeek(date, { weekStartsOn: 0 })
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function getHourSlots(startHour = 6, endHour = 22) {
  const slots = []
  for (let h = startHour; h <= endHour; h++) slots.push(h)
  return slots
}

export function getLecturesForDay(lectures, day) {
  return lectures.filter(l => isSameDay(parseISO(l.start_time), day))
}

export function getTMAForDay(tmaDeadlines, day) {
  return tmaDeadlines.filter(t => isSameDay(parseISO(t.due_date), day))
}

export function isSameDayCheck(dateA, dateB) {
  return isSameDay(new Date(dateA), new Date(dateB))
}

export function formatTime(dateStr) {
  return format(new Date(dateStr), 'h:mm a')
}

export function formatDate(dateStr, fmt = 'MMM d, yyyy') {
  return format(new Date(dateStr), fmt)
}

export function formatDayHeader(date) {
  return format(date, 'EEE d')
}

export function isToday(date) {
  return isSameDay(date, new Date())
}

export function getEventTopPercent(startTime, dayStart = 6) {
  const start = new Date(startTime)
  const totalMinutes = (24 - dayStart) * 60
  const minutesFromStart = (getHours(start) - dayStart) * 60 + getMinutes(start)
  return Math.max(0, (minutesFromStart / totalMinutes) * 100)
}

export function getEventHeightPercent(startTime, endTime, dayStart = 6) {
  const totalMinutes = (24 - dayStart) * 60
  const duration = differenceInMinutes(new Date(endTime), new Date(startTime))
  return Math.max(2, (duration / totalMinutes) * 100)
}

export function detectOverlap(lectures) {
  const sorted = [...lectures].sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
  const columns = []
  for (const lecture of sorted) {
    let placed = false
    for (let i = 0; i < columns.length; i++) {
      const last = columns[i][columns[i].length - 1]
      if (new Date(lecture.start_time) >= new Date(last.end_time)) {
        columns[i].push(lecture)
        placed = true
        break
      }
    }
    if (!placed) columns.push([lecture])
  }
  return columns.length
}
