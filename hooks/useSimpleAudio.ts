"use client"

import { useState } from "react"

export function useSimpleAudio() {
  const [isSpeaking, setIsSpeaking] = useState(false)

  const speak = (text: string) => {
    return new Promise<void>((resolve) => {
      console.log("🗣️ SPEAKING:", text)
      setIsSpeaking(true)

      // Cancelar cualquier audio anterior
      speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = "es-ES"
      utterance.rate = 1.3
      utterance.pitch = 0.9
      utterance.volume = 1

      utterance.onend = () => {
        console.log("✅ SPEECH FINISHED")
        setIsSpeaking(false)
        resolve()
      }

      utterance.onerror = () => {
        console.log("❌ SPEECH ERROR")
        setIsSpeaking(false)
        resolve()
      }

      // Hablar inmediatamente
      speechSynthesis.speak(utterance)
    })
  }

  return { speak, isSpeaking }
}
