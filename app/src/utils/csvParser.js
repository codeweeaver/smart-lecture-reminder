export function parseCSV(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_').replace(/"/g, ''))
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
  }).filter(row => Object.values(row).some(v => v !== ''))
}

export const CSV_TEMPLATE_HEADERS = 'course_code,course_title,facilitator_name,start_time,end_time,meeting_web_url,venue'
export const CSV_TEMPLATE_EXAMPLE = 'CIT 403,Software Engineering,Dr. Yusuf,2026-03-10T10:00:00,2026-03-10T12:00:00,https://zoom.us/j/12345678,Online'
