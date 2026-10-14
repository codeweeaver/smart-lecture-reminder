import { useState, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useSettings } from '../../contexts/SettingsContext.jsx'
import { extractCourseCodesFromSlip } from '../../utils/slipParser.js'
import { supabase, fetchAllRows } from '../../services/supabase.js'
import { enrollInCourses } from '../../services/enrollments.service.js'
import { Button } from '../ui/Button.jsx'
import { Input } from '../ui/Input.jsx'
import { Select } from '../ui/Select.jsx'
import { FiUpload, FiCheck, FiSearch } from 'react-icons/fi'

export default function Step2SlipUpload({ onNext, onSkip }) {
  const { user, profile } = useAuth()
  const { activeSession, activeSemester } = useSettings()
  const [file, setFile] = useState(null)
  const [extractedCodes, setExtractedCodes] = useState([])
  const [allCourses, setAllCourses] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [processing, setProcessing] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [progFilter, setProgFilter] = useState(profile?.programme || '')
  const [levelFilter, setLevelFilter] = useState(profile?.level ? String(profile.level) : '')

  const programmes = useMemo(
    () => [...new Set(allCourses.map(c => c.programme).filter(Boolean))].sort(),
    [allCourses]
  )
  const levels = useMemo(
    () => [...new Set(allCourses.map(c => c.level).filter(Boolean))].sort((a, b) => a - b),
    [allCourses]
  )

  const visibleCourses = useMemo(() => {
    const q = search.toLowerCase()
    return allCourses.filter(c => {
      const matchText = !q || c.course_code.toLowerCase().includes(q) || c.course_title.toLowerCase().includes(q)
      const matchProg  = !progFilter || c.programme === progFilter
      const matchLevel = !levelFilter || String(c.level) === levelFilter
      return matchText && matchProg && matchLevel
    })
  }, [allCourses, search, progFilter, levelFilter])

  async function handleFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f); setProcessing(true); setError('')
    try {
      const codes = await extractCourseCodesFromSlip(f)
      setExtractedCodes(codes)

      const courses = await fetchAllRows(() => supabase.from('courses').select('*'))
      setAllCourses(courses || [])

      const matched = new Set((courses || []).filter(c => codes.includes(c.course_code)).map(c => c.id))
      setSelected(matched)
    } catch {
      setError('Could not read PDF. Please try a different file or select manually below.')
    } finally {
      setProcessing(false)
    }
  }

  function toggle(id) {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  async function handleEnroll() {
    if (selected.size === 0) return
    setEnrolling(true)
    try {
      await enrollInCourses(user.id, [...selected], activeSession, activeSemester)
      await supabase.from('users').update({ onboarding_complete: false }).eq('id', user.id)
      onNext()
    } catch (err) {
      setError(err.message || 'Enrollment failed')
    } finally {
      setEnrolling(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl p-6">
      <h2 className="font-display font-bold text-xl text-gray-900 mb-1">Enroll in Courses</h2>
      <p className="text-gray-500 text-sm mb-4">Upload your course registration slip to auto-enroll</p>

      {!file ? (
        <label className="flex flex-col items-center gap-3 border-2 border-dashed border-gray-300 rounded-xl p-8 cursor-pointer hover:border-noun-400 hover:bg-noun-50 transition mb-4">
          <FiUpload className="text-noun-400" size={28} />
          <div className="text-center">
            <p className="font-medium text-sm text-gray-700">Upload Course Reg Slip</p>
            <p className="text-xs text-gray-400 mt-0.5">PDF file from NOUN portal</p>
          </div>
          <input type="file" accept=".pdf" onChange={handleFile} className="hidden" />
        </label>
      ) : (
        <div className="bg-noun-50 rounded-xl px-4 py-3 flex items-center gap-2 mb-4">
          <FiCheck className="text-noun-600" size={16} />
          <p className="text-sm text-noun-700 font-medium">{file.name}</p>
        </div>
      )}

      {processing && <p className="text-center text-sm text-gray-500 my-4">Extracting course codes…</p>}
      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

      {allCourses.length > 0 && (
        <div className="mb-4">
          {/* Filter bar */}
          <div className="flex flex-col gap-2 mb-2">
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
          </div>

          <p className="text-xs text-gray-400 mb-2">
            {extractedCodes.length > 0
              ? `Found ${extractedCodes.length} code(s) from slip  `
              : 'Select your courses  '}
            Showing {visibleCourses.length} of {allCourses.length}
          </p>

          <div className="max-h-52 overflow-y-auto space-y-1 no-scrollbar">
            {visibleCourses.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No courses match your filters</p>
            ) : visibleCourses.map(c => (
              <label key={c.id} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)}
                  className="w-4 h-4 accent-noun-500" />
                <div>
                  <span className="text-sm font-medium text-gray-900">{c.course_code}</span>
                  <span className="text-xs text-gray-500 ml-2">{c.course_title}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {(allCourses.length > 0 || file) && (
          <Button onClick={handleEnroll} loading={enrolling} disabled={selected.size === 0} className="w-full">
            {`Enroll in ${selected.size} Course(s) →`}
          </Button>
        )}
        <button onClick={onSkip} className="w-full text-sm text-gray-400 hover:text-gray-600 py-2">
          Skip for now
        </button>
      </div>
    </div>
  )
}
