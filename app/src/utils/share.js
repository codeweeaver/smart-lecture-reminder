import { format } from 'date-fns'

export function buildWhatsAppShare(lecture) {
  const time = format(new Date(lecture.start_time), 'EEE MMM d, h:mm a')
  const text = `📚 *${lecture.course_code}*  ${lecture.course_title}\n📅 ${time}\n👤 ${lecture.facilitator_name}\n🔗 ${lecture.meeting_web_url || ''}`
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const el = document.createElement('textarea')
    el.value = text
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
    return true
  }
}
