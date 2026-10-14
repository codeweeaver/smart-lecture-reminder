import { Navigate, Outlet } from 'react-router-dom'
import { ClockLoader } from 'react-spinners'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { ROUTES } from '../../constants/routes.js'

export default function ProtectedRoute({ allowedRoles }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <ClockLoader color="#1a9a5c" size={50} />
          <p className="text-noun-600 text-sm font-medium">Loading…</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to={ROUTES.LOGIN} replace />

  if (profile?.status === 'pending') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⏳</span>
          </div>
          <h2 className="font-semibold text-gray-900 text-lg mb-2">Awaiting Approval</h2>
          <p className="text-gray-500 text-sm">Your lecturer account is pending admin approval. You'll be notified once approved.</p>
        </div>
      </div>
    )
  }

  if (profile?.status === 'suspended') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm text-center">
          <span className="text-4xl">🚫</span>
          <h2 className="font-semibold text-gray-900 text-lg mt-4 mb-2">Account Suspended</h2>
          <p className="text-gray-500 text-sm">Please contact your administrator for assistance.</p>
        </div>
      </div>
    )
  }

  if (allowedRoles && !allowedRoles.includes(profile?.role)) {
    return <Navigate to={ROUTES.HOME} replace />
  }

  return <Outlet />
}
