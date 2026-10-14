import { subMinutes } from 'date-fns'

export const extractMeetingId = (url) => url?.match(/zoom\.us\/j\/(\d+)/)?.[1] ?? null
export const extractZoomPassword = (url) => url?.match(/[?&]pwd=([^&]+)/)?.[1] ?? null
export const buildDeepLink = (id, pwd) => `zoommtg://zoom.us/join?confno=${id}${pwd ? `&pwd=${pwd}` : ''}`

export function isLiveLecture(lecture) {
  const now = new Date()
  return now >= subMinutes(new Date(lecture.start_time), 5) && now <= new Date(lecture.end_time)
}

export function isUpcomingLecture(lecture, minutesBefore = 30) {
  const now = new Date()
  const start = new Date(lecture.start_time)
  return start > now && (start - now) / 60000 <= minutesBefore
}

export function isPastLecture(lecture) {
  return new Date(lecture.end_time) < new Date()
}

export function generateICS(lecture) {
  const fmt = d => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  return `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\n` +
    `DTSTART:${fmt(new Date(lecture.start_time))}\nDTEND:${fmt(new Date(lecture.end_time))}\n` +
    `SUMMARY:${lecture.course_code} - ${lecture.course_title}\n` +
    `DESCRIPTION:Facilitator: ${lecture.facilitator_name}\\nZoom: ${lecture.meeting_web_url || ''}\n` +
    `LOCATION:${lecture.meeting_web_url || 'Online'}\nEND:VEVENT\nEND:VCALENDAR`
}

export function downloadICS(lecture) {
  const content = generateICS(lecture)
  const blob = new Blob([content], { type: 'text/calendar' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${lecture.course_code}-lecture.ics`
  a.click()
  URL.revokeObjectURL(url)
}
