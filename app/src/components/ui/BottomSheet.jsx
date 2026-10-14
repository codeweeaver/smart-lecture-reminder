import { motion, AnimatePresence } from 'motion/react'

export function BottomSheet({ isOpen, onClose, children, title }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 inset-x-0 bg-white rounded-t-2xl shadow-2xl z-50 max-h-[90vh] overflow-y-auto no-scrollbar"
          >
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 mb-2" />
            {title && <div className="px-4 pb-3 font-semibold text-gray-900 border-b border-gray-100">{title}</div>}
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
