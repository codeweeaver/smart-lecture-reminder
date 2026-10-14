import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabase.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { FiRefreshCw, FiX } from 'react-icons/fi'
import { AnimatePresence, motion } from 'motion/react'

export default function NewSemesterBanner() {
  const { profile } = useAuth()
  const [show, setShow] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (profile?.role !== 'student') return
    async function check() {
      const { data } = await supabase.from('app_settings').select('value').eq('key', 'active_academic_session').single()
      const active = data?.value
      const { data: enrollments } = await supabase.from('enrollments').select('id').eq('user_id', profile.id).eq('academic_session', active).eq('expired', false)
      if (enrollments && enrollments.length === 0) setShow(true)
    }
    if (profile) check()
  }, [profile])

  if (dismissed || !show) return null

  return (
    <AnimatePresence>
      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
        className="bg-gold-500 text-white px-4 py-2 flex items-center gap-2 text-sm">
        <FiRefreshCw size={14} />
        <span className="flex-1">New semester detected! Please re-enroll in your courses.</span>
        <button onClick={() => setDismissed(true)} className="p-1 hover:bg-white/20 rounded"><FiX size={14} /></button>
      </motion.div>
    </AnimatePresence>
  )
}
