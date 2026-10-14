import { useLectures } from '../../contexts/LecturesContext.jsx'
import { useAttendance } from '../../hooks/useAttendance.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useState, useMemo } from 'react'
import { Card } from '../ui/Card.jsx'
import { Button } from '../ui/Button.jsx'
import AttendanceSummary from './AttendanceSummary.jsx'
import { unenrollFromCourse } from '../../services/enrollments.service.js'
import { useToast } from '../ui/Toast.jsx'
import { FiBookOpen, FiUsers, FiTrash2 } from 'react-icons/fi'

export default function CourseCard({ enrollment, onUnenroll }) {
  const { lectures } = useLectures()
  const { getForCourse } = useAttendance()
  const { user } = useAuth()
  const toast = useToast()
  const [confirming, setConfirming] = useState(false)
  const [removing, setRemoving] = useState(false)

  const course = enrollment.course
  const color = enrollment.custom_color || course?.color_hex || '#1a9a5c'

  const courseLectures = useMemo(() =>
    lectures.filter(l => l.course_id === course?.id),
    [lectures, course]
  )
  const attendance = getForCourse(course?.id)

  async function handleUnenroll() {
    setRemoving(true)
    try {
      await unenrollFromCourse(user.id, enrollment.course_id, enrollment.academic_session)
      toast(`Removed ${course?.course_code} from your courses`, 'success')
      onUnenroll?.()
    } catch (err) {
      toast(err.message || 'Failed to remove course', 'error')
      setRemoving(false)
      setConfirming(false)
    }
  }

  return (
    <Card className="p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: color + '20' }}>
          <FiBookOpen style={{ color }} size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-gray-900 dark:text-gray-100">{course?.course_code}</p>
          <p className="text-xs text-gray-500 truncate">{course?.course_title}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full font-medium">
            {course?.credit_units} CU
          </span>
          {!confirming && (
            <button
              onClick={() => setConfirming(true)}
              className="p-1 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              title="Remove course"
            >
              <FiTrash2 size={13} />
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
        <span className="flex items-center gap-1"><FiUsers size={11} /> {courseLectures.length} lectures</span>
        <span>Level {course?.level}</span>
      </div>
      <AttendanceSummary attendance={attendance} total={courseLectures.length} />
      {confirming && (
        <div className="mt-3 border-t border-gray-100 dark:border-gray-800 pt-3 flex items-center justify-between gap-2">
          <p className="text-xs text-gray-500">Remove from your courses?</p>
          <div className="flex gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>Cancel</Button>
            <Button variant="danger" size="sm" loading={removing} onClick={handleUnenroll}>Remove</Button>
          </div>
        </div>
      )}
    </Card>
  )
}
