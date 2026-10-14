import { motion } from 'motion/react'
import { FiFileText } from 'react-icons/fi'

export default function TMABlock({ tma, onClick, compact = false }) {
  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={() => onClick?.(tma)}
      className="rounded-lg px-2 py-1 cursor-pointer select-none overflow-hidden bg-yellow-50 dark:bg-yellow-950/30"
      style={{ borderLeft: '3px solid #e8b824' }}
    >
      <div className="flex items-center gap-1">
        <FiFileText size={10} className="text-yellow-600 dark:text-yellow-400 shrink-0" />
        <p className="font-bold text-xs truncate text-yellow-700 dark:text-yellow-400">TMA {tma.tma_number}</p>
      </div>
      {!compact && <p className="text-xs text-yellow-600 dark:text-yellow-500 truncate">Due {new Date(tma.due_date).toLocaleDateString()}</p>}
    </motion.div>
  )
}
