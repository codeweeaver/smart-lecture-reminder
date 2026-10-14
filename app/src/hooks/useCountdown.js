import { useState, useEffect } from 'react'
import { differenceInSeconds } from 'date-fns'
import { formatCountdown } from '../utils/formatters.js'

export function useCountdown(targetDate) {
  const [label, setLabel] = useState('')

  useEffect(() => {
    if (!targetDate) { setLabel(''); return }
    function update() {
      const diff = differenceInSeconds(new Date(targetDate), new Date())
      if (diff <= 0) { setLabel('Now'); return }
      setLabel(formatCountdown(targetDate))
    }
    update()
    const id = setInterval(update, 30000)
    return () => clearInterval(id)
  }, [targetDate])

  return label
}
