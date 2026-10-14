import { usePWAUpdate } from '../../hooks/usePWAUpdate.js'
import { FiRefreshCw } from 'react-icons/fi'
import { AnimatePresence, motion } from 'motion/react'

export default function UpdateBanner() {
  const { needUpdate, update } = usePWAUpdate()
  return (
    <AnimatePresence>
      {needUpdate && (
        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
          className="bg-noun-600 text-white text-sm text-center py-2 flex items-center justify-center gap-3">
          <span>A new version is available</span>
          <button onClick={update} className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-xs font-medium transition">
            <FiRefreshCw size={12} /> Update now
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
