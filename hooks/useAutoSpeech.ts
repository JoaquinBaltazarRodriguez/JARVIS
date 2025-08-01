"use client"

import { useState, useEffect, useCallback, useRef } from "react"

export function useAutoSpeech() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [isSupported, setIsSupported] = useState(false)
  const recognitionRef = useRef<any>(null)
  const isActiveRef = useRef(false)
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const finalTranscriptRef = useRef("")
  const isSpeakingRef = useRef(false)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  // --- Contador de reintentos para "no-speech" ---
  const noSpeechRetryCountRef = useRef(0)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition
      const isHttps = window.location.protocol === "https:" || window.location.hostname === "localhost"
      const supported = !!SpeechRecognition && isHttps

      setIsSupported(supported)
      console.log("🎤 Speech Recognition supported:", supported)
      console.log("🔒 HTTPS/Localhost:", isHttps)
      console.log("🌐 Current URL:", window.location.href)

      if (!supported && !isHttps) {
        console.warn("⚠️ Speech Recognition requires HTTPS or localhost")
      }
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
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
    setIsListening(false)
    isActiveRef.current = false
    finalTranscriptRef.current = ""
  }, [])

  const setSpeakingState = useCallback(
    (speaking: boolean) => {
      isSpeakingRef.current = speaking
      console.log("🔇 NEXUS SPEAKING STATE:", speaking)

      if (speaking) {
        stopAllRecognition()
      }
    },
    [stopAllRecognition],
  )

  // 🌙 ESCUCHA CONTINUA MEJORADA CON MANEJO DE ERRORES
  const startContinuousListening = useCallback(
    (onWakeWord: (detected: boolean) => void) => {
      if (!isSupported) {
        console.log("❌ Speech recognition not supported or not HTTPS")
        return
      }

      const startRecognition = () => {
        if (isActiveRef.current || isSpeakingRef.current) {
          console.log("⏸️ Skipping recognition - already active or NEXUS speaking")
          return
        }

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
            if (isSpeakingRef.current) {
              console.log("🔇 Ignoring speech - NEXUS is speaking")
              return
            }

            // Reiniciar contador de no-speech al detectar voz
            noSpeechRetryCountRef.current = 0;

            for (let i = event.resultIndex; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript.toLowerCase()
              console.log("👂 Continuous listening heard:", transcript)
            }
          }

          recognition.onerror = (event: any) => {
            console.error("❌ [SIEMPRE] Continuous listening error:", event.error)
            isActiveRef.current = false
            // Siempre reiniciar excepto si está hablando
            if (!isSpeakingRef.current) {
              if (!isActiveRef.current) {
                startRecognition()
              }
            } else {
              console.log("🔇 No se reinicia porque NEXUS está hablando (onerror)")
            }
          }

          recognition.onend = () => {
            console.log("🔚 [SIEMPRE] Continuous listening ended, reiniciando inmediatamente...")
            isActiveRef.current = false
            if (!isSpeakingRef.current) {
              // Reiniciar inmediatamente sin delay
              if (!isActiveRef.current) {
                startRecognition()
              }
            } else {
              console.log("🔇 No se reinicia porque NEXUS está hablando")
            }
          }

          recognition.start()
          recognitionRef.current = recognition
        } catch (error) {
          console.error("❌ Error starting continuous listening:", error)
          isActiveRef.current = false

          // Reintentar después de un error de inicialización
          retryTimeoutRef.current = setTimeout(() => {
            if (!isActiveRef.current && !isSpeakingRef.current) {
              startRecognition()
            }
          }, 3000)
        }
      }

      startRecognition()
      return recognitionRef.current
    },
    [isSupported, stopAllRecognition],
  )

  // 🎯 ESCUCHA AUTOMÁTICA MEJORADA
  const startAutoListening = useCallback(() => {
    if (!isSupported || isActiveRef.current || isSpeakingRef.current) {
      console.log("❌ Cannot start auto listening - not supported, already active, or NEXUS speaking")
      return
    }

    try {
      stopAllRecognition()

      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition
      const recognition = new SpeechRecognition()

      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = "es-ES"
      // Se eliminó recognition.maxAlternatives = 1 porque causa error de tipo

      finalTranscriptRef.current = ""
      let hasSpokenRecently = false

      recognition.onstart = () => {
        console.log("🎤 Auto listening started - NO CLICK NEEDED")
        setIsListening(true)
        isActiveRef.current = true
      }

      recognition.onresult = (event: any) => {
        if (isSpeakingRef.current) {
          console.log("🔇 Ignoring speech - NEXUS is speaking")
          return
        }

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

        if (finalTranscript) {
          finalTranscriptRef.current += finalTranscript
          hasSpokenRecently = true
          console.log("📝 Accumulated transcript:", finalTranscriptRef.current)

          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current)
          }

          silenceTimeoutRef.current = setTimeout(() => {
            if (finalTranscriptRef.current.trim() && hasSpokenRecently && !isSpeakingRef.current) {
              console.log("🎯 PROCESSING COMPLETE PHRASE (INSTANT):", finalTranscriptRef.current)
              setTranscript(finalTranscriptRef.current.trim())
              stopAllRecognition()
            }
          }, 0)
        }

        if (interimTranscript) {
          hasSpokenRecently = true
        }
      }

      recognition.onend = () => {
        console.log("🔚 Auto listening ended")
        setIsListening(false)
        isActiveRef.current = false
        recognitionRef.current = null
      }

      recognition.onerror = (event: any) => {
        console.error("❌ Auto listening error:", event.error)
        setIsListening(false)
        isActiveRef.current = false
        recognitionRef.current = null

        // 🔧 MANEJO DE ERRORES PARA AUTO LISTENING
        if (event.error === "no-speech") {
          console.log("🔄 No speech detected, retrying auto listening in 1s...")
          setTimeout(() => {
            if (!isActiveRef.current && !isSpeakingRef.current) {
              startAutoListening()
            }
          }, 1000)
        } else if (event.error === "network" || event.error === "aborted") {
          console.log("🔄 Auto listening will retry automatically")
        }
      }

      recognition.start()
      recognitionRef.current = recognition
    } catch (error) {
      console.error("❌ Error starting auto listening:", error)
      setIsListening(false)
      isActiveRef.current = false
    }
  }, [isSupported, stopAllRecognition])

  return {
    isListening,
    transcript,
    isSupported,
    startAutoListening,
    stopListening: stopAllRecognition,
    startContinuousListening,
    resetTranscript: () => setTranscript(""),
    setSpeakingState,
  }
}
