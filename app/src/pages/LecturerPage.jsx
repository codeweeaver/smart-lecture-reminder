import { motion } from 'motion/react'
import LecturerDashboard from '../components/lecturer/LecturerDashboard.jsx'

export default function LecturerPage() {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <LecturerDashboard />
    </motion.div>
  )
}
