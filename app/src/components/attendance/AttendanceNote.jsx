import { useState } from 'react'

export default function AttendanceNote({ note, onChange, onSave }) {
  const [expanded, setExpanded] = useState(!!note)

  if (!expanded) {
    return (
      <button onClick={() => setExpanded(true)} className="text-xs text-noun-600 hover:underline">
        + Add note
      </button>
    )
  }

  return (
    <div className="space-y-2">
      <textarea value={note} onChange={e => onChange(e.target.value)} placeholder="Optional note (e.g. reason for missing)…"
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-noun-400 resize-none"
        rows={2} />
      <button onClick={onSave} className="text-xs text-noun-600 font-medium hover:underline">Save note</button>
    </div>
  )
}
