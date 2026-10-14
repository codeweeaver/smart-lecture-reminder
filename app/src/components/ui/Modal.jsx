import { useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { FiX } from 'react-icons/fi'

export function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  const maxWidths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className={`fixed inset-x-4 top-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl z-50 ${maxWidths[size]} mx-auto max-h-[90vh] overflow-y-auto no-scrollbar`}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">{title}</h2>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                <FiX size={16} />
              </button>
            </div>
            <div className="p-5">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
