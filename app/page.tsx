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
import YouTubePlayer, { YouTubePlayerRef } from "@/components/YoutubePlayer"
import { searchYouTube } from "@/lib/youtubeSearch"
import { MapViewer, type MapViewerRef } from "@/components/MapViewer"
import { ContactsDB, LocationsDB, CommandDetector, TimeUtils } from "@/lib/database"
import { ConversationsManager } from "@/components/ConversationsManager"
import { ConversationsDB, type Conversation, type ConversationMessage } from "@/lib/conversations"
import { usePillReminder } from "@/hooks/usePillReminder"
import { TokenDisplay } from "@/components/TokenDisplay"
import { TokenManager } from "@/lib/tokenManager"
import { LocalCommands } from "@/lib/localCommands"
import { JarvisMemory } from "@/lib/jarvisMemory"

// --- CONFIGURACIÓN DE CIUDAD Y API WEATHER ---
const DEFAULT_CITY = "Posadas, Misiones, AR";
const WEATHER_API_KEY = "34c011ccd32573ff3d987a6a9b241b2f";

function getFriendlyWeatherMessage(desc: string) {
  const d = desc.toLowerCase();
  if (d.includes("lluvia")) return "Señor, se esperan lluvias. Le recomiendo llevar paraguas.";
  if (d.includes("nublado") && d.includes("parcial")) return "Señor, estará parcialmente nublado. Ideal para salir, pero lleve abrigo por si acaso.";
  if (d.includes("nublado")) return "Señor, el cielo estará mayormente nublado.";
  if (d.includes("despejado") || d.includes("cielo claro") || d.includes("claro")) return "Señor, se espera un día soleado y despejado. ¡Aproveche el buen clima!";
  if (d.includes("tormenta")) return "Señor, hay alerta de tormenta. Le recomiendo precaución.";
  if (d.includes("niebla")) return "Señor, habrá niebla. Conduzca con cuidado.";
  return `Señor, el clima será: ${desc}.`;
}

async function fetchWeather(city: string, day: "today" | "tomorrow" = "today") {
  // Para ambos casos, usamos /forecast para obtener máxima y mínima realista
  const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${WEATHER_API_KEY}&units=metric&lang=es`)
  if (!res.ok) return null;
  const data = await res.json();
  const now = new Date();
  let targetDate;
  if (day === "today") {
    targetDate = now.toISOString().slice(0, 10);
  } else {
    const tomorrow = new Date(now.getTime() + 24*60*60*1000);
    targetDate = tomorrow.toISOString().slice(0, 10);
  }
  // Filtrar bloques del día objetivo
  const blocks = data.list.filter((item: any) => item.dt_txt.startsWith(targetDate));
  if (!blocks.length) return null;
  // Calcular min y max del día
  const temp_min = Math.min(...blocks.map((b: any) => b.main.temp_min));
  const temp_max = Math.max(...blocks.map((b: any) => b.main.temp_max));
  // Elegir bloque de máxima del día
  const maxBlock = blocks.reduce((prev: any, curr: any) => (curr.main.temp_max > prev.main.temp_max ? curr : prev));
  // Usar la descripción del bloque de máxima
  const descBlock = maxBlock;
  return {
    desc: descBlock.weather[0].description,
    temp: descBlock.main.temp_max,
    temp_min,
    temp_max,
    city: data.city.name
  };
}

// --- DETECTOR DE COMANDO DE MÚSICA YOUTUBE ---
function isYouTubeMusicCommand(text: string): boolean {
  return (
    text.toLowerCase().includes("pon ") ||
    text.toLowerCase().includes("reproduce ") ||
    text.toLowerCase().includes("música de ") ||
    text.toLowerCase().includes("canción de ")
  )
}

// Define types
type AppState =
  | "sleeping"
  | "waiting_password"
  | "active"
  | "calling_confirmation"
  | "navigation_mode"
  | "music_mode"
  | "music_playing"
  | "map_active"
  | "intelligent_mode"
  | "functional_mode"
  | "image_download_confirmation"

type Message = {
  text: string
  type: "user" | "nexus"
  imageUrl?: string
  imagePrompt?: string
  source?: "memory" | "ollama" | "wikipedia" | "none"
}

export default function AdvancedJarvis() {
  // --- HANDLER DE PRONÓSTICO ---
  const handleWeatherCommand = async (text: string) => {
    let day: "today" | "tomorrow" = "today";
    if (text.includes("mañana")) day = "tomorrow";
    const weather = await fetchWeather(DEFAULT_CITY, day);
    if (!weather) {
      setCurrentText("No pude obtener el pronóstico, Señor.");
      await speak("No pude obtener el pronóstico, Señor.");
      setCurrentText("");
      return;
    }
    const friendly = getFriendlyWeatherMessage(weather.desc);
    const msg = `${friendly} Temperatura mínima de ${Math.round(weather.temp_min)}°C y máxima de ${Math.round(weather.temp_max)}°C.`;
    setCurrentText(msg);
    await speak(msg);
    setCurrentText("");
  }

  const [appState, setAppState] = useState<AppState>("sleeping")
  const [messages, setMessages] = useState<Message[]>([])
  const [currentText, setCurrentText] = useState("")
  const [currentImage, setCurrentImage] = useState<{ url: string; prompt: string } | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [mounted, setMounted] = useState(false)

  // ESTADOS PARA FUNCIONALIDADES
  const [pendingCall, setPendingCall] = useState<{ name: string; phone: string } | null>(null)
  const [isNavigating, setIsNavigating] = useState(false)
  const [showContactsManager, setShowContactsManager] = useState(false)
  const [showLocationsManager, setShowLocationsManager] = useState(false)

  // ESTADOS PARA YOUTUBE
  const [isPlayingMusic, setIsPlayingMusic] = useState(false)
  const [currentSongTitle, setCurrentSongTitle] = useState("")
  const [currentVideoId, setCurrentVideoId] = useState("")
  const [waitingForSong, setWaitingForSong] = useState(false)
  const youtubePlayerRef = useRef<YouTubePlayerRef>(null)
  // ESTADOS DE PLAYLIST
  const [playlistMode, setPlaylistMode] = useState(false)
  const [currentPlaylist, setCurrentPlaylist] = useState<any>(null)
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(0)

  // PLAYLIST DE LOS 80
  const playlist80s = {
    name: "música de los 80",
    songs: [
      { title: "The end of the world", videoId: "tqrHS9nZp0k" },
      { title: "Hey lover", videoId: "KbHaIbDKQMc" },
      { title: "Laughing on the outside", videoId: "qmUEkQPE7fk" },
      { title: "Hey Jude", videoId: "A_MjCqQoLLA" },
      { title: "I want to hold your hand", videoId: "v1HDt1tknTc" },
      { title: "Love of my life", videoId: "2bqm4gRY3mA" },
      { title: "I will follow him", videoId: "IRk9gAqjLgg" },
      { title: "Tonight you belong to me", videoId: "NJd0MLBuJjA" },
      { title: "Cant take my eyes off you", videoId: "J36z7AnhvOM" },
      { title: "You dont own me", videoId: "OYB1rbL8EHo" },
      { title: "Everybody loves somebody", videoId: "z-2_OstpR5c" },
      { title: "We belong toghether", videoId: "7p2HqW9J1iU" },
      { title: "Leader of the pack", videoId: "EONn2gj1ngA" },
      { title: "California Dreamin", videoId: "Q8UKf65NOzM" },
      { title: "All i have to do is dream", videoId: "oU6uUEwZ8FM" },
      { title: "Happy toghether", videoId: "56cKlT62wrQ" },
      { title: "Stand by me", videoId: "pSw8an1u3rc" },
      { title: "Tarzan boy", videoId: "einn_UJgGGM" },
      { title: "Look what you've done", videoId: "_r0n9Dv6XnY" },
      { title: "Karma chameleon", videoId: "XD1cxSE25ck" },
      { title: "Cuando pase el temblor", videoId: "JmcA9LIIXWw" },
      { title: "A little respect", videoId: "ZNzYr4U7Zs8" },
      { title: "Self control", videoId: "x34icYC8zA0" },
      { title: "Forever young", videoId: "RP0_8J7uxhs" },
      { title: "Running up that hill", videoId: "YHRvDo8rUoQ" },
      { title: "Every breath you take", videoId: "wp43OdtAAkM" },
      { title: "Boys dont cry", videoId: "OMOGaugKpzs" },
      { title: "its been a long, long time", videoId: "9GkVhgIeGJQ" },
      { title: "Have you ever seen the rain", videoId: "Chs2bmqzyUs" },
      { title: "Sunshine", videoId: "2oX2FSv4Rys" },
      { title: "Imagine", videoId: "atY7ymXAcRQ" },
      { title: "This charming man", videoId: "VOgFZfRVaww" },
      { title: "Knockin on heaven's door", videoId: "cJRP3LRcUFg" },
      { title: "Love me do", videoId: "k04tX2fvh0o" },
      { title: "Only you", videoId: "0pGOFX1D_jg" },
      { title: "Dont dream its over", videoId: "5p2k55F-uag" },
      { title: "Who can it be now", videoId: "J9gKyRmic20" },
      { title: "Head over heels", videoId: "XuFC6ud1cAQ" },
      { title: "Always on my mind", videoId: "CsHiG-43Fzg" },
      { title: "I dont want to see the world on fire", videoId: "ZotVMxuXBo0" },
      { title: "Chinese New year", videoId: "gykWYPrArbY" },
      { title: "Just the two of us", videoId: "Uw5OLnN7UvM" },
      { title: "Hold the line", videoId: "htgr3pvBr-I" },
      { title: "Pretty little baby", videoId: "egPVvFYxLe4" },
    ]
  }

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
        // Solo reproducir sonido si NEXUS está activo
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
      appState === "music_mode" ||
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
      } else if (appState === "music_mode") {
        if (text.includes("cancelar")) {
          handleCancelAction()
        } else {
          handleYouTubeMusicSelection(text)
        }
      } else if (appState === "image_download_confirmation") {
        // 🖼️ MANEJAR CONFIRMACIÓN DE DESCARGA DE IMAGEN
        handleImageDownloadConfirmation(text)
      } else if (appState === "music_playing") {
        // 🎵 CONTROLES DE YOUTUBE POR VOZ
        if (isYouTubeVoiceControlCommand(text)) {
          console.log("🎵 YOUTUBE VOICE CONTROL COMMAND DETECTED")
          handleYouTubeVoiceControl(text)
        }
        // 🎵 COMANDO DE QUITAR MÚSICA
        else if (text.includes("quitar música") || text.includes("cerrar música") || text.includes("apagar música")) {
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
        } else if (text.includes("nexus") && (text.includes("apágate") || text.includes("apagate"))) {
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
        } else if (isYouTubeMusicCommand && isYouTubeMusicCommand(text)) {
          console.log("🎵 YOUTUBE MUSIC COMMAND DETECTED")
          handleYouTubeMusicCommand()
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
          link.download = `nexus-image-${Date.now()}.png`
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
    type: "user" | "nexus",
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
    setMessages((prev) => [...prev, { text: intelligentMsg, type: "nexus" }])
    await speak(intelligentMsg)
    setCurrentText("")
  }

  // 🔧 MANEJAR MODO FUNCIONAL
  const handleFunctionalMode = async () => {
    setAppState("functional_mode")
    const functionalMsg =
      "Modo funcional activado, Señor. Puedo gestionar correos electrónicos, WhatsApp, aplicaciones y realizar tareas administrativas. ¿Qué función necesita que ejecute?"
    setCurrentText(functionalMsg)
    setMessages((prev) => [...prev, { text: functionalMsg, type: "nexus" }])
    await speak(functionalMsg)
    setCurrentText("")
  }

  // 🔄 VOLVER AL MODO NORMAL
  const handleNormalMode = async () => {
    setAppState("active")
    const normalMsg = "Volviendo al modo normal, Señor. ¿En qué más puedo asistirle?"
    setCurrentText(normalMsg)
    setMessages((prev) => [...prev, { text: normalMsg, type: "nexus" }])
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

        if (typeof window !== "undefined") {
        window.open(`tel:${pendingCall.phone}`, "_self")
      }

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
      const welcomeMsg = "Inicializando NEXUS. bienvenido señor, ¿en qué puedo asistirlo?"
      setMessages((prev) => [...prev, { text: welcomeMsg, type: "nexus" }])
      setCurrentText(welcomeMsg)

      playStartupSound()
      setAppState("active")
      setHasInitialized(true)

      await speak(welcomeMsg)
      setCurrentText("")
    } else {
      console.log("❌ PASSWORD INCORRECT")
      const errorMsg = "Contraseña incorrecta. Por favor, proporcione la contraseña de reconocimiento."
      setMessages((prev) => [...prev, { text: errorMsg, type: "nexus" }])
      setCurrentText(errorMsg)

      await speak(errorMsg)
      setCurrentText("")
    }

    setIsProcessing(false)
  }

  const handleShutdown = async () => {
    console.log("😴 SHUTTING DOWN NEXUS")
    setIsProcessing(true)

    const goodbye = "Desactivando NEXUS. Hasta luego, Señor."
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
    setCurrentSongTitle("")
    setCurrentVideoId("")
    setIsMapActive(false)
    setCurrentDestination("")
    setCurrentDestinationAddress("")
    setPendingImageDownload(null)
    setWaitingImageDownloadConfirmation(false)
    setHasInitialized(false)
    setIsProcessing(false)
  }

  const handleUserMessage = async (message: string) => {
  // --- DETECTOR DE PRONÓSTICO ---
  if (message.toLowerCase().includes("pronóstico de hoy") || message.toLowerCase().includes("pronóstico de mañana")) {
    await handleWeatherCommand(message);
    setIsProcessing(false);
    return;
  }
    console.log("📨 USER MESSAGE:", message)
    setIsProcessing(true)
    setMessages((prev) => [...prev, { text: message, type: "user" }])

    // 💬 GUARDAR EN CONVERSACIÓN
    saveMessageToConversation(message, "user")

    // 🧠 GUARDAR EN MEMORIA DE NEXUS
    JarvisMemory.saveMemory("context", message, ["user_input"])

    try {
      // 🔧 PROCESAR COMANDOS LOCALES EN MODO NORMAL Y FUNCIONAL
      if (appState === "active" || appState === "functional_mode") {
        const mode = appState === "functional_mode" ? "functional" : "normal"
        const localCommand = LocalCommands.processCommand(message, mode)

        if (localCommand) {
          console.log("🔧 LOCAL COMMAND PROCESSED:", localCommand)

          setMessages((prev) => [...prev, { text: localCommand.response, type: "nexus" }])
          saveMessageToConversation(localCommand.response, "nexus")

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
              case "youtube":
                handleYouTubeMusicCommand()
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

        setMessages((prev) => [...prev, { text: restrictedMsg, type: "nexus" }])
        saveMessageToConversation(restrictedMsg, "nexus")
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
        setMessages((prev) => [...prev, { text: limitMsg, type: "nexus" }])
        saveMessageToConversation(limitMsg, "nexus")
        setCurrentText(limitMsg)
        await speak(limitMsg)
        setCurrentText("")
        setIsProcessing(false)
        return
      }

      // Resto del código para llamar a la API...
      console.log("🧠 CALLING CHAT API - INTELLIGENT MODE ONLY...")

      const response = await fetch("/api/mcp-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          intelligentMode: true,
          functionalMode: false,
          conversationContext: messages.filter(m => m.type === "nexus" || m.type === "user").map(m => m.text).join(" | ")
        }),
      })

      const data = await response.json()

      if (data.success) {
        // 🧠 REGISTRAR INTERACCIÓN EN MEMORIA
        JarvisMemory.recordInteraction(message, data.response)

        // 🖼️ PROCESAR RESPUESTA CON IMAGEN
        if (data.hasImage && data.imageUrl) {
          setCurrentImage({
            url: data.imageUrl,
            prompt: data.imagePrompt || message,
          })

          setMessages((prev) => [
            ...prev,
            {
              text: data.response,
              type: "nexus",
              imageUrl: data.imageUrl,
              imagePrompt: data.imagePrompt || message,
              source: data.source || undefined,
            },
          ])

          saveMessageToConversation(data.response, "nexus", data.imageUrl, data.imagePrompt || message)

          setCurrentText(data.response)
          await speak(data.response)
          setCurrentText("")

          // 🖼️ PREGUNTAR SI QUIERE DESCARGAR LA IMAGEN
          setTimeout(async () => {
            const downloadQuestion = "¿Desea descargar esta imagen, Señor?"
            setCurrentText(downloadQuestion)
            await speak(downloadQuestion)
            setCurrentText("")

            setPendingImageDownload({
              url: data.imageUrl,
              prompt: data.imagePrompt || message,
            })
            setWaitingImageDownloadConfirmation(true)
            setAppState("image_download_confirmation")
          }, 2000)
        } else {
          setMessages((prev) => [
            ...prev,
            {
              text: data.response,
              type: "nexus",
              source: data.source || undefined,
            },
          ])
          saveMessageToConversation(data.response)

          setCurrentText(data.response)
          await speak(data.response)
          setCurrentText("")
        }

        if (data.source === "none") {
          const noInfoMsg = "No se pudo obtener información precisa."
          setMessages((prev) => [...prev, { text: noInfoMsg, type: "nexus" }])
          saveMessageToConversation(noInfoMsg, "nexus")
          setCurrentText(noInfoMsg)
          await speak(noInfoMsg)
          setCurrentText("")
        }
      }
    } catch (error) {
      console.error("❌ ERROR:", error)
      const errorMsg = "Lo siento, Señor, tuve un problema técnico. Inténtelo de nuevo."
      setMessages((prev) => [...prev, { text: errorMsg, type: "nexus" }])
      saveMessageToConversation(errorMsg, "nexus")
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
    setWaitingForSong(false)
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

  const handleYouTubeMusicCommand = async () => {
    console.log("🎵 YOUTUBE MUSIC COMMAND DETECTED")
    setAppState("music_mode")
    setWaitingForSong(true)

    const youtubeMsg = "¿Qué canción o artista desea escuchar, Señor?"
    setCurrentText(youtubeMsg)
    await speak(youtubeMsg)
    setCurrentText("")
  }

  const handleYouTubeMusicSelection = async (text: string) => {
    console.log("🎵 RAW YOUTUBE INPUT:", text)
    const cleaned = text.replace(/pon |reproduce |música de |canción de /gi, "").trim().toLowerCase()
    // Si el usuario pide la playlist de los 80
    if (cleaned.includes("playlist") && cleaned.includes("80")) {
      setPlaylistMode(true)
      setCurrentPlaylist(playlist80s)
      setCurrentPlaylistIndex(0)
      setCurrentSongTitle(playlist80s.songs[0].title)
      setCurrentVideoId(playlist80s.songs[0].videoId)
      setIsPlayingMusic(true)
      setWaitingForSong(false)
      setAppState("music_playing")
      setCurrentText(`Reproduciendo playlist: música de los 80\nCanción: ${playlist80s.songs[0].title}`)
      await speak(`Reproduciendo playlist: música de los 80. Canción: ${playlist80s.songs[0].title}`)
      setCurrentText("")
      return
    }
    // Canción individual
    const result = await searchYouTube(cleaned)
    if (result) {
      setCurrentSongTitle(result.title)
      setCurrentVideoId(result.videoId)
      setIsPlayingMusic(true)
      setWaitingForSong(false)
      setPlaylistMode(false)
      setCurrentPlaylist(null)
      setAppState("music_playing")
      setCurrentText(`Reproduciendo: ${result.title}`)
      await speak(`Reproduciendo: ${result.title}`)
      setCurrentText("")
    } else {
      setCurrentText("No encontré la canción, Señor. ¿Puede repetir el nombre?")
      await speak("No encontré la canción, Señor. ¿Puede repetir el nombre?")
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
      setCurrentSongTitle("")
      setCurrentVideoId("")
      setPlaylistMode(false)
      setCurrentPlaylist(null)
      setCurrentPlaylistIndex(0)
      setAppState("active")
    }
  }

  const isYouTubeVoiceControlCommand = (text: string) => {
    return (
      text.includes("pausa") ||
      text.includes("play") ||
      text.includes("reproduce") ||
      text.includes("reanuda") ||
      text.includes("siguiente") ||
      text.includes("anterior")
    )
  }

  const handleYouTubeVoiceControl = async (text: string) => {
    if (!youtubePlayerRef.current) return
    if (text.includes("pausa")) youtubePlayerRef.current.pause()
    else if (text.includes("play") || text.includes("reanuda") || text.includes("reproduce")) youtubePlayerRef.current.play()
    else if (text.includes("siguiente") && playlistMode && currentPlaylist) {
      if (currentPlaylistIndex < currentPlaylist.songs.length - 1) {
        const nextIndex = currentPlaylistIndex + 1
        setCurrentPlaylistIndex(nextIndex)
        setCurrentSongTitle(currentPlaylist.songs[nextIndex].title)
        setCurrentVideoId(currentPlaylist.songs[nextIndex].videoId)
        setCurrentText(`Siguiente: ${currentPlaylist.songs[nextIndex].title}`)
        await speak(`Siguiente: ${currentPlaylist.songs[nextIndex].title}`)
        setCurrentText("")
      }
    } else if (text.includes("anterior") && playlistMode && currentPlaylist) {
      if (currentPlaylistIndex > 0) {
        const prevIndex = currentPlaylistIndex - 1
        setCurrentPlaylistIndex(prevIndex)
        setCurrentSongTitle(currentPlaylist.songs[prevIndex].title)
        setCurrentVideoId(currentPlaylist.songs[prevIndex].videoId)
        setCurrentText(`Anterior: ${currentPlaylist.songs[prevIndex].title}`)
        await speak(`Anterior: ${currentPlaylist.songs[prevIndex].title}`)
        setCurrentText("")
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
    if (appState === "music_mode") return <Music className="h-20 w-20 text-green-400 animate-pulse" />
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
    if (appState === "music_mode") {
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
    if (appState === "sleeping") return "Di: 'NEXUS enciéndete'"
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
    if (appState === "music_mode") {
      if (isListening) return "Escuchando canción... (Di 'cancelar' para salir)"
      return waitingForSong ? "Di el nombre de la canción (o 'cancelar')" : "Seleccionando música..."
    }
    if (appState === "image_download_confirmation") {
      if (isListening) return "¿Descargar imagen? (Sí/No)"
      return "Esperando confirmación de descarga..."
    }
    if (appState === "music_playing") {
      if (isListening) return "Solo escucho 'NEXUS quitar música'"
      return "Reproduciendo música (Solo comando: 'quitar música')"
    }
    if (appState === "map_active") {
      if (isListening) return "Solo escucho 'NEXUS quitar mapa'"
      return "Mapa activo (Solo comando: 'quitar mapa')"
    }
    if (appState === "intelligent_mode") {
      if (isSpeaking) return "NEXUS hablando..."
      if (isProcessing) return "Procesando con IA avanzada..."
      if (isListening) return "Modo inteligente - Escuchando... (automático)"
      return "Modo inteligente activo (automático)"
    }
    if (appState === "functional_mode") {
      if (isSpeaking) return "NEXUS hablando..."
      if (isProcessing) return "Ejecutando función..."
      if (isListening) return "Modo funcional - Escuchando... (automático)"
      return "Modo funcional activo (automático)"
    }
    if (isSpeaking) return "NEXUS hablando..."
    if (isProcessing) return "Procesando con ChatGPT..."
    if (isListening) return "Escuchando... (automático)"
    return "Habla libremente (automático)"
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-cyan-400 text-xl">Inicializando NEXUS...</div>
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
          <h1 className="text-3xl font-bold text-cyan-400 tracking-wider">NEXUS</h1>

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
                      {">"} NEXUS_SPEAKING
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
                          : appState === "music_mode"
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
                    ? "NEXUS_INTELLIGENT_OUTPUT:"
                    : appState === "functional_mode"
                      ? "NEXUS_FUNCTIONAL_OUTPUT:"
                      : appState === "image_download_confirmation"
                        ? "NEXUS_DOWNLOAD_CONFIRMATION:"
                        : "NEXUS_OUTPUT:"}
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

      {/* Messages con Input de Texto - Solo mostrar si NEXUS está activo */}
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
                        {msg.type === "user" ? "> SEÑOR:" : "> NEXUS:"}
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
                      {/* Source Badge for Jarvis responses */}
                      {msg.type === "nexus" && msg.source && (
                        <div className="mt-2 flex items-center">
                          <span
                            className={
                              `inline-block px-2 py-0.5 rounded-full text-xs font-semibold ml-0 ` +
                              (msg.source === "memory"
                                ? "bg-green-800 text-green-200 border border-green-400"
                                : msg.source === "ollama"
                                  ? "bg-blue-900 text-blue-200 border border-blue-400"
                                  : msg.source === "wikipedia"
                                    ? "bg-yellow-900 text-yellow-200 border border-yellow-400"
                                    : msg.source === "none"
                                      ? "bg-gray-700 text-gray-300 border border-gray-500"
                                      : "bg-gray-700 text-cyan-200 border border-cyan-400")
                            }
                            title={
                              msg.source === "memory"
                                ? "Respuesta generada desde la memoria de NEXUS"
                                : msg.source === "ollama"
                                  ? "Respuesta generada por el modelo Ollama LLM local"
                                  : msg.source === "wikipedia"
                                    ? "Respuesta basada en Wikipedia"
                                    : msg.source === "none"
                                      ? "No se encontró información precisa en las fuentes disponibles"
                                      : "Fuente desconocida"
                            }
                          >
                            {msg.source === "memory"
                              ? "Memoria"
                              : msg.source === "ollama"
                                ? "Ollama LLM"
                                : msg.source === "wikipedia"
                                  ? "Wikipedia"
                                  : msg.source === "none"
                                    ? "Sin fuente precisa"
                                    : msg.source}
                          </span>
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
                    placeholder="Escribe a NEXUS..."
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
                💬 Escribe y presiona Enter para chatear por texto (NEXUS responderá por voz)
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
          <p className="text-cyan-300 text-xs mt-1">
            🎵 <b>Para reproducir música</b> di: <span className="bg-cyan-900 px-1 rounded">"pon [nombre de la canción o artista]"</span> o <span className="bg-cyan-900 px-1 rounded">"reproduce [nombre de la canción]"</span>
          </p>
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

      {/* 🎵 REPRODUCTOR DE YOUTUBE INTEGRADO */}
      {isPlayingMusic && currentVideoId && (
        <div className="fixed inset-0 flex items-center justify-center z-40 bg-black/80">
          <YouTubePlayer
            ref={youtubePlayerRef}
            videoId={currentVideoId}
            title={currentSongTitle || ""}
            onEnd={async () => {
              if (playlistMode && currentPlaylist && currentPlaylistIndex < currentPlaylist.songs.length - 1) {
                const nextIndex = currentPlaylistIndex + 1;
                setCurrentPlaylistIndex(nextIndex);
                setCurrentSongTitle(currentPlaylist.songs[nextIndex].title);
                setCurrentVideoId(currentPlaylist.songs[nextIndex].videoId);
                setCurrentText(`Siguiente: ${currentPlaylist.songs[nextIndex].title}`);
                await speak(`Siguiente: ${currentPlaylist.songs[nextIndex].title}`);
                setCurrentText("");
              } else {
                setIsPlayingMusic(false);
                setCurrentVideoId("");
                setCurrentSongTitle("");
                setPlaylistMode(false);
                setCurrentPlaylist(null);
                setCurrentPlaylistIndex(0);
                setAppState("active");
              }
            }}
          />
          <Button
            className="absolute top-6 right-6 bg-cyan-700 text-white"
            onClick={() => handleMusicControl("quitar")}
          >
            Quitar música
          </Button>
        </div>
      )}

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