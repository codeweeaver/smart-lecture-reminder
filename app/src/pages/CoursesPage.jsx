import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import AttendanceRingSummary from '../components/courses/AttendanceRingSummary.jsx'
import CourseList from '../components/courses/CourseList.jsx'
import CourseEnrollModal from '../components/courses/CourseEnrollModal.jsx'
import NotificationPanel from '../components/notifications/NotificationPanel.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'
import { FiPlusCircle, FiSearch } from 'react-icons/fi'

export default function CoursesPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [showEnroll, setShowEnroll] = useState(false)
  const [search, setSearch] = useState('')
  const [listKey, setListKey] = useState(0)

  // Deep-link from global search: prefill the course filter
  useEffect(() => {
    const q = location.state?.query
    if (!q) return
    setSearch(q)
    navigate(location.pathname, { replace: true, state: {} })
  }, [location.state, navigate, location.pathname])

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="p-4 max-w-2xl mx-auto pb-24 md:pb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-bold text-2xl text-gray-900 dark:text-gray-100">My Courses</h1>
        <Button size="sm" onClick={() => setShowEnroll(true)}>
          <FiPlusCircle size={15} className="mr-1.5" /> Enroll
        </Button>
      </div>

      <AttendanceRingSummary />

      {/* Course search */}
      <div className="relative">
        <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search your courses…"
          className="pl-9"
        />
      </div>

      <CourseList key={listKey} search={search} onEnrollClick={() => setShowEnroll(true)} />

      <CourseEnrollModal isOpen={showEnroll} onClose={() => setShowEnroll(false)} onEnrolled={() => { setShowEnroll(false); setListKey(k => k + 1) }} />
      <NotificationPanel />
    </motion.div>
  )
}
