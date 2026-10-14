import { Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'
import MobileNav from './MobileNav.jsx'
import OnboardingWizard from '../onboarding/OnboardingWizard.jsx'
import UpdateBanner from '../common/UpdateBanner.jsx'
import NewSemesterBanner from '../common/NewSemesterBanner.jsx'
import OfflineBanner from '../common/OfflineBanner.jsx'

export default function AppShell() {
  const { profile, updateProfile } = useAuth()

  const showOnboarding = profile?.role === 'student' && profile?.onboarding_complete === false

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <UpdateBanner />
        <OfflineBanner />
        <NewSemesterBanner />
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
        {/* Mobile bottom nav */}
        <div className="md:hidden">
          <MobileNav />
        </div>
      </div>

      {/* Onboarding wizard overlay for new students */}
      {showOnboarding && (
        <OnboardingWizard onComplete={() => updateProfile({ onboarding_complete: true })} />
      )}
    </div>
  )
}
