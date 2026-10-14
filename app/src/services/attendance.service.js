import { supabase } from './supabase.js'

export async function markAttendance(userId, lectureId, courseId, status, note = null) {
  const { data, error } = await supabase
    .from('attendance')
    .upsert({ user_id: userId, lecture_id: lectureId, course_id: courseId, status, note, marked_at: new Date().toISOString() },
      { onConflict: 'user_id,lecture_id' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getAttendanceForUser(userId) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('user_id', userId)
  if (error) throw error
  return data
}

export async function getAttendanceForCourse(userId, courseId) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('user_id', userId)
    .eq('course_id', courseId)
  if (error) throw error
  return data
}

export async function getAttendanceForLecture(userId, lectureId) {
  const { data } = await supabase
    .from('attendance')
    .select('*')
    .eq('user_id', userId)
    .eq('lecture_id', lectureId)
    .single()
  return data
}
