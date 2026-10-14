import { supabase } from './supabase.js'

export async function getEnrollments(userId, academicSession) {
  const { data, error } = await supabase
    .from('enrollments')
    .select('*, course:courses(*)')
    .eq('user_id', userId)
    .eq('academic_session', academicSession)
    .eq('expired', false)
  if (error) throw error
  return data
}

export async function enrollInCourses(userId, courseIds, academicSession, semester) {
  const { data: courses } = await supabase.from('courses').select('id, course_code').in('id', courseIds)
  const codeMap = Object.fromEntries((courses || []).map(c => [c.id, c.course_code]))

  const rows = courseIds.map(courseId => ({
    user_id: userId,
    course_id: courseId,
    course_code: codeMap[courseId] || '',
    semester,
    academic_session: academicSession,
  }))

  const { data, error } = await supabase
    .from('enrollments')
    .upsert(rows, { onConflict: 'user_id,course_id,academic_session' })
    .select()
  if (error) throw error
  return data
}

export async function unenrollFromCourse(userId, courseId, academicSession) {
  const { error } = await supabase
    .from('enrollments')
    .delete()
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .eq('academic_session', academicSession)
  if (error) throw error
}

export async function updateEnrollmentColor(id, customColor) {
  const { data, error } = await supabase
    .from('enrollments')
    .update({ custom_color: customColor })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function expireEnrollments(userId) {
  const { error } = await supabase
    .from('enrollments')
    .update({ expired: true })
    .eq('user_id', userId)
    .eq('expired', false)
  if (error) throw error
}
