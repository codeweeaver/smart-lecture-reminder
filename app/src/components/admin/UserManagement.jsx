import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase, fetchAllRows } from '../../services/supabase.js'
import { useSettings } from '../../contexts/SettingsContext.jsx'
import { Button } from '../ui/Button.jsx'
import { Badge } from '../ui/Badge.jsx'
import { CollapsibleSearch } from '../ui/CollapsibleSearch.jsx'
import { Select } from '../ui/Select.jsx'
import { Skeleton } from '../ui/Skeleton.jsx'
import { Modal } from '../ui/Modal.jsx'
import { Checkbox } from '../ui/Checkbox.jsx'
import { useToast } from '../ui/Toast.jsx'
import LecturerEditModal from './LecturerEditModal.jsx'
import BulkLecturerImportModal from './BulkLecturerImportModal.jsx'
import { FiUser, FiUpload, FiEdit2 } from 'react-icons/fi'

export default function UserManagement() {
  const toast = useToast()
  const { activeSession } = useSettings()
  const location = useLocation()
  const navigate = useNavigate()
  const [tab, setTab] = useState('Students')
  const [students, setStudents] = useState([])
  const [lecturers, setLecturers] = useState([])
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [programmeFilter, setProgrammeFilter] = useState('all')
  const [levelFilter, setLevelFilter] = useState('all')
  const [editLecturer, setEditLecturer] = useState(null)
  const [showImport, setShowImport] = useState(false)

  // Pending approval state
  const [approvingLecturer, setApprovingLecturer] = useState(null)
  const [courses, setCourses] = useState([])
  const [assignedCourses, setAssignedCourses] = useState(new Set())
  const [approving, setApproving] = useState(false)

  async function load() {
    setLoading(true)
    // Only the columns this page actually renders/filters on — with 885+
    // lecturers, select('*') was pulling every column (including the
    // push_subscriptions/notification_preferences jsonb blobs nothing here
    // reads) for every row, taking 15+ seconds just to leave the loading state.
    const { data } = await supabase
      .from('users')
      .select('id, email, full_name, role, status, matric_number, programme, level, faculty, department')
      .order('full_name')
    const all = data || []
    setStudents(all.filter(u => u.role === 'student'))
    setLecturers(all.filter(u => u.role === 'lecturer' && u.status !== 'pending'))
    setPending(all.filter(u => u.role === 'lecturer' && u.status === 'pending'))
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  // Deep-link from global search: preset the role tab + name filter
  useEffect(() => {
    const { role, query } = location.state || {}
    if (!role && !query) return
    if (role) setTab(role)
    if (query) setSearch(query)
    navigate(location.pathname, { replace: true, state: {} })
  }, [location.state, navigate, location.pathname])

  async function setStatus(userId, status, isStudent) {
    try {
      await supabase.from('users').update({ status }).eq('id', userId)
      if (isStudent) {
        setStudents(prev => prev.map(u => u.id === userId ? { ...u, status } : u))
      } else {
        setLecturers(prev => prev.map(u => u.id === userId ? { ...u, status } : u))
      }
      toast('Status updated', 'success')
    } catch { toast('Failed to update', 'error') }
  }

  async function openApprove(lecturer) {
    setApprovingLecturer(lecturer)
    const data = await fetchAllRows(() => supabase.from('courses').select('*').order('course_code'))
    setCourses(data || [])
    const { data: existing } = await supabase.from('lecturer_courses').select('course_id')
      .eq('lecturer_id', lecturer.id)
    setAssignedCourses(new Set((existing || []).map(e => e.course_id)))
  }

  function toggleCourse(id) {
    setAssignedCourses(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  async function handleApprove() {
    if (!approvingLecturer) return
    setApproving(true)
    try {
      await supabase.from('users').update({ status: 'active' }).eq('id', approvingLecturer.id)
      const rows = [...assignedCourses].map(cid => ({
        lecturer_id: approvingLecturer.id,
        course_id: cid,
        academic_session: activeSession,
      }))
      if (rows.length > 0) {
        await supabase.from('lecturer_courses').upsert(rows, { onConflict: 'lecturer_id,course_id,academic_session' })
      }
      toast(`${approvingLecturer.full_name} approved!`, 'success')
      setApprovingLecturer(null)
      load()
    } catch (err) { toast(err.message, 'error') }
    finally { setApproving(false) }
  }

  const statusColors = { active: 'green', pending: 'orange', suspended: 'red' }

  const programmeOptions = [...new Set(students.map(u => u.programme).filter(Boolean))].sort()

  const filteredStudents = students.filter(u => {
    const q = search.toLowerCase()
    const matchText = !q || u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    const matchStatus = statusFilter === 'all' || u.status === statusFilter
    const matchProgramme = programmeFilter === 'all' || u.programme === programmeFilter
    const matchLevel = levelFilter === 'all' || String(u.level) === levelFilter
    return matchText && matchStatus && matchProgramme && matchLevel
  })
  const filteredLecturers = lecturers.filter(u => {
    const q = search.toLowerCase()
    const matchText = !q || u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    const matchStatus = statusFilter === 'all' || u.status === statusFilter
    return matchText && matchStatus
  })

  if (loading) return <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="w-32 shrink-0">
          <Select
            size="sm"
            value={tab}
            onChange={e => {
              const t = e.target.value
              setTab(t); setSearch(''); setStatusFilter('all'); setProgrammeFilter('all'); setLevelFilter('all')
            }}
          >
            <option value="Students">Students</option>
            <option value="Lecturers">Lecturers</option>
          </Select>
        </div>

        <div className="w-32 shrink-0">
          <Select size="sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            {Object.keys(statusColors).map(s => (
              <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
            ))}
          </Select>
        </div>
        {tab === 'Students' && (
          <>
            <div className="w-40 shrink-0">
              <Select size="sm" value={programmeFilter} onChange={e => setProgrammeFilter(e.target.value)}>
                <option value="all">All programmes</option>
                {programmeOptions.map(p => <option key={p} value={p}>{p}</option>)}
              </Select>
            </div>
            <div className="w-28 shrink-0">
              <Select size="sm" value={levelFilter} onChange={e => setLevelFilter(e.target.value)}>
                <option value="all">All levels</option>
                {[100, 200, 300, 400].map(lvl => (
                  <option key={lvl} value={String(lvl)}>{lvl} Level</option>
                ))}
              </Select>
            </div>
          </>
        )}
        {/* Search */}
        <CollapsibleSearch
          size="sm"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Search ${tab.toLowerCase()}…`}
          ariaLabel={`Search ${tab.toLowerCase()}`}
        />

        {tab === 'Lecturers' && (
          <Button size="sm" variant="outline" className="ml-auto" onClick={() => setShowImport(true)}>
            <FiUpload size={13} className="mr-1.5" />Import Lecturers
          </Button>
        )}
      </div>

      {/* === STUDENTS TAB === */}
      {tab === 'Students' && (
        <div className="space-y-2">
          {filteredStudents.length === 0 ? (
            <p className="py-6 text-sm text-center text-gray-400">
              {students.length === 0 ? 'No students yet.' : 'No students match your filters.'}
            </p>
          ) : filteredStudents.map(u => (
            <div key={u.id} className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-noun-100 shrink-0">
                <span className="text-xs font-bold text-noun-700">{u.full_name?.[0]?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{u.full_name}</p>
                <p className="text-xs text-gray-400">{u.matric_number || u.email} · {u.programme} {u.level ? `L${u.level}` : ''}</p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Badge color={statusColors[u.status] || 'gray'}>{u.status}</Badge>
                {u.status === 'active' && (
                  <Button size="sm" variant="danger" onClick={() => setStatus(u.id, 'suspended', true)}>Suspend</Button>
                )}
                {u.status === 'suspended' && (
                  <Button size="sm" variant="secondary" onClick={() => setStatus(u.id, 'active', true)}>Restore</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* === LECTURERS TAB === */}
      {tab === 'Lecturers' && (
        <div>
          {/* Pending section */}
          {pending.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-xs font-semibold tracking-wide text-orange-600 uppercase">
                Pending Approval ({pending.length})
              </p>
              <div className="space-y-2">
                {pending.map(u => (
                  <div key={u.id} className="flex items-center gap-3 p-3 border border-orange-200 bg-orange-50 rounded-xl">
                    <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-full shrink-0">
                      <FiUser className="text-orange-500" size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{u.full_name}</p>
                      <p className="text-xs text-gray-500">{u.email} · {u.department || u.faculty || 'No department'}</p>
                    </div>
                    <Badge color="orange">pending</Badge>
                    <Button size="sm" onClick={() => openApprove(u)}>Approve</Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active / suspended lecturers */}
          {filteredLecturers.length === 0 ? (
            <p className="py-6 text-sm text-center text-gray-400">
              {lecturers.length === 0 ? 'No lecturers yet.' : 'No lecturers match your filters.'}
            </p>
          ) : (
            <div className="space-y-2">
              {filteredLecturers.map(u => (
                <div key={u.id} className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-noun-100 shrink-0">
                    <span className="text-xs font-bold text-noun-700">{u.full_name?.[0]?.toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{u.full_name}</p>
                    <p className="text-xs text-gray-400">{u.email} · {u.faculty || ''}{u.department ? ` / ${u.department}` : ''}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Badge color={statusColors[u.status] || 'gray'}>{u.status}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => setEditLecturer(u)}>
                      <FiEdit2 size={12} className="mr-1" />Edit
                    </Button>
                    {u.status === 'active' && (
                      <Button size="sm" variant="danger" onClick={() => setStatus(u.id, 'suspended', false)}>Suspend</Button>
                    )}
                    {u.status === 'suspended' && (
                      <Button size="sm" variant="secondary" onClick={() => setStatus(u.id, 'active', false)}>Restore</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Approve modal */}
      <Modal isOpen={!!approvingLecturer} onClose={() => setApprovingLecturer(null)}
        title={`Approve ${approvingLecturer?.full_name}`}>
        <p className="mb-3 text-sm text-gray-500">
          Assign courses for <strong>{activeSession}</strong> session:
        </p>
        <div className="mb-4 space-y-1 overflow-y-auto max-h-60">
          {courses.length === 0 ? (
            <p className="py-2 text-sm text-gray-400">No courses found for the active session.</p>
          ) : courses.map(c => (
            <div key={c.id} className="px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
              <Checkbox
                label={`${c.course_code}  ${c.course_title}`}
                checked={assignedCourses.has(c.id)}
                onChange={() => toggleCourse(c.id)}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
          <Button variant="ghost" onClick={() => setApprovingLecturer(null)}>Cancel</Button>
          <Button onClick={handleApprove} loading={approving}>Approve &amp; Assign</Button>
        </div>
      </Modal>

      {/* Edit lecturer modal */}
      {editLecturer && (
        <LecturerEditModal
          lecturer={editLecturer}
          isOpen={!!editLecturer}
          onClose={() => setEditLecturer(null)}
          onSaved={() => { setEditLecturer(null); load() }}
        />
      )}

      {/* Bulk import modal */}
      <BulkLecturerImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onImported={() => { setShowImport(false); load() }}
      />
    </div>
  )
}
