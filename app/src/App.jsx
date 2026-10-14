import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider, Outlet, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { SettingsProvider } from './contexts/SettingsContext.jsx'
import { LecturesProvider } from './contexts/LecturesContext.jsx'
import { CalendarProvider } from './contexts/CalendarContext.jsx'
import { NotificationProvider } from './contexts/NotificationContext.jsx'
import ErrorBoundary from './components/common/ErrorBoundary.jsx'
import ProtectedRoute from './components/auth/ProtectedRoute.jsx'
import AppShell from './components/layout/AppShell.jsx'
import { ROUTES } from './constants/routes.js'
import { useAuth } from './contexts/AuthContext.jsx'

const LoginPage        = lazy(() => import('./components/auth/LoginPage.jsx'))
const RegisterPage     = lazy(() => import('./components/auth/RegisterPage.jsx'))
const ForgotPasswordPage = lazy(() => import('./components/auth/ForgotPasswordPage.jsx'))
const ResetPasswordPage = lazy(() => import('./components/auth/ResetPasswordPage.jsx'))
const DashboardPage    = lazy(() => import('./pages/DashboardPage.jsx'))
const CalendarPage     = lazy(() => import('./pages/CalendarPage.jsx'))
const CoursesPage      = lazy(() => import('./pages/CoursesPage.jsx'))
const SettingsPage     = lazy(() => import('./pages/SettingsPage.jsx'))
const AdminPage        = lazy(() => import('./pages/AdminPage.jsx'))
const AdminLecturesPage = lazy(() => import('./pages/AdminLecturesPage.jsx'))
const AdminCoursesPage = lazy(() => import('./pages/AdminCoursesPage.jsx'))
const AdminUsersPage   = lazy(() => import('./pages/AdminUsersPage.jsx'))
const LecturerPage     = lazy(() => import('./pages/LecturerPage.jsx'))
const NotFoundPage     = lazy(() => import('./pages/NotFoundPage.jsx'))

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-10 h-10 border-4 border-noun-200 border-t-noun-500 rounded-full animate-spin" />
    </div>
  )
}

function HomeRedirect() {
  const { profile } = useAuth()
  if (profile?.role === 'admin') return <Navigate to={ROUTES.ADMIN} replace />
  if (profile?.role === 'lecturer') return <Navigate to={ROUTES.LECTURER} replace />
  return <DashboardPage />
}

function Providers() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <LecturesProvider>
          <CalendarProvider>
            <NotificationProvider>
              <Outlet />
            </NotificationProvider>
          </CalendarProvider>
        </LecturesProvider>
      </SettingsProvider>
    </AuthProvider>
  )
}

const router = createBrowserRouter([
  {
    element: <Providers />,
    children: [
      { path: ROUTES.LOGIN, element: <LoginPage /> },
      { path: ROUTES.REGISTER, element: <RegisterPage /> },
      { path: ROUTES.FORGOT_PASSWORD, element: <ForgotPasswordPage /> },
      { path: ROUTES.RESET_PASSWORD, element: <ResetPasswordPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppShell />,
            children: [
              { path: ROUTES.HOME, element: <HomeRedirect /> },
              { path: ROUTES.CALENDAR, element: <CalendarPage /> },
              { path: ROUTES.COURSES, element: <CoursesPage /> },
              { path: ROUTES.SETTINGS, element: <SettingsPage /> },
              {
                element: <ProtectedRoute allowedRoles={['admin']} />,
                children: [
                  { path: ROUTES.ADMIN, element: <AdminPage /> },
                  { path: ROUTES.ADMIN_LECTURES, element: <AdminLecturesPage /> },
                  { path: ROUTES.ADMIN_COURSES, element: <AdminCoursesPage /> },
                  { path: ROUTES.ADMIN_USERS, element: <AdminUsersPage /> },
                ],
              },
              {
                element: <ProtectedRoute allowedRoles={['lecturer']} />,
                children: [{ path: ROUTES.LECTURER, element: <LecturerPage /> }],
              },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <RouterProvider router={router} />
      </Suspense>
    </ErrorBoundary>
  )
}
