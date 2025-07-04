"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"

import { useCineSound } from "@/hooks/useCineSound"

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
  RefreshCw,
  Settings,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useSimpleAudio } from "@/hooks/useSimpleAudio"
import { useAutoSpeech } from "@/hooks/useAutoSpeech"
import { useFuturisticSounds } from "@/hooks/useFuturisticSounds"
import { ContactsManager } from "@/components/ContactsManager"
import { LocationsManager } from "@/components/LocationsManager"
import YouTubePlayer, { type YouTubePlayerRef } from "@/components/YoutubePlayer"
import { searchYouTube } from "@/lib/youtubeSearch"
import dynamic from "next/dynamic"

const MapViewer = dynamic(() => import("@/components/MapViewer").then((mod) => mod.MapViewer), { ssr: false })
import type { MapViewerRef } from "@/components/MapViewer"

import { ContactsDB, LocationsDB, CommandDetector, TimeUtils } from "@/lib/database"
import { ConversationsManager } from "@/components/ConversationsManager"
import { ConversationsDB, type Conversation, type ConversationMessage } from "@/lib/conversations"
import { usePillReminder } from "@/hooks/usePillReminder"
import { TokenDisplay } from "@/components/TokenDisplay"
import { TokenManager } from "@/lib/tokenManager"
import { LocalCommands } from "@/lib/localCommands"
import { NexusMemory } from "@/lib/jarvisMemory"
import Starfield from "@/components/Starfield"
import { useNexusStartupAnimation } from "@/hooks/useNexusStartupAnimation"
import { SettingsModal } from "@/components/SettingsModal"
import { LoadingScreen } from "@/components/LoadingScreen"

// --- CONFIGURACIÓN DE CIUDAD Y API WEATHER ---

const DEFAULT_CITY = "Posadas, Misiones, AR"

const WEATHER_API_KEY = "34c011ccd32573ff3d987a6a9b241b2f"

function getFriendlyWeatherMessage(desc: string) {
  const d = desc.toLowerCase()
  if (d.includes("lluvia")) return "Señor, se esperan lluvias. Le recomiendo llevar paraguas."
  if (d.includes("nublado") && d.includes("parcial"))
    return "Señor, estará parcialmente nublado. Ideal para salir, pero lleve abrigo por si acaso."
  if (d.includes("nublado")) return "Señor, el cielo estará mayormente nublado."
  if (d.includes("despejado") || d.includes("cielo claro") || d.includes("claro"))
    return "Señor, se espera un día soleado y despejado. ¡Aproveche el buen clima!"
  if (d.includes("tormenta")) return "Señor, hay alerta de tormenta. Le recomiendo precaución."
  if (d.includes("niebla")) return "Señor, habrá niebla. Conduzca con cuidado."
  return `Señor, el clima será: ${desc}.`
}

async function fetchWeather(city: string, day: "today" | "tomorrow" = "today") {
  // Para ambos casos, usamos /forecast para obtener máxima y mínima realista
  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${WEATHER_API_KEY}&units=metric&lang=es`,
  )
  if (!res.ok) return null
  const data = await res.json()
  const now = new Date()
  let targetDate
  if (day === "today") {
    targetDate = now.toISOString().slice(0, 10)
  } else {
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    targetDate = tomorrow.toISOString().slice(0, 10)
  }
  // Filtrar bloques del día objetivo
  const blocks = data.list.filter((item: any) => item.dt_txt.startsWith(targetDate))
  if (!blocks.length) return null
  // Calcular min y max del día
  const temp_min = Math.min(...blocks.map((b: any) => b.main.temp_min))
  const temp_max = Math.max(...blocks.map((b: any) => b.main.temp_max))
  // Elegir bloque de máxima del día
  const maxBlock = blocks.reduce((prev: any, curr: any) => (curr.main.temp_max > prev.main.temp_max ? curr : prev))
  // Usar la descripción del bloque de máxima
  const descBlock = maxBlock
  return {
    desc: descBlock.weather[0].description,
    temp: descBlock.main.temp_max,
    temp_min,
    temp_max,
    city: data.city.name,
  }
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
  | "initializing" // <- NUEVO ESTADO PARA PANTALLA DE CARGA
  | "active"
  | "calling_confirmation"
  | "navigation_mode"
  | "music_mode"
  | "music_playing"
  | "map_active"
  | "intelligent_mode"
  | "functional_mode"
  | "image_download_confirmation"

type FileType = {
  name: string
  url: string
  type: "image" | "document" | "audio" | "video" | "other" | "text"
  size: number
  file?: File
}

type Message = {
  text: string
  type: "user" | "nexus"
  imageUrl?: string
  imagePrompt?: string
  files?: FileType[]
  source?: "memory" | "ollama" | "wikipedia" | "none"
}

export default function AdvancedJarvis() {
  // --- Estados principales de la app ---
  const [appState, setAppState] = useState<AppState>("sleeping")
  const [messages, setMessages] = useState<Message[]>([])
  const [currentText, setCurrentText] = useState("")
  const [currentImage, setCurrentImage] = useState<{ url: string; prompt: string } | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [startupAnim, setStartupAnim] = useState(false)
  const [showLoadingScreen, setShowLoadingScreen] = useState(false) // <- NUEVO ESTADO

  // --- Estados para input y sugerencias de comandos ---
  const startupAudioRef = useRef<HTMLAudioElement | null>(null)
  const [userInput, setUserInput] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<FileType[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Manejar la selección de archivos
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setIsUploading(true)

    // Procesar cada archivo
    const filePromises = Array.from(files).map((file) => {
      return new Promise<FileType>((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          const fileType = getFileType(file.type)
          resolve({
            name: file.name,
            url: URL.createObjectURL(file),
            type: fileType,
            size: file.size,
            file: file, // Guardamos la referencia al archivo original
          })
        }
        reader.readAsDataURL(file)
      })
    })

    // Cuando todos los archivos estén procesados
    Promise.all(filePromises).then((filesData) => {
      setSelectedFiles((prev) => [...prev, ...filesData])
      setIsUploading(false)

      // Resetear el input de archivo
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    })
  }

  // Eliminar un archivo seleccionado
  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // Manejar el envío del mensaje con archivos
  const handleSendMessage = async () => {
    if ((!userInput || userInput.trim() === "") && selectedFiles.length === 0) return

    const messageText = userInput.trim() || `He subido ${selectedFiles.length} archivo(s)`

    // Crear el mensaje con los archivos
    const newMessage: Message = {
      text: messageText,
      type: "user",
      files: [...selectedFiles],
    }

    // Agregar el mensaje al chat
    setMessages((prev) => [...prev, newMessage])
    saveMessageToConversation(messageText, "user")

    // Si hay archivos, prepararlos para enviar a la API
    if (selectedFiles.length > 0) {
      try {
        setIsProcessing(true)

        // Aquí iría la lógica para enviar los archivos a la API de Ollama
        // Por ahora, simulamos una respuesta de NEXUS
        const responseText =
          `He recibido ${selectedFiles.length} archivo(s) para analizar. ` +
          `Contenido: ${selectedFiles.map((f) => f.name).join(", ")}`

        // Agregar la respuesta de NEXUS
        setMessages((prev) => [
          ...prev,
          {
            text: responseText,
            type: "nexus",
          },
        ])
        saveMessageToConversation(responseText, "nexus")

        // Leer el contenido de los archivos y enviarlo a la API
        for (const file of selectedFiles) {
          if (file.type === "document" || file.type === "text") {
            // Para archivos de texto, leer su contenido
            const text = await readFileAsText(file.file)
            console.log("Contenido del archivo:", text)
            // Aquí enviarías el contenido a la API de Ollama
          } else if (file.type === "image") {
            // Para imágenes, podrías usar la API de visión de Ollama si es compatible
            console.log("Procesando imagen:", file.name)
            // Aquí enviarías la imagen a la API de visión de Ollama
          }
        }
      } catch (error) {
        console.error("Error al procesar archivos:", error)
        const errorMsg = "Lo siento, hubo un error al procesar los archivos."
        setMessages((prev) => [...prev, { text: errorMsg, type: "nexus" }])
        saveMessageToConversation(errorMsg, "nexus")
      } finally {
        setIsProcessing(false)
        setSelectedFiles([])
      }
    } else {
      // Si no hay archivos, enviar el mensaje normal
      handleUserMessage(messageText)
    }

    // Limpiar el input
    setUserInput("")
  }

  // Función auxiliar para leer archivos de texto
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve((e.target?.result as string) || "")
      reader.onerror = (e) => reject(reader.error)
      reader.readAsText(file)
    })
  }

  // Función para activar el input de archivo
  const triggerFileInput = () => {
    // Si ya hay archivos seleccionados, limpiar la selección
    if (selectedFiles.length > 0) {
      setSelectedFiles([])
    } else {
      fileInputRef.current?.click()
    }
  }

  // Obtener el tipo de archivo basado en el MIME type
  const getFileType = (mimeType: string): "image" | "document" | "audio" | "video" | "other" => {
    if (!mimeType) return "other"
    if (mimeType.startsWith("image/")) return "image"
    if (mimeType.startsWith("video/")) return "video"
    if (mimeType.startsWith("audio/")) return "audio"
    if (
      [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
      ].includes(mimeType)
    ) {
      return "document"
    }
    return "other"
  }

  // Sugerencias según modo actual (no filtrar por texto, solo mostrar todas)
  const getCommandMode = () => (appState === "functional_mode" ? "functional" : "normal")

  // Estado para abrir/cerrar el modal de settings
  const [showSettings, setShowSettings] = useState(false)

  // --- HANDLER DE PRONÓSTICO ---
  const handleWeatherCommand = async (text: string) => {
    let day: "today" | "tomorrow" = "today"
    if (text.includes("mañana")) day = "tomorrow"
    const weather = await fetchWeather(DEFAULT_CITY, day)
    if (!weather) {
      setCurrentText("No pude obtener el pronóstico, Señor.")
      await speak("No pude obtener el pronóstico, Señor.")
      setCurrentText("")
      return
    }
    const friendly = getFriendlyWeatherMessage(weather.desc)
    const msg = `${friendly} Temperatura mínima de ${Math.round(weather.temp_min)}°C y máxima de ${Math.round(weather.temp_max)}°C.`
    setCurrentText(msg)
    await speak(msg)
    setCurrentText("")
  }

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
  // NUEVO ESTADO: esperando nombre de playlist
  const [awaitingPlaylistName, setAwaitingPlaylistName] = useState(false)

  // PLAYLISTS REGISTRADAS
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
      { title: "Everybody wants to rule the world", videoId: "7p2HqW9J1iU" },
      { title: "We belong together", videoId: "EONn2gj1ngA" },
      { title: "California Dreamin", videoId: "oU6uUEwZ8FM" },
      { title: "All i have to do is dream", videoId: "56cKlT62wrQ" },
      { title: "Happy together", videoId: "pSw8an1u3rc" },
      { title: "Stand by me", videoId: "einn_UJgGGM" },
      { title: "Tarzan boy", videoId: "_r0n9Dv6XnY" },
      { title: "Look what you've done", videoId: "XD1cxSE25ck" },
      { title: "Karma chameleon", videoId: "JmcA9LIIXWw" },
      { title: "Cuando pase el temblor", videoId: "ZNzYr4U7Zs8" },
      { title: "A little respect", videoId: "x34icYC8zA0" },
      { title: "Self control", videoId: "RP0_8J7uxhs" },
      { title: "Forever young", videoId: "YHRvDo8rUoQ" },
      { title: "Running up that hill", videoId: "wp43OdtAAkM" },
      { title: "Every breath you take", videoId: "OMOGaugKpzs" },
      { title: "Boys don't cry", videoId: "9GkVhgIeGJQ" },
      { title: "Its been a long time", videoId: "Chs2bmqzyUs" },
      { title: "Have you ever seen the rain", videoId: "u1V8YRJnr4Q" },
      { title: "Sunshine", videoId: "atY7ymXAcRQ" },
      { title: "Imagine", videoId: "VOgFZfRVaww" },
      { title: "This charming man", videoId: "cJRP3LRcUFg" },
      { title: "Knockin on heaven's door", videoId: "k04tX2fvh0o" },
      { title: "Love me do", videoId: "0pGOFX1D_jg" },
      { title: "Only you", videoId: "5p2k55F-uag" },
      { title: "Dont dream its over", videoId: "J9gKyRmic20" },
      { title: "Who can it be now", videoId: "SECVGN4Bsgg" },
      { title: "Heav over heels", videoId: "CsHiG-43Fzg" },
      { title: "Always on my mind", videoId: "ZotVMxuXBo0" },
      { title: "I dont want to see the world on fire", videoId: "TmIwm5RElRs" },
      { title: "Chinese new year", videoId: "gykWYPrArbY" },
      { title: "Just the two of us", videoId: "Uw5OLnN7UvM" },
      { title: "Hold the line", videoId: "htgr3pvBr-I" },
      { title: "Pretty little baby", videoId: "egPVvFYxLe4" },
    ],
  }

  const playlistArcane = {
    name: "ARCANE",
    songs: [
      { title: "ma meilleure ennemie", videoId: "XbLemOwzdxk" },
      { title: "Isha death song", videoId: "r7cwj7UPM8Q" },
      { title: "To Ashes of blood", videoId: "Gj-jmBi0aK8" },
      { title: "Enemy", videoId: "D9G1VOjN_84" },
    ],
  }

  const playlistEstudio = {
    name: "Musica de estudio",
    songs: [
      { title: "Solitude M83", videoId: "h_F5WVmTugY" },
      { title: "The line", videoId: "E2Rj2gQAyPA" },
      { title: "Bang bang bang", videoId: "zd9rtEyZY6w" },
      { title: "This is what falling in love feels like", videoId: "BOyO8sZOaOQ" },
      { title: "Wasteland", videoId: "WPDpgSBEWaI" },
      { title: "No surprises", videoId: "u5CVsCnxyXg" },
      { title: "Cant help falling in love", videoId: "eTKeQhYVvbQ" },
    ],
  }

  const playlists = [playlist80s, playlistArcane, playlistEstudio] // 'Musica de estudio' actualizado

  // Estados para mostrar/ocultar el selector de playlists
  const [showPlaylistSelector, setShowPlaylistSelector] = useState(false)

  // --- ACCESIBILIDAD GLOBAL ---
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(true)
  const [focusedElement, setFocusedElement] = useState<string | null>(null)

  // Handler accesible universal
  function handleAccessibleAction(key: string, label: string, action: () => void) {
    if (screenReaderEnabled) {
      if (focusedElement === key) {
        setFocusedElement(null)
        action()
      } else {
        setFocusedElement(key)
        if (typeof speak === "function") speak(label)
      }
    } else {
      action()
    }
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
  useCineSound(isSpeaking) // Efecto cine cuando NEXUS habla
  useNexusStartupAnimation(startupAnim, () => setStartupAnim(false))
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

  // Detecta transición de waiting_password a active para animación de inicio
  useEffect(() => {
    if (appState === "active" && mounted) {
      setStartupAnim(true)
      if (!startupAudioRef.current) {
        startupAudioRef.current = new Audio("/nexus-startup.mp3")
        startupAudioRef.current.volume = 0.34
      }
      startupAudioRef.current.currentTime = 0
      startupAudioRef.current.play()
    }
  }, [appState, mounted])

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

      // --- NUEVO FLUJO PARA PLAYLISTS ---
      if (awaitingPlaylistName) {
        handleYouTubeMusicSelection(text)
        return
      }

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

        // ���� COMANDO DE QUITAR MÚSICA
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
        } else if (/reproduce una playlist|pon una playlist|quiero escuchar una playlist/i.test(text)) {
          // Reconocer el comando globalmente
          handleYouTubeMusicSelection(text)
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
  const saveMessageToConversation = (text: string, type: "user" | "nexus", imageUrl?: string, imagePrompt?: string) => {
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
    const navMsg = "¿Dónde desea ir señor? (di cancelar para cancelar la acción)"
    setCurrentText(navMsg)
    await speak(navMsg)
    setCurrentText("")
  }

  // 🗺️ MANEJAR COMANDO DE NAVEGACIÓN
  const handleNavigationCommand = async (text: string) => {
    // Permitir cancelar
    if (text.toLowerCase().includes("cancelar")) {
      const cancelMsg = "Navegación cancelada, Señor. Volviendo al modo normal."
      setCurrentText(cancelMsg)
      await speak(cancelMsg)
      setCurrentText("")
      setAppState("active")
      setIsNavigating(false)
      return
    }

    const locationName = text.trim()
    if (!locationName) {
      const emptyMsg = "No entendí el destino, Señor. Por favor, diga el nombre de una ubicación guardada."
      setCurrentText(emptyMsg)
      await speak(emptyMsg)
      setCurrentText("")
      setIsNavigating(false)
      setAppState("active")
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
      const notFoundMsg = `No encontré "${locationName}" en sus ubicaciones guardadas, Señor. ¿Desea que lo agregue o intente con otra dirección?`
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
    console.log(" NAVIGATION INSTRUCTION:", instruction)
    await speak(instruction)
  }

  // INICIAR NAVEGACIÓN EN MAPA
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

  // CENTRAR MAPA EN MI UBICACIÓN
  const handleCenterMapOnUser = async () => {
    const msg = "Centrando el mapa en su ubicación actual, Señor."
    setCurrentText(msg)
    await speak(msg)
    setCurrentText("")
    if (mapViewerRef.current && mapViewerRef.current.centerOnUser) {
      mapViewerRef.current.centerOnUser()
    }
  }

  // 🔄 NUEVA FUNCIÓN PARA MANEJAR COMPLETADO DE CARGA
  const handleLoadingComplete = async () => {
    console.log("🚀 LOADING COMPLETE!")

    setShowLoadingScreen(false)
    setAppState("active")
    setHasInitialized(true)

    const welcomeMsg = "Bienvenido, Señor. NEXUS está ahora completamente operativo. ¿En qué puedo asistirle hoy?"
    setMessages((prev) => [...prev, { text: welcomeMsg, type: "nexus" }])
    setCurrentText(welcomeMsg)
    playStartupSound()

    await speak(welcomeMsg)
    setCurrentText("")
  }

  const handlePasswordCheck = async (password: string) => {
    console.log(" CHECKING PASSWORD:", password)
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

      // 🔄 MOSTRAR PANTALLA DE CARGA EN LUGAR DE IR DIRECTO A ACTIVE
      setAppState("initializing")
      setShowLoadingScreen(true)
      setIsProcessing(false)
    } else {
      console.log("❌ PASSWORD INCORRECT")
      const errorMsg = "Contraseña incorrecta. Por favor, proporcione la contraseña de reconocimiento."
      setMessages((prev) => [...prev, { text: errorMsg, type: "nexus" }])
      setCurrentText(errorMsg)
      await speak(errorMsg)
      setCurrentText("")
      setIsProcessing(false)
    }
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
    // --- COMANDOS DE VOZ PARA LECTOR DE PANTALLA ---
    // Mejorar reconocimiento de comandos de voz para lector de pantalla
    const normalized = message
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()

    // Variantes aceptadas para activar/desactivar
    const activarLector = [
      "activar lector de pantalla",
      "activa el lector de pantalla",
      "activa lector de pantalla",
      "activar el lector de pantalla",
      "activar talkback",
      "activa talkback",
      "enciende el lector de pantalla",
      "enciende lector de pantalla",
      "prende el lector de pantalla",
      "prende lector de pantalla",
    ]

    const desactivarLector = [
      "desactivar lector de pantalla",
      "desactiva el lector de pantalla",
      "desactiva lector de pantalla",
      "desactivar el lector de pantalla",
      "desactivar talkback",
      "desactiva talkback",
      "apaga el lector de pantalla",
      "apaga lector de pantalla",
    ]

    // Reconocimiento flexible: permite frases con palabras adicionales
    if (activarLector.some((variant) => normalized.includes(variant))) {
      setScreenReaderEnabled(true)
      setCurrentText("Lector de pantalla activado, Señor.")
      if (typeof speak === "function") await speak("Lector de pantalla activado, Señor.")
      setCurrentText("")
      return
    }

    if (desactivarLector.some((variant) => normalized.includes(variant))) {
      setScreenReaderEnabled(false)
      setCurrentText("Lector de pantalla desactivado, Señor.")
      if (typeof speak === "function") await speak("Lector de pantalla desactivado, Señor.")
      setCurrentText("")
      setFocusedElement(null)
      return
    }

    // --- DETECTOR DE PRONÓSTICO ---
    if (message.toLowerCase().includes("pronóstico de hoy") || message.toLowerCase().includes("pronóstico de mañana")) {
      await handleWeatherCommand(message)
      setIsProcessing(false)
      return
    }

    console.log("📨 USER MESSAGE:", message)
    setIsProcessing(true)
    setMessages((prev) => [...prev, { text: message, type: "user" }])

    // 💬 GUARDAR EN CONVERSACIÓN
    saveMessageToConversation(message, "user")

    // 🧠 GUARDAR EN MEMORIA DE NEXUS
    NexusMemory.saveMemory("context", message, ["user_input"])

    try {
      // 🚦 CANCELAR NAVEGACIÓN SI SE ESTÁ ESPERANDO DIRECCIÓN
      if (appState === "navigation_mode") {
        if (CommandDetector.isCancelCommand(message.toLowerCase())) {
          const cancelMsg = "Navegación cancelada, Señor. Volviendo al modo normal."
          setCurrentText(cancelMsg)
          await speak(cancelMsg)
          setCurrentText("")
          setAppState("active")
          setIsNavigating(false)
          setCurrentDestination("")
          setCurrentDestinationAddress("")
          setIsProcessing(false)
          return
        } else {
          // Intentar extraer la dirección con extractLocationName
          let locationName = CommandDetector.extractLocationName(message)
          let location = locationName ? LocationsDB.findByName(locationName) : null

          // Si no se extrajo nada, intentar buscar directamente por el mensaje completo
          if (!location && message.trim().length > 0) {
            location = LocationsDB.findByName(message.trim())
            locationName = message.trim()
          }

          if (location) {
            const navMsg = `Abriendo navegación hacia ${location.name}, Señor...`
            setCurrentText(navMsg)
            await speak(navMsg)
            setCurrentText("")
            setCurrentDestination(location.name)
            setCurrentDestinationAddress(location.address)
            setIsMapActive(true)
            setAppState("map_active")
            setIsNavigating(false)
            setIsProcessing(false)
            return
          } else {
            const msg = "¿A qué ubicación específica desea ir, Señor? (puede decir 'cancelar' para abortar)"
            setCurrentText(msg)
            await speak(msg)
            setCurrentText("")
            setAppState("navigation_mode")
            setIsProcessing(false)
            return
          }
        }
      }

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
          conversationContext: messages
            .filter((m) => m.type === "nexus" || m.type === "user")
            .map((m) => m.text)
            .join(" | "),
        }),
      })

      const data = await response.json()

      if (data.success) {
        // 🧠 REGISTRAR INTERACCIÓN EN MEMORIA
        NexusMemory.recordInteraction(message, data.response)

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
    console.log(" RAW YOUTUBE INPUT:", text)
    const cleaned = text
      .replace(/pon |reproduce |música de |canción de |la |el |playlist |playlists? |de /gi, "")
      .trim()
      .toLowerCase()
    const isPlaylistRequest = /playlist|playlists?/i.test(text)

    // Si estamos esperando el nombre de la playlist (por "reproduce una playlist")
    if (awaitingPlaylistName) {
      // Normaliza texto: quita tildes y minúsculas
      const normalize = (str: string) =>
        str
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
      const input = normalize(text.trim())

      const foundPlaylist = playlists.find((pl) => {
        const plName = normalize(pl.name)
        return plName.includes(input) || input.includes(plName)
      })

      if (foundPlaylist) {
        setPlaylistMode(true)
        setCurrentPlaylist(foundPlaylist)
        setCurrentPlaylistIndex(0)
        setCurrentSongTitle(foundPlaylist.songs[0].title)
        setCurrentVideoId(foundPlaylist.songs[0].videoId)
        setIsPlayingMusic(true)
        setWaitingForSong(false)
        setAppState("music_playing")

        const msg = `Reproduciendo playlist ${foundPlaylist.name}: ${foundPlaylist.songs[0].title}`
        setCurrentText(msg)
        await speak(msg)
        setCurrentText("")
        setAwaitingPlaylistName(false)
        return
      } else {
        setCurrentText(
          "No encontré la playlist mencionada, Señor. ¿Puede repetir el nombre? (Solo nombres registrados)",
        )
        await speak("No encontré la playlist mencionada, Señor. ¿Puede repetir el nombre? (Solo nombres registrados)")
        setCurrentText("")
        return
      }
    }

    // Si el usuario pide "reproduce una playlist" o similar
    if (isPlaylistRequest && /reproduce una playlist|pon una playlist|quiero escuchar una playlist/i.test(text)) {
      setAwaitingPlaylistName(true)
      setCurrentText(
        "¿Qué playlist desea reproducir, Señor? (Opciones: " + playlists.map((pl) => pl.name).join(", ") + ")",
      )
      await speak("¿Qué playlist desea reproducir, Señor?")
      setCurrentText("")
      return
    }

    // Si el usuario dice directamente "reproduce la playlist X"
    if (isPlaylistRequest) {
      const foundPlaylist = playlists.find((pl) => {
        const plName = pl.name.toLowerCase().replace(/[^a-záéíóúüñ0-9 ]/gi, "")
        const input = cleaned.replace(/[^a-záéíóúüñ0-9 ]/gi, "")
        return input.includes(plName) || plName.includes(input)
      })

      if (foundPlaylist) {
        setPlaylistMode(true)
        setCurrentPlaylist(foundPlaylist)
        setCurrentPlaylistIndex(0)
        setCurrentSongTitle(foundPlaylist.songs[0].title)
        setCurrentVideoId(foundPlaylist.songs[0].videoId)
        setIsPlayingMusic(true)
        setWaitingForSong(false)
        setAppState("music_playing")

        const msg = `Reproduciendo playlist ${foundPlaylist.name}: ${foundPlaylist.songs[0].title}`
        setCurrentText(msg)
        await speak(msg)
        setCurrentText("")
        return
      } else {
        setCurrentText("No encontré la playlist mencionada, Señor. ¿Puede repetir el nombre?")
        await speak("No encontré la playlist mencionada, Señor. ¿Puede repetir el nombre?")
        setCurrentText("")
        return
      }
    }

    // Si no es pedido de playlist, buscar canción individual en YouTube
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
    else if (text.includes("play") || text.includes("reanuda") || text.includes("reproduce"))
      youtubePlayerRef.current.play()
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
    if (appState === "initializing") return <Loader2 className="h-20 w-20 text-cyan-400 animate-spin" /> // <- NUEVO ICONO
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

    if (appState === "initializing") {
      // <- NUEVO ESTILO
      return `${baseClasses} border-cyan-500 shadow-cyan-500/50 animate-pulse`
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
    if (appState === "initializing") return "Inicializando NEXUS..." // <- NUEVO TEXTO
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
    <div className="min-h-screen bg-black/95 relative overflow-hidden">
      {/* Fondo de estrellas futurista */}
      <Starfield isSpeaking={isSpeaking} startupMode={startupAnim} />

      {/* PANEL DE ESTADO IMPONENTE SOLO PARA ESTADO DE NEXUS */}
      {((appState !== "sleeping" && appState !== "waiting_password") || isListening || isProcessing) && (
        <div className="fixed left-1/2 -translate-x-1/2 top-6 md:top-8 z-50 flex justify-center w-full pointer-events-none select-none">
          <div
            className="max-w-2xl px-6 py-3 rounded-xl bg-black/60 border border-cyan-400/30 shadow-lg backdrop-blur-md"
            style={{ textShadow: "0 2px 16px #00fff9, 0 1px 2px #000", minWidth: "240px" }}
          >
            <span className="text-xl md:text-2xl font-semibold text-cyan-100 tracking-wide text-center">
              {getStatusText()}
            </span>
          </div>
        </div>
      )}
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
          {/* Botón Reiniciar NEXUS */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleAccessibleAction("reset", "Reiniciar NEXUS", () => window.location.reload())}
            className={`text-cyan-400 ${focusedElement === "reset" && screenReaderEnabled ? "border-2 border-green-400 bg-green-900/30" : ""}`}
            title="Reiniciar NEXUS"
            aria-label="Reiniciar NEXUS"
            tabIndex={0}
            onKeyDown={(e) =>
              (e.key === "Enter" || e.key === " ") &&
              handleAccessibleAction("reset", "Reiniciar NEXUS", () => window.location.reload())
            }
          >
            <RefreshCw className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              handleAccessibleAction("contacts", "Gestor de contactos", () => setShowContactsManager(true))
            }
            className={`text-cyan-400 ${focusedElement === "contacts" && screenReaderEnabled ? "border-2 border-green-400 bg-green-900/30" : ""}`}
            title="Gestionar Contactos"
            aria-label="Gestionar Contactos"
            tabIndex={0}
            onKeyDown={(e) =>
              (e.key === "Enter" || e.key === " ") &&
              handleAccessibleAction("contacts", "Gestor de contactos", () => setShowContactsManager(true))
            }
          >
            <Phone className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              handleAccessibleAction("locations", "Gestor de ubicaciones", () => setShowLocationsManager(true))
            }
            className={`text-cyan-400 ${focusedElement === "locations" && screenReaderEnabled ? "border-2 border-green-400 bg-green-900/30" : ""}`}
            title="Gestionar Ubicaciones"
            aria-label="Gestionar Ubicaciones"
            tabIndex={0}
            onKeyDown={(e) =>
              (e.key === "Enter" || e.key === " ") &&
              handleAccessibleAction("locations", "Gestor de ubicaciones", () => setShowLocationsManager(true))
            }
          >
            <MapPin className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              handleAccessibleAction("conversations", "Historial de conversaciones", () =>
                setShowConversationsManager(true),
              )
            }
            className={`text-cyan-400 ${focusedElement === "conversations" && screenReaderEnabled ? "border-2 border-green-400 bg-green-900/30" : ""}`}
            title="Historial de Conversaciones"
            aria-label="Historial de Conversaciones"
            tabIndex={0}
            onKeyDown={(e) =>
              (e.key === "Enter" || e.key === " ") &&
              handleAccessibleAction("conversations", "Historial de conversaciones", () =>
                setShowConversationsManager(true),
              )
            }
          >
            <MessageCircle className="h-5 w-5" />
          </Button>

          {/* Botón Playlist */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleAccessibleAction("playlists", "Panel de música", () => setShowPlaylistSelector(true))}
            className={`rounded-full p-2 hover:bg-cyan-900 ${focusedElement === "playlists" && screenReaderEnabled ? "border-2 border-green-400 bg-green-900/30" : ""}`}
            title="Ver playlists"
            aria-label="Ver playlists"
            tabIndex={0}
            onKeyDown={(e) =>
              (e.key === "Enter" || e.key === " ") &&
              handleAccessibleAction("playlists", "Panel de música", () => setShowPlaylistSelector(true))
            }
          >
            <Music className="w-6 h-6 text-cyan-400" />
          </Button>

          {/* Botón Settings */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleAccessibleAction("settings", "Configuraciones", () => setShowSettings(true))}
            className={`rounded-full p-2 hover:bg-cyan-900 ml-2 ${focusedElement === "settings" && screenReaderEnabled ? "border-2 border-green-400 bg-green-900/30" : ""}`}
            title="Configuraciones"
            aria-label="Configuraciones"
            tabIndex={0}
            onKeyDown={(e) =>
              (e.key === "Enter" || e.key === " ") &&
              handleAccessibleAction("settings", "Configuraciones", () => setShowSettings(true))
            }
          >
            <Settings className="w-6 h-6 text-cyan-400 animate-spin-slow" />
          </Button>
        </div>
      </div>

      {/* Modal de Playlists */}
      {showPlaylistSelector && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
          <div className="bg-gray-900 rounded-lg p-8 shadow-xl border border-cyan-800 relative min-w-[320px] max-w-[90vw]">
            <h2 className="text-cyan-300 text-xl font-bold mb-4 flex items-center gap-2">
              <Music className="inline-block w-6 h-6 text-cyan-400" /> Playlists Registradas
            </h2>
            <ul className="space-y-2 mb-4">
              {playlists.map((pl, idx) => (
                <li key={pl.name} className="flex items-center justify-between bg-cyan-950/40 rounded px-4 py-2">
                  <span className="text-cyan-100 font-semibold">{pl.name}</span>
                  <span className="text-cyan-400 text-xs">{pl.songs.length} canciones</span>
                </li>
              ))}
            </ul>
            <Button
              className="w-full bg-cyan-700 hover:bg-cyan-800 text-white mt-2"
              onClick={() => setShowPlaylistSelector(false)}
            >
              Cerrar
            </Button>
          </div>
        </div>
      )}
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
                    <div className="text-cyan-400 text-xs font-mono animate-pulse opacity-70">{">"} NEXUS_SPEAKING</div>
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
              <div className="w-48 h-48 rounded-full bg-black flex items-center justify-center">{getMainIcon()}</div>
            </div>

            {/* Status Text */}
            <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 text-center w-full">
              <p
                className={`text-sm font-medium ${
                  appState === "sleeping"
                    ? "text-gray-400"
                    : appState === "waiting_password"
                      ? "text-yellow-400"
                      : appState === "initializing" // <- NUEVO COLOR
                        ? "text-cyan-400"
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
      {!isMapActive &&
        !isPlayingMusic &&
        appState !== "sleeping" &&
        appState !== "waiting_password" &&
        appState !== "initializing" && ( // <- EXCLUIR INITIALIZING
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

                        {/* Mostrar archivos adjuntos */}
                        {msg.files && msg.files.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {msg.files.map((file, fileIdx) => (
                              <div
                                key={fileIdx}
                                className="flex items-center p-2 bg-gray-800/50 rounded-lg border border-cyan-500/20"
                              >
                                {/* Icono según el tipo de archivo */}
                                <div className="mr-2 text-cyan-400">
                                  {file.type === "image" && (
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-5 w-5"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                      />
                                    </svg>
                                  )}
                                  {file.type === "document" && (
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-5 w-5"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                      />
                                    </svg>
                                  )}
                                  {file.type === "audio" && (
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-5 w-5"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                                      />
                                    </svg>
                                  )}
                                  {file.type === "video" && (
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-5 w-5"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                      />
                                    </svg>
                                  )}
                                  {file.type === "other" && (
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-5 w-5"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                      />
                                    </svg>
                                  )}
                                </div>

                                {/* Información del archivo */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-cyan-100 truncate" title={file.name}>
                                    {file.name}
                                  </p>
                                  <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                                </div>

                                {/* Botón de vista previa/descarga */}
                                <a
                                  href={file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-2 p-1 text-cyan-400 hover:text-cyan-300"
                                  title="Abrir archivo"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                    />
                                  </svg>
                                </a>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Mostrar imagen del mensaje (para compatibilidad con mensajes antiguos) */}
                        {msg.imageUrl && !msg.files?.some((f) => f.type === "image") && (
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
                    <div className="relative flex items-center">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          placeholder={
                            selectedFiles.length > 0
                              ? "Escribe un mensaje sobre los archivos..."
                              : "Escribe un mensaje..."
                          }
                          className="w-full bg-gray-800/50 border border-cyan-500/30 rounded-lg px-4 py-2 text-cyan-100 placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 text-sm pr-10"
                          value={userInput}
                          onChange={(e) => setUserInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleSendMessage()
                            }
                          }}
                          disabled={
                            isProcessing ||
                            isSpeaking ||
                            isUploading ||
                            appState === "sleeping" ||
                            appState === "waiting_password"
                          }
                          autoComplete="off"
                        />

                        {/* Mostrar miniaturas de archivos seleccionados */}
                        {selectedFiles.length > 0 && (
                          <div className="absolute -top-12 left-0 right-0 flex space-x-2 overflow-x-auto pb-2">
                            {selectedFiles.map((file, idx) => (
                              <div key={idx} className="flex-shrink-0 relative group">
                                <div className="w-10 h-10 bg-gray-700/80 rounded flex items-center justify-center">
                                  {file.type === "image" ? (
                                    <img
                                      src={file.url || "/placeholder.svg"}
                                      alt={file.name}
                                      className="w-full h-full object-cover rounded"
                                    />
                                  ) : (
                                    <span className="text-xs text-cyan-300">
                                      {file.name.split(".").pop()?.toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    removeSelectedFile(idx)
                                  }}
                                  className="absolute -top-2 -right-2 bg-red-500 rounded-full w-4 h-4 flex items-center justify-center text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Eliminar archivo"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Botón de adjuntar archivo */}
                      <button
                        type="button"
                        onClick={triggerFileInput}
                        disabled={isUploading}
                        className={`absolute right-2 p-1 ${selectedFiles.length > 0 ? "text-red-400 hover:text-red-300" : "text-cyan-400 hover:text-cyan-300"} disabled:opacity-50`}
                        title={
                          selectedFiles.length > 0 ? `Quitar ${selectedFiles.length} archivo(s)` : "Adjuntar archivo"
                        }
                      >
                        {selectedFiles.length > 0 ? (
                          <span className="text-xs font-bold">{selectedFiles.length}</span>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                            />
                          </svg>
                        )}
                      </button>

                      {/* Input de archivo oculto */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileInputChange}
                        className="hidden"
                        multiple
                        accept="image/*,.pdf,.doc,.docx,.txt,.mp3,.mp4"
                      />
                    </div>

                    {isUploading && (
                      <div className="mt-2 text-xs text-cyan-400 flex items-center">
                        <svg
                          className="animate-spin -ml-1 mr-2 h-3 w-3 text-cyan-400"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Subiendo archivos...
                      </div>
                    )}
                  </div>
                  <div className="text-cyan-400 text-xs font-mono opacity-70">{">"} CHAT</div>
                </div>
                <p className="text-gray-500 text-xs mt-2 text-center">
                  💬 Escribe y presiona Enter para chatear por texto (NEXUS responderá por voz)
                </p>
              </div>
            </Card>
          </div>
        )}

      {/* Instrucciones de uso */}
      {appState !== "sleeping" &&
        appState !== "waiting_password" &&
        appState !== "initializing" && ( // <- EXCLUIR INITIALIZING
          <div className="p-4 text-center relative z-10">
            <p className="text-gray-500 text-xs">
              Estado: {appState} | Escuchando: {isListening ? "Sí" : "No"} | Hablando: {isSpeaking ? "Sí" : "No"} |
              Procesando: {isProcessing ? "Sí" : "No"} | 🎤{" "}
              {isPlayingMusic ? "SOLO MÚSICA" : isMapActive ? "SOLO MAPA" : "AUTOMÁTICO"}
            </p>
            <p className="text-cyan-400 text-xs mt-1">💡 Modos: Modo Normal | Modo Inteligente | Modo Funcional</p>
            <p className="text-cyan-300 text-xs mt-1">
              🎵 <b>Para reproducir música</b> di:{" "}
              <span className="bg-cyan-900 px-1 rounded">"pon [nombre de la canción o artista]"</span> o{" "}
              <span className="bg-cyan-900 px-1 rounded">"reproduce [nombre de la canción]"</span>
            </p>
            <p className="text-cyan-300 text-xs mt-1">
              📞 <b>Para llamar</b> di: <span className="bg-cyan-900 px-1 rounded">"llama a [nombre]"</span> o{" "}
              <span className="bg-cyan-900 px-1 rounded">"NEXUS llama a [nombre]"</span>
            </p>
            <p className="text-blue-300 text-xs mt-1">
              🗺️ <b>Para navegar a una ubicación</b> di:{" "}
              <span className="bg-blue-900 px-1 rounded">"ir a [nombre de la ubicación]"</span> o{" "}
              <span className="bg-blue-900 px-1 rounded">"navega a [nombre de la ubicación]"</span>
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
                const nextIndex = currentPlaylistIndex + 1
                setCurrentPlaylistIndex(nextIndex)
                setCurrentSongTitle(currentPlaylist.songs[nextIndex].title)
                setCurrentVideoId(currentPlaylist.songs[nextIndex].videoId)
                setCurrentText(`Siguiente: ${currentPlaylist.songs[nextIndex].title}`)
                await speak(`Siguiente: ${currentPlaylist.songs[nextIndex].title}`)
                setCurrentText("")
              } else {
                setIsPlayingMusic(false)
                setCurrentVideoId("")
                setCurrentSongTitle("")
                setPlaylistMode(false)
                setCurrentPlaylist(null)
                setCurrentPlaylistIndex(0)
                setAppState("active")
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
      {/* 🗺️ MAPA INTEGRADO */}
      {isMapActive && (!currentDestination || !currentDestinationAddress) && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/80">
          <div className="bg-gray-900 text-red-400 p-8 rounded-lg border border-red-500">
            <p>
              <b>Error:</b> El mapa fue activado sin un destino o dirección válida.
            </p>
            <p>currentDestination: {String(currentDestination)}</p>
            <p>currentDestinationAddress: {String(currentDestinationAddress)}</p>
            <p>Por favor, verifique el comando de voz o las ubicaciones registradas.</p>
            <button
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded"
              onClick={() => {
                setIsMapActive(false)
                setCurrentDestination("")
                setCurrentDestinationAddress("")
                setAppState("active")
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

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

      {/* 📍 GESTOR DE UBICACIONES */}
      <LocationsManager isOpen={showLocationsManager} onClose={() => setShowLocationsManager(false)} />

      {/* 💬 GESTOR DE CONVERSACIONES */}
      <ConversationsManager
        isOpen={showConversationsManager}
        onClose={() => setShowConversationsManager(false)}
        currentConversationId={currentConversation?.id}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
      />

      {/* ⚙️ SETTINGS MODAL */}
      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />

      {/* 🔄 PANTALLA DE CARGA NEXUS */}
      <LoadingScreen isVisible={showLoadingScreen} onComplete={handleLoadingComplete} />
    </div>
  )
}
