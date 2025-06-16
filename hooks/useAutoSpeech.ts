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
  const isSpeakingRef = useRef(false) // 🔇 PARA EVITAR AUTO-ESCUCHA

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition
      setIsSupported(!!SpeechRecognition)
      console.log("🎤 Auto Speech Recognition supported:", !!SpeechRecognition)
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

  // 🔇 FUNCIÓN PARA PAUSAR ESCUCHA CUANDO JARVIS HABLA
  const setSpeakingState = useCallback(
    (speaking: boolean) => {
      isSpeakingRef.current = speaking
      console.log("🔇 JARVIS SPEAKING STATE:", speaking)

      if (speaking) {
        // Pausar reconocimiento cuando JARVIS habla
        stopAllRecognition()
      }
    },
    [stopAllRecognition],
  )

  // 🌙 ESCUCHA CONTINUA PARA WAKE WORD
  const startContinuousListening = useCallback(
    (onWakeWord: (detected: boolean) => void) => {
      if (!isSupported) {
        console.log("❌ Speech recognition not supported")
        return
      }

      const startRecognition = () => {
        if (isActiveRef.current || isSpeakingRef.current) {
          console.log("⏸️ Skipping recognition - already active or JARVIS speaking")
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
            // 🔇 NO PROCESAR SI JARVIS ESTÁ HABLANDO
            if (isSpeakingRef.current) {
              console.log("🔇 Ignoring speech - JARVIS is speaking")
              return
            }

            for (let i = event.resultIndex; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript.toLowerCase()
              console.log("👂 Continuous listening heard:", transcript)

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

            if (event.error !== "no-speech" && !isSpeakingRef.current) {
              setTimeout(() => {
                if (!isActiveRef.current && !isSpeakingRef.current) {
                  startRecognition()
                }
              }, 2000)
            }
          }

          recognition.onend = () => {
            console.log("🔚 Continuous listening ended")
            isActiveRef.current = false

            if (!isSpeakingRef.current) {
              setTimeout(() => {
                if (!isActiveRef.current && !isSpeakingRef.current) {
                  startRecognition()
                }
              }, 1000)
            }
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

  // 🎯 ESCUCHA AUTOMÁTICA PARA CONVERSACIÓN
  const startAutoListening = useCallback(() => {
    if (!isSupported || isActiveRef.current || isSpeakingRef.current) {
      console.log("❌ Cannot start auto listening - not supported, already active, or JARVIS speaking")
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
        console.log("🎤 Auto listening started - NO CLICK NEEDED")
        setIsListening(true)
        isActiveRef.current = true
      }

      recognition.onresult = (event: any) => {
        // 🔇 NO PROCESAR SI JARVIS ESTÁ HABLANDO
        if (isSpeakingRef.current) {
          console.log("🔇 Ignoring speech - JARVIS is speaking")
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

          // ⏰ ESPERAR 4 SEGUNDOS DE SILENCIO
          silenceTimeoutRef.current = setTimeout(() => {
            if (finalTranscriptRef.current.trim() && hasSpokenRecently && !isSpeakingRef.current) {
              console.log("🎯 PROCESSING COMPLETE PHRASE:", finalTranscriptRef.current)
              setTranscript(finalTranscriptRef.current.trim())
              stopAllRecognition()
            }
          }, 4000)
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
    setSpeakingState, // 🔇 NUEVA FUNCIÓN PARA CONTROLAR ESTADO DE HABLA
  }
}
