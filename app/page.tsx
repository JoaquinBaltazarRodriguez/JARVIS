"use client"

import { useState, useEffect, useRef } from "react"
import {
  Power,
  Volume2,
  Loader2,
  Lock,
  Unlock,
  ImageIcon,
  Phone,
  MapPin,
  Music,
  Brain,
  Mail,
  MessageCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useSimpleAudio } from "@/hooks/useSimpleAudio"
import { useAutoSpeech } from "@/hooks/useAutoSpeech"
import { useFuturisticSounds } from "@/hooks/useFuturisticSounds"
import { ContactsManager } from "@/components/ContactsManager"
import { LocationsManager } from "@/components/LocationsManager"
import { SpotifyManager } from "@/components/SpotifyManager"
import { MapViewer, type MapViewerRef } from "@/components/MapViewer"
import { ContactsDB, LocationsDB, SpotifyDB, CommandDetector, TimeUtils } from "@/lib/database"
import { ConversationsManager } from "@/components/ConversationsManager"
import { ConversationsDB, type Conversation, type ConversationMessage } from "@/lib/conversations"
import { usePillReminder } from "@/hooks/usePillReminder"
import { TokenDisplay } from "@/components/TokenDisplay"
import { TokenManager } from "@/lib/tokenManager"
import { LocalCommands } from "@/lib/localCommands"
import { JarvisMemory } from "@/lib/jarvisMemory"
import { SpotifyPlayerWorking } from "@/components/SpotifyPlayerWorking"

// Define types
type AppState =
  | "sleeping"
  | "waiting_password"
  | "active"
  | "calling_confirmation"
  | "navigation_mode"
  | "spotify_mode"
  | "music_playing"
  | "map_active"
  | "intelligent_mode"
  | "functional_mode"
  | "image_download_confirmation"

type Message = {
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

  // 💬 ESTADOS PARA CONVERSACIONES
  const [showConversationsManager, setShowConversationsManager] = useState(false)
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [conversationMessages, setConversationMessages] = useState<ConversationMessage[]>([])

  // 🖼️ NUEVOS ESTADOS PARA DESCARGA DE IMÁGENES
  const [pendingImageDownload, setPendingImageDownload] = useState<{ url: string; prompt: string } | null>(null)
  const [waitingImageDownloadConfirmation, setWaitingImageDownloadConfirmation] = useState(false)

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
  const { playStartupSound, playShutdownSound, playClickSound, playHoverSound } = useFuturisticSounds()
  const { showReminder, currentTime, dismissReminder } = usePillReminder((message: string) => {
    console.log("💊 PILL REMINDER TRIGGERED:", message)
    speak(message)
  })

  const mapViewerRef = useRef<MapViewerRef>(null)

  useEffect(() => {
    setSpeakingState(isSpeaking)
  }, [isSpeaking, setSpeakingState])

  useEffect(() => {
    setMounted(true)
  }, [])

  // 🔊 AGREGAR SONIDOS DE CLIC GLOBALES
  useEffect(() => {
    if (mounted) {
      const handleGlobalClick = (e: MouseEvent) => {
        // Solo reproducir sonido si JARVIS está activo
        if (appState !== "sleeping") {
          playClickSound()
        }
      }

      const handleGlobalMouseOver = (e: MouseEvent) => {
        const target = e.target as HTMLElement
        // Solo para botones y elementos interactivos
        if (target.tagName === "BUTTON" || target.classList.contains("cursor-pointer")) {
          if (appState !== "sleeping") {
            playHoverSound()
          }
        }
      }

      document.addEventListener("click", handleGlobalClick)
      document.addEventListener("mouseover", handleGlobalMouseOver)

      return () => {
        document.removeEventListener("click", handleGlobalClick)
        document.removeEventListener("mouseover", handleGlobalMouseOver)
      }
    }
  }, [mounted, appState, playClickSound, playHoverSound])

  // 🎵 MANEJAR AUTENTICACIÓN DE SPOTIFY AL CARGAR
  useEffect(() => {
    if (mounted) {
      const urlParams = new URLSearchParams(window.location.search)

      // Manejar éxito de autenticación de Spotify
      if (urlParams.get("spotify_success") === "true") {
        const accessToken = urlParams.get("access_token")
        const refreshToken = urlParams.get("refresh_token")
        const expiresIn = urlParams.get("expires_in")

        if (accessToken) {
          // Guardar tokens en localStorage
          localStorage.setItem("spotify_access_token", accessToken)
          if (refreshToken) localStorage.setItem("spotify_refresh_token", refreshToken)
          if (expiresIn)
            localStorage.setItem("spotify_expires_at", (Date.now() + Number.parseInt(expiresIn) * 1000).toString())

          console.log("✅ SPOTIFY AUTHENTICATED SUCCESSFULLY")

          // Limpiar URL
          window.history.replaceState({}, document.title, window.location.pathname)

          // Mostrar mensaje de éxito
          const successMsg =
            "Spotify conectado exitosamente, Señor. Ahora puede controlar la música directamente desde JARVIS."
          setCurrentText(successMsg)
          speak(successMsg).then(() => setCurrentText(""))
        }
      }

      // Manejar errores de autenticación de Spotify
      const spotifyError = urlParams.get("spotify_error")
      if (spotifyError) {
        console.error("❌ SPOTIFY AUTH ERROR:", spotifyError)

        let errorMsg = "Error conectando con Spotify, Señor. "
        switch (spotifyError) {
          case "access_denied":
            errorMsg += "Acceso denegado por el usuario."
            break
          case "no_code":
            errorMsg += "No se recibió código de autorización."
            break
          case "token_exchange":
            errorMsg += "Error intercambiando código por token."
            break
          default:
            errorMsg += "Error desconocido en la autenticación."
        }

        setCurrentText(errorMsg)
        speak(errorMsg).then(() => setCurrentText(""))

        // Limpiar URL
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    }
  }, [mounted, speak])

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
      appState === "spotify_mode" ||
      appState === "intelligent_mode" ||
      appState === "functional_mode" ||
      appState === "image_download_confirmation"
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
      } else if (appState === "image_download_confirmation") {
        // 🖼️ MANEJAR CONFIRMACIÓN DE DESCARGA DE IMAGEN
        handleImageDownloadConfirmation(text)
      } else if (appState === "music_playing") {
        // 🎵 CONTROLES DE SPOTIFY POR VOZ
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
      } else if (appState === "active" || appState === "intelligent_mode" || appState === "functional_mode") {
        if (CommandDetector.isCancelCommand(text)) {
          console.log("❌ CANCEL COMMAND DETECTED")
          handleCancelAction()
        } else if (CommandDetector.isTimeCommand(text)) {
          console.log("🕐 TIME COMMAND DETECTED")
          handleTimeCommand()
        } else if (text.includes("jarvis") && (text.includes("apágate") || text.includes("apagate"))) {
          console.log("🔌 SHUTDOWN COMMAND DETECTED")
          handleShutdown()
        }
        // 🧠 COMANDOS DE MODO INTELIGENTE
        else if (text.includes("modo inteligente") || text.includes("activación inteligente")) {
          console.log("🧠 INTELLIGENT MODE COMMAND DETECTED")
          handleIntelligentMode()
        }
        // 🔧 COMANDOS DE MODO FUNCIONAL
        else if (text.includes("modo funcional") || text.includes("activación funcional")) {
          console.log("🔧 FUNCTIONAL MODE COMMAND DETECTED")
          handleFunctionalMode()
        }
        // 🔄 VOLVER AL MODO NORMAL
        else if (text.includes("modo normal") || text.includes("salir del modo")) {
          console.log("🔄 NORMAL MODE COMMAND DETECTED")
          handleNormalMode()
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

  // 🖼️ NUEVA FUNCIÓN PARA MANEJAR CONFIRMACIÓN DE DESCARGA
  const handleImageDownloadConfirmation = async (text: string) => {
    if (
      text.includes("sí") ||
      text.includes("si") ||
      text.includes("quiero") ||
      text.includes("descargar") ||
      text.includes("confirmo") ||
      text.includes("descarga")
    ) {
      if (pendingImageDownload) {
        const downloadMsg = "Descargando imagen, Señor..."
        setCurrentText(downloadMsg)
        await speak(downloadMsg)
        setCurrentText("")

        // Descargar imagen
        try {
          const response = await fetch(pendingImageDownload.url)
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const link = document.createElement("a")
          link.href = url
          link.download = `jarvis-image-${Date.now()}.png`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          window.URL.revokeObjectURL(url)

          const successMsg = "Imagen descargada exitosamente, Señor."
          setCurrentText(successMsg)
          await speak(successMsg)
          setCurrentText("")
        } catch (error) {
          const errorMsg = "Error descargando la imagen, Señor."
          setCurrentText(errorMsg)
          await speak(errorMsg)
          setCurrentText("")
        }

        setPendingImageDownload(null)
        setWaitingImageDownloadConfirmation(false)
        setAppState("intelligent_mode") // Volver al modo inteligente
      }
    } else if (text.includes("no") || text.includes("cancela") || text.includes("cancelar")) {
      const cancelMsg = "Descarga cancelada, Señor. Continuando..."
      setCurrentText(cancelMsg)
      await speak(cancelMsg)
      setCurrentText("")

      setPendingImageDownload(null)
      setWaitingImageDownloadConfirmation(false)
      setAppState("intelligent_mode") // Volver al modo inteligente
    }
  }

  // 💬 CREAR NUEVA CONVERSACIÓN
  const handleNewConversation = () => {
    const title = ConversationsDB.generateAutoTitle(messages)
    const newConversation = ConversationsDB.create(title)
    setCurrentConversation(newConversation)
    setConversationMessages([])
    setMessages([])
    console.log("💬 NEW CONVERSATION STARTED:", newConversation.title)
  }

  // 💬 SELECCIONAR CONVERSACIÓN EXISTENTE
  const handleSelectConversation = (conversationId: string) => {
    const conversation = ConversationsDB.getById(conversationId)
    if (conversation) {
      setCurrentConversation(conversation)
      setConversationMessages(conversation.messages)
      // Convertir mensajes de conversación a formato de la interfaz
      const interfaceMessages: Message[] = conversation.messages.map((msg) => ({
        text: msg.text,
        type: msg.type,
        imageUrl: msg.imageUrl,
        imagePrompt: msg.imagePrompt,
      }))
      setMessages(interfaceMessages)
      console.log("💬 CONVERSATION LOADED:", conversation.title)
    }
  }

  // 💬 GUARDAR MENSAJE EN CONVERSACIÓN ACTUAL
  const saveMessageToConversation = (
    text: string,
    type: "user" | "jarvis",
    imageUrl?: string,
    imagePrompt?: string,
  ) => {
    if (!currentConversation) {
      // Crear nueva conversación automáticamente
      const title = type === "user" ? text.substring(0, 30) + "..." : "Nueva conversación"
      const newConversation = ConversationsDB.create(title)
      setCurrentConversation(newConversation)
    }

    if (currentConversation) {
      const message: ConversationMessage = {
        id: Date.now().toString(),
        text,
        type,
        timestamp: new Date(),
        imageUrl,
        imagePrompt,
      }

      ConversationsDB.addMessage(currentConversation.id, message)
      setConversationMessages((prev) => [...prev, message])
    }
  }

  const handleIntelligentMode = async () => {
    setAppState("intelligent_mode")
    const intelligentMsg =
      "Modo inteligente activado, Señor. Ahora tengo acceso a capacidades avanzadas de IA. Puedo ayudarle con programación, análisis técnico, resolución de problemas complejos y generación de imágenes. ¿En qué puedo asistirle?"
    setCurrentText(intelligentMsg)
    setMessages((prev) => [...prev, { text: intelligentMsg, type: "jarvis" }])
    await speak(intelligentMsg)
    setCurrentText("")
  }

  // 🔧 MANEJAR MODO FUNCIONAL
  const handleFunctionalMode = async () => {
    setAppState("functional_mode")
    const functionalMsg =
      "Modo funcional activado, Señor. Puedo gestionar correos electrónicos, WhatsApp, aplicaciones y realizar tareas administrativas. ¿Qué función necesita que ejecute?"
    setCurrentText(functionalMsg)
    setMessages((prev) => [...prev, { text: functionalMsg, type: "jarvis" }])
    await speak(functionalMsg)
    setCurrentText("")
  }

  // 🔄 VOLVER AL MODO NORMAL
  const handleNormalMode = async () => {
    setAppState("active")
    const normalMsg = "Volviendo al modo normal, Señor. ¿En qué más puedo asistirle?"
    setCurrentText(normalMsg)
    setMessages((prev) => [...prev, { text: normalMsg, type: "jarvis" }])
    await speak(normalMsg)
    setCurrentText("")
  }

  // 📱 MANEJAR COMANDO DE LLAMADA
  const handleCallCommand = async (text: string) => {
    const contactName = CommandDetector.extractContactName(text)
    console.log("📱 EXTRACTED CONTACT NAME:", contactName)

    if (!contactName) {
      const msg = "¿A quién desea llamar, Señor?"
      setCurrentText(msg)
      await speak(msg)
      setCurrentText("")
      return
    }

    const contact = ContactsDB.findByName(contactName)
    if (contact) {
      setPendingCall({ name: contact.name, phone: contact.phone })
      setAppState("calling_confirmation")

      const confirmMsg = `¿Desea llamar a ${contact.name}, Señor?`
      setCurrentText(confirmMsg)
      await speak(confirmMsg)
      setCurrentText("")
    } else {
      const notFoundMsg = `No encontré a ${contactName} en su agenda, Señor. ¿Desea que abra el gestor de contactos?`
      setCurrentText(notFoundMsg)
      await speak(notFoundMsg)
      setCurrentText("")
    }
  }

  // 📱 MANEJAR CONFIRMACIÓN DE LLAMADA
  const handleCallConfirmation = async (text: string) => {
    if (text.includes("sí") || text.includes("si") || text.includes("confirmo") || text.includes("llama")) {
      if (pendingCall) {
        const callingMsg = `Llamando a ${pendingCall.name}, Señor...`
        setCurrentText(callingMsg)
        await speak(callingMsg)
        setCurrentText("")

        window.open(`tel:${pendingCall.phone}`, "_self")

        setPendingCall(null)
        setAppState("active")
      }
    } else if (text.includes("no") || text.includes("cancela") || text.includes("cancelar")) {
      const cancelMsg = "Llamada cancelada, Señor."
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

    const navMsg = "Por supuesto, Señor. ¿A dónde desea dirigirse?"
    setCurrentText(navMsg)
    await speak(navMsg)
    setCurrentText("")
  }

  // 🗺️ MANEJAR COMANDO DE NAVEGACIÓN
  const handleNavigationCommand = async (text: string) => {
    const locationName = CommandDetector.extractLocationName(text)
    console.log("🗺️ EXTRACTED LOCATION NAME:", locationName)

    if (!locationName) {
      const msg = "¿A qué ubicación específica desea ir, Señor?"
      setCurrentText(msg)
      await speak(msg)
      setCurrentText("")
      return
    }

    const location = LocationsDB.findByName(locationName)
    if (location) {
      const navMsg = `Abriendo navegación hacia ${location.name}, Señor...`
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
      const notFoundMsg = `No encontré ${locationName} en sus ubicaciones guardadas, Señor.`
      setCurrentText(notFoundMsg)
      await speak(notFoundMsg)
      setCurrentText("")

      setIsNavigating(false)
      setAppState("active")
    }
  }

  // 🗺️ CERRAR MAPA
  const handleCloseMap = async () => {
    const closeMsg = "Cerrando navegación, Señor. Volviendo al modo normal."
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
    const startMsg = "Iniciando navegación por voz hacia " + currentDestination + ", Señor."
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
      const welcomeMsg = "Bienvenido, Señor. JARVIS está ahora completamente operativo. ¿En qué puedo asistirle hoy?"
      setMessages((prev) => [...prev, { text: welcomeMsg, type: "jarvis" }])
      setCurrentText(welcomeMsg)

      playStartupSound()
      setAppState("active")
      setHasInitialized(true)

      await speak(welcomeMsg)
      setCurrentText("")
    } else {
      console.log("❌ PASSWORD INCORRECT")
      const errorMsg = "Contraseña incorrecta. Por favor, proporcione la contraseña de reconocimiento."
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

    const goodbye = "Desactivando JARVIS. Hasta luego, Señor."
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
    setPendingImageDownload(null)
    setWaitingImageDownloadConfirmation(false)
    setHasInitialized(false)
    setIsProcessing(false)
  }

  const handleUserMessage = async (message: string) => {
    console.log("📨 USER MESSAGE:", message)
    setIsProcessing(true)
    setMessages((prev) => [...prev, { text: message, type: "user" }])

    // 💬 GUARDAR EN CONVERSACIÓN
    saveMessageToConversation(message, "user")

    // 🧠 GUARDAR EN MEMORIA DE JARVIS
    JarvisMemory.saveMemory("context", message, ["user_input"])

    try {
      // 🔧 PROCESAR COMANDOS LOCALES EN MODO NORMAL Y FUNCIONAL
      if (appState === "active" || appState === "functional_mode") {
        const mode = appState === "functional_mode" ? "functional" : "normal"
        const localCommand = LocalCommands.processCommand(message, mode)

        if (localCommand) {
          console.log("🔧 LOCAL COMMAND PROCESSED:", localCommand)

          setMessages((prev) => [...prev, { text: localCommand.response, type: "jarvis" }])
          saveMessageToConversation(localCommand.response, "jarvis")

          setCurrentText(localCommand.response)
          await speak(localCommand.response)
          setCurrentText("")

          // Ejecutar acción si existe
          if (localCommand.action) {
            switch (localCommand.action) {
              case "call":
                if (localCommand.data?.contactName) {
                  handleCallCommand(`llama a ${localCommand.data.contactName}`)
                }
                break
              case "navigate":
                if (localCommand.data?.destination) {
                  handleNavigationStart(`ir a ${localCommand.data.destination}`)
                }
                break
              case "spotify":
                handleSpotifyCommand()
                break
              case "cancel":
                handleCancelAction()
                break
            }
          }

          setIsProcessing(false)
          return
        }
      }

      // 🧠 SOLO USAR OPENAI EN MODO INTELIGENTE
      if (appState !== "intelligent_mode") {
        const restrictedMsg =
          appState === "functional_mode"
            ? "Señor, para consultas libres debe activar el modo inteligente. En modo funcional solo ejecuto comandos específicos."
            : "Señor, para consultas libres debe activar el modo inteligente. En modo normal solo ejecuto comandos básicos."

        setMessages((prev) => [...prev, { text: restrictedMsg, type: "jarvis" }])
        saveMessageToConversation(restrictedMsg, "jarvis")
        setCurrentText(restrictedMsg)
        await speak(restrictedMsg)
        setCurrentText("")
        setIsProcessing(false)
        return
      }

      // 🚫 VERIFICAR LÍMITES DE TOKENS
      const tokenCheck = TokenManager.canUseTokens()
      if (!tokenCheck.allowed) {
        const limitMsg = `Señor, ${tokenCheck.reason} Por favor, revise su panel de OpenAI.`
        setMessages((prev) => [...prev, { text: limitMsg, type: "jarvis" }])
        saveMessageToConversation(limitMsg, "jarvis")
        setCurrentText(limitMsg)
        await speak(limitMsg)
        setCurrentText("")
        setIsProcessing(false)
        return
      }

      // Resto del código para llamar a la API...
      console.log("🧠 CALLING CHAT API - INTELLIGENT MODE ONLY...")

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          intelligentMode: true,
          functionalMode: false,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // 💰 REGISTRAR USO DE TOKENS SI EXISTE
        if (data.tokensUsed && data.tokensUsed > 0) {
          const usage = TokenManager.recordUsage(data.tokensUsed)

          // 🚨 VERIFICAR ALERTAS
          const alert = TokenManager.checkLimits()
          if (alert) {
            console.log("🚨 TOKEN ALERT:", alert)
            setTimeout(() => {
              speak(`Señor, ${alert.message}`)
            }, 3000)
          }
        }

        // 🧠 REGISTRAR INTERACCIÓN EN MEMORIA
        JarvisMemory.recordInteraction(message, data.response)

        // 🖼️ PROCESAR RESPUESTA CON IMAGEN - NUEVA LÓGICA
        if (data.hasImage && data.imageUrl) {
          setCurrentImage({
            url: data.imageUrl,
            prompt: data.imagePrompt || message,
          })

          setMessages((prev) => [
            ...prev,
            {
              text: data.response,
              type: "jarvis",
              imageUrl: data.imageUrl,
              imagePrompt: data.imagePrompt || message,
            },
          ])

          saveMessageToConversation(data.response, "jarvis", data.imageUrl, data.imagePrompt || message)

          setCurrentText(data.response)
          await speak(data.response)
          setCurrentText("")

          // 🖼️ PREGUNTAR SI QUIERE DESCARGAR LA IMAGEN
          setTimeout(async () => {
            const downloadQuestion = "¿Desea descargar esta imagen, Señor?"
            setCurrentText(downloadQuestion)
            await speak(downloadQuestion)
            setCurrentText("")

            // Configurar estado para confirmación de descarga
            setPendingImageDownload({
              url: data.imageUrl,
              prompt: data.imagePrompt || message,
            })
            setWaitingImageDownloadConfirmation(true)
            setAppState("image_download_confirmation")
          }, 2000)
        } else {
          setMessages((prev) => [...prev, { text: data.response, type: "jarvis" }])
          saveMessageToConversation(data.response)

          setCurrentText(data.response)
          await speak(data.response)
          setCurrentText("")
        }
      }
    } catch (error) {
      console.error("❌ ERROR:", error)
      const errorMsg = "Lo siento, Señor, tuve un problema técnico. Inténtelo de nuevo."
      setMessages((prev) => [...prev, { text: errorMsg, type: "jarvis" }])
      saveMessageToConversation(errorMsg, "jarvis")
      setCurrentText(errorMsg)
      await speak(errorMsg)
      setCurrentText("")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancelAction = async () => {
    console.log("❌ CANCELING ACTION")
    const cancelMsg = "Acción cancelada, Señor. Volviendo al modo normal."
    setCurrentText(cancelMsg)
    await speak(cancelMsg)
    setCurrentText("")

    setPendingCall(null)
    setIsNavigating(false)
    setWaitingForPlaylist(false)
    setPendingImageDownload(null)
    setWaitingImageDownloadConfirmation(false)
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
    const agendaMsg = "Abriendo su agenda de contactos, Señor."
    setCurrentText(agendaMsg)
    await speak(agendaMsg)
    setCurrentText("")
    setShowContactsManager(true)
  }

  const handleSpotifyCommand = async () => {
    console.log("🎵 SPOTIFY COMMAND DETECTED")
    setAppState("spotify_mode")
    setWaitingForPlaylist(true)

    const spotifyMsg = "¿Qué playlist desea escuchar, Señor?"
    setCurrentText(spotifyMsg)
    await speak(spotifyMsg)
    setCurrentText("")
  }

  const handleSpotifyPlaylistSelection = async (text: string) => {
    console.log("🎵 RAW SPOTIFY INPUT:", text)

    const lowerText = text.toLowerCase().trim()
    const playlists = SpotifyDB.getAll()

    console.log(
      "🎵 AVAILABLE PLAYLISTS:",
      playlists.map((p) => p.name),
    )

    // 🔍 BÚSQUEDA MEJORADA DE PLAYLIST - VERSIÓN CORREGIDA
    const foundPlaylist = playlists.find((playlist) => {
      const playlistName = playlist.name.toLowerCase()
      console.log(`🔍 COMPARING: "${lowerText}" with "${playlistName}"`)

      // 1. Búsqueda exacta primero
      if (lowerText === playlistName) {
        console.log("✅ EXACT MATCH FOUND")
        return true
      }

      // 2. Búsqueda por inclusión directa (muy importante para casos como "música de los 80")
      if (playlistName.includes(lowerText) || lowerText.includes(playlistName)) {
        console.log("✅ INCLUSION MATCH FOUND")
        return true
      }

      // 3. Búsqueda por palabras individuales
      const textWords = lowerText.split(" ").filter((word) => word.length > 2)
      const playlistWords = playlistName.split(" ").filter((word) => word.length > 2)

      // Contar palabras que coinciden
      const matchingWords = textWords.filter((textWord) =>
        playlistWords.some(
          (playlistWord) =>
            playlistWord.includes(textWord) || textWord.includes(playlistWord) || playlistWord === textWord,
        ),
      )

      // Si coinciden al menos 2 palabras o 1 palabra importante (>3 caracteres)
      if (matchingWords.length >= 2 || matchingWords.some((word) => word.length > 3)) {
        console.log("✅ KEYWORD MATCH FOUND:", matchingWords)
        return true
      }

      // 4. Búsqueda especial para números y caracteres especiales
      const normalizedText = lowerText.replace(/[áéíóú]/g, (match) => {
        const replacements: { [key: string]: string } = { á: "a", é: "e", í: "i", ó: "o", ú: "u" }
        return replacements[match] || match
      })
      const normalizedPlaylist = playlistName.replace(/[áéíóú]/g, (match) => {
        const replacements: { [key: string]: string } = { á: "a", é: "e", í: "i", ó: "o", ú: "u" }
        return replacements[match] || match
      })

      if (normalizedPlaylist.includes(normalizedText) || normalizedText.includes(normalizedPlaylist)) {
        console.log("✅ NORMALIZED MATCH FOUND")
        return true
      }

      return false
    })

    if (foundPlaylist) {
      console.log("✅ PLAYLIST FOUND:", foundPlaylist.name)

      const playingMsg = `Reproduciendo ${foundPlaylist.name}, Señor. Abriendo reproductor integrado...`
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

      // Mostrar playlists disponibles
      const availablePlaylists = playlists.map((p) => p.name).join(", ")
      const notFoundMsg = `No encontré una playlist que coincida con "${text}", Señor. Las playlists disponibles son: ${availablePlaylists}. ¿Puede repetir el nombre?`
      setCurrentText(notFoundMsg)
      await speak(notFoundMsg)
      setCurrentText("")
    }
  }

  const handleMusicControl = async (text: string) => {
    if (text.includes("quitar") || text.includes("cerrar") || text.includes("apagar")) {
      const stopMsg = "Cerrando reproductor de música, Señor. Volviendo al modo normal."
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

    // 🎵 USAR CONTROL REAL DE SPOTIFY
    const spotifyControl = (window as any).spotifyVoiceControl

    if (spotifyControl) {
      switch (controlType) {
        case "play":
          spotifyControl.play()
          responseMsg = `Reproduciendo ${spotifyControl.currentTrack || "música"} en Spotify, Señor.`
          break
        case "pause":
          spotifyControl.pause()
          responseMsg = "Pausando música en Spotify, Señor."
          break
        case "next":
          spotifyControl.next()
          responseMsg = "Cambiando a la siguiente canción, Señor."
          break
        case "previous":
          spotifyControl.previous()
          responseMsg = "Volviendo a la canción anterior, Señor."
          break
        default:
          responseMsg = "Comando de Spotify no reconocido, Señor. Use: reproducir, pausar, siguiente o anterior."
      }
    } else {
      responseMsg = "Reproductor de Spotify no disponible, Señor. Abra una playlist primero."
    }

    setCurrentText(responseMsg)
    await speak(responseMsg)
    setCurrentText("")

    console.log("🎵 SPOTIFY VOICE CONTROL EXECUTED:", controlType)
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
    if (appState === "intelligent_mode") return <Brain className="h-20 w-20 text-purple-400 animate-pulse" />
    if (appState === "functional_mode") return <Mail className="h-20 w-20 text-orange-400 animate-pulse" />
    if (appState === "image_download_confirmation")
      return <ImageIcon className="h-20 w-20 text-cyan-400 animate-pulse" />
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
    if (appState === "intelligent_mode") {
      return `${baseClasses} border-purple-500 shadow-purple-500/50 animate-pulse`
    }
    if (appState === "functional_mode") {
      return `${baseClasses} border-orange-500 shadow-orange-500/50 animate-pulse`
    }
    if (appState === "image_download_confirmation") {
      return `${baseClasses} border-cyan-500 shadow-cyan-500/50 animate-pulse`
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
      return "¿A dónde quiere ir?"
    }
    if (appState === "spotify_mode") {
      if (isListening) return "Escuchando playlist... (Di 'cancelar' para salir)"
      return waitingForPlaylist ? "Di el nombre de la playlist (o 'cancelar')" : "Seleccionando música..."
    }
    if (appState === "image_download_confirmation") {
      if (isListening) return "¿Descargar imagen? (Sí/No)"
      return "Esperando confirmación de descarga..."
    }
    if (appState === "music_playing") {
      if (isListening) return "Solo escucho 'JARVIS quitar música'"
      return "Reproduciendo música (Solo comando: 'quitar música')"
    }
    if (appState === "map_active") {
      if (isListening) return "Solo escucho 'JARVIS quitar mapa'"
      return "Mapa activo (Solo comando: 'quitar mapa')"
    }
    if (appState === "intelligent_mode") {
      if (isSpeaking) return "JARVIS hablando..."
      if (isProcessing) return "Procesando con IA avanzada..."
      if (isListening) return "Modo inteligente - Escuchando... (automático)"
      return "Modo inteligente activo (automático)"
    }
    if (appState === "functional_mode") {
      if (isSpeaking) return "JARVIS hablando..."
      if (isProcessing) return "Ejecutando función..."
      if (isListening) return "Modo funcional - Escuchando... (automático)"
      return "Modo funcional activo (automático)"
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
        <div className="flex items-center space-x-4">
          <h1 className="text-3xl font-bold text-cyan-400 tracking-wider">JARVIS</h1>

          {/* 💰 DISPLAY DE TOKENS */}
          <TokenDisplay />

          {/* 🧠 MODO INTELIGENTE HEADER */}
          {appState === "intelligent_mode" && (
            <div className="flex items-center space-x-2 bg-purple-900/30 px-4 py-2 rounded-full border border-purple-500/50">
              <Brain className="h-5 w-5 text-purple-400" />
              <span className="text-purple-300 text-sm font-bold">🧠 MODO INTELIGENTE</span>
            </div>
          )}

          {/* 🔧 MODO FUNCIONAL HEADER */}
          {appState === "functional_mode" && (
            <div className="flex items-center space-x-2 bg-orange-900/30 px-4 py-2 rounded-full border border-orange-500/50">
              <Mail className="h-5 w-5 text-orange-400" />
              <span className="text-orange-300 text-sm font-bold">📧 MODO FUNCIONAL</span>
            </div>
          )}

          {/* 🖼️ MODO CONFIRMACIÓN DESCARGA */}
          {appState === "image_download_confirmation" && (
            <div className="flex items-center space-x-2 bg-cyan-900/30 px-4 py-2 rounded-full border border-cyan-500/50">
              <ImageIcon className="h-5 w-5 text-cyan-400" />
              <span className="text-cyan-300 text-sm font-bold">🖼️ CONFIRMAR DESCARGA</span>
            </div>
          )}
        </div>

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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowConversationsManager(true)}
            className="text-cyan-400"
            title="Historial de Conversaciones"
          >
            <MessageCircle className="h-5 w-5" />
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
                                : appState === "intelligent_mode"
                                  ? "text-purple-400"
                                  : appState === "functional_mode"
                                    ? "text-orange-400"
                                    : appState === "image_download_confirmation"
                                      ? "text-cyan-400"
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
                <p className="text-cyan-100 text-sm mb-3 font-medium font-mono">
                  {">"}{" "}
                  {appState === "intelligent_mode"
                    ? "JARVIS_INTELLIGENT_OUTPUT:"
                    : appState === "functional_mode"
                      ? "JARVIS_FUNCTIONAL_OUTPUT:"
                      : appState === "image_download_confirmation"
                        ? "JARVIS_DOWNLOAD_CONFIRMATION:"
                        : "JARVIS_OUTPUT:"}
                </p>
                <p className="text-cyan-300 text-lg leading-relaxed font-light">{currentText}</p>
                <span className="inline-block w-2 h-5 bg-cyan-400 ml-1 animate-pulse"></span>
              </div>
            </Card>
          )}

          {/* 🖼️ MOSTRAR IMAGEN ACTUAL - SIN BOTÓN DE DESCARGA MANUAL */}
          {currentImage && !waitingImageDownloadConfirmation && (
            <Card className="mb-8 bg-gray-900/80 border-cyan-500/30 p-6 max-w-md backdrop-blur-sm relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-cyan-500/5 animate-pulse"></div>
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse"></div>
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse delay-500"></div>

              <div className="text-center relative z-10">
                <div className="flex items-center justify-center mb-3">
                  <ImageIcon className="h-4 w-4 text-cyan-400 mr-2" />
                  <p className="text-cyan-100 text-sm font-medium font-mono">{">"} IMAGE_DISPLAY:</p>
                </div>
                <div className="rounded-lg overflow-hidden border border-cyan-500/30 mb-3">
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
                <p className="text-cyan-300 text-sm opacity-70">{currentImage.prompt}</p>
              </div>
            </Card>
          )}

          {!isSupported && (
            <p className="text-red-400 text-sm mt-4">Reconocimiento de voz no soportado en este navegador</p>
          )}
        </div>
      )}

      {/* Messages con Input de Texto - Solo mostrar si JARVIS está activo */}
      {!isMapActive && !isPlayingMusic && appState !== "sleeping" && appState !== "waiting_password" && (
        <div className="p-6 max-h-80 overflow-y-auto relative z-10">
          <Card className="bg-gray-900/60 border-cyan-500/20 p-4 backdrop-blur-sm">
            {/* Historial de Mensajes */}
            {messages.length > 0 && (
              <div className="space-y-3 mb-4">
                {messages.slice(-3).map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-xs px-4 py-3 rounded-2xl text-sm ${
                        msg.type === "user"
                          ? "bg-cyan-500 text-black"
                          : appState === "intelligent_mode"
                            ? "bg-purple-700/80 text-purple-100 border border-purple-500/20"
                            : appState === "functional_mode"
                              ? "bg-orange-700/80 text-orange-100 border border-orange-500/20"
                              : "bg-gray-700/80 text-cyan-100 border border-cyan-500/20"
                      }`}
                    >
                      <p className="font-bold text-xs mb-1 opacity-70 font-mono">
                        {msg.type === "user" ? "> SEÑOR:" : "> JARVIS:"}
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
            )}

            {/* Input de Texto para Chat */}
            <div className="border-t border-cyan-500/20 pt-4">
              <div className="flex items-center space-x-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Escribe a JARVIS..."
                    className="w-full bg-gray-800/50 border border-cyan-500/30 rounded-lg px-4 py-2 text-cyan-100 placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 text-sm"
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && e.currentTarget.value.trim()) {
                        const message = e.currentTarget.value.trim()
                        e.currentTarget.value = ""
                        handleUserMessage(message)
                      }
                    }}
                    disabled={isProcessing || isSpeaking || appState === "sleeping" || appState === "waiting_password"}
                  />
                </div>
                <div className="text-cyan-400 text-xs font-mono opacity-70">{">"} CHAT_INPUT</div>
              </div>
              <p className="text-gray-500 text-xs mt-2 text-center">
                💬 Escribe y presiona Enter para chatear por texto (JARVIS responderá por voz)
              </p>
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
          <p className="text-cyan-400 text-xs mt-1">💡 Modos: Modo Normal | Modo Inteligente | Modo Funcional</p>
          {transcript && <p className="text-yellow-400 text-xs mt-1">Último: "{transcript}"</p>}
        </div>
      )}

      {/* 💊 RECORDATORIO DE PASTILLAS */}
      {showReminder && (
        <div className="fixed top-4 right-4 z-50">
          <Card className="bg-red-900/90 border-red-500/50 p-4 backdrop-blur-sm animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-3 animate-ping"></div>
                <p className="text-red-100 font-medium">💊 Hora de las pastillas</p>
              </div>
              <Button onClick={dismissReminder} size="sm" variant="ghost" className="text-red-300 hover:text-red-100">
                ✓
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* 🎵 REPRODUCTOR DE SPOTIFY INTEGRADO - NUEVO */}
      <SpotifyPlayerWorking
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

      {/* 💬 GESTOR DE CONVERSACIONES */}
      <ConversationsManager
        isOpen={showConversationsManager}
        onClose={() => setShowConversationsManager(false)}
        currentConversationId={currentConversation?.id}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
      />
    </div>
  )
}
