import { FiBell, FiAlertCircle, FiRefreshCw, FiVideo, FiMic, FiClock } from 'react-icons/fi'
import { formatRelative } from '../../utils/formatters.js'

const TYPE_ICONS = {
  reminder:       { icon: FiClock,       color: 'text-noun-600 dark:text-noun-400',     bg: 'bg-noun-50 dark:bg-noun-500/10' },
  cancellation:   { icon: FiAlertCircle, color: 'text-red-600 dark:text-red-400',        bg: 'bg-red-50 dark:bg-red-500/10' },
  reschedule:     { icon: FiRefreshCw,   color: 'text-orange-600 dark:text-orange-400',  bg: 'bg-orange-50 dark:bg-orange-500/10' },
  recording_added:{ icon: FiVideo,       color: 'text-blue-600 dark:text-blue-400',      bg: 'bg-blue-50 dark:bg-blue-500/10' },
  announcement:   { icon: FiMic,         color: 'text-yellow-600 dark:text-yellow-400',  bg: 'bg-yellow-50 dark:bg-yellow-500/10' },
  tma_deadline:   { icon: FiBell,        color: 'text-gold-600 dark:text-gold-400',      bg: 'bg-yellow-50 dark:bg-yellow-500/10' },
}

export default function NotificationItem({ notification, onRead }) {
  const config = TYPE_ICONS[notification.type] || { icon: FiBell, color: 'text-gray-600', bg: 'bg-gray-50' }
  const Icon = config.icon

  return (
    <div
      onClick={() => onRead(notification.id)}
      className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60 transition border-b border-gray-50 dark:border-gray-800 ${!notification.read ? 'border-l-2 border-l-noun-400' : ''}`}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${config.bg} dark:bg-opacity-10`}>
        <Icon size={14} className={config.color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${notification.read ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100 font-medium'}`}>{notification.message}</p>
        <p className="text-xs text-gray-400 mt-0.5">{formatRelative(notification.created_at)}</p>
      </div>
      {!notification.read && <div className="w-2 h-2 bg-noun-500 rounded-full mt-1.5 shrink-0" />}
    </div>
  )
}
