import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { FiArrowLeft, FiCheckCircle, FiAlertCircle } from 'react-icons/fi'
import { resetPasswordForEmail } from '../../services/auth.service.js'
import { ROUTES } from '../../constants/routes.js'
import { GRADIENT_HERO } from '../../utils/gradientPresets.js'
import { friendlySupabaseError } from '../../utils/formatters.js'
import { Input } from '../ui/Input.jsx'
import { Button } from '../ui/Button.jsx'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setError(''); setLoading(true)
    try {
      await resetPasswordForEmail(email)
      setSent(true)
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
          {sent ? (
            <div className="text-center py-4">
              <FiCheckCircle className="text-green-500 mx-auto mb-3" size={48} />
              <h2 className="font-semibold text-gray-900 text-lg mb-2">Check your email</h2>
              <p className="text-gray-500 text-sm mb-4">
                We sent a reset link to <strong>{email}</strong>
              </p>
              <Link to={ROUTES.LOGIN} className="text-noun-600 font-medium hover:underline text-sm">
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <Link to={ROUTES.LOGIN} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5">
                <FiArrowLeft size={14} /> Back to Sign In
              </Link>
              <h2 className="font-semibold text-gray-900 text-lg mb-1">Reset password</h2>
              <p className="text-gray-500 text-sm mb-4">Enter your email and we'll send you a reset link.</p>

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
                  label="Email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                />
                <Button className="w-full h-11 mt-1" loading={loading} onClick={handleSubmit}>
                  Send Reset Link
                </Button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
