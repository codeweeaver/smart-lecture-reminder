import { supabase } from './supabase.js'

// TMA deadlines are semester-wide  one deadline per TMA number, not per course
export async function getTMADeadlines(academicSession) {
  const { data, error } = await supabase
    .from('tma_deadlines')
    .select('*')
    .eq('academic_session', academicSession)
    .order('tma_number')
  if (error) throw error
  return data
}

export async function upsertTMADeadline({ tma_number, due_date, academic_session, semester }) {
  // Delete any existing deadline for this tma_number + session, then insert fresh.
  await supabase.from('tma_deadlines')
    .delete()
    .eq('tma_number', tma_number)
    .eq('academic_session', academic_session)

  const { error } = await supabase
    .from('tma_deadlines')
    .insert({ tma_number, due_date, academic_session, semester, reminder_sent: false, course_code: '' })
  if (error) throw error
}

export async function deleteTMADeadline(id) {
  const { error } = await supabase.from('tma_deadlines').delete().eq('id', id)
  if (error) throw error
}
