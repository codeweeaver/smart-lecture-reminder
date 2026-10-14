import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { FiCheckCircle, FiAlertCircle } from 'react-icons/fi'
import { updatePassword } from '../../services/auth.service.js'
import { ROUTES } from '../../constants/routes.js'
import { GRADIENT_HERO } from '../../utils/gradientPresets.js'
import { friendlySupabaseError } from '../../utils/formatters.js'
import { Input } from '../ui/Input.jsx'
import { Button } from '../ui/Button.jsx'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirmPassword) { setError('Passwords do not match'); return }

    setLoading(true)
    try {
      await updatePassword(password)
      setDone(true)
      setTimeout(() => navigate(ROUTES.LOGIN), 2500)
    } catch (err) {
      setError(friendlySupabaseError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen ${GRADIENT_HERO} flex flex-col items-center justify-center p-4`}>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          {done ? (
            <div className="text-center py-4">
              <FiCheckCircle className="text-green-500 mx-auto mb-3" size={48} />
              <h2 className="font-semibold text-gray-900 text-lg mb-2">Password updated</h2>
              <p className="text-gray-500 text-sm mb-4">Redirecting you to sign in...</p>
              <Link to={ROUTES.LOGIN} className="text-noun-600 font-medium hover:underline text-sm">
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <h2 className="font-semibold text-gray-900 text-lg mb-1">Set a new password</h2>
              <p className="text-gray-500 text-sm mb-4">Choose a new password for your account.</p>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-3 py-3 mb-4">
                  <FiAlertCircle size={15} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div
                className="space-y-3"
                onKeyDown={e => e.key === 'Enter' && !loading && handleSubmit()}
              >
                <Input
                  label="New password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <Input
                  label="Confirm password"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <Button className="w-full h-11 mt-1" loading={loading} onClick={handleSubmit}>
                  Update Password
                </Button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
