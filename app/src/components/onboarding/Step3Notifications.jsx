import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { subscribeToPush } from '../../services/push.service.js'
import { Button } from '../ui/Button.jsx'
import { FiBell, FiCheck } from 'react-icons/fi'

export default function Step3Notifications({ onNext, onSkip }) {
  const { user } = useAuth()
  const [status, setStatus] = useState('idle')

  async function handleEnable() {
    setStatus('loading')
    const result = await subscribeToPush(user.id)
    setStatus(result.success ? 'granted' : 'denied')
    if (result.success) setTimeout(onNext, 1000)
  }

  return (
    <div className="bg-white rounded-2xl p-6 text-center">
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${status === 'granted' ? 'bg-green-100' : 'bg-noun-100'}`}>
        {status === 'granted' ? <FiCheck className="text-green-600" size={28} /> : <FiBell className="text-noun-600" size={28} />}
      </div>
      <h2 className="font-display font-bold text-xl text-gray-900 mb-2">
        {status === 'granted' ? 'Notifications enabled!' : 'Enable Reminders'}
      </h2>
      <p className="text-gray-500 text-sm mb-6">
        {status === 'granted'
          ? "You'll get reminders 30, 15, and 5 minutes before each lecture."
          : "Get push notifications 30 min before every lecture, even when the app is closed."}
      </p>
      {status === 'denied' && <p className="text-red-500 text-sm mb-4">Permission was denied. You can enable later in Settings.</p>}
      {status !== 'granted' && (
        <>
          <Button onClick={handleEnable} disabled={status === 'loading'} className="w-full mb-2">
            {status === 'loading' ? 'Requesting…' : '🔔 Enable Push Notifications'}
          </Button>
          <button onClick={onSkip} className="w-full text-sm text-gray-400 hover:text-gray-600 py-2">
            Skip for now
          </button>
        </>
      )}
    </div>
  )
}
