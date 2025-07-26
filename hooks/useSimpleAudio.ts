"use client"

import { useState, useEffect } from "react"

// Variable global para controlar el silenciamiento
let isMuted = false;

// Función para establecer el estado global de silencio
export function setNexusVoiceMuted(muted: boolean) {
  isMuted = muted;
  console.log(`🔊 NEXUS voice ${muted ? 'muted' : 'unmuted'}`);
  // Guardar preferencia en localStorage
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('nexus_voice_muted', muted ? 'true' : 'false');
  }
}

// Función para obtener el estado global de silencio
export function isNexusVoiceMuted(): boolean {
  return isMuted;
}

export function useSimpleAudio() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)

  useEffect(() => {
    const initializeAudio = () => {
      try {
        // 🎤 INICIALIZAR WEB AUDIO API PARA EFECTOS
        const context = new (window.AudioContext || (window as any).webkitAudioContext)()
        setAudioContext(context)

        const voices = speechSynthesis.getVoices()
        console.log("🎤 Available voices:", voices.length)
        if (voices.length > 0) {
          setIsReady(true)
        }
        
        // Cargar preferencia de silenciamiento desde localStorage
        if (typeof localStorage !== 'undefined') {
          const savedMuted = localStorage.getItem('nexus_voice_muted');
          if (savedMuted === 'true') {
            isMuted = true;
            console.log('🔊 NEXUS voice loaded as muted from settings');
          }
        }
      } catch (error) {
        console.error("❌ Error initializing audio:", error)
      }
    }

    // ⚡ INICIALIZACIÓN MÁS RÁPIDA
    setTimeout(initializeAudio, 200)

    const handleVoicesChanged = () => {
      const voices = speechSynthesis.getVoices()
      console.log("🎤 Voices changed:", voices.length)
      if (voices.length > 0) {
        setIsReady(true)
      }
    }

    speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged)

    return () => {
      speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged)
    }
  }, [])

  const speak = (text: string) => {
    return new Promise<void>((resolve) => {
      console.log("🗣️ NEXUS SPEAKING:", text)
      setIsSpeaking(true)
      
      // Si está silenciado, solo registrar el texto pero no reproducir audio
      if (isMuted) {
        console.log("🔇 NEXUS is muted, skipping speech")
        setTimeout(() => {
          setIsSpeaking(false)
          resolve()
        }, 500) // Simular un pequeño retraso como si hubiera hablado
        return
      }

      speechSynthesis.cancel()

      // ⚡ TIEMPO DE ESPERA REDUCIDO PARA RESPUESTA MÁS RÁPIDA
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = "es-ES"
        utterance.rate = 1.2 // 🚀 VELOCIDAD OPTIMIZADA PARA NEXUS
        utterance.pitch = 0.4 // 🤖 MÁS GRAVE PARA EFECTO ROBÓTICO NEXUS
        utterance.volume = 0.95 // 🔊 VOLUMEN ALTO

        // 🎤 BUSCAR VOZ MASCULINA Y GRAVE PARA NEXUS
        const voices = speechSynthesis.getVoices()
        const nexusVoice = voices.find(
          (voice) =>
            (voice.lang.includes("es") || voice.lang.includes("en")) &&
            (voice.name.toLowerCase().includes("male") ||
              voice.name.toLowerCase().includes("diego") ||
              voice.name.toLowerCase().includes("carlos") ||
              voice.name.toLowerCase().includes("jorge") ||
              voice.name.toLowerCase().includes("daniel") ||
              voice.name.toLowerCase().includes("alex") ||
              voice.name.toLowerCase().includes("david") ||
              voice.name.toLowerCase().includes("microsoft") ||
              voice.name.toLowerCase().includes("google") ||
              voice.name.toLowerCase().includes("enhanced")),
        )

        utterance.rate = 1.4
        utterance.pitch = 0.1
        utterance.volume = 10

        if (nexusVoice) {
          utterance.voice = nexusVoice
          console.log("🤖 Using NEXUS-like voice:", nexusVoice.name)
        } else {
          const maleVoice = voices.find((voice) => voice.name.toLowerCase().includes("male"))
          if (maleVoice) {
            utterance.voice = maleVoice
            console.log("🤖 Using male voice:", maleVoice.name)
          } else {
            console.log("🤖 Using default voice with robotic settings")
          }
        }

        utterance.onend = () => {
          console.log("✅ NEXUS speech completed")
          setIsSpeaking(false)
          resolve()
        }

        utterance.onerror = (event) => {
          console.error("❌ NEXUS speech error:", event.error)
          setIsSpeaking(false)
          resolve()
        }

        utterance.onstart = () => {
          console.log("🤖 NEXUS voice activated")

          // 🎛️ APLICAR EFECTO ROBÓTICO AVANZADO
          if (audioContext) {
            try {
              // Crear efectos de audio más robóticos
              const gainNode = audioContext.createGain()
              const biquadFilter = audioContext.createBiquadFilter()

              // Configurar filtro para sonido más robótico
              biquadFilter.type = "lowpass"
              biquadFilter.frequency.value = 3000 // Frecuencia más baja para efecto robótico
              biquadFilter.Q.value = 1.5

              // Configurar ganancia para reverb sutil
              gainNode.gain.value = 0.8

              console.log("🎛️ Advanced robotic audio effects applied")
            } catch (error) {
              console.log("⚠️ Advanced audio effects not available, using enhanced voice settings")
            }
          }
        }

        speechSynthesis.speak(utterance)
      }, 50) // ⚡ REDUCIDO PARA RESPUESTA MÁS RÁPIDA
    })
  }

  return { speak, isSpeaking, isReady }
}
