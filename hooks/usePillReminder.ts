"use client"

import { useState, useEffect, useCallback } from "react"

interface PillReminderHook {
  showReminder: boolean
  currentTime: string
  dismissReminder: () => void
  checkTime: () => void
}

export function usePillReminder(onReminder: (message: string) => void): PillReminderHook {
  const [showReminder, setShowReminder] = useState(false)
  const [currentTime, setCurrentTime] = useState("")
  const [lastReminderTime, setLastReminderTime] = useState<string | null>(null)

  // 💊 HORARIOS EXACTOS DE PASTILLAS
  const pillTimes = ["01:00", "08:00", "09:00", "17:00", "21:00"]

  const checkTime = useCallback(() => {
    const now = new Date()
    const currentHour = now.getHours().toString().padStart(2, "0")
    const currentMinute = now.getMinutes().toString().padStart(2, "0")
    const currentTimeString = `${currentHour}:${currentMinute}`

    setCurrentTime(currentTimeString)

    // Verificar si es hora exacta de tomar pastillas
    if (pillTimes.includes(currentTimeString)) {
      // Evitar recordatorios duplicados en el mismo minuto
      if (lastReminderTime !== currentTimeString) {
        console.log("💊 PILL REMINDER TIME:", currentTimeString)
        setShowReminder(true)
        setLastReminderTime(currentTimeString)
        onReminder("Señor, debe tomar sus pastillas, haga una pausa")
      }
    }
  }, [onReminder, lastReminderTime])

  const dismissReminder = useCallback(() => {
    setShowReminder(false)
    console.log("💊 Pill reminder dismissed")
  }, [])

  useEffect(() => {
    // Verificar cada 30 segundos para mayor precisión
    const interval = setInterval(checkTime, 30000)

    // Verificar inmediatamente al montar
    checkTime()

    return () => clearInterval(interval)
  }, [checkTime])

  return {
    showReminder,
    currentTime,
    dismissReminder,
    checkTime,
  }
}
