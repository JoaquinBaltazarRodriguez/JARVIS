"use client"

import { useCallback } from "react"

export function useFuturisticSounds() {
  // 🎵 SONIDO DE INICIO FUTURISTA
  const playStartupSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

      const playTone = (frequency: number, duration: number, delay = 0) => {
        setTimeout(() => {
          const oscillator = audioContext.createOscillator()
          const gainNode = audioContext.createGain()

          oscillator.connect(gainNode)
          gainNode.connect(audioContext.destination)

          oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
          oscillator.type = "sine"

          gainNode.gain.setValueAtTime(0, audioContext.currentTime)
          gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1)
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration)

          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + duration)
        }, delay)
      }

      // 🚀 SECUENCIA DE INICIO (como armadura de Iron Man)
      playTone(220, 0.3, 0) // Tono bajo inicial
      playTone(330, 0.3, 200) // Tono medio
      playTone(440, 0.4, 400) // Tono alto
      playTone(550, 0.5, 600) // Tono muy alto
      playTone(660, 0.6, 800) // Tono final ascendente

      console.log("🎵 Playing startup sound")
    } catch (error) {
      console.error("❌ Error playing startup sound:", error)
    }
  }, [])

  // 🔌 SONIDO DE APAGADO FUTURISTA
  const playShutdownSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

      const playTone = (frequency: number, duration: number, delay = 0) => {
        setTimeout(() => {
          const oscillator = audioContext.createOscillator()
          const gainNode = audioContext.createGain()

          oscillator.connect(gainNode)
          gainNode.connect(audioContext.destination)

          oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
          oscillator.type = "sine"

          gainNode.gain.setValueAtTime(0, audioContext.currentTime)
          gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1)
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration)

          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + duration)
        }, delay)
      }

      // 🔻 SECUENCIA DE APAGADO (descendente)
      playTone(660, 0.4, 0) // Tono alto inicial
      playTone(550, 0.4, 200) // Tono medio-alto
      playTone(440, 0.4, 400) // Tono medio
      playTone(330, 0.5, 600) // Tono medio-bajo
      playTone(220, 0.8, 800) // Tono bajo final (más largo)

      console.log("🔌 Playing shutdown sound")
    } catch (error) {
      console.error("❌ Error playing shutdown sound:", error)
    }
  }, [])

  return {
    playStartupSound,
    playShutdownSound,
  }
}
