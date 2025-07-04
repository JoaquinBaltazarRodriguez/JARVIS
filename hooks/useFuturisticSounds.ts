"use client"

import { useCallback } from "react"

export function useFuturisticSounds() {
  // 🏢 SONIDO DE ASCENSOR ELEGANTE PARA INICIO
  const playStartupSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

      const createElevatorTone = (frequency: number, delay = 0, duration = 0.8, volume = 0.12) => {
        setTimeout(() => {
          const oscillator = audioContext.createOscillator()
          const gainNode = audioContext.createGain()
          const filterNode = audioContext.createBiquadFilter()
          const reverbNode = audioContext.createDelay(0.3)
          const reverbGain = audioContext.createGain()

          // 🔗 CONEXIONES PARA REVERB ELEGANTE
          oscillator.connect(filterNode)
          filterNode.connect(gainNode)
          gainNode.connect(reverbNode)
          gainNode.connect(audioContext.destination)
          reverbNode.connect(reverbGain)
          reverbGain.connect(audioContext.destination)

          // ⚙️ CONFIGURACIÓN DE TONO ELEGANTE
          oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
          oscillator.type = "sine" // Sonido suave y elegante

          // Filtro suave para sonido cálido
          filterNode.type = "lowpass"
          filterNode.frequency.setValueAtTime(frequency * 2, audioContext.currentTime)
          filterNode.Q.setValueAtTime(1, audioContext.currentTime)

          // Reverb elegante
          reverbNode.delayTime.setValueAtTime(0.2, audioContext.currentTime)
          reverbGain.gain.setValueAtTime(0.3, audioContext.currentTime)

          // Envelope suave de ascensor
          gainNode.gain.setValueAtTime(0, audioContext.currentTime)
          gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.1)
          gainNode.gain.setValueAtTime(volume, audioContext.currentTime + duration - 0.2)
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration)

          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + duration)
        }, delay)
      }

      const createChime = (frequency: number, delay = 0, volume = 0.08) => {
        setTimeout(() => {
          const oscillator = audioContext.createOscillator()
          const gainNode = audioContext.createGain()
          const filterNode = audioContext.createBiquadFilter()

          oscillator.connect(filterNode)
          filterNode.connect(gainNode)
          gainNode.connect(audioContext.destination)

          oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
          oscillator.type = "triangle"

          filterNode.type = "bandpass"
          filterNode.frequency.setValueAtTime(frequency, audioContext.currentTime)
          filterNode.Q.setValueAtTime(2, audioContext.currentTime)

          gainNode.gain.setValueAtTime(0, audioContext.currentTime)
          gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.05)
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1.2)

          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 1.2)
        }, delay)
      }

      // 🏢 SECUENCIA DE ASCENSOR ELEGANTE
      console.log("🏢 Playing ELEGANT ELEVATOR startup sequence...")

      // 🎵 ACORDE ASCENDENTE ELEGANTE (como ascensor de hotel de lujo)
      createElevatorTone(220, 0, 1.0, 0.15) // La grave
      createElevatorTone(277, 200, 1.0, 0.12) // Do#
      createElevatorTone(330, 400, 1.0, 0.12) // Mi
      createElevatorTone(440, 600, 1.2, 0.15) // La agudo (más largo)

      // 🔔 CHIME FINAL ELEGANTE
      setTimeout(() => {
        createChime(880, 0, 0.1) // Chime agudo
        createChime(660, 100, 0.08) // Chime medio
        createChime(440, 200, 0.06) // Chime grave
      }, 1800)

      // 🎵 TONO FINAL DE CONFIRMACIÓN
      setTimeout(() => {
        createElevatorTone(523, 0, 0.6, 0.1) // Do agudo final
      }, 2500)

      console.log("🏢 ELEGANT ELEVATOR NEXUS startup sequence completed")
    } catch (error) {
      console.error("❌ Error playing elevator startup sound:", error)
    }
  }, [])

  // 🔌 SONIDO DE APAGADO DESCENDENTE ELEGANTE
  const playShutdownSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

      const createElevatorTone = (frequency: number, delay = 0, duration = 0.8, volume = 0.12) => {
        setTimeout(() => {
          const oscillator = audioContext.createOscillator()
          const gainNode = audioContext.createGain()
          const filterNode = audioContext.createBiquadFilter()
          const reverbNode = audioContext.createDelay(0.25)
          const reverbGain = audioContext.createGain()

          oscillator.connect(filterNode)
          filterNode.connect(gainNode)
          gainNode.connect(reverbNode)
          gainNode.connect(audioContext.destination)
          reverbNode.connect(reverbGain)
          reverbGain.connect(audioContext.destination)

          oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
          oscillator.type = "sine"

          filterNode.type = "lowpass"
          filterNode.frequency.setValueAtTime(frequency * 1.5, audioContext.currentTime)
          filterNode.Q.setValueAtTime(1, audioContext.currentTime)

          reverbNode.delayTime.setValueAtTime(0.2, audioContext.currentTime)
          reverbGain.gain.setValueAtTime(0.4, audioContext.currentTime)

          gainNode.gain.setValueAtTime(0, audioContext.currentTime)
          gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.1)
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration)

          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + duration)
        }, delay)
      }

      // 🔻 SECUENCIA DE APAGADO DESCENDENTE
      console.log("🔌 Playing ELEGANT ELEVATOR shutdown sequence...")

      createElevatorTone(440, 0, 0.8, 0.12) // La
      createElevatorTone(330, 300, 0.8, 0.1) // Mi
      createElevatorTone(277, 600, 0.8, 0.08) // Do#
      createElevatorTone(220, 900, 1.2, 0.06) // La grave (más largo)

      console.log("🔌 ELEGANT ELEVATOR NEXUS shutdown sequence completed")
    } catch (error) {
      console.error("❌ Error playing elevator shutdown sound:", error)
    }
  }, [])

  // 🎵 SONIDO DE CONFIRMACIÓN ELEGANTE
  const playConfirmationSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      const filterNode = audioContext.createBiquadFilter()
      const reverbNode = audioContext.createDelay(0.15)
      const reverbGain = audioContext.createGain()

      oscillator.connect(filterNode)
      filterNode.connect(gainNode)
      gainNode.connect(reverbNode)
      gainNode.connect(audioContext.destination)
      reverbNode.connect(reverbGain)
      reverbGain.connect(audioContext.destination)

      oscillator.frequency.setValueAtTime(660, audioContext.currentTime)
      oscillator.type = "triangle"

      filterNode.type = "bandpass"
      filterNode.frequency.setValueAtTime(880, audioContext.currentTime)
      filterNode.Q.setValueAtTime(2, audioContext.currentTime)

      reverbNode.delayTime.setValueAtTime(0.1, audioContext.currentTime)
      reverbGain.gain.setValueAtTime(0.25, audioContext.currentTime)

      gainNode.gain.setValueAtTime(0, audioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(0.08, audioContext.currentTime + 0.02)
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.4)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.4)

      console.log("✅ Elegant confirmation sound played")
    } catch (error) {
      console.error("❌ Error playing elegant confirmation sound:", error)
    }
  }, [])

  // 🔊 SONIDO DE CLIC ELEGANTE
  const playClickSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      const filterNode = audioContext.createBiquadFilter()

      oscillator.connect(filterNode)
      filterNode.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
      oscillator.type = "sine"

      filterNode.type = "bandpass"
      filterNode.frequency.setValueAtTime(800, audioContext.currentTime)
      filterNode.Q.setValueAtTime(3, audioContext.currentTime)

      gainNode.gain.setValueAtTime(0, audioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(0.03, audioContext.currentTime + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.08)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.08)
    } catch (error) {
      console.error("❌ Error playing elegant click sound:", error)
    }
  }, [])

  // 🔊 SONIDO DE HOVER SUTIL
  const playHoverSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      const filterNode = audioContext.createBiquadFilter()

      oscillator.connect(filterNode)
      filterNode.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.setValueAtTime(600, audioContext.currentTime)
      oscillator.type = "sine"

      filterNode.type = "highpass"
      filterNode.frequency.setValueAtTime(500, audioContext.currentTime)
      filterNode.Q.setValueAtTime(1, audioContext.currentTime)

      gainNode.gain.setValueAtTime(0, audioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(0.02, audioContext.currentTime + 0.02)
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.06)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.06)
    } catch (error) {
      console.error("❌ Error playing elegant hover sound:", error)
    }
  }, [])

  return {
    playStartupSound,
    playShutdownSound,
    playConfirmationSound,
    playClickSound,
    playHoverSound,
  }
}
