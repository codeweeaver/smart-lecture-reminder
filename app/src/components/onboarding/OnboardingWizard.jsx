import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import Step1Programme from './Step1Programme.jsx'
import Step2SlipUpload from './Step2SlipUpload.jsx'
import Step3Notifications from './Step3Notifications.jsx'
import Step4Install from './Step4Install.jsx'

export default function OnboardingWizard({ onComplete }) {
  const [step, setStep] = useState(1)

  const next = () => setStep(s => s + 1)
  const skip = () => setStep(s => s + 1)

  return (
    <div className="fixed inset-0 bg-noun-700/95 z-50 flex items-center justify-center p-4">
      {/* Progress dots */}
      <div className="absolute top-8 flex gap-2">
        {[1,2,3,4].map(s => (
          <div key={s} className={`w-2 h-2 rounded-full transition-all ${s === step ? 'bg-white w-6' : s < step ? 'bg-white/60' : 'bg-white/25'}`} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.2 }} className="w-full max-w-sm">
          {step === 1 && <Step1Programme onNext={next} />}
          {step === 2 && <Step2SlipUpload onNext={next} onSkip={skip} />}
          {step === 3 && <Step3Notifications onNext={next} onSkip={skip} />}
          {step === 4 && <Step4Install onComplete={onComplete} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
