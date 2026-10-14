import { useState } from 'react'
import { useNotifications } from '../../contexts/NotificationContext.jsx'
import { AnimatePresence, motion } from 'motion/react'
import { FiX, FiCheck, FiBell } from 'react-icons/fi'
import NotificationItem from './NotificationItem.jsx'
import { format } from 'date-fns'

function groupByDate(notifications) {
  const groups = {}
  for (const n of notifications) {
    const key = format(new Date(n.created_at), 'MMM d, yyyy')
    if (!groups[key]) groups[key] = []
    groups[key].push(n)
  }
  return groups
}

const CHIPS = [
  { id: 'all',           label: 'All' },
  { id: 'reminders',     label: 'Reminders' },
  { id: 'alerts',        label: 'Alerts' },
  { id: 'announcements', label: 'Announcements' },
  { id: 'tma',           label: 'TMA' },
]

const TYPE_MAP = {
  reminders:     n => n.type === 'reminder',
  alerts:        n => n.type === 'cancellation' || n.type === 'reschedule',
  announcements: n => n.type === 'announcement' || n.type === 'recording_added',
  tma:           n => n.type === 'tma_deadline',
}

export default function NotificationPanel() {
  const { notifications, isPanelOpen, setIsPanelOpen, markRead, markAllRead } = useNotifications()
  const [typeFilter, setTypeFilter] = useState('all')

  const visible = typeFilter === 'all' ? notifications : notifications.filter(TYPE_MAP[typeFilter])
  const groups = groupByDate(visible)

  return (
    <AnimatePresence>
      {isPanelOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-40" onClick={() => setIsPanelOpen(false)} />
          <motion.div
            initial={{ opacity: 0, x: 320 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 320 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Notifications</h2>
              <div className="flex items-center gap-2">
                <button onClick={markAllRead} className="text-xs text-noun-600 dark:text-noun-400 flex items-center gap-1 hover:underline">
                  <FiCheck size={12} /> Mark all read
                </button>
                <button onClick={() => setIsPanelOpen(false)} aria-label="Close notifications" className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400">
                  <FiX size={18} />
                </button>
              </div>
            </div>

            {/* Type filter chips */}
            <div className="flex gap-1.5 px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 overflow-x-auto no-scrollbar">
              {CHIPS.map(chip => (
                <button
                  key={chip.id}
                  onClick={() => setTypeFilter(chip.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    typeFilter === chip.id
                      ? 'bg-noun-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto no-scrollbar">
              {visible.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <div className="w-14 h-14 rounded-full bg-noun-50 dark:bg-noun-950/40 flex items-center justify-center mb-3">
                    <FiBell size={22} className="text-noun-400" />
                  </div>
                  <p className="font-medium text-gray-700 dark:text-gray-300">
                    {typeFilter === 'all' ? 'No notifications yet' : `No ${CHIPS.find(c => c.id === typeFilter)?.label.toLowerCase()}`}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                    {typeFilter === 'all' ? 'Push notifications will appear here' : 'Try a different filter'}
                  </p>
                </div>
              ) : (
                Object.entries(groups).map(([date, items]) => (
                  <div key={date}>
                    <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase bg-gray-50 dark:bg-gray-800/60">{date}</p>
                    {items.map(n => <NotificationItem key={n.id} notification={n} onRead={markRead} />)}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
