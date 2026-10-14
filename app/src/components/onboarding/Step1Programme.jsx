import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { updateUserProfile } from '../../services/auth.service.js'
import { Button } from '../ui/Button.jsx'
import { Select } from '../ui/Select.jsx'
import { PROGRAMMES, LEVELS, STUDY_CENTRES } from '../../constants/reminderIntervals.js'
import { useToast } from '../ui/Toast.jsx'

export default function Step1Programme({ onNext }) {
  const { user, profile, updateProfile } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({
    programme: profile?.programme || '',
    level: profile?.level || '',
    study_centre: profile?.study_centre || '',
  })
  const [loading, setLoading] = useState(false)

  function set(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })) }

  async function handleSubmit() {
    setLoading(true)
    try {
      await updateUserProfile(user.id, {
        programme: form.programme,
        level: Number(form.level),
        study_centre: form.study_centre,
      })
      updateProfile({ programme: form.programme, level: Number(form.level), study_centre: form.study_centre })
      onNext()
    } catch {
      toast('Failed to save. Try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl p-6">
      <h2 className="font-display font-bold text-xl text-gray-900 mb-1">Your Programme</h2>
      <p className="text-gray-500 text-sm mb-5">Help us personalize your lecture schedule</p>

      <div className="space-y-4">
        <Select label="Programme" value={form.programme} onChange={set('programme')}>
          <option value="">Select your programme</option>
          {PROGRAMMES.map(p => <option key={p} value={p}>{p}</option>)}
        </Select>

        <div className="grid grid-cols-2 gap-3">
          <Select label="Level" value={form.level} onChange={set('level')}>
            <option value="">Select level</option>
            {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </Select>
          <Select label="Study Centre" value={form.study_centre} onChange={set('study_centre')}>
            <option value="">Select centre</option>
            {STUDY_CENTRES.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>

        <Button className="w-full h-11 mt-1" loading={loading} onClick={handleSubmit}>
          Continue →
        </Button>
      </div>
    </div>
  )
}
