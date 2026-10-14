import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { FiCheck, FiX, FiAlertCircle, FiInfo } from 'react-icons/fi'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
  }, [])

  const icons = { success: FiCheck, error: FiX, warning: FiAlertCircle, info: FiInfo }
  const colors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error:   'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info:    'bg-blue-50 border-blue-200 text-blue-800',
  }

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
        <AnimatePresence>
          {toasts.map(t => {
            const Icon = icons[t.type] ?? FiInfo
            return (
              <motion.div key={t.id}
                initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-md text-sm font-medium ${colors[t.type] ?? colors.info}`}
              >
                <Icon size={16} className="shrink-0" />
                <span>{t.message}</span>
                <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} className="ml-auto p-0.5 rounded hover:opacity-70">
                  <FiX size={14} />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx.toast
}
