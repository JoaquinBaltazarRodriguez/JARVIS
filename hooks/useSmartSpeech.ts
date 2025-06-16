"use client"

import { useState, useEffect, useCallback, useRef } from "react"

export function useSmartSpeech() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [isSupported, setIsSupported] = useState(false)
  const recognitionRef = useRef<any>(null)
  const isActiveRef = useRef(false)
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const finalTranscriptRef = useRef("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition
      setIsSupported(!!SpeechRecognition)
      console.log("🎤 Smart Speech Recognition supported:", !!SpeechRecognition)
    }
  }, [])

  const stopAllRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (e) {
        console.log("Recognition already stopped")
      }
      recognitionRef.current = null
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current)
      silenceTimeoutRef.current = null
    }
    setIsListening(false)
    isActiveRef.current = false
    finalTranscriptRef.current = ""
  }, [])

  // 🔄 ESCUCHA CONTINUA PARA WAKE WORD
  const startContinuousListening = useCallback(
    (onWakeWord: (detected: boolean) => void) => {
      if (!isSupported) {
        console.log("❌ Speech recognition not supported")
        return
      }

      const startRecognition = () => {
        if (isActiveRef.current) return

        try {
          const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition
          const recognition = new SpeechRecognition()

          recognition.continuous = true
          recognition.interimResults = true
          recognition.lang = "es-ES"

          recognition.onstart = () => {
            console.log("🎧 Continuous listening started")
            isActiveRef.current = true
          }

          recognition.onresult = (event: any) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript.toLowerCase()
              console.log("👂 Continuous listening heard:", transcript)

              // Detectar palabras de activación
              if (transcript.includes("jarvis") || transcript.includes("yarvis")) {
                if (
                  transcript.includes("enciende") ||
                  transcript.includes("activa") ||
                  transcript.includes("despierta") ||
                  transcript.includes("enciéndete")
                ) {
                  console.log("🚀 Wake word detected!")
                  onWakeWord(true)
                  stopAllRecognition()
                  return
                }
              }
            }
          }

          recognition.onerror = (event: any) => {
            console.error("❌ Continuous listening error:", event.error)
            isActiveRef.current = false

            if (event.error !== "no-speech") {
              setTimeout(() => {
                if (!isActiveRef.current) {
                  startRecognition()
                }
              }, 2000)
            }
          }

          recognition.onend = () => {
            console.log("🔚 Continuous listening ended")
            isActiveRef.current = false

            setTimeout(() => {
              if (!isActiveRef.current) {
                startRecognition()
              }
            }, 1000)
          }

          recognition.start()
          recognitionRef.current = recognition
        } catch (error) {
          console.error("❌ Error starting continuous listening:", error)
          isActiveRef.current = false
        }
      }

      startRecognition()
      return recognitionRef.current
    },
    [isSupported, stopAllRecognition],
  )

  // 🎯 ESCUCHA INTELIGENTE MEJORADA - ESPERA MÁS TIEMPO
  const startSmartListening = useCallback(() => {
    if (!isSupported || isActiveRef.current) {
      console.log("❌ Cannot start smart listening - not supported or already active")
      return
    }

    try {
      stopAllRecognition()

      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition
      const recognition = new SpeechRecognition()

      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = "es-ES"

      finalTranscriptRef.current = ""
      let hasSpokenRecently = false

      recognition.onstart = () => {
        console.log("🎤 Smart listening started - WAITING FOR COMPLETE PHRASE")
        setIsListening(true)
        isActiveRef.current = true
      }

      recognition.onresult = (event: any) => {
        let interimTranscript = ""
        let finalTranscript = ""

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript

          if (event.results[i].isFinal) {
            finalTranscript += transcript
            console.log("✅ Final part:", transcript)
          } else {
            interimTranscript += transcript
            console.log("⏳ Interim part:", transcript)
          }
        }

        // Acumular transcript final
        if (finalTranscript) {
          finalTranscriptRef.current += finalTranscript
          hasSpokenRecently = true
          console.log("📝 Accumulated transcript:", finalTranscriptRef.current)

          // Limpiar timeout anterior
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current)
          }

          // ⏰ ESPERAR 4 SEGUNDOS DE SILENCIO (más tiempo)
          silenceTimeoutRef.current = setTimeout(() => {
            if (finalTranscriptRef.current.trim() && hasSpokenRecently) {
              console.log("🎯 PROCESSING COMPLETE PHRASE:", finalTranscriptRef.current)
              setTranscript(finalTranscriptRef.current.trim())
              stopAllRecognition()
            }
          }, 4000) // ⚡ AUMENTADO DE 2 A 4 SEGUNDOS
        }

        // Si hay interim transcript, resetear el flag de silencio
        if (interimTranscript) {
          hasSpokenRecently = true
        }
      }

      recognition.onend = () => {
        console.log("🔚 Smart listening ended")
        setIsListening(false)
        isActiveRef.current = false
        recognitionRef.current = null
      }

      recognition.onerror = (event: any) => {
        console.error("❌ Smart listening error:", event.error)
        setIsListening(false)
        isActiveRef.current = false
        recognitionRef.current = null
      }

      recognition.start()
      recognitionRef.current = recognition
    } catch (error) {
      console.error("❌ Error starting smart listening:", error)
      setIsListening(false)
      isActiveRef.current = false
    }
  }, [isSupported, stopAllRecognition])

  return {
    isListening,
    transcript,
    isSupported,
    startSmartListening,
    stopListening: stopAllRecognition,
    startContinuousListening,
    resetTranscript: () => setTranscript(""),
  }
}
