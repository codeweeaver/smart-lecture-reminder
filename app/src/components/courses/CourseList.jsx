import { useMemo } from 'react'
import { motion } from 'motion/react'
import { useEnrolledCourses } from '../../hooks/useEnrolledCourses.js'
import CourseCard from './CourseCard.jsx'
import { SkeletonCard } from '../ui/Skeleton.jsx'
import { EmptyState } from '../ui/EmptyState.jsx'
import { FiBookOpen } from 'react-icons/fi'

export default function CourseList({ onEnrollClick, search = '' }) {
  const { enrollments, loading, refresh } = useEnrolledCourses()

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return enrollments
    return enrollments.filter(e =>
      e.course_code?.toLowerCase().includes(q) ||
      e.course?.course_title?.toLowerCase().includes(q)
    )
  }, [enrollments, search])

  if (loading) return (
    <div className="grid gap-3 sm:grid-cols-2">
      {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
    </div>
  )

  if (enrollments.length === 0) return (
    <EmptyState
      icon={FiBookOpen}
      title="No courses enrolled"
      description="Upload your course registration slip to enroll in your courses."
      action={onEnrollClick && (
        <button onClick={onEnrollClick} className="bg-noun-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-noun-600 transition">
          Enroll in Courses
        </button>
      )}
    />
  )

  if (filtered.length === 0) return (
    <p className="text-sm text-gray-400 text-center py-10">No courses match your search</p>
  )

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {filtered.map((enrollment, i) => (
        <motion.div
          key={enrollment.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <CourseCard enrollment={enrollment} onUnenroll={refresh} />
        </motion.div>
      ))}
    </div>
  )
}
