import { useOfflineStatus } from '../../hooks/useOfflineStatus.js'
import { FiWifiOff } from 'react-icons/fi'
import { motion, AnimatePresence } from 'motion/react'

export default function OfflineBanner() {
  const isOffline = useOfflineStatus()
  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
          className="bg-yellow-500 text-white text-center text-xs font-medium py-2 flex items-center justify-center gap-2">
          <FiWifiOff size={12} />
          You're offline  showing cached data
        </motion.div>
      )}
    </AnimatePresence>
  )
}
