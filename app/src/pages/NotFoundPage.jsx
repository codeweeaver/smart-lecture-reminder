import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../constants/routes.js'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-4 text-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="flex flex-col items-center"
      >
        <p className="text-7xl mb-4">🔍</p>
        <h1 className="font-display font-bold text-2xl text-gray-900 mb-2">Page not found</h1>
        <p className="text-gray-500 text-sm mb-6">The page you're looking for doesn't exist.</p>
        <Link to={ROUTES.HOME} className="bg-noun-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-noun-600 transition">
          Back to Dashboard
        </Link>
      </motion.div>
    </div>
  )
}
