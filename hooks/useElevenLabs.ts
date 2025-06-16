"use client"

import { useState, useEffect } from "react"

export function useElevenLabs() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Inicializar audio después de que el componente esté montado
    const initializeAudio = () => {
      try {
        // Forzar carga de voces
        const voices = speechSynthesis.getVoices()
        console.log("Initial voices:", voices.length)

        if (voices.length > 0) {
          setIsReady(true)
        }
      } catch (error) {
        console.error("Error initializing audio:", error)
      }
    }

    // Esperar un poco y luego inicializar
    setTimeout(initializeAudio, 500)

    // También escuchar el evento de voces cargadas
    const handleVoicesChanged = () => {
      const voices = speechSynthesis.getVoices()
      console.log("Voices changed:", voices.length)
      if (voices.length > 0) {
        setIsReady(true)
      }
    }

    speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged)

    return () => {
      speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged)
    }
  }, [])

  const speak = async (text: string) => {
    return new Promise<void>((resolve, reject) => {
      try {
        setIsSpeaking(true)
        console.log("🎤 Speaking:", text)

        // Cancelar cualquier síntesis anterior
        speechSynthesis.cancel()

        // Esperar un momento para asegurar que la cancelación se complete
        setTimeout(() => {
          const utterance = new SpeechSynthesisUtterance(text)
          utterance.lang = "es-ES"
          utterance.rate = 1.2 // ⚡ MÁS RÁPIDO (era 0.9)
          utterance.pitch = 0.8
          utterance.volume = 1

          // Buscar una voz en español
          const voices = speechSynthesis.getVoices()
          const spanishVoice = voices.find(
            (voice) =>
              voice.lang.includes("es") ||
              voice.name.toLowerCase().includes("spanish") ||
              voice.name.toLowerCase().includes("español") ||
              voice.name.toLowerCase().includes("diego") ||
              voice.name.toLowerCase().includes("monica"),
          )

          if (spanishVoice) {
            utterance.voice = spanishVoice
            console.log("🗣️ Using voice:", spanishVoice.name)
          } else {
            console.log("🗣️ No Spanish voice found, using default")
          }

          utterance.onend = () => {
            console.log("✅ Speech ended successfully")
            setIsSpeaking(false)
            resolve()
          }

          utterance.onerror = (event) => {
            console.error("❌ Speech error:", event.error)
            setIsSpeaking(false)
            reject(new Error(`Speech error: ${event.error}`))
          }

          utterance.onstart = () => {
            console.log("🎵 Speech started")
          }

          // Hablar inmediatamente
          speechSynthesis.speak(utterance)
        }, 100)
      } catch (error) {
        console.error("❌ Error al reproducir audio:", error)
        setIsSpeaking(false)
        reject(error)
      }
    })
  }

  return { speak, isSpeaking, isReady }
}
