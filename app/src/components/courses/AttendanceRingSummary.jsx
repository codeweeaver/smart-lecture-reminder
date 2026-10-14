import { useMemo } from 'react'
import { useLectures } from '../../contexts/LecturesContext.jsx'
import { useAttendance } from '../../hooks/useAttendance.js'
import { useEnrolledCourses } from '../../hooks/useEnrolledCourses.js'
import { ProgressRing } from '../ui/ProgressRing.jsx'

// Aggregate attendance ring across all enrolled courses. Uses the same
// "total = all lectures for the course" definition CourseCard's per-course
// AttendanceSummary already uses — no new attendance semantics invented.
export default function AttendanceRingSummary() {
  const { enrollments } = useEnrolledCourses()
  const { lectures } = useLectures()
  const { attendance } = useAttendance()

  const { attended, total } = useMemo(() => {
    const courseIds = new Set(enrollments.map((e) => e.course_id))
    const total = lectures.filter((l) => courseIds.has(l.course_id)).length
    const attended = attendance.filter((a) => a.status === 'attended' && courseIds.has(a.course_id)).length
    return { attended, total }
  }, [enrollments, lectures, attendance])

  if (total === 0) return null

  const pct = Math.round((attended / total) * 100)

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 flex items-center gap-4">
      <ProgressRing value={pct} size={84} strokeWidth={9} />
      <div>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Overall Attendance</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {attended} attended out of {total} lecture{total !== 1 ? 's' : ''} across {enrollments.length} course
          {enrollments.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  )
}
