import { useState, useEffect, useRef, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useSettings } from '../contexts/SettingsContext.jsx'
import { useLectures } from '../contexts/LecturesContext.jsx'
import { supabase } from '../services/supabase.js'
import { ROUTES } from '../constants/routes.js'
import { formatTime, formatDate } from '../utils/formatters.js'

const CAP_PER_CATEGORY = 5
const DEBOUNCE_MS = 200
const SECTION_ORDER = ['lecture', 'tma', 'course', 'user']
const SECTION_LABELS = { lecture: 'Lectures', tma: 'TMA Deadlines', course: 'Courses', user: 'Users' }

export function useGlobalSearch(isOpen) {
  const { user, profile } = useAuth()
  const { activeSession } = useSettings()
  const { lectures, tmaDeadlines } = useLectures()
  const role = profile?.role

  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)

  const [courses, setCourses] = useState([])
  const [users, setUsers] = useState([])
  const [loadingExtras, setLoadingExtras] = useState(false)
  const hasFetchedExtras = useRef(false)

  // Debounce the typed query before recomputing matches.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [query])

  // Reset on close so reopening starts fresh.
  useEffect(() => {
    if (!isOpen) { setQuery(''); setActiveIndex(-1) }
  }, [isOpen])

  // Reset the roving highlight whenever the matched set changes.
  useEffect(() => { setActiveIndex(-1) }, [debouncedQuery])

  // Lazy fetch — fires once per session, only for roles that have a course/user entity.
  useEffect(() => {
    if (!isOpen || hasFetchedExtras.current || !role) return
    hasFetchedExtras.current = true

    async function loadExtras() {
      setLoadingExtras(true)
      try {
        if (role === 'admin') {
          const [{ data: courseRows }, { data: userRows }] = await Promise.all([
            supabase.from('courses')
              .select('id, course_code, course_title, level, programme')
              .order('course_code'),
            supabase.from('users')
              .select('id, full_name, email, role, status, matric_number')
              .order('full_name'),
          ])
          setCourses(courseRows || [])
          setUsers(userRows || [])
        } else if (role === 'student') {
          const { data: enrollments } = await supabase.from('enrollments')
            .select('course:courses(id, course_code, course_title, level, programme)')
            .eq('user_id', user.id)
            .eq('academic_session', activeSession)
            .eq('expired', false)
          setCourses((enrollments || []).map(e => e.course).filter(Boolean))
        }
        // lecturer: no course-catalog entity to search — skip entirely
      } finally {
        setLoadingExtras(false)
      }
    }
    loadExtras()
  }, [isOpen, role, user?.id, activeSession])

  const roleCoursesRoute = role === 'admin' ? ROUTES.ADMIN_COURSES : ROUTES.COURSES

  const groups = useMemo(() => {
    if (!debouncedQuery) return { lecture: [], tma: [], course: [], user: [] }
    const q = debouncedQuery.toLowerCase()

    const lecture = lectures.filter(l =>
      l.course_code?.toLowerCase().includes(q) ||
      l.course_title?.toLowerCase().includes(q) ||
      l.facilitator_name?.toLowerCase().includes(q) ||
      l.announcement?.toLowerCase().includes(q)
    ).map(l => ({
      _type: 'lecture', id: l.id, primary: l.course_code, secondary: l.course_title,
      meta: `${formatTime(l.start_time)} · ${l.facilitator_name}`, colorHex: l.color_hex,
      to: ROUTES.CALENDAR, state: { openLectureId: l.id },
    }))

    const tma = tmaDeadlines.filter(t => {
      const label = `tma ${t.tma_number}`.toLowerCase()
      const dateLabel = formatDate(t.due_date, 'MMM d, yyyy').toLowerCase()
      return label.includes(q) || dateLabel.includes(q)
    }).map(t => ({
      _type: 'tma', id: t.id, primary: `TMA ${t.tma_number}`,
      secondary: `Due ${formatDate(t.due_date, 'EEE, MMM d')}`, meta: formatTime(t.due_date),
      to: ROUTES.CALENDAR, state: { openTMAId: t.id },
    }))

    const course = role === 'lecturer' ? [] : courses.filter(c =>
      c.course_code?.toLowerCase().includes(q) || c.course_title?.toLowerCase().includes(q)
    ).map(c => ({
      _type: 'course', id: c.id, primary: c.course_code, secondary: c.course_title,
      meta: [c.programme, c.level ? `L${c.level}` : null].filter(Boolean).join(' · '),
      to: roleCoursesRoute, state: { query: c.course_code },
    }))

    const user = role === 'admin' ? users.filter(u =>
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.matric_number?.toLowerCase().includes(q)
    ).map(u => ({
      _type: 'user', id: u.id, primary: u.full_name, secondary: u.email,
      meta: u.role === 'lecturer' ? 'Lecturer' : 'Student',
      to: ROUTES.ADMIN_USERS,
      state: { role: u.role === 'student' ? 'Students' : 'Lecturers', query: u.full_name },
    })) : []

    return { lecture, tma, course, user }
  }, [debouncedQuery, lectures, tmaDeadlines, courses, users, role, roleCoursesRoute])

  const cappedGroups = useMemo(() => ({
    lecture: groups.lecture.slice(0, CAP_PER_CATEGORY),
    tma: groups.tma.slice(0, CAP_PER_CATEGORY),
    course: groups.course.slice(0, CAP_PER_CATEGORY),
    user: groups.user.slice(0, CAP_PER_CATEGORY),
  }), [groups])

  const totalCounts = {
    lecture: groups.lecture.length, tma: groups.tma.length,
    course: groups.course.length, user: groups.user.length,
  }

  const flatResults = useMemo(
    () => SECTION_ORDER.flatMap(k => cappedGroups[k]),
    [cappedGroups]
  )

  function moveActiveIndex(delta) {
    setActiveIndex(prev => {
      if (flatResults.length === 0) return -1
      return (prev + delta + flatResults.length) % flatResults.length
    })
  }

  const availableCategories = SECTION_ORDER
    .filter(k => !(k === 'course' && role === 'lecturer') && !(k === 'user' && role !== 'admin'))
    .map(k => SECTION_LABELS[k].toLowerCase())
  const placeholder = `Search ${availableCategories.join(', ')}…`

  return {
    query, setQuery, placeholder,
    hasQuery: debouncedQuery.length > 0,
    loadingExtras,
    groups: cappedGroups, totalCounts, sectionOrder: SECTION_ORDER, sectionLabels: SECTION_LABELS,
    flatResults, hasAnyResults: flatResults.length > 0,
    activeIndex, setActiveIndex, moveActiveIndex,
  }
}
