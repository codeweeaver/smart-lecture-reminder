import { useState, useEffect, useMemo } from 'react'
import { Modal } from '../ui/Modal.jsx'
import { Button } from '../ui/Button.jsx'
import { Checkbox } from '../ui/Checkbox.jsx'
import { Select } from '../ui/Select.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useSettings } from '../../contexts/SettingsContext.jsx'
import { supabase, fetchAllRows } from '../../services/supabase.js'
import { enrollInCourses } from '../../services/enrollments.service.js'
import { useToast } from '../ui/Toast.jsx'
import { Skeleton } from '../ui/Skeleton.jsx'
import { FiSearch } from 'react-icons/fi'

export default function CourseEnrollModal({ isOpen, onClose, onEnrolled }) {
  const { user, profile } = useAuth()
  const { activeSession, activeSemester } = useSettings()
  const toast = useToast()
  const [courses, setCourses] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [search, setSearch] = useState('')
  const [progFilter, setProgFilter] = useState('')
  const [levelFilter, setLevelFilter] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setSearch(''); setProgFilter(profile?.programme || ''); setLevelFilter(profile?.level ? String(profile.level) : '')
    setLoading(true)
    fetchAllRows(() => supabase.from('courses').select('*').order('course_code'))
      .then(data => { setCourses(data || []); setLoading(false) })
  }, [isOpen, activeSession])

  const programmes = useMemo(
    () => [...new Set(courses.map(c => c.programme).filter(Boolean))].sort(),
    [courses]
  )
  const levels = useMemo(
    () => [...new Set(courses.map(c => c.level).filter(Boolean))].sort((a, b) => a - b),
    [courses]
  )

  const visibleCourses = useMemo(() => {
    const q = search.toLowerCase()
    return courses.filter(c => {
      const matchText = !q || c.course_code.toLowerCase().includes(q) || c.course_title.toLowerCase().includes(q)
      const matchProg  = !progFilter || c.programme === progFilter
      const matchLevel = !levelFilter || String(c.level) === levelFilter
      return matchText && matchProg && matchLevel
    })
  }, [courses, search, progFilter, levelFilter])

  function toggle(id) {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  async function handleSave() {
    if (!user || selected.size === 0) return
    setSaving(true)
    try {
      await enrollInCourses(user.id, [...selected], activeSession, activeSemester)
      toast(`Enrolled in ${selected.size} course(s)!`, 'success')
      onEnrolled?.()
      onClose()
    } catch (err) {
      toast(err.message || 'Enrollment failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Enroll in Courses">
      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : (
        <>
          {/* Filter bar */}
          <div className="flex flex-col gap-2 mb-3">
            <div className="relative">
              <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search courses…"
                className="w-full pl-8 pr-3 h-9 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-noun-500 focus:border-transparent bg-white"
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={progFilter}
                onChange={e => setProgFilter(e.target.value)}
                className="flex-1 h-9 text-xs"
              >
                <option value="">All Programmes</option>
                {programmes.map(p => <option key={p} value={p}>{p}</option>)}
              </Select>
              <Select
                value={levelFilter}
                onChange={e => setLevelFilter(e.target.value)}
                className="flex-1 h-9 text-xs"
              >
                <option value="">All Levels</option>
                {levels.map(l => <option key={l} value={String(l)}>Level {l}</option>)}
              </Select>
            </div>
            <p className="text-xs text-gray-400">
              Showing {visibleCourses.length} of {courses.length} courses
            </p>
          </div>

          <div className="max-h-52 overflow-y-auto space-y-1 no-scrollbar mb-4">
            {visibleCourses.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No courses match your filters</p>
            ) : visibleCourses.map(c => (
              <label key={c.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 cursor-pointer">
                <Checkbox checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                <div>
                  <p className="font-medium text-sm text-gray-900">{c.course_code}</p>
                  <p className="text-xs text-gray-500">{c.course_title}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-3 mt-4 flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} loading={saving} disabled={selected.size === 0}>
              Enroll ({selected.size})
            </Button>
          </div>
        </>
      )}
    </Modal>
  )
}
