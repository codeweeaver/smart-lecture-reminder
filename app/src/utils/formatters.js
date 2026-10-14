import { formatDistanceToNow, format, differenceInMinutes } from 'date-fns'

export function formatRelative(dateStr) {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
}

export function formatFullDate(dateStr) {
  return format(new Date(dateStr), 'EEEE, MMMM d, yyyy')
}

export function formatTimeRange(start, end) {
  return `${format(new Date(start), 'h:mm a')} – ${format(new Date(end), 'h:mm a')}`
}

export function formatTime(dateStr) {
  return format(new Date(dateStr), 'h:mm a')
}

export function formatDate(dateStr, fmt = 'MMM d, yyyy') {
  return format(new Date(dateStr), fmt)
}

export function formatCountdown(targetDate) {
  const diff = differenceInMinutes(new Date(targetDate), new Date())
  if (diff <= 0) return 'Now'
  if (diff < 60) return `${diff}m`
  const hours = Math.floor(diff / 60)
  const mins = diff % 60
  if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  const days = Math.floor(hours / 24)
  const remHours = hours % 24
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`
}

export function friendlySupabaseError(err) {
  const msg = err?.message ?? ''
  if (msg.includes('Invalid login credentials')) return 'Invalid email or password.'
  if (msg.includes('User already registered')) return 'An account with this email already exists.'
  if (msg.includes('Password should be at least')) return 'Password must be at least 6 characters.'
  if (msg.includes('Unable to validate email address')) return 'Please enter a valid email address.'
  if (msg.includes('Email not confirmed')) return 'Please confirm your email before signing in.'
  return msg || 'Something went wrong. Please try again.'
}
