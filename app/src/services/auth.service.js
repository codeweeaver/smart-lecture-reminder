import { supabase } from './supabase.js'

export async function signUp({ email, password, fullName, role, matricNumber, faculty, department }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role },
      emailRedirectTo: `${window.location.origin}/`,
    }
  })
  if (error) throw error

  // Update user profile with additional fields
  if (data.user) {
    const updates = { full_name: fullName, role }
    if (role === 'student') {
      // programme/level/study_centre are collected once, in the onboarding
      // wizard's Step1Programme — asking for them again at registration was
      // redundant.
      Object.assign(updates, {
        matric_number: matricNumber?.toUpperCase(),
        onboarding_complete: false,
      })
    } else if (role === 'lecturer') {
      Object.assign(updates, { faculty, department, status: 'pending' })
    }
    await supabase.from('users').update(updates).eq('id', data.user.id)
  }

  return data
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function logOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function resetPasswordForEmail(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (error) throw error
}

export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

export async function getCurrentProfile(userId) {
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).single()
  if (error) throw error
  return data
}

export async function updateUserProfile(userId, updates) {
  const { data, error } = await supabase.from('users').update(updates).eq('id', userId).select().single()
  if (error) throw error
  return data
}
