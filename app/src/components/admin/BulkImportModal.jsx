import { useState } from 'react'
import { Modal } from '../ui/Modal.jsx'
import { Button } from '../ui/Button.jsx'
import { Toggle } from '../ui/Toggle.jsx'
import { parseCSV, CSV_TEMPLATE_HEADERS, CSV_TEMPLATE_EXAMPLE } from '../../utils/csvParser.js'
import { supabase, fetchAllRows } from '../../services/supabase.js'
import { extractMeetingId, extractZoomPassword, buildDeepLink } from '../../utils/zoomHelpers.js'
import { useSettings } from '../../contexts/SettingsContext.jsx'
import { FiUpload, FiDownload, FiCheck, FiX, FiAlertTriangle } from 'react-icons/fi'
import { useToast } from '../ui/Toast.jsx'

const BATCH_SIZE = 500

export default function BulkImportModal({ isOpen, onClose, onImported }) {
  const toast = useToast()
  const { activeSession, activeSemester } = useSettings()
  const [rows, setRows] = useState([])
  const [status, setStatus] = useState('idle')
  const [results, setResults] = useState([])
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [replaceMode, setReplaceMode] = useState(false)

  function downloadTemplate() {
    const csv = CSV_TEMPLATE_HEADERS + '\n' + CSV_TEMPLATE_EXAMPLE
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    Object.assign(document.createElement('a'), { href: url, download: 'lecture-template.csv' }).click()
    URL.revokeObjectURL(url)
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]; if (!file) return
    const text = await file.text()
    const parsed = parseCSV(text)
    setRows(parsed); setStatus('preview'); setResults([])
    setReplaceMode(false)
    e.target.value = ''
  }

  async function handleImport() {
    setStatus('importing')
    setProgress({ done: 0, total: rows.length })

    // Pre-fetch all courses → Map<CODE, course>. Paginated — a plain query
    // silently caps at Supabase's default 1000-row response limit, which
    // with 2,000+ real courses meant most lecture rows failed to resolve
    // their course_id at all ("Course not found") past whatever the first
    // ~1000 courses happened to be.
    let allCourses
    try {
      allCourses = await fetchAllRows(() => supabase.from('courses').select('id,course_code,course_title,color_hex'))
    } catch {
      toast('Failed to fetch courses', 'error')
      setStatus('preview')
      return
    }
    const courseMap = new Map(allCourses.map(c => [c.course_code.trim().toUpperCase(), c]))

    // Pre-fetch all lecturers (same pagination — safe today at 885, but the
    // count is only going to grow, and the failure mode above is easy to miss).
    const allLecturers = await fetchAllRows(() => supabase.from('users').select('id,full_name').eq('role', 'lecturer'))
    const lecturers = allLecturers || []

    // Resolve all rows in memory  no async calls
    const resolved = []
    const skipped = []
    for (const row of rows) {
      const course = courseMap.get((row.course_code || '').trim().toUpperCase())
      if (!course) {
        skipped.push({ label: row.course_code || '(blank)', error: 'Course not found' })
        continue
      }
      const needle = (row.facilitator_name || '').toLowerCase()
      const lecturer = needle ? lecturers.find(l => l.full_name.toLowerCase().includes(needle)) : null
      const url = row.meeting_web_url || ''
      const meetingId = extractMeetingId(url)
      const pwd = extractZoomPassword(url)
      resolved.push({
        course_id: course.id,
        course_code: course.course_code,
        course_title: course.course_title || row.course_title || '',
        color_hex: course.color_hex || '#1a9a5c',
        facilitator_id: lecturer?.id ?? null,
        facilitator_name: row.facilitator_name || '',
        meeting_web_url: url,
        meeting_id: meetingId,
        meeting_deep_link: meetingId ? buildDeepLink(meetingId, pwd) : null,
        meeting_platform: row.meeting_platform || 'zoom',
        start_time: new Date(row.start_time).toISOString(),
        end_time: new Date(row.end_time).toISOString(),
        status: 'scheduled',
        semester: row.semester || activeSemester,
        academic_session: row.academic_session || activeSession,
        notifications_sent: { '30min': false, '15min': false, '5min': false },
      })
    }

    // Replace mode: delete all existing lectures for each session+semester pair found in CSV
    if (replaceMode) {
      const pairs = [...new Map(
        rows.map(r => {
          const session = r.academic_session || activeSession
          const sem = r.semester || activeSemester
          return [`${session}|${sem}`, { session, sem }]
        })
      ).values()]

      for (const { session, sem } of pairs) {
        const { error } = await supabase
          .from('lectures')
          .delete()
          .eq('academic_session', session)
          .eq('semester', sem)
        if (error) {
          toast(`Failed to clear existing lectures: ${error.message}`, 'error')
          setStatus('preview')
          return
        }
      }
    }

    // Batch insert in chunks of BATCH_SIZE
    let inserted = 0
    const batchErrors = []
    for (let i = 0; i < resolved.length; i += BATCH_SIZE) {
      const chunk = resolved.slice(i, i + BATCH_SIZE)
      const { error } = await supabase.from('lectures').insert(chunk)
      if (error) {
        batchErrors.push({ label: `Rows ${i + 1}–${i + chunk.length}`, error: error.message })
      } else {
        inserted += chunk.length
      }
      setProgress({ done: Math.min(i + BATCH_SIZE, resolved.length), total: rows.length })
    }

    const res = [
      ...(inserted > 0 ? [{ ok: true, label: `${inserted.toLocaleString()} lectures imported successfully` }] : []),
      ...skipped.map(e => ({ ok: false, label: e.label, error: e.error })),
      ...batchErrors.map(e => ({ ok: false, label: e.label, error: e.error })),
    ]

    setResults(res)
    setStatus('done')
    toast(
      `Imported ${inserted.toLocaleString()} / ${rows.length.toLocaleString()} lectures`,
      inserted === rows.length ? 'success' : inserted > 0 ? 'success' : 'error'
    )
    if (inserted > 0) onImported?.()
  }

  // Derive unique session+semester pairs from the loaded CSV for the warning label
  const sessionLabels = rows.length > 0
    ? [...new Set(rows.map(r => `${r.academic_session || activeSession} / ${r.semester || activeSemester}`))]
    : []

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bulk Import Lectures">
      <div className="space-y-4">
        <button onClick={downloadTemplate} className="flex items-center gap-1.5 text-sm text-noun-600 hover:underline">
          <FiDownload size={14} /> Download CSV template
        </button>

        {status === 'idle' && (
          <label className="flex flex-col items-center gap-2 border-2 border-dashed border-gray-300 rounded-xl p-6 cursor-pointer hover:border-noun-400 hover:bg-noun-50 transition">
            <FiUpload className="text-noun-400" size={24} />
            <span className="text-sm text-gray-600">Upload CSV file</span>
            <input type="file" accept=".csv" onChange={handleFile} className="hidden" />
          </label>
        )}

        {status === 'preview' && (
          <>
            <p className="text-sm text-gray-600">{rows.length.toLocaleString()} row(s) ready to import</p>

            <div className="max-h-48 overflow-y-auto border rounded-xl divide-y text-xs">
              {rows.slice(0, 100).map((r, i) => (
                <div key={i} className="px-3 py-2 text-gray-700">
                  {r.course_code} · {r.facilitator_name} · {r.start_time}
                </div>
              ))}
              {rows.length > 100 && (
                <div className="px-3 py-2 text-gray-400 italic">
                  …and {(rows.length - 100).toLocaleString()} more rows
                </div>
              )}
            </div>

            {/* Replace mode toggle */}
            <div className="border border-gray-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">Replace existing lectures</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Delete all current lectures for{' '}
                    {sessionLabels.length > 0
                      ? sessionLabels.map(s => <span key={s} className="font-medium text-gray-700">{s}</span>)
                      : 'this session'}{' '}
                    before importing
                  </p>
                </div>
                <Toggle checked={replaceMode} onChange={setReplaceMode} />
              </div>
              {replaceMode && (
                <div className="flex items-start gap-2 bg-orange-50 border border-orange-100 text-orange-700 text-xs rounded-lg px-3 py-2">
                  <FiAlertTriangle size={13} className="mt-0.5 shrink-0" />
                  <span>
                    All existing lectures and attendance records for the above session(s) will be permanently deleted before the new data is inserted. This cannot be undone.
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStatus('idle')} className="flex-1">Cancel</Button>
              <Button
                onClick={handleImport}
                variant={replaceMode ? 'danger' : 'primary'}
                className="flex-1"
              >
                {replaceMode ? 'Replace & Import' : 'Import All'}
              </Button>
            </div>
          </>
        )}

        {status === 'importing' && (
          <div className="text-center py-4 space-y-3">
            <p className="text-sm text-gray-500">
              {progress.done === 0
                ? replaceMode ? 'Clearing existing lectures…' : 'Resolving rows…'
                : `Importing ${progress.done.toLocaleString()} / ${progress.total.toLocaleString()} lectures…`}
            </p>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-noun-500 h-2 rounded-full transition-all duration-300"
                style={{ width: progress.total > 0 ? `${(progress.done / progress.total) * 100}%` : '5%' }}
              />
            </div>
          </div>
        )}

        {status === 'done' && (
          <>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {results.map((r, i) => (
                <div key={i} className={`flex items-center gap-2 text-xs p-2 rounded-lg ${r.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {r.ok ? <FiCheck size={12} /> : <FiX size={12} />}
                  {r.label}{r.error ? `  ${r.error}` : ''}
                </div>
              ))}
            </div>
            <Button onClick={onClose} className="w-full">Done</Button>
          </>
        )}
      </div>
    </Modal>
  )
}
