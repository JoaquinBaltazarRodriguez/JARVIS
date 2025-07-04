"use client"

import { useState, useRef, useEffect } from "react"

export function useSimpleSpeech() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [isSupported, setIsSupported] = useState(false)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    // Verificar soporte al montar el componente
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition
      setIsSupported(!!SpeechRecognition)
      console.log("🎤 Speech Recognition Support:", !!SpeechRecognition)
    }
  }, [])

  const startListening = () => {
    if (!isSupported) {
      console.log("❌ Speech recognition not supported")
      return
    }

    console.log("🎤 STARTING TO LISTEN")

    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.lang = "es-ES"
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => {
      console.log("👂 LISTENING STARTED")
      setIsListening(true)
    }

    recognition.onresult = (event: any) => {
      const result = event.results[0][0].transcript
      console.log("📝 HEARD:", result)
      setTranscript(result)
    }

    recognition.onend = () => {
      console.log("🔚 LISTENING ENDED")
      setIsListening(false)
    }

    recognition.onerror = (event: any) => {
      console.log("❌ LISTENING ERROR:", event.error)
      setIsListening(false)
    }

    recognition.start()
    recognitionRef.current = recognition
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setIsListening(false)
  }

  const resetTranscript = () => {
    setTranscript("")
  }

  // ✅ FUNCIÓN PARA ESCUCHA CONTINUA (WAKE WORD) - AHORA EXPORTADA
  const startContinuousListening = () => {
    if (!isSupported) {
      console.log("❌ Speech recognition not supported for continuous listening")
      return
    }

    console.log("🔄 STARTING CONTINUOUS LISTENING FOR WAKE WORD")

    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.lang = "es-ES"
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onstart = () => {
      console.log("🔄 CONTINUOUS LISTENING STARTED")
    }

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i][0].transcript.toLowerCase()
        console.log("👂 CONTINUOUS HEARD:", result)

        // Actualizar transcript para que el componente principal lo procese
        setTranscript(result)
      }
    }

    recognition.onerror = (event: any) => {
      console.log("❌ CONTINUOUS LISTENING ERROR:", event.error)
      // Reiniciar automáticamente en caso de error
      setTimeout(() => {
        if (recognitionRef.current === recognition) {
          startContinuousListening()
        }
      }, 2000)
    }

    recognition.onend = () => {
      console.log("🔚 CONTINUOUS LISTENING ENDED - RESTARTING")
      // Reiniciar automáticamente
      setTimeout(() => {
        if (recognitionRef.current === recognition) {
          startContinuousListening()
        }
      }, 1000)
    }

    recognition.start()
    recognitionRef.current = recognition
  }

  return {
    isListening,
    transcript,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    startContinuousListening, // ✅ AHORA EXPORTADA
  }
}
