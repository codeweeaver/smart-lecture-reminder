import { useState, useEffect } from 'react'
import { subscribeCourses } from '../../services/courses.service.js'
import { CURRENT_SESSION } from '../../constants/reminderIntervals.js'
import useEnrolledCourses from '../../hooks/useEnrolledCourses.js'

export default function Step2Enroll({ onNext }) {
  const [courses, setCourses] = useState([])
  const [filter, setFilter] = useState('')
  const { enroll, unenroll, isEnrolled, enrollments } = useEnrolledCourses()

  useEffect(() => {
    return subscribeCourses(CURRENT_SESSION, setCourses)
  }, [])

  const filtered = courses.filter((c) => {
    const q = filter.toLowerCase()
    return !q || c.courseCode?.toLowerCase().includes(q) || c.courseTitle?.toLowerCase().includes(q)
  })

  return (
    <div className="max-w-md mx-auto px-6 py-8">
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">📚</div>
        <h2 className="font-display font-bold text-2xl text-gray-900">Enroll in Courses</h2>
        <p className="text-gray-500 text-sm mt-1">
          Select the courses you're taking this semester
          {enrollments.length > 0 && ` · ${enrollments.length} selected`}
        </p>
      </div>

      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Search courses…"
        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-noun-300 mb-4"
      />

      {courses.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p className="text-3xl mb-2">📭</p>
          <p className="text-sm">No courses available yet.</p>
          <p className="text-xs mt-1">Ask your admin to add courses first.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto mb-6">
          {filtered.map((course) => {
            const enrolled = isEnrolled(course.id)
            return (
              <button
                key={course.id}
                onClick={() => enrolled ? unenroll(course.id) : enroll(course)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                  enrolled
                    ? 'border-noun-300 bg-noun-50'
                    : 'border-gray-200 bg-white hover:border-noun-200'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  enrolled ? 'border-noun-600 bg-noun-600' : 'border-gray-300'
                }`}>
                  {enrolled && <span className="text-white text-xs">✓</span>}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-gray-900">{course.courseCode}</p>
                  <p className="text-xs text-gray-500 truncate">{course.courseTitle}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <button
        onClick={onNext}
        className="w-full bg-noun-600 hover:bg-noun-700 text-white font-semibold py-3 rounded-xl transition-colors"
      >
        {enrollments.length === 0 ? 'Skip for now' : `Continue with ${enrollments.length} course${enrollments.length > 1 ? 's' : ''} →`}
      </button>
    </div>
  )
}
