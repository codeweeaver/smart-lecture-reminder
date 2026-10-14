import { useNotifications } from '../../contexts/NotificationContext.jsx'
import { motion, useReducedMotion } from 'motion/react'
import { FiBell } from 'react-icons/fi'

export default function NotificationBell({ compact = false }) {
  const { unreadCount, setIsPanelOpen } = useNotifications()
  const reduceMotion = useReducedMotion()

  return (
    <motion.button
      onClick={() => setIsPanelOpen(true)}
      aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
      animate={unreadCount > 0 && !reduceMotion ? { rotate: [0, -15, 15, -10, 10, 0] } : {}}
      transition={{ duration: 0.5 }}
      className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition"
    >
      <FiBell size={compact ? 16 : 20} />
      {unreadCount > 0 && (
        <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </motion.button>
  )
}
