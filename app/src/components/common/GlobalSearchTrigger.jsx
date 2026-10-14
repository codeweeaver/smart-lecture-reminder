import { motion } from 'motion/react'
import { FiSearch } from 'react-icons/fi'

export default function GlobalSearchTrigger({ onClick }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      type="button"
      onClick={onClick}
      aria-label="Search"
      className="flex items-center justify-center w-11 h-11 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
    >
      <FiSearch size={18} />
    </motion.button>
  )
}
