import { motion } from 'motion/react'
import UserManagement from '../components/admin/UserManagement.jsx'

export default function AdminUsersPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="max-w-5xl p-4 mx-auto"
    >
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-display">Users</h1>
        <p className="text-sm text-gray-500">Manage students, lecturers, and pending approvals</p>
      </div>
      <UserManagement />
    </motion.div>
  )
}
