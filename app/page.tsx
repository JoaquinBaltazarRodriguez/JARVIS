"use client"

import { useState, useEffect, useRef } from "react"
import { Power, Volume2, Loader2, Lock, Unlock, ImageIcon, Phone, MapPin, Music } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useSimpleAudio } from "@/hooks/useSimpleAudio"
import { useAutoSpeech } from "@/hooks/useAutoSpeech"
import { useFuturisticSounds } from "@/hooks/useFuturisticSounds"
import { ContactsManager } from "@/components/ContactsManager"
import { LocationsManager } from "@/components/LocationsManager"
import { SpotifyManager } from "@/components/SpotifyManager"
import { SpotifyPlayer } from "@/components/SpotifyPlayer"
import { MapViewer, type MapViewerRef } from "@/components/MapViewer"
import { ContactsDB, LocationsDB, SpotifyDB, CommandDetector, TimeUtils } from "@/lib/database"

type AppState =
  | "sleeping"
  | "waiting_password"
  | "active"
  | "calling_confirmation"
  | "navigation_mode"
  | "spotify_mode"
  | "music_playing"
  | "map_active"

interface Message {
  text: string
  type: "user" | "jarvis"
  imageUrl?: string
  imagePrompt?: string
}

export default function AdvancedJarvis() {
  const [appState, setAppState] = useState<AppState>("sleeping")
  const [messages, setMessages] = useState<Message[]>([])
  const [currentText, setCurrentText] = useState("")
  const [currentImage, setCurrentImage] = useState<{ url: string; prompt: string } | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [mounted, setMounted] = useState(false)

  // 📱 ESTADOS PARA FUNCIONALIDADES
  const [pendingCall, setPendingCall] = useState<{ name: string; phone: string } | null>(null)
  const [isNavigating, setIsNavigating] = useState(false)
  const [showContactsManager, setShowContactsManager] = useState(false)
  const [showLocationsManager, setShowLocationsManager] = useState(false)

  // 🎵 ESTADOS PARA SPOTIFY
  const [isPlayingMusic, setIsPlayingMusic] = useState(false)
  const [currentPlaylist, setCurrentPlaylist] = useState("")
  const [currentPlaylistUrl, setCurrentPlaylistUrl] = useState("")
  const [showSpotifyManager, setShowSpotifyManager] = useState(false)
  const [waitingForPlaylist, setWaitingForPlaylist] = useState(false)

  // 🗺️ ESTADOS PARA MAPA
  const [isMapActive, setIsMapActive] = useState(false)
  const [currentDestination, setCurrentDestination] = useState("")
  const [currentDestinationAddress, setCurrentDestinationAddress] = useState("")

  const { speak, isSpeaking } = useSimpleAudio()
  const {
    isListening,
    transcript,
    isSupported,
    startAutoListening,
    stopListening,
    resetTranscript,
    startContinuousListening,
    setSpeakingState,
  } = useAutoSpeech()
  const { playStartupSound, playShutdownSound } = useFuturisticSounds()

  const mapViewerRef = useRef<MapViewerRef>(null)

  useEffect(() => {
    setSpeakingState(isSpeaking)
  }, [isSpeaking, setSpeakingState])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && appState === "sleeping" && isSupported) {
      console.log("🌙 Starting continuous listening for wake word...")
      startContinuousListening(handleWakeWordDetected)
    }
  }, [mounted, appState, isSupported])

  // 🎵 ESCUCHA SELECTIVA - Diferentes modos
  useEffect(() => {
    if (
      appState === "waiting_password" ||
      appState === "active" ||
      appState === "navigation_mode" ||
      appState === "spotify_mode"
    ) {
      if (!isPlayingMusic && !isMapActive && !isListening && !isSpeaking && !isProcessing) {
        console.log("🎤 STARTING AUTO LISTENING - NORMAL MODE")
        setTimeout(() => {
          if (!isPlayingMusic && !isMapActive && !isListening && !isSpeaking && !isProcessing) {
            startAutoListening()
          }
        }, 1000)
      }
    }
    // 🎵 ESCUCHA ESPECIAL CUANDO ESTÁ REPRODUCIENDO MÚSICA
    else if (appState === "music_playing") {
      if (!isListening && !isSpeaking && !isProcessing) {
        console.log("🎵 STARTING MUSIC-ONLY LISTENING")
        setTimeout(() => {
          if (!isListening && !isSpeaking && !isProcessing) {
            startAutoListening()
          }
        }, 1000)
      }
    }
    // 🗺️ ESCUCHA ESPECIAL CUANDO ESTÁ EL MAPA ACTIVO
    else if (appState === "map_active") {
      if (!isListening && !isSpeaking && !isProcessing) {
        console.log("🗺️ STARTING MAP-ONLY LISTENING")
        setTimeout(() => {
          if (!isListening && !isSpeaking && !isProcessing) {
            startAutoListening()
          }
        }, 1000)
      }
    }
  }, [appState, isPlayingMusic, isMapActive, isListening, isSpeaking, isProcessing])

  const handleWakeWordDetected = (detected: boolean) => {
    if (detected && appState === "sleeping") {
      console.log("🚀 WAKE WORD DETECTED!")
      setAppState("waiting_password")
      stopListening()

      const passwordPrompt = "Contraseña de reconocimiento requerida."
      setCurrentText(passwordPrompt)
      speak(passwordPrompt).then(() => setCurrentText(""))
    }
  }

  useEffect(() => {
    if (transcript && !isProcessing) {
      const text = transcript.toLowerCase().trim()
      console.log("💬 PROCESSING:", text, "| STATE:", appState)

      if (appState === "waiting_password") {
        handlePasswordCheck(text)
      } else if (appState === "calling_confirmation") {
        handleCallConfirmation(text)
      } else if (appState === "navigation_mode") {
        handleNavigationCommand(text)
      } else if (appState === "spotify_mode") {
        if (CommandDetector.isCancelCommand(text)) {
          console.log("❌ CANCEL COMMAND IN SPOTIFY MODE")
          handleCancelAction()
        } else {
          handleSpotifyPlaylistSelection(text)
        }
      } else if (appState === "music_playing") {
        // 🎵 CONTROLES DE SPOTIFY POR VOZ - NUEVO
        if (CommandDetector.isSpotifyControlCommand(text)) {
          console.log("🎵 SPOTIFY CONTROL COMMAND DETECTED")
          handleSpotifyControlCommand(text)
        }
        // 🎵 COMANDO DE QUITAR MÚSICA
        else if (CommandDetector.isMusicControlCommand(text)) {
          console.log("🎵 MUSIC CONTROL COMMAND DETECTED")
          handleMusicControl(text)
        } else {
          console.log("🎵 IGNORING NON-MUSIC COMMAND WHILE PLAYING")
        }
      } else if (appState === "map_active") {
        // 🗺️ COMANDOS ESPECÍFICOS PARA MAPA
        if (text.includes("quitar mapa") || text.includes("cerrar mapa") || text.includes("salir del mapa")) {
          console.log("🗺️ CLOSE MAP COMMAND")
          handleCloseMap()
        } else if (
          text.includes("iniciar navegación") ||
          text.includes("empezar navegación") ||
          text.includes("iniciar navegacion") ||
          text.includes("empezar navegacion")
        ) {
          console.log("🗺️ START NAVIGATION COMMAND")
          handleStartMapNavigation()
        } else {
          console.log("🗺️ IGNORING NON-MAP COMMAND WHILE MAP ACTIVE")
        }
      } else if (appState === "active") {
        if (CommandDetector.isCancelCommand(text)) {
          console.log("❌ CANCEL COMMAND DETECTED")
          handleCancelAction()
        } else if (CommandDetector.isTimeCommand(text)) {
          console.log("🕐 TIME COMMAND DETECTED")
          handleTimeCommand()
        } else if (text.includes("jarvis") && (text.includes("apágate") || text.includes("apagate"))) {
          console.log("🔌 SHUTDOWN COMMAND DETECTED")
          handleShutdown()
        } else if (CommandDetector.isAgendaCommand(text)) {
          console.log("📱 AGENDA COMMAND DETECTED")
          handleAgendaCommand()
        } else if (CommandDetector.isDirectCallCommand(text)) {
          console.log("📱 DIRECT CALL COMMAND DETECTED")
          handleCallCommand(text)
        } else if (CommandDetector.isNavigationCommand(text)) {
          console.log("🗺️ NAVIGATION COMMAND DETECTED")
          handleNavigationStart(text)
        } else if (CommandDetector.isSpotifyCommand(text)) {
          console.log("🎵 SPOTIFY COMMAND DETECTED")
          handleSpotifyCommand()
        } else if (CommandDetector.isMusicControlCommand(text)) {
          console.log("🎵 MUSIC CONTROL COMMAND DETECTED")
          handleMusicControl(text)
        } else if (text.length > 2) {
          handleUserMessage(transcript)
        }
      }
      resetTranscript()
    }
  }, [transcript, appState, isProcessing])

  // 📱 MANEJAR COMANDO DE LLAMADA
  const handleCallCommand = async (text: string) => {
    const contactName = CommandDetector.extractContactName(text)
    console.log("📱 EXTRACTED CONTACT NAME:", contactName)

    if (!contactName) {
      const msg = "¿A quién deseas llamar, Joaquín?"
      setCurrentText(msg)
      await speak(msg)
      setCurrentText("")
      return
    }

    const contact = ContactsDB.findByName(contactName)
    if (contact) {
      setPendingCall({ name: contact.name, phone: contact.phone })
      setAppState("calling_confirmation")

      const confirmMsg = `¿Deseas llamar a ${contact.name}?`
      setCurrentText(confirmMsg)
      await speak(confirmMsg)
      setCurrentText("")
    } else {
      const notFoundMsg = `No encontré a ${contactName} en tu agenda, Joaquín. ¿Quieres que abra el gestor de contactos?`
      setCurrentText(notFoundMsg)
      await speak(notFoundMsg)
      setCurrentText("")
    }
  }

  // 📱 MANEJAR CONFIRMACIÓN DE LLAMADA
  const handleCallConfirmation = async (text: string) => {
    if (text.includes("sí") || text.includes("si") || text.includes("confirmo") || text.includes("llama")) {
      if (pendingCall) {
        const callingMsg = `Llamando a ${pendingCall.name}...`
        setCurrentText(callingMsg)
        await speak(callingMsg)
        setCurrentText("")

        window.open(`tel:${pendingCall.phone}`, "_self")

        setPendingCall(null)
        setAppState("active")
      }
    } else if (text.includes("no") || text.includes("cancela") || text.includes("cancelar")) {
      const cancelMsg = "Llamada cancelada."
      setCurrentText(cancelMsg)
      await speak(cancelMsg)
      setCurrentText("")

      setPendingCall(null)
      setAppState("active")
    }
  }

  // 🗺️ MANEJAR INICIO DE NAVEGACIÓN
  const handleNavigationStart = async (text: string) => {
    setAppState("navigation_mode")
    setIsNavigating(true)

    const navMsg = "Claro Joaquín, ¿a dónde deseas ir?"
    setCurrentText(navMsg)
    await speak(navMsg)
    setCurrentText("")
  }

  // 🗺️ MANEJAR COMANDO DE NAVEGACIÓN
  const handleNavigationCommand = async (text: string) => {
    const locationName = CommandDetector.extractLocationName(text)
    console.log("🗺️ EXTRACTED LOCATION NAME:", locationName)

    if (!locationName) {
      const msg = "¿A qué ubicación específica quieres ir?"
      setCurrentText(msg)
      await speak(msg)
      setCurrentText("")
      return
    }

    const location = LocationsDB.findByName(locationName)
    if (location) {
      const navMsg = `Abriendo mapa hacia ${location.name}...`
      setCurrentText(navMsg)
      await speak(navMsg)
      setCurrentText("")

      // 🗺️ ACTIVAR MAPA INTEGRADO
      setCurrentDestination(location.name)
      setCurrentDestinationAddress(location.address)
      setIsMapActive(true)
      setAppState("map_active")
      setIsNavigating(false)
    } else {
      const notFoundMsg = `No encontré ${locationName} en tus ubicaciones guardadas, Joaquín.`
      setCurrentText(notFoundMsg)
      await speak(notFoundMsg)
      setCurrentText("")

      setIsNavigating(false)
      setAppState("active")
    }
  }

  // 🗺️ CERRAR MAPA
  const handleCloseMap = async () => {
    const closeMsg = "Cerrando mapa. Volviendo al modo normal."
    setCurrentText(closeMsg)
    await speak(closeMsg)
    setCurrentText("")

    setIsMapActive(false)
    setCurrentDestination("")
    setCurrentDestinationAddress("")
    setAppState("active")
  }

  // 🗺️ MANEJAR INSTRUCCIONES DE NAVEGACIÓN
  const handleNavigationUpdate = async (instruction: string) => {
    console.log("🧭 NAVIGATION INSTRUCTION:", instruction)
    await speak(instruction)
  }

  // 🗺️ INICIAR NAVEGACIÓN EN MAPA
  const handleStartMapNavigation = async () => {
    const startMsg = "Iniciando navegación por voz hacia " + currentDestination + "."
    setCurrentText(startMsg)
    await speak(startMsg)
    setCurrentText("")

    // Activar navegación en el componente MapViewer
    if (mapViewerRef.current) {
      mapViewerRef.current.startNavigation()
    }
  }

  const handlePasswordCheck = async (password: string) => {
    console.log("🔐 CHECKING PASSWORD:", password)
    setMessages((prev) => [...prev, { text: password, type: "user" }])
    setIsProcessing(true)

    const validPasswords = [
      "joaquin rodriguez",
      "joaquinrodriguez",
      "joaquín rodriguez",
      "joaquínrodriguez",
      "22 de abril",
      "veintidos de abril",
      "veintidós de abril",
    ]

    const isValidPassword = validPasswords.some(
      (validPass) => password.includes(validPass) || validPass.includes(password.replace(/\s+/g, "")),
    )

    if (isValidPassword) {
      console.log("✅ PASSWORD CORRECT!")
      const welcomeMsg = "Bienvenido Joaquín. JARVIS está ahora completamente operativo. ¿En qué puedo asistirte hoy?"
      setMessages((prev) => [...prev, { text: welcomeMsg, type: "jarvis" }])
      setCurrentText(welcomeMsg)

      playStartupSound()
      setAppState("active")
      setHasInitialized(true)

      await speak(welcomeMsg)
      setCurrentText("")
    } else {
      console.log("❌ PASSWORD INCORRECT")
      const errorMsg = "Contraseña incorrecta. Por favor, proporciona la contraseña de reconocimiento."
      setMessages((prev) => [...prev, { text: errorMsg, type: "jarvis" }])
      setCurrentText(errorMsg)

      await speak(errorMsg)
      setCurrentText("")
    }

    setIsProcessing(false)
  }

  const handleShutdown = async () => {
    console.log("😴 SHUTTING DOWN JARVIS")
    setIsProcessing(true)

    const goodbye = "Desactivando JARVIS. Hasta luego Joaquín."
    setCurrentText(goodbye)

    playShutdownSound()

    await speak(goodbye)

    setAppState("sleeping")
    setMessages([])
    setCurrentText("")
    setCurrentImage(null)
    setPendingCall(null)
    setIsNavigating(false)
    setIsPlayingMusic(false)
    setCurrentPlaylist("")
    setCurrentPlaylistUrl("")
    setIsMapActive(false)
    setCurrentDestination("")
    setCurrentDestinationAddress("")
    setHasInitialized(false)
    setIsProcessing(false)
  }

  const handleUserMessage = async (message: string) => {
    console.log("📨 USER MESSAGE:", message)
    setIsProcessing(true)
    setMessages((prev) => [...prev, { text: message, type: "user" }])

    try {
      console.log("🌐 CALLING CHATGPT API...")

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      })

      const responseText = await response.text()
      console.log("📄 RAW RESPONSE:", responseText)

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${responseText}`)
      }

      const data = JSON.parse(responseText)
      console.log("🤖 JARVIS RESPONSE:", data)

      if (data.response) {
        if (data.hasImage && data.imageUrl) {
          console.log("🖼️ SHOWING IMAGE:", data.imageUrl)
          setCurrentImage({ url: data.imageUrl, prompt: data.imagePrompt })
          setMessages((prev) => [
            ...prev,
            {
              text: data.response,
              type: "jarvis",
              imageUrl: data.imageUrl,
              imagePrompt: data.imagePrompt,
            },
          ])
        } else {
          setMessages((prev) => [...prev, { text: data.response, type: "jarvis" }])
        }

        setCurrentText(data.response)
        await speak(data.response)
        setCurrentText("")

        if (data.hasImage) {
          setTimeout(() => setCurrentImage(null), 10000)
        }
      } else {
        throw new Error("No response field in API response")
      }
    } catch (error) {
      console.error("❌ COMPLETE ERROR:", error)

      let errorMsg = "Lo siento Joaquín, "
      if (error instanceof Error) {
        if (error.message.includes("fetch")) {
          errorMsg += "no pude conectar con el servidor."
        } else if (error.message.includes("API key")) {
          errorMsg += "hay un problema con la configuración."
        } else {
          errorMsg += "tuve un problema técnico."
        }
      }
      errorMsg += " Inténtalo de nuevo."

      setMessages((prev) => [...prev, { text: errorMsg, type: "jarvis" }])
      setCurrentText(errorMsg)
      await speak(errorMsg)
      setCurrentText("")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancelAction = async () => {
    console.log("❌ CANCELING ACTION")
    const cancelMsg = "Acción cancelada. Volviendo al modo normal."
    setCurrentText(cancelMsg)
    await speak(cancelMsg)
    setCurrentText("")

    setPendingCall(null)
    setIsNavigating(false)
    setWaitingForPlaylist(false)
    setAppState("active")
  }

  const handleTimeCommand = async () => {
    console.log("🕐 TIME COMMAND DETECTED")
    const timeResponse = TimeUtils.getTimeResponse()
    setCurrentText(timeResponse)
    await speak(timeResponse)
    setCurrentText("")
  }

  const handleAgendaCommand = async () => {
    console.log("📱 AGENDA COMMAND DETECTED")
    const agendaMsg = "Abriendo tu agenda de contactos, Joaquín."
    setCurrentText(agendaMsg)
    await speak(agendaMsg)
    setCurrentText("")
    setShowContactsManager(true)
  }

  const handleSpotifyCommand = async () => {
    console.log("🎵 SPOTIFY COMMAND DETECTED")
    setAppState("spotify_mode")
    setWaitingForPlaylist(true)

    const spotifyMsg = "¿Qué playlist deseas escuchar, Joaquín?"
    setCurrentText(spotifyMsg)
    await speak(spotifyMsg)
    setCurrentText("")
  }

  const handleSpotifyPlaylistSelection = async (text: string) => {
    console.log("🎵 RAW SPOTIFY INPUT:", text)

    const lowerText = text.toLowerCase()
    const playlists = SpotifyDB.getAll()

    console.log(
      "🎵 AVAILABLE PLAYLISTS:",
      playlists.map((p) => p.name),
    )

    const foundPlaylist = playlists.find((playlist) => {
      const playlistName = playlist.name.toLowerCase()
      console.log(`🔍 COMPARING: "${lowerText}" contains "${playlistName}"?`)

      return (
        lowerText.includes(playlistName) ||
        playlistName.includes(lowerText) ||
        playlistName.split(" ").some((word) => lowerText.includes(word)) ||
        lowerText.split(" ").some((word) => playlistName.includes(word))
      )
    })

    if (foundPlaylist) {
      console.log("✅ PLAYLIST FOUND:", foundPlaylist.name)

      const playingMsg = `Reproduciendo ${foundPlaylist.name}. Abriendo reproductor integrado...`
      setCurrentText(playingMsg)
      await speak(playingMsg)
      setCurrentText("")

      // 🎵 ACTIVAR REPRODUCTOR INTEGRADO
      setIsPlayingMusic(true)
      setCurrentPlaylist(foundPlaylist.name)
      setCurrentPlaylistUrl(foundPlaylist.spotifyUrl)
      setWaitingForPlaylist(false)
      setAppState("music_playing")
    } else {
      console.log("❌ PLAYLIST NOT FOUND")

      const notFoundMsg = `No encontré una playlist que coincida con "${text}". ¿Puedes repetir el nombre?`
      setCurrentText(notFoundMsg)
      await speak(notFoundMsg)
      setCurrentText("")
    }
  }

  const handleMusicControl = async (text: string) => {
    if (text.includes("quitar") || text.includes("cerrar") || text.includes("apagar")) {
      const stopMsg = "Cerrando reproductor de música. Volviendo al modo normal."
      setCurrentText(stopMsg)
      await speak(stopMsg)
      setCurrentText("")

      setIsPlayingMusic(false)
      setCurrentPlaylist("")
      setCurrentPlaylistUrl("")
      setAppState("active")
    }
  }

  // 🎵 MANEJAR CONTROLES DE SPOTIFY POR VOZ - MEJORADO
  const handleSpotifyControlCommand = async (text: string) => {
    const controlType = CommandDetector.extractSpotifyControl(text)
    console.log("🎵 SPOTIFY CONTROL TYPE:", controlType)

    let responseMsg = ""

    switch (controlType) {
      case "play":
        responseMsg = "Reproduciendo música en Spotify."
        break
      case "pause":
        responseMsg = "Pausando música en Spotify."
        break
      case "next":
        responseMsg = "Cambiando a la siguiente canción."
        break
      case "previous":
        responseMsg = "Volviendo a la canción anterior."
        break
      default:
        responseMsg = "Comando de Spotify no reconocido. Usa: reproducir, pausar, siguiente o anterior."
    }

    setCurrentText(responseMsg)
    await speak(responseMsg)
    setCurrentText("")

    // 🎵 ENVIAR COMANDO REAL A SPOTIFY
    if (controlType !== "unknown" && (window as any).spotifyControl) {
      try {
        ;(window as any).spotifyControl(controlType)
        console.log("🎵 REAL SPOTIFY CONTROL SENT:", controlType)
      } catch (error) {
        console.error("❌ Error sending Spotify control:", error)
      }
    }
  }

  const getMainIcon = () => {
    if (isSpeaking) return <Volume2 className="h-20 w-20 text-cyan-400 animate-pulse" />
    if (isProcessing) return <Loader2 className="h-20 w-20 text-yellow-400 animate-spin" />
    if (appState === "sleeping") return <Power className="h-20 w-20 text-gray-500" />
    if (appState === "waiting_password") return <Lock className="h-20 w-20 text-yellow-400" />
    if (appState === "calling_confirmation") return <Phone className="h-20 w-20 text-green-400 animate-pulse" />
    if (appState === "navigation_mode") return <MapPin className="h-20 w-20 text-blue-400 animate-pulse" />
    if (appState === "spotify_mode") return <Music className="h-20 w-20 text-green-400 animate-pulse" />
    if (appState === "music_playing") return <Music className="h-20 w-20 text-green-400 animate-bounce" />
    if (appState === "map_active") return <MapPin className="h-20 w-20 text-blue-400 animate-bounce" />
    return <Unlock className="h-20 w-20 text-cyan-400" />
  }

  const getCircleClasses = () => {
    const baseClasses =
      "w-64 h-64 rounded-full border-4 flex items-center justify-center transition-all duration-500 relative"

    if (isSpeaking) {
      return `${baseClasses} border-cyan-500 shadow-cyan-500/50 animate-pulse`
    }
    if (isProcessing) {
      return `${baseClasses} border-yellow-500 shadow-yellow-500/50 animate-pulse`
    }
    if (isListening) {
      return `${baseClasses} border-green-500 shadow-green-500/50 animate-pulse`
    }
    if (appState === "sleeping") {
      return `${baseClasses} border-gray-600 opacity-60`
    }
    if (appState === "waiting_password") {
      return `${baseClasses} border-yellow-500 shadow-yellow-500/30`
    }
    if (appState === "calling_confirmation") {
      return `${baseClasses} border-green-500 shadow-green-500/50 animate-pulse`
    }
    if (appState === "navigation_mode") {
      return `${baseClasses} border-blue-500 shadow-blue-500/50 animate-pulse`
    }
    if (appState === "spotify_mode") {
      return `${baseClasses} border-green-500 shadow-green-500/50 animate-pulse`
    }
    if (appState === "music_playing") {
      return `${baseClasses} border-green-500 shadow-green-500/70 animate-pulse`
    }
    if (appState === "map_active") {
      return `${baseClasses} border-blue-500 shadow-blue-500/70 animate-pulse`
    }
    return `${baseClasses} border-cyan-500 shadow-cyan-500/30`
  }

  const getStatusText = () => {
    if (appState === "sleeping") return "Di: 'JARVIS enciéndete'"
    if (appState === "waiting_password") {
      if (isListening) return "Escuchando contraseña..."
      if (isProcessing) return "Verificando contraseña..."
      return "Di la contraseña (automático)"
    }
    if (appState === "calling_confirmation") {
      return pendingCall ? `¿Llamar a ${pendingCall.name}? (Sí/No)` : "Confirmando llamada..."
    }
    if (appState === "navigation_mode") {
      return "¿A dónde quieres ir?"
    }
    if (appState === "spotify_mode") {
      if (isListening) return "Escuchando playlist... (Di 'cancelar' para salir)"
      return waitingForPlaylist ? "Di el nombre de la playlist (o 'cancelar')" : "Seleccionando música..."
    }
    if (appState === "music_playing") {
      if (isListening) return "Solo escucho 'JARVIS quitar música'"
      return "Reproduciendo música (Solo comando: 'quitar música')"
    }
    if (appState === "map_active") {
      if (isListening) return "Solo escucho 'JARVIS quitar mapa'"
      return "Mapa activo (Solo comando: 'quitar mapa')"
    }
    if (isSpeaking) return "JARVIS hablando..."
    if (isProcessing) return "Procesando con ChatGPT..."
    if (isListening) return "Escuchando... (automático)"
    return "Habla libremente (automático)"
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-cyan-400 text-xl">Inicializando JARVIS...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex flex-col relative overflow-hidden">
      {/* ✨ ANIMACIONES DE FONDO ÉPICAS CUANDO HABLA */}
      {isSpeaking && (
        <>
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-cyan-400/30 rounded-full animate-ping"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-cyan-400/20 rounded-full animate-ping delay-75"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-cyan-400/10 rounded-full animate-ping delay-150"></div>
          </div>

          <div className="absolute inset-0 pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-cyan-400 rounded-full animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${1 + Math.random() * 2}s`,
                }}
              />
            ))}
          </div>

          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/4 w-0.5 h-full bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent animate-pulse"></div>
            <div className="absolute top-0 right-1/4 w-0.5 h-full bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent animate-pulse delay-500"></div>
            <div className="absolute left-0 top-1/4 h-0.5 w-full bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent animate-pulse delay-1000"></div>
            <div className="absolute left-0 bottom-1/4 h-0.5 w-full bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent animate-pulse delay-1500"></div>
          </div>

          <div className="absolute inset-0 bg-cyan-500/5 animate-pulse pointer-events-none"></div>
        </>
      )}

      {/* Animated Background Normal */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b border-cyan-500/20 relative z-10">
        <h1 className="text-3xl font-bold text-cyan-400 tracking-wider">JARVIS</h1>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowContactsManager(true)}
            className="text-cyan-400"
            title="Gestionar Contactos"
          >
            <Phone className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowLocationsManager(true)}
            className="text-cyan-400"
            title="Gestionar Ubicaciones"
          >
            <MapPin className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSpotifyManager(true)}
            className="text-cyan-400"
            title="Gestionar Playlists"
          >
            <Music className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => window.location.reload()} className="text-cyan-400">
            <Power className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Main Interface - Solo mostrar si no hay mapa o música activa */}
      {!isMapActive && !isPlayingMusic && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10">
          {/* Central Circle */}
          <div className="relative mb-12">
            <div className={getCircleClasses()}>
              {/* ✨ EFECTOS FUTURISTAS EN EL CÍRCULO CUANDO HABLA */}
              {isSpeaking && (
                <>
                  <div className="absolute inset-0 rounded-full border-2 border-cyan-400/30 animate-ping"></div>
                  <div className="absolute inset-4 rounded-full border-2 border-cyan-400/20 animate-ping delay-75"></div>
                  <div className="absolute inset-8 rounded-full border-2 border-cyan-400/10 animate-ping delay-150"></div>

                  <div className="absolute top-4 left-4 w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-100"></div>
                  <div className="absolute top-8 right-6 w-1 h-1 bg-cyan-300 rounded-full animate-bounce delay-200"></div>
                  <div className="absolute bottom-6 left-8 w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce delay-300"></div>
                  <div className="absolute bottom-4 right-4 w-1 h-1 bg-cyan-200 rounded-full animate-bounce delay-400"></div>

                  <div className="absolute -top-16 left-1/2 transform -translate-x-1/2">
                    <div className="text-cyan-400 text-xs font-mono animate-pulse opacity-70">
                      {">"} JARVIS_SPEAKING
                    </div>
                  </div>
                  <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2">
                    <div className="text-cyan-400 text-xs font-mono animate-pulse opacity-70">
                      {">"} AUDIO_OUTPUT_ACTIVE
                    </div>
                  </div>
                  <div className="absolute top-1/2 -left-20 transform -translate-y-1/2 rotate-90">
                    <div className="text-cyan-400 text-xs font-mono animate-pulse opacity-50">{">"} AI_PROCESSING</div>
                  </div>
                  <div className="absolute top-1/2 -right-20 transform -translate-y-1/2 -rotate-90">
                    <div className="text-cyan-400 text-xs font-mono animate-pulse opacity-50">
                      {">"} VOICE_SYNTHESIS
                    </div>
                  </div>
                </>
              )}

              <div className="w-48 h-48 rounded-full bg-gradient-to-br from-gray-800/50 to-gray-900/50 flex items-center justify-center backdrop-blur-sm">
                {getMainIcon()}
              </div>
            </div>

            {/* Status Text */}
            <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 text-center w-full">
              <p
                className={`text-sm font-medium ${
                  appState === "sleeping"
                    ? "text-gray-400"
                    : appState === "waiting_password"
                      ? "text-yellow-400"
                      : appState === "calling_confirmation"
                        ? "text-green-400"
                        : appState === "navigation_mode"
                          ? "text-blue-400"
                          : appState === "spotify_mode"
                            ? "text-green-400"
                            : appState === "music_playing"
                              ? "text-green-400"
                              : appState === "map_active"
                                ? "text-blue-400"
                                : "text-cyan-400"
                }`}
              >
                {getStatusText()}
              </p>
            </div>
          </div>

          {/* Current Speech con efectos futuristas */}
          {currentText && (
            <Card className="mb-8 bg-gray-900/80 border-cyan-500/30 p-6 max-w-lg backdrop-blur-sm relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-cyan-500/5 animate-pulse"></div>
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse"></div>
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse delay-500"></div>

              <div className="text-center relative z-10">
                <p className="text-cyan-100 text-sm mb-3 font-medium font-mono">{">"} JARVIS_OUTPUT:</p>
                <p className="text-cyan-300 text-lg leading-relaxed font-light">{currentText}</p>
                <span className="inline-block w-2 h-5 bg-cyan-400 ml-1 animate-pulse"></span>
              </div>
            </Card>
          )}

          {/* 🖼️ MOSTRAR IMAGEN ACTUAL */}
          {currentImage && (
            <Card className="mb-8 bg-gray-900/80 border-cyan-500/30 p-6 max-w-md backdrop-blur-sm relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-cyan-500/5 animate-pulse"></div>
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse"></div>
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse delay-500"></div>

              <div className="text-center relative z-10">
                <div className="flex items-center justify-center mb-3">
                  <ImageIcon className="h-4 w-4 text-cyan-400 mr-2" />
                  <p className="text-cyan-100 text-sm font-medium font-mono">{">"} IMAGE_DISPLAY:</p>
                </div>
                <div className="rounded-lg overflow-hidden border border-cyan-500/30">
                  <img
                    src={currentImage.url || "/placeholder.svg"}
                    alt={currentImage.prompt}
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      console.error("Image failed to load")
                      setCurrentImage(null)
                    }}
                  />
                </div>
                <p className="text-cyan-300 text-sm mt-2 opacity-70">{currentImage.prompt}</p>
              </div>
            </Card>
          )}

          {!isSupported && (
            <p className="text-red-400 text-sm mt-4">Reconocimiento de voz no soportado en este navegador</p>
          )}
        </div>
      )}

      {/* Messages - Solo mostrar si no hay mapa o música activa */}
      {!isMapActive && !isPlayingMusic && messages.length > 0 && (
        <div className="p-6 max-h-60 overflow-y-auto relative z-10">
          <Card className="bg-gray-900/60 border-cyan-500/20 p-4 backdrop-blur-sm">
            <div className="space-y-3">
              {messages.slice(-3).map((msg, idx) => (
                <div key={idx} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-xs px-4 py-3 rounded-2xl text-sm ${
                      msg.type === "user"
                        ? "bg-cyan-500 text-black"
                        : "bg-gray-700/80 text-cyan-100 border border-cyan-500/20"
                    }`}
                  >
                    <p className="font-bold text-xs mb-1 opacity-70 font-mono">
                      {msg.type === "user" ? "> JOAQUÍN:" : "> JARVIS:"}
                    </p>
                    <p>{msg.text}</p>
                    {msg.imageUrl && (
                      <div className="mt-2 rounded overflow-hidden border border-cyan-500/30">
                        <img
                          src={msg.imageUrl || "/placeholder.svg"}
                          alt={msg.imagePrompt || "Imagen"}
                          className="w-full h-24 object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Debug Info - Solo mostrar si no hay mapa o música activa */}
      {!isMapActive && !isPlayingMusic && (
        <div className="p-4 text-center relative z-10">
          <p className="text-gray-500 text-xs">
            Estado: {appState} | Escuchando: {isListening ? "Sí" : "No"} | Hablando: {isSpeaking ? "Sí" : "No"} |
            Procesando: {isProcessing ? "Sí" : "No"} | 🎤{" "}
            {isPlayingMusic ? "SOLO MÚSICA" : isMapActive ? "SOLO MAPA" : "AUTOMÁTICO"}
          </p>
          {transcript && <p className="text-yellow-400 text-xs mt-1">Último: "{transcript}"</p>}
        </div>
      )}

      {/* 🎵 REPRODUCTOR DE SPOTIFY INTEGRADO */}
      <SpotifyPlayer
        isPlaying={isPlayingMusic}
        playlistUrl={currentPlaylistUrl}
        playlistName={currentPlaylist}
        onStop={() => {
          setIsPlayingMusic(false)
          setCurrentPlaylist("")
          setCurrentPlaylistUrl("")
          setAppState("active")
        }}
        onSpotifyControl={(action) => {
          console.log("🎵 SPOTIFY CONTROL FROM VOICE:", action)
          // Aquí puedes manejar la acción si necesitas feedback adicional
        }}
      />

      {/* 🗺️ MAPA INTEGRADO */}
      <MapViewer
        ref={mapViewerRef}
        isActive={isMapActive}
        destination={currentDestination}
        destinationAddress={currentDestinationAddress}
        onClose={() => {
          setIsMapActive(false)
          setCurrentDestination("")
          setCurrentDestinationAddress("")
          setAppState("active")
        }}
        onNavigationUpdate={handleNavigationUpdate}
      />

      {/* 📱 GESTORES */}
      <ContactsManager isOpen={showContactsManager} onClose={() => setShowContactsManager(false)} />
      <LocationsManager isOpen={showLocationsManager} onClose={() => setShowLocationsManager(false)} />
      <SpotifyManager isOpen={showSpotifyManager} onClose={() => setShowSpotifyManager(false)} />
    </div>
  )
}
