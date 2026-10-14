import { useState } from 'react'
import { upsertTMADeadline } from '../../services/tma.service.js'
import { useSettings } from '../../contexts/SettingsContext.jsx'
import { Button } from '../ui/Button.jsx'
import { Input } from '../ui/Input.jsx'
import { Select } from '../ui/Select.jsx'
import { useToast } from '../ui/Toast.jsx'

export default function TMAForm({ onSaved, onCancel, prefillNumber }) {
  const toast = useToast()
  const { activeSession, activeSemester } = useSettings()
  const [form, setForm] = useState({
    tma_number: prefillNumber ?? 1,
    due_date: '',
  })
  const [saving, setSaving] = useState(false)

  function set(k, v) { setForm(prev => ({ ...prev, [k]: v })) }

  async function handleSubmit() {
    if (!form.due_date) { toast('Set a due date', 'error'); return }
    setSaving(true)
    try {
      await upsertTMADeadline({
        tma_number: Number(form.tma_number),
        due_date: new Date(form.due_date).toISOString(),
        academic_session: activeSession,
        semester: activeSemester,
      })
      toast(`TMA ${form.tma_number} deadline saved!`, 'success')
      onSaved?.()
    } catch (err) {
      toast(err.message || 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        This deadline applies to <span className="font-medium text-gray-700 dark:text-gray-300">all enrolled students</span> for
        the <span className="font-medium text-gray-700 dark:text-gray-300">{activeSession}</span> session.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Select label="TMA Number" value={form.tma_number}
          onChange={e => set('tma_number', e.target.value)}>
          <option value={1}>TMA 1</option>
          <option value={2}>TMA 2</option>
          <option value={3}>TMA 3</option>
        </Select>
        <Input label="Due Date & Time" type="datetime-local"
          value={form.due_date} onChange={e => set('due_date', e.target.value)} />
      </div>

      <div className="border-t border-gray-100 pt-3 mt-2 flex justify-end gap-3">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button loading={saving} onClick={handleSubmit}>Set Deadline</Button>
      </div>
    </div>
  )
}
