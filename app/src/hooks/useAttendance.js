import { useState, useEffect } from 'react'
import { getAttendanceForUser, markAttendance } from '../services/attendance.service.js'
import { useAuth } from '../contexts/AuthContext.jsx'

export function useAttendance() {
  const { user } = useAuth()
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setAttendance([]); setLoading(false); return }
    getAttendanceForUser(user.id).then(data => {
      setAttendance(data || [])
      setLoading(false)
    })
  }, [user])

  function getForLecture(lectureId) {
    return attendance.find(a => a.lecture_id === lectureId) || null
  }

  function getForCourse(courseId) {
    return attendance.filter(a => a.course_id === courseId)
  }

  async function mark(lectureId, courseId, status, note) {
    if (!user) return
    const record = await markAttendance(user.id, lectureId, courseId, status, note)
    setAttendance(prev => {
      const filtered = prev.filter(a => a.lecture_id !== lectureId)
      return [...filtered, record]
    })
  }

  return { attendance, loading, getForLecture, getForCourse, mark }
}
