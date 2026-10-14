export const COURSE_COLORS = [
  { hex: '#1a9a5c', label: 'NOUN Green' },
  { hex: '#127a46', label: 'Dark Green' },
  { hex: '#0d5c34', label: 'Forest' },
  { hex: '#3db57a', label: 'Mint' },
  { hex: '#72ce9e', label: 'Light Green' },
  { hex: '#e8b824', label: 'Gold' },
  { hex: '#f97316', label: 'Orange' },
  { hex: '#ef4444', label: 'Red' },
  { hex: '#8b5cf6', label: 'Purple' },
  { hex: '#3b82f6', label: 'Blue' },
  { hex: '#06b6d4', label: 'Cyan' },
  { hex: '#ec4899', label: 'Pink' },
]

const DEFAULT_COURSE_COLOR = '#1a9a5c'

function hashString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  // Avalanche finalizer (Murmur-style)  without this, codes that differ by
  // only a trailing digit (e.g. "GST 101" vs "GST 102") produce hashes that
  // are off by ~1 and land in the same `% length` bucket almost every time.
  hash ^= hash >>> 16
  hash = Math.imul(hash, 0x45d9f3b)
  hash ^= hash >>> 16
  return Math.abs(hash)
}

// Respects an explicitly customized color_hex; falls back to a deterministic
// hash-pick from COURSE_COLORS by course_code when the color is missing or
// still the bland default, so different courses stay visually distinct.
export function getDistinctCourseColor(courseCode, colorHex) {
  if (colorHex && colorHex !== DEFAULT_COURSE_COLOR) return colorHex
  if (!courseCode) return colorHex || DEFAULT_COURSE_COLOR
  const index = hashString(courseCode) % COURSE_COLORS.length
  return COURSE_COLORS[index].hex
}
