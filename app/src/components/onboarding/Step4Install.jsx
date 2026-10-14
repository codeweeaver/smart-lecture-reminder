import { useAuth } from '../../contexts/AuthContext.jsx'
import { usePWAInstall } from '../../hooks/usePWAInstall.js'
import { updateUserProfile } from '../../services/auth.service.js'
import { Button } from '../ui/Button.jsx'
import { FiSmartphone } from 'react-icons/fi'

export default function Step4Install({ onComplete }) {
  const { user, updateProfile } = useAuth()
  const { canInstall, install } = usePWAInstall()

  async function handleInstall() {
    await install()
    await finishOnboarding()
  }

  async function finishOnboarding() {
    await updateUserProfile(user.id, { onboarding_complete: true })
    updateProfile({ onboarding_complete: true })
    onComplete()
  }

  return (
    <div className="bg-white rounded-2xl p-6 text-center">
      <div className="w-16 h-16 bg-noun-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <FiSmartphone className="text-noun-600" size={28} />
      </div>
      <h2 className="font-display font-bold text-xl text-gray-900 mb-2">Install App</h2>
      <p className="text-gray-500 text-sm mb-6">
        Install NOUN Reminder on your home screen for instant access  works offline too!
      </p>
      {canInstall ? (
        <>
          <Button onClick={handleInstall} className="w-full mb-2">📲 Install on Home Screen</Button>
          <button onClick={finishOnboarding} className="w-full text-sm text-gray-400 hover:text-gray-600 py-2">
            Not now
          </button>
        </>
      ) : (
        <>
          <p className="text-xs text-gray-400 mb-4">To install: tap the share button in your browser → "Add to Home Screen"</p>
          <Button onClick={finishOnboarding} className="w-full">Go to Dashboard →</Button>
        </>
      )}
    </div>
  )
}
