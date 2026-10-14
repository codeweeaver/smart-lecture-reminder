import { useState, useRef } from 'react'
import { parseCSV } from '../../utils/csvParser.js'
import { supabase } from '../../services/supabase.js'
import { getDistinctCourseColor } from '../../utils/colorPalette.js'
import { Modal } from '../ui/Modal.jsx'
import { Button } from '../ui/Button.jsx'
import { useToast } from '../ui/Toast.jsx'
import { FiUpload, FiDownload, FiCheckCircle, FiXCircle } from 'react-icons/fi'

const COURSE_CSV_HEADERS = 'course_code,course_title,credit_units,programme,level,semester'
const COURSE_CSV_EXAMPLE =
  'CIT 403,Software Engineering,3,Computer Science,400,second\nGST 101,Use of English and Communication Skills I,2,General Studies,100,first'

const REQUIRED_COLS = ['course_code', 'course_title', 'programme', 'level', 'semester']

export default function BulkCourseImportModal({ isOpen, onClose, onImported, activeSession }) {
  const toast = useToast()
  const fileRef = useRef(null)
  const [stage, setStage] = useState('idle') // idle | preview | done
  const [rows, setRows] = useState([])
  const [results, setResults] = useState([])
  const [importing, setImporting] = useState(false)

  function downloadTemplate() {
    const csv = COURSE_CSV_HEADERS + '\n' + COURSE_CSV_EXAMPLE
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    Object.assign(document.createElement('a'), { href: url, download: 'course-template.csv' }).click()
    URL.revokeObjectURL(url)
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (fileRef.current) fileRef.current.value = ''
    if (!file) return
    const text = await file.text()
    const parsed = parseCSV(text)
    const missing = REQUIRED_COLS.filter(c => !parsed[0] || !(c in parsed[0]))
    if (missing.length) {
      toast(`CSV missing columns: ${missing.join(', ')}`, 'error')
      return
    }
    const validRows = parsed.filter(r => r.course_code?.trim() && r.course_title?.trim())
    if (validRows.length === 0) { toast('No valid rows found', 'error'); return }
    setRows(validRows)
    setStage('preview')
  }

  async function handleImport() {
    setImporting(true)
    const session = activeSession || '2026_2'
    const upsertRows = rows.map(r => ({
      course_code:      r.course_code.trim().toUpperCase(),
      course_title:     r.course_title.trim(),
      credit_units:     parseInt(r.credit_units, 10) || 2,
      programme:        r.programme.trim(),
      level:            parseInt(r.level, 10) || 100,
      semester:         r.semester.trim(),
      academic_session: session,
      color_hex:        getDistinctCourseColor(r.course_code.trim().toUpperCase(), null),
    }))

    const { data, error } = await supabase
      .from('courses')
      .upsert(upsertRows, { onConflict: 'course_code' })
      .select('course_code')

    setImporting(false)

    if (error) {
      toast(`Import failed: ${error.message}`, 'error')
      setResults(upsertRows.map(r => ({ course_code: r.course_code, ok: false, error: error.message })))
    } else {
      const importedCodes = new Set((data || []).map(d => d.course_code))
      setResults(upsertRows.map(r => ({ course_code: r.course_code, course_title: r.course_title, ok: true, upserted: importedCodes.has(r.course_code) })))
      toast(`${upsertRows.length} course(s) imported successfully`, 'success')
    }
    setStage('done')
  }

  function handleClose() {
    const hadSuccess = stage === 'done' && results.some(r => r.ok)
    setStage('idle')
    setRows([])
    setResults([])
    onClose()
    if (hadSuccess) onImported?.()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Courses via CSV" size="md">
      {stage === 'idle' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Bulk-import courses from a CSV file. The{' '}
            <code className="bg-gray-100 px-1 rounded text-xs font-mono">academic_session</code> is
            set automatically to the active session ({activeSession || '2026_2'}).
            Re-importing existing courses safely updates them (upsert on course code + session).
          </p>
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-4 text-center">
            <FiUpload className="mx-auto text-gray-400 mb-2" size={24} />
            <p className="text-sm text-gray-500 mb-1">
              Required:{' '}
              <code className="text-xs bg-white border border-gray-200 px-1 rounded">
                course_code, course_title, programme, level, semester
              </code>
            </p>
            <p className="text-xs text-gray-400 mb-3">
              Optional: <code className="text-xs bg-white border border-gray-200 px-1 rounded">credit_units</code> (defaults to 2)
            </p>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
            <Button onClick={() => fileRef.current?.click()}>Choose CSV file</Button>
          </div>
          <div className="flex justify-between items-center">
            <button onClick={downloadTemplate} className="flex items-center gap-1.5 text-sm text-noun-600 hover:underline">
              <FiDownload size={14} />Download template
            </button>
          </div>
          <div className="border-t border-gray-100 pt-3 flex justify-end">
            <Button variant="ghost" onClick={handleClose}>Cancel</Button>
          </div>
        </div>
      )}

      {stage === 'preview' && (
        <div>
          <p className="text-sm text-gray-500 mb-3">
            Preview  <strong>{rows.length}</strong> course(s) to import into session{' '}
            <strong>{activeSession || '2026_2'}</strong>:
          </p>
          <div className="max-h-64 overflow-y-auto space-y-1.5 border border-gray-100 rounded-xl p-2 mb-4">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-2 rounded-lg bg-gray-50">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: getDistinctCourseColor(r.course_code?.trim().toUpperCase(), null) }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{r.course_code?.trim().toUpperCase()}</p>
                  <p className="text-xs text-gray-400 truncate">{r.course_title?.trim()}</p>
                </div>
                <span className="text-[10px] bg-noun-100 text-noun-700 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                  L{r.level} · {r.semester}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-3 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setStage('idle')}>Back</Button>
            <Button onClick={handleImport} loading={importing}>
              Import {rows.length} Course{rows.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      )}

      {stage === 'done' && (
        <div>
          <p className="text-sm text-gray-500 mb-3">Import complete:</p>
          <div className="max-h-64 overflow-y-auto space-y-1.5 border border-gray-100 rounded-xl p-2 mb-4">
            {results.map((r, i) => (
              <div key={i} className="flex items-start gap-2 px-2 py-2 rounded-lg">
                {r.ok
                  ? <FiCheckCircle className="text-green-500 shrink-0 mt-0.5" size={15} />
                  : <FiXCircle className="text-red-500 shrink-0 mt-0.5" size={15} />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 font-medium">{r.course_code}</p>
                  {r.course_title && <p className="text-xs text-gray-400 truncate">{r.course_title}</p>}
                  {!r.ok && <p className="text-xs text-red-500">{r.error}</p>}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-3 flex justify-end">
            <Button onClick={handleClose}>Done</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
