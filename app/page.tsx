"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";

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
  User,
  LogOut,
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

const MapViewer = dynamic(() => import("@/components/MapViewer").then((mod) => mod.MapViewer), { ssr: false })
import type { MapViewerRef } from "@/components/MapViewer"

import { ContactsDB, LocationsDB, CommandDetector, TimeUtils } from "@/lib/database"
import { ConversationsManager } from "@/components/ConversationsManager"
import { ConversationsDB, type Conversation, type ConversationMessage } from "@/lib/conversations"
import { NexusLoginSystem } from "@/components/NexusLoginSystem"
import { ProfilesManager } from "@/lib/profilesManager"
import type { UserProfile } from "@/components/ProfileSelector"
import { usePillReminder } from "@/hooks/usePillReminder"
// importación eliminada para limpiar la UI
import { TokenManager } from "@/lib/tokenManager"
import { LocalCommands } from "@/lib/localCommands"
import { NexusMemory } from "@/lib/jarvisMemory"
import Starfield from "@/components/Starfield"
import FunctionalModeShell from "@/components/FunctionalModeShell"
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
  | "profile_selection" // <- NUEVO ESTADO PARA SELECCIÓN DE PERFIL
  | "waiting_password"
  | "initializing" // <- ESTADO PARA PANTALLA DE CARGA
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
  // ...otros estados
  const [backgroundSubtitle, setBackgroundSubtitle] = useState<string>("");
  // Componentes cargados dinámicamente
const FunctionalWorkspace = dynamic(() => import("@/components/FunctionalWorkspace"), { ssr: false });

  // --- Estados principales de la app ---
  const [appState, setAppState] = useState<AppState>("sleeping")
  const [messages, setMessages] = useState<Message[]>([])
  const [currentText, setCurrentText] = useState("")
  const [currentImage, setCurrentImage] = useState<{ url: string; prompt: string } | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [startupAnim, setStartupAnim] = useState(false)
  const [showLoadingScreen, setShowLoadingScreen] = useState(false)
  
  // --- Estados para sistema de perfiles ---
  const [showLoginSystem, setShowLoginSystem] = useState(false)
  const [activeProfile, setActiveProfile] = useState<UserProfile | null>(null)
  
  // Efecto para inicializar el sistema de perfiles
  useEffect(() => {
    // Cargar el estado del perfil desde localStorage
    const savedProfile = ProfilesManager.getActiveProfile();
    
    if (savedProfile) {
      // Si hay un perfil activo guardado, usarlo directamente
      setActiveProfile(savedProfile);
      // Activar Nexus normalmente
      setAppState("initializing");
      setShowLoadingScreen(true);
    } else {
      // Si no hay perfil activo, mostrar la pantalla de login
      setShowLoginSystem(true);
    }
  }, [])

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
const [musicBackgroundMode, setMusicBackgroundMode] = useState(false)
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

  // FUNCIONES PARA PLAYLISTS DINÁMICAS UI
  function parseYouTubeId(url: string): string | undefined {
    // Soporta links tipo https://www.youtube.com/watch?v=ID o https://youtu.be/ID
    try {
      const yt = url.match(/(?:v=|youtu\.be\/)([\w-]{11})/)
      return yt ? yt[1] : undefined
    } catch { return undefined }
  }
  function addSongToPlaylist() {
    if (selectedPlaylistIdx === null) return
    const videoId = parseYouTubeId(newSongLink.trim())
    if (!videoId) { alert("Link de YouTube inválido"); return }
    setPlaylists(prev => prev.map((pl, i) => i === selectedPlaylistIdx ? {
      ...pl,
      songs: [...pl.songs, { title: newSongTitle.trim(), videoId }]
    } : pl))
    setNewSongTitle(""); setNewSongLink("")
  }

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
      { title: "Dont dream its over", videoId: "J9gKyRmic20" },
      { title: "Who can it be now", videoId: "SECVGN4Bsgg" },
      { title: "Heav over heels", videoId: "CsHiG-43Fzg" },
      { title: "Always on my mind", videoId: "ZotVMxuXBo0" },
      { title: "I dont want to see the world on fire", videoId: "TmIwm5RElRs" },
      { title: "Chinese new year", videoId: "gykWYPrArbY" },
      { title: "Just the two of us", videoId: "Uw5OLnN7UvM" },
      { title: "Hold the line", videoId: "htgr3pvBr-I" },
      { title: "Pretty little baby", videoId: "egPVvFYxLe4" },
      { title: "No surprises", videoId: "u5CVsCnxyXg" },
      { title: "Cant help falling in love", videoId: "eTKeQhYVvbQ" },
    ],
  }

  const playlistArcane = {
  name: "Arcane",
  songs: [
    { title: "Meilleure enemmie", videoId: "XbLemOwzdxk" },
    { title: "Isha song", videoId: "IzKQBo1gLYg" },
    { title: "What could have been", videoId: "exAfcktnzVA" },
    { title: "Playground", videoId: "mtHJvyGasS4" },
    { title: "Goodbye", videoId: "omgSWqwVTjY" },
    { title: "to ashes and blood", videoId: "HFVM4QE1qBA" },
    { title: "The Line", videoId: "E2Rj2gQAyPA" },
    { title: "Enemy", videoId: "F5tSoaJ93ac" },
    { title: "Dynasties and Dystopia", videoId: "atx7AlYB_z4" },
    { title: "Our love", videoId: "2Yr3sKPi8mM" },
    { title: "Get Jinxed", videoId: "coDc2Ek2pWQ" },
    { title: "Guns of fire", videoId: "pKNEx-9OqRM" },
    { title: "Wasteland", videoId: "WPDpgSBEWaI" },
  ],
}

const playlistEstudio2 = {
  name: "musica para estudiar",
  songs: [
    { title: "Isha song", videoId: "r7cwj7UPM8Q" },
    { title: "Romantic Homicide", videoId: "eKL3TceSxvk" },
    { title: "Bangbang", videoId: "zd9rtEyZY6w" },
    { title: "Solitude", videoId: "h_F5WVmTugY" },
    { title: "After sex", videoId: "sElE_BfQ67s" },
    { title: "Me and the devil", videoId: "x-mar1osQdY" },
    { title: "The Line", videoId: "E2Rj2gQAyPA" },
    { title: "Creep", videoId: "XFkzRNyygfk" },
    { title: "No surprises", videoId: "u5CVsCnxyXg" },
  ],
}

const playlistSodaStereo = {
  name: "Soda Stereo",
  songs: [
    { title: "Mix Soda Stereo", videoId: "m8eZlQELWNI" },
  ],
}

const playlistEstudio = {
  name: "Estudio",
  songs: [
    { title: "Lo-Fi Beats", videoId: "jfKfPfyJRdk" },
    { title: "Coding Music", videoId: "WPni755-Krg" },
  ],
}

// --- PLAYLISTS DINÁMICAS (editable por UI) ---
  const PLAYLISTS_STORAGE_KEY = "nexus_playlists";
  const [playlists, setPlaylists] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(PLAYLISTS_STORAGE_KEY)
      if (stored) {
        try {
          return JSON.parse(stored)
        } catch (e) {
          // Si hay error, usar las predefinidas
        }
      }
    }
    return [playlist80s, playlistArcane, playlistEstudio, playlistEstudio2, playlistSodaStereo]
  })
  const [selectedPlaylistIdx, setSelectedPlaylistIdx] = useState<number | null>(null)
  const [newPlaylistName, setNewPlaylistName] = useState("")
  const [newSongTitle, setNewSongTitle] = useState("")
  const [newSongLink, setNewSongLink] = useState("")
  // Estados para mostrar/ocultar el selector de playlists
  const [showPlaylistSelector, setShowPlaylistSelector] = useState(false)

  // Persistir playlists en localStorage automáticamente
  useEffect(() => {
    try {
      localStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(playlists))
    } catch (e) { /* ignorar */ }
  }, [playlists])

  // Función para borrar playlists guardadas
  function clearPersistedPlaylists() {
    localStorage.removeItem(PLAYLISTS_STORAGE_KEY)
    setPlaylists([playlist80s, playlistArcane, playlistEstudio])
  }
  


  // --- ACCESIBILIDAD GLOBAL ---
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false) // Disabled by default
  const [focusedElement, setFocusedElement] = useState<string | null>(null)

  // ... Resto del código ...
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
        // 🎵 Lógica especial para música en segundo plano
        if (musicBackgroundMode) {
          // Permitir comandos de modo, quitar música y TODOS los comandos de control de música
          if (
            text.includes("modo inteligente") || text.includes("activación inteligente")
          ) {
            console.log("🧠 INTELLIGENT MODE COMMAND DETECTED (BG MUSIC)");
            handleIntelligentMode({ silent: true, subtitle: "Cambiando a modo inteligente..." });
          } else if (
            text.includes("modo funcional") || text.includes("activación funcional")
          ) {
            console.log("🔧 FUNCTIONAL MODE COMMAND DETECTED (BG MUSIC)");
            handleFunctionalMode({ silent: true, subtitle: "Cambiando a modo funcional..." });
          } else if (
            text.includes("modo normal") || text.includes("salir del modo")
          ) {
            console.log("🔄 NORMAL MODE COMMAND DETECTED (BG MUSIC)");
            handleNormalMode({ silent: true, subtitle: "Cambiando a modo normal..." });
          } else if (
            text.includes("quitar música") || text.includes("cerrar música") || text.includes("apagar música")
          ) {
            console.log("🎵 MUSIC CONTROL COMMAND DETECTED (BG MUSIC)");
            handleMusicControl(text);
          } else if (isYouTubeVoiceControlCommand(text)) {
            console.log("🎵 YOUTUBE VOICE CONTROL COMMAND DETECTED (BG MUSIC)");
            handleYouTubeVoiceControl(text);
          } else {
            // Ignorar otros comandos irrelevantes
            console.log("🎵 IGNORING NON-MODE/NON-MUSIC COMMAND WHILE PLAYING IN BACKGROUND");
          }
        } else {
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

  const handleIntelligentMode = async ({ silent = false, subtitle = "", forceListen = false }: ModeHandlerOptions = {}) => {
    setAppState("intelligent_mode");
    const intelligentMsg =
      "Modo inteligente activado, Señor. Bienvenido al PORTAL-NEXUS, en que proyecto quiere trabajar hoy señor?";
    setMessages((prev) => [...prev, { text: intelligentMsg, type: "nexus" }]);
    if (!silent) {
      setCurrentText(intelligentMsg);
      await speak(intelligentMsg);
      setCurrentText("");
    } else {
      if (subtitle) {
        setBackgroundSubtitle(subtitle);
        setTimeout(() => setBackgroundSubtitle(""), 3000);
      }
      if (forceListen) {
        startAutoListening();
      } else {
        setTimeout(() => {
          startAutoListening();
        }, 500);
      }
    }
  }

  // 🔧 MANEJAR MODO FUNCIONAL
  const handleFunctionalMode = async ({ silent = false, subtitle = "", forceListen = false }: ModeHandlerOptions = {}) => {
    setAppState("functional_mode");
    const functionalMsg =
      "Modo funcional activado señor. Tiene a su disposición un gestor de espacio de trabajo, con acceso a calendario, notas, y mas funcionalidades.";
    setMessages((prev) => [...prev, { text: functionalMsg, type: "nexus" }]);
    if (!silent) {
      setCurrentText(functionalMsg);
      await speak(functionalMsg);
      setCurrentText("");
    } else {
      if (subtitle) {
        setBackgroundSubtitle(subtitle);
        setTimeout(() => setBackgroundSubtitle(""), 3000);
      }
      if (forceListen) {
        startAutoListening();
      } else {
        setTimeout(() => {
          startAutoListening();
        }, 500);
      }
    }
  }

  // 🔄 VOLVER AL MODO NORMAL
  type ModeHandlerOptions = { silent?: boolean; subtitle?: string; forceListen?: boolean };

const handleNormalMode = async ({ silent = false, subtitle = "", forceListen = false }: ModeHandlerOptions = {}) => {
  setAppState("active");
  const normalMsg = "Volviendo al modo normal, Señor. ¿En qué más puedo asistirle?";
  setMessages((prev) => [...prev, { text: normalMsg, type: "nexus" }]);
  if (silent) {
    stopListening();
    if (subtitle) {
      setBackgroundSubtitle(subtitle);
      setTimeout(() => setBackgroundSubtitle(""), 3000);
    }
    if (forceListen) {
      startAutoListening();
      return;
    }
    setTimeout(() => {
      startAutoListening();
    }, 500);
    return;
  }
  setCurrentText(normalMsg);
  await speak(normalMsg);
  setCurrentText("");
} 

// 🔄 FUNCIÓN PARA REINICIAR NEXUS
const handleReset = async () => {
  // Detener cualquier reproducción de música
  if (isPlayingMusic) {
    if (youtubePlayerRef.current && typeof youtubePlayerRef.current.stopVideo === 'function') {
      youtubePlayerRef.current.stopVideo();
    }
    setIsPlayingMusic(false);
    setCurrentSongTitle("");
    setCurrentVideoId("");
    setPlaylistMode(false);
    setCurrentPlaylist(null);
    setCurrentPlaylistIndex(0);
    setMusicBackgroundMode(false);
  }
  
  // Detener la escucha
  if (isListening) {
    stopListening();
  }
  
  // Reiniciar estados
  setAppState("active");
  setCurrentText("NEXUS reiniciado correctamente.");
  await speak("NEXUS reiniciado correctamente.");
  setCurrentText("");
  
  // Reproducir sonido de inicio
  playStartupSound();
};

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
  // --- Comandos de segundo plano ---
  const normalized = message
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()

  // Comando para segundo plano
  if (isPlayingMusic && (
    normalized.includes("reproduce en segundo plano") || normalized.includes("segundo plano")
  )) {
    setMusicBackgroundMode(true)
    setCurrentText("Música en segundo plano activada.")
    setTimeout(() => setCurrentText(""), 1500)
    return
  }
  // Comando para primer plano
  if (isPlayingMusic && (
    normalized.includes("reproduce en primer plano") || normalized.includes("primer plano")
  )) {
    setMusicBackgroundMode(false)
    setCurrentText("Música en primer plano.")
    setTimeout(() => setCurrentText(""), 1500)
    return
  }

  // --- COMANDOS DE VOZ PARA LECTOR DE PANTALLA ---
  // Mejorar reconocimiento de comandos de voz para lector de pantalla

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

    // --- SOLO RESPONDER A COMANDOS PREDEFINIDOS ---
    const mode = appState === "functional_mode" ? "functional" : "normal"
    const availableCommands = LocalCommands.getAvailableCommands(mode).map(cmd => cmd.toLowerCase())
    // Revisar si el mensaje coincide con algún comando predefinido
    const isRecognized = availableCommands.some(cmd => {
      // Permitir variables como [contacto] o [lugar]
      if (cmd.includes("[contacto]")) {
        return normalized.startsWith("llama a ") || normalized.startsWith("llamar a ")
      }
      if (cmd.includes("[lugar]")) {
        return normalized.startsWith("navegar a ") || normalized.startsWith("navega a ")
      }
      if (cmd.includes("[playlist]")) {
        return normalized.includes("pon ") || normalized.includes("reproduce ")
      }
      // Comando exacto
      return normalized === cmd.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
    })

    if (!isRecognized) {
      // Si no es comando válido ni de lector, ignorar por completo (no respuesta, no feedback)
      setIsProcessing(false);
      return;
    }

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
          }
          
          setCurrentText("")
          setAppState("navigation_mode")
          setIsProcessing(false)
          return
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
              case "youtube" as any:
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

      const foundPlaylist = playlists.find((pl: { name: string; songs: any[] }) => {
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
        "¿Qué playlist desea reproducir, Señor? (Opciones: " + playlists.map((pl: { name: string }) => pl.name).join(", ") + ")",
      )
      await speak("¿Qué playlist desea reproducir, Señor?")
      setCurrentText("")
      return
    }

    // Si el usuario dice directamente "reproduce la playlist X"
    if (isPlaylistRequest) {
      const foundPlaylist = playlists.find((pl: { name: string; songs: any[] }) => {
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
      setMusicBackgroundMode(true) // Iniciar siempre en modo background
      // Mantener el modo actual en lugar de cambiar a music_playing
      // Solo cambiar a music_playing si no estamos en functional_mode o intelligent_mode
      if (appState !== ("functional_mode" as AppState) && appState !== "intelligent_mode") {
        setAppState("music_playing")
      }
      
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
      const stopMsg = "Cerrando reproductor de música, Señor."
      setCurrentText(stopMsg)
      await speak(stopMsg)
      setCurrentText("")
      setIsPlayingMusic(false)
      setCurrentSongTitle("")
      setCurrentVideoId("")
      setPlaylistMode(false)
      setCurrentPlaylist(null)
      setCurrentPlaylistIndex(0)
      setMusicBackgroundMode(false)
      
      // No cambiar el modo si estamos en modo funcional o inteligente
      if (appState !== ("functional_mode" as AppState) && appState !== "intelligent_mode") {
        setAppState("active")
      }
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

  // --- ICONO PRINCIPAL CON CICLO DE ANIMACIÓN EN MODO NORMAL + MÚSICA ---
// --- ICONO PRINCIPAL: Modo normal + música fondo = solo una nota musical vibrando ---
// No se requiere ciclo ni useState/useEffect


const getMainIcon = () => {
  // --- LOGO: Modo normal + música fondo = solo nota musical vibrando ---
  if (appState === "active" && isPlayingMusic && musicBackgroundMode) {
    return (
      <Music className="h-20 w-20 text-green-400 animate-pulse" />
    );
  }
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
    "w-64 h-64 rounded-full border-4 flex items-center justify-center transition-all duration-500 relative";

  // PRIORIDAD: Modo normal + música fondo SIEMPRE círculo verde vibrante
  if (appState === "active" && isPlayingMusic && musicBackgroundMode) {
    return `${baseClasses} border-green-500 shadow-green-500/70 animate-pulse`;
  }

  if (isSpeaking) {
    return `${baseClasses} border-cyan-500 shadow-cyan-500/50 animate-pulse`;
  }

  if (isProcessing) {
    return `${baseClasses} border-yellow-500 shadow-yellow-500/50 animate-pulse`;
  }

  if (isListening) {
    return `${baseClasses} border-green-500 shadow-green-500/50 animate-pulse`;
  }

  if (appState === "sleeping") {
    return `${baseClasses} border-gray-600 opacity-60`;
  }

  if (appState === "waiting_password") {
    return `${baseClasses} border-yellow-500 shadow-yellow-500/30`;
  }

  if (appState === "initializing") {
    // <- NUEVO ESTILO
    return `${baseClasses} border-cyan-500 shadow-cyan-500/50 animate-pulse`;
  }

  if (appState === "calling_confirmation") {
    return `${baseClasses} border-green-500 shadow-green-500/50 animate-pulse`;
  }

  if (appState === "navigation_mode") {
    return `${baseClasses} border-blue-500 shadow-blue-500/50 animate-pulse`;
  }

  if (appState === "music_mode") {
    return `${baseClasses} border-green-500 shadow-green-500/50 animate-pulse`;
  }

  if (appState === "music_playing") {
    return `${baseClasses} border-green-500 shadow-green-500/70 animate-pulse`;
  }

  if (appState === "map_active") {
    return `${baseClasses} border-blue-500 shadow-blue-500/70 animate-pulse`;
  }

  if (appState === "intelligent_mode") {
    return `${baseClasses} border-purple-500 shadow-purple-500/50 animate-pulse`;
  }

  if (appState === "functional_mode") {
    return `${baseClasses} border-orange-500 shadow-orange-500/50 animate-pulse`;
  }

  if (appState === "image_download_confirmation") {
    return `${baseClasses} border-cyan-500 shadow-cyan-500/50 animate-pulse`;
  }

  return `${baseClasses} border-cyan-500 shadow-cyan-500/30`;
}

  const getStatusText = () => {
    if (appState === "sleeping") return "Presione para activar NEXUS"
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
      return "Modo funcional"
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

  // --- INTERFAZ ESTÁTICA PARA MODO FUNCIONAL ---
  if (appState === "functional_mode" as AppState) {
    // Usamos el componente memoizado FunctionalModeShell que nunca se vuelve a renderizar
    // gracias al comparador personalizado (siempre retorna true)
    const handleMusicControlInFunctional = (action: string) => {
      console.log('Music control action en modo funcional:', action) // Para debug
      
      if (action === 'toggle') {
        if (youtubePlayerRef.current && 
            typeof youtubePlayerRef.current.pauseVideo === 'function' && 
            typeof youtubePlayerRef.current.playVideo === 'function') {
          if (!isPlayingMusic) {
            youtubePlayerRef.current.playVideo();
            setIsPlayingMusic(true);
          } else {
            youtubePlayerRef.current.pauseVideo();
            setIsPlayingMusic(false);
          }
        }
      } else if (action === 'quitar' || action === 'close') {
        // Detener la música
        if (youtubePlayerRef.current && 
            typeof youtubePlayerRef.current.stopVideo === 'function') {
          youtubePlayerRef.current.stopVideo();
          setCurrentSongTitle("");
          setMusicBackgroundMode(false);
          setIsPlayingMusic(false);
        }
      } else if (action === 'foreground') {
        // Cambiar a modo música
        setAppState('music_mode');
      } else if (action === 'next' && playlistMode && currentPlaylist) {
        // Reproducir siguiente canción
        if (currentPlaylistIndex < currentPlaylist.songs.length - 1) {
          const nextIndex = currentPlaylistIndex + 1;
          setCurrentPlaylistIndex(nextIndex);
          const nextSong = currentPlaylist.songs[nextIndex];
          setCurrentSongTitle(nextSong.title);
          setCurrentVideoId(nextSong.videoId);
          
          // Actualizar el reproductor
          if (youtubePlayerRef.current && 
              typeof youtubePlayerRef.current.loadVideoById === 'function') {
            youtubePlayerRef.current.loadVideoById(nextSong.videoId);
          }
        }
      } else if (action === 'previous' && playlistMode && currentPlaylist) {
        // Reproducir canción anterior
        if (currentPlaylistIndex > 0) {
          const prevIndex = currentPlaylistIndex - 1;
          setCurrentPlaylistIndex(prevIndex);
          const prevSong = currentPlaylist.songs[prevIndex];
          setCurrentSongTitle(prevSong.title);
          setCurrentVideoId(prevSong.videoId);
          
          // Actualizar el reproductor
          if (youtubePlayerRef.current && 
              typeof youtubePlayerRef.current.loadVideoById === 'function') {
            youtubePlayerRef.current.loadVideoById(prevSong.videoId);
          }
        }
      } else if (action === 'foreground') {
        // Cambiar a modo primer plano
        setMusicBackgroundMode(false);
      }
    };
    
    return (
      <FunctionalModeShell 
        onNormal={() => handleNormalMode({ silent: true, subtitle: "Cambiando a modo normal" })} 
        onIntelligent={() => handleIntelligentMode({ silent: true, subtitle: "Cambiando a modo inteligente" })} 
        onFunctional={() => handleFunctionalMode({ silent: true, subtitle: "Cambiando a modo funcional" })} 
        musicBackgroundMode={musicBackgroundMode}
        currentSongTitle={currentSongTitle}
        onShowSettings={() => setShowSettings(true)}
        onShowConversations={() => setShowConversationsManager(true)}
        onShowLocations={() => setShowLocationsManager(true)}
        onMusicControl={handleMusicControlInFunctional}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black/95 relative overflow-hidden">
      {/* El modo funcional se maneja completamente con el componente memoizado FunctionalModeShell */}
      {appState !== "functional_mode" && (
        <>
          {/* Fondo de estrellas futurista */}
          <Starfield isSpeaking={isSpeaking} startupMode={startupAnim} />

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
        </>
      )}
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b border-cyan-500/20 relative z-10">
        <div className="flex items-center space-x-4">
          <h1 className="text-3xl font-bold text-cyan-400 tracking-wider">NEXUS</h1>
          {/* Status text e indicador de modo en el header */}
          <div className="flex items-center ml-6 gap-3">
            <span className="text-cyan-200 text-base font-semibold drop-shadow-md" style={{textShadow:'0 2px 8px #000'}}>{getStatusText()}</span>
            {appState === "intelligent_mode" && (
              <span className="flex items-center gap-1 px-3 py-1 bg-purple-900/60 rounded-full border border-purple-500 ml-2">
                <Brain className="w-5 h-5 text-purple-400" />
                <span className="text-purple-300 text-xs font-semibold">MODO INTELIGENTE</span>
              </span>
            )}
            {appState === "functional_mode" && (
              <span className="flex items-center gap-1 px-3 py-1 bg-orange-900/60 rounded-full border border-orange-500 ml-2">
                <Mail className="w-5 h-5 text-orange-400" />
                <span className="text-orange-300 text-xs font-semibold">MODO FUNCIONAL</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {/* Botón Playlists */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleAccessibleAction("playlists", "Playlists de música", () => setShowPlaylistSelector(true))}
            className={`rounded-full p-2 hover:bg-cyan-900 ${focusedElement === "playlists" && screenReaderEnabled ? "border-2 border-green-400 bg-green-900/30" : ""}`}
            title="Playlists de música"
            aria-label="Playlists de música"
            tabIndex={0}
            onKeyDown={(e) =>
              (e.key === "Enter" || e.key === " ") &&
              handleAccessibleAction("playlists", "Playlists de música", () => setShowPlaylistSelector(true))
            }
          >
            <Music className="w-6 h-6 text-cyan-400" />
          </Button>

          {/* Botón Mapa */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleAccessibleAction("locations", "Ubicaciones", () => setShowLocationsManager(true))}
            className={`rounded-full p-2 hover:bg-cyan-900 ${focusedElement === "locations" && screenReaderEnabled ? "border-2 border-green-400 bg-green-900/30" : ""}`}
            title="Ubicaciones"
            aria-label="Ubicaciones"
            tabIndex={0}
            onKeyDown={(e) =>
              (e.key === "Enter" || e.key === " ") &&
              handleAccessibleAction("locations", "Ubicaciones", () => setShowLocationsManager(true))
            }
          >
            <MapPin className="w-6 h-6 text-cyan-400" />
          </Button>

          {/* Botón Agenda */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleAccessibleAction("conversations", "Conversaciones", () => setShowConversationsManager(true))}
            className={`rounded-full p-2 hover:bg-cyan-900 ${focusedElement === "conversations" && screenReaderEnabled ? "border-2 border-green-400 bg-green-900/30" : ""}`}
            title="Conversaciones"
            aria-label="Conversaciones"
            tabIndex={0}
            onKeyDown={(e) =>
              (e.key === "Enter" || e.key === " ") &&
              handleAccessibleAction("conversations", "Conversaciones", () => setShowConversationsManager(true))
            }
          >
            <MessageCircle className="w-6 h-6 text-cyan-400" />
          </Button>

          {/* Botón Reiniciar NEXUS */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleAccessibleAction("reset", "Reiniciar NEXUS", async () => {
              // Detener cualquier reproducción de música
              if (isPlayingMusic) {
                if (youtubePlayerRef.current && typeof youtubePlayerRef.current.stopVideo === 'function') {
                  youtubePlayerRef.current.stopVideo();
                }
                setIsPlayingMusic(false);
                setCurrentSongTitle("");
                setCurrentVideoId("");
                setPlaylistMode(false);
                setCurrentPlaylist(null);
                setCurrentPlaylistIndex(0);
                setMusicBackgroundMode(false);
              }
              
              // Detener la escucha
              if (isListening) {
                stopListening();
              }
              
              // Reiniciar estados
              setAppState("active");
              setCurrentText("NEXUS reiniciado correctamente.");
              await speak("NEXUS reiniciado correctamente.");
              setCurrentText("");
              
              // Reproducir sonido de inicio
              playStartupSound();
            })}
            className={`rounded-full p-2 hover:bg-cyan-900 ${focusedElement === "reset" && screenReaderEnabled ? "border-2 border-green-400 bg-green-900/30" : ""}`}
            title="Reiniciar NEXUS"
            aria-label="Reiniciar NEXUS"
            tabIndex={0}
            onKeyDown={(e) =>
              (e.key === "Enter" || e.key === " ") &&
              handleAccessibleAction("reset", "Reiniciar NEXUS", async () => {
                // Detener cualquier reproducción de música
                if (isPlayingMusic) {
                  if (youtubePlayerRef.current && typeof youtubePlayerRef.current.stopVideo === 'function') {
                    youtubePlayerRef.current.stopVideo();
                  }
                  setIsPlayingMusic(false);
                  setCurrentSongTitle("");
                  setCurrentVideoId("");
                  setPlaylistMode(false);
                  setCurrentPlaylist(null);
                  setCurrentPlaylistIndex(0);
                  setMusicBackgroundMode(false);
                }
                
                // Detener la escucha
                if (isListening) {
                  stopListening();
                }
                
                // Reiniciar estados
                setAppState("active");
                setCurrentText("NEXUS reiniciado correctamente.");
                await speak("NEXUS reiniciado correctamente.");
                setCurrentText("");
                
                // Reproducir sonido de inicio
                playStartupSound();
              })
            }
          >
            <RefreshCw className="w-6 h-6 text-cyan-400" />
          </Button>

          {/* Botón Settings */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleAccessibleAction("settings", "Configuraciones", () => setShowSettings(true))}
            className={`rounded-full p-2 hover:bg-cyan-900 ${focusedElement === "settings" && screenReaderEnabled ? "border-2 border-green-400 bg-green-900/30" : ""}`}
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
    <div className="bg-gray-900 rounded-lg p-8 shadow-xl border border-cyan-800 relative min-w-[340px] max-w-[90vw] min-h-[400px]">
      <h2 className="text-cyan-300 text-xl font-bold mb-4 flex items-center gap-2">
        <Music className="inline-block w-6 h-6 text-cyan-400" /> Playlists Registradas
      </h2>
      {/* CREAR NUEVA PLAYLIST */}
      <div className="mb-4 flex gap-2">
        <input
          className="flex-1 rounded px-2 py-1 bg-gray-800 text-cyan-100 border border-cyan-700"
          placeholder="Nueva playlist"
          value={newPlaylistName}
          onChange={e => setNewPlaylistName(e.target.value)}
          onKeyDown={e => { if(e.key==="Enter" && newPlaylistName.trim()){ setPlaylists((prev: { name: string, songs: any[] }[])=>[...prev,{name:newPlaylistName.trim(),songs:[]}]); setNewPlaylistName("") }}}
        />
        <Button
          className="bg-cyan-700 hover:bg-cyan-800 text-white"
          disabled={!newPlaylistName.trim()}
          onClick={()=>{ setPlaylists((prev: { name: string, songs: any[] }[])=>[...prev,{name:newPlaylistName.trim(),songs:[]}]); setNewPlaylistName("") }}
        >Crear</Button>
      </div>
      {/* LISTA DE PLAYLISTS */}
      <ul className="space-y-2 mb-4">
        {playlists.map((pl: { name: string, songs: any[] }, idx: number) => (
          <li key={pl.name} className={`flex items-center justify-between bg-cyan-950/40 rounded px-4 py-2 ${selectedPlaylistIdx===idx?"border-2 border-cyan-400":""}`}>
            <span className="text-cyan-100 font-semibold cursor-pointer" onClick={()=>setSelectedPlaylistIdx(idx)}>{pl.name}</span>
            <span className="text-cyan-400 text-xs">{pl.songs.length} canciones</span>
            <Button
              size="sm"
              className="ml-2 bg-red-700 hover:bg-red-800 text-white px-2 py-0.5"
              onClick={()=>{
                setPlaylists((prev: { name: string, songs: any[] }[])=>prev.filter((_: { name: string, songs: any[] }, i: number)=>i!==idx));
                if(selectedPlaylistIdx===idx) setSelectedPlaylistIdx(null)
                else if(selectedPlaylistIdx && selectedPlaylistIdx>idx) setSelectedPlaylistIdx(selectedPlaylistIdx-1)
              }}
              title="Eliminar playlist"
            >🗑️</Button>
          </li>
        ))}
      </ul>
      {/* DETALLE DE PLAYLIST SELECCIONADA */}
      {selectedPlaylistIdx!==null && playlists[selectedPlaylistIdx] && (
        <div className="mb-4 p-4 rounded bg-cyan-950/60">
          <div className="flex justify-between items-center mb-2">
            <span className="text-cyan-200 font-bold">{playlists[selectedPlaylistIdx].name}</span>
            <span className="text-cyan-400 text-xs">{playlists[selectedPlaylistIdx].songs.length} canciones</span>
          </div>
          <ul className="space-y-1 mb-2 max-h-32 overflow-y-auto">
            {playlists[selectedPlaylistIdx].songs.map((song: { title: string, videoId: string }, sidx: number) => (
              <li key={song.title+sidx} className="flex items-center justify-between text-cyan-100 text-sm bg-cyan-900/30 rounded px-2 py-1">
                <span>{song.title}</span>
                <a className="ml-2 text-cyan-400 underline" href={`https://youtube.com/watch?v=${song.videoId}`} target="_blank" rel="noopener noreferrer">Ver</a>
              </li>
            ))}
            {playlists[selectedPlaylistIdx].songs.length===0 && <li className="text-cyan-400 text-xs">Sin canciones</li>}
          </ul>
          {/* FORM AGREGAR CANCIÓN */}
          <div className="flex gap-2 mb-2">
            <input
              className="flex-1 rounded px-2 py-1 bg-gray-800 text-cyan-100 border border-cyan-700"
              placeholder="Título de la canción"
              value={newSongTitle}
              onChange={e=>setNewSongTitle(e.target.value)}
            />
            <input
              className="flex-1 rounded px-2 py-1 bg-gray-800 text-cyan-100 border border-cyan-700"
              placeholder="Link de YouTube"
              value={newSongLink}
              onChange={e=>setNewSongLink(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"){addSongToPlaylist()}}}
            />
            <Button
              className="bg-cyan-700 hover:bg-cyan-800 text-white"
              disabled={!newSongTitle.trim()||!newSongLink.trim()}
              onClick={()=>addSongToPlaylist()}
            >Añadir</Button>
          </div>
        </div>
      )}
      <Button
        className="w-full bg-cyan-700 hover:bg-cyan-800 text-white mt-2"
        onClick={() => { setShowPlaylistSelector(false); setSelectedPlaylistIdx(null); }}
      >Cerrar</Button>
    </div>
  </div>
)}
      {/* Selector de Modo NEXUS */}

      {/* Main Interface - Solo mostrar si no hay mapa o música activa */}
      {/* Render central solo cuando música en segundo plano, modo normal y música sonando */}
      {!isMapActive && isPlayingMusic && musicBackgroundMode && appState === "active" && (
        <div className="flex-1 flex flex-col items-center justify-center min-h-screen p-8 relative z-10">
          {/* Central Circle SOLO para logo animado música fondo */}
          <div className="relative flex flex-col items-center justify-center mb-20 w-full mt-[-70px]">
            <div className="w-48 h-48 rounded-full bg-black flex items-center justify-center">
              {getMainIcon()}
            </div>
          </div>
        </div>
      )}

      {/* Render habitual solo cuando NO está en música en segundo plano */}
      {!isMapActive && (!isPlayingMusic || !musicBackgroundMode || appState !== "active") && appState !== "functional_mode" && (
        <div className="flex-1 flex flex-col items-center justify-center min-h-screen p-8 relative z-10">
          {/* Central Circle */}
          <div className="relative flex flex-col items-center justify-center mb-20 w-full mt-[-70px]">
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

            {/* Botones de modo centrados debajo del logo, solo si hasInitialized y modo activo */}
            {hasInitialized && ["active","intelligent_mode"].includes(appState) && (
              <div className="flex gap-8 mt-10 justify-center items-center w-full">
                <button
                  className={`px-8 py-3 rounded-[10px] text-lg font-bold border-2 transition-all duration-200 shadow-lg ${appState==="active"?"bg-cyan-900/90 text-cyan-200 border-cyan-400 scale-105":"bg-cyan-900/60 text-cyan-400 border-cyan-700 hover:scale-105"}`}
                  onClick={() => { if (!isSpeaking && appState!=="active") handleNormalMode({silent:false}) }}
                  tabIndex={0}
                  aria-label="Modo Normal"
                >Modo Normal</button>
                <button
                  className={`px-8 py-3 rounded-[10px] text-lg font-bold border-2 transition-all duration-200 shadow-lg ${appState==="intelligent_mode"?"bg-purple-900/90 text-purple-200 border-purple-400 scale-105":"bg-purple-900/60 text-purple-400 border-purple-700 hover:scale-105"}`}
                  onClick={() => { if (!isSpeaking && appState!=="intelligent_mode") handleIntelligentMode({silent:false}) }}
                  tabIndex={0}
                  aria-label="Modo Inteligente"
                >Modo Inteligente</button>
                <button
                  className={`px-8 py-3 rounded-[10px] text-lg font-bold border-2 transition-all duration-200 shadow-lg ${appState===("functional_mode" as AppState)?"bg-orange-900/90 text-orange-200 border-orange-400 scale-105":"bg-orange-900/60 text-orange-400 border-orange-700 hover:scale-105"}`}
                  onClick={() => { if (!isSpeaking && appState!==("functional_mode" as AppState)) handleFunctionalMode({silent:false}) }}
                  tabIndex={0}
                  aria-label="Modo Funcional"
                >Modo Funcional</button>
              </div>
            )}

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
                  {"> "} {appState === "intelligent_mode"
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

      {/* Footer limpio SOLO con botones de modo NEXUS */}



      

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

      {/* Reproductor YouTube siempre montado (oculto en segundo plano) */}
      {isPlayingMusic && currentVideoId && (
        <div className={musicBackgroundMode ? "hidden" : "fixed inset-0 z-50 flex items-center justify-center bg-black/80"}>
          <div className="relative w-full max-w-xl">
            <YouTubePlayer
              ref={youtubePlayerRef}
              videoId={currentVideoId}
              onEnd={async () => {
                if (playlistMode && currentPlaylist && currentPlaylistIndex < currentPlaylist.songs.length - 1) {
                  const nextIndex = currentPlaylistIndex + 1
                  setCurrentPlaylistIndex(nextIndex)
                  setCurrentSongTitle(currentPlaylist.songs[nextIndex].title)
                  setCurrentVideoId(currentPlaylist.songs[nextIndex].videoId)
                } else {
                  setIsPlayingMusic(false)
                  setCurrentSongTitle("")
                  setCurrentVideoId("")
                  setPlaylistMode(false)
                  setCurrentPlaylist(null)
                  setCurrentPlaylistIndex(0)
                  setMusicBackgroundMode(false)
                  
                  // Mantener el modo actual si estamos en modo funcional o inteligente
                  if (appState !== ("functional_mode" as AppState) && appState !== "intelligent_mode") {
                    setAppState("active")
                  }
                }
              }}
            />
            {!musicBackgroundMode && (
              <div className="flex gap-2 mt-4 justify-end">
                <Button onClick={() => setMusicBackgroundMode(true)} variant="secondary">
                  Reproducir en segundo plano
                </Button>
                <Button onClick={() => handleMusicControl("quitar")}>Quitar música</Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mini barra de música en segundo plano con controles */}
      {isPlayingMusic && currentVideoId && musicBackgroundMode && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-cyan-900/90 rounded-lg shadow-xl flex items-center px-4 py-3 z-40 border border-cyan-600 gap-3">
          {/* Indicador de modo y escucha */}
          <div className="flex flex-col items-center justify-center mr-3">
            <span className="text-xs font-bold text-cyan-200">
              {appState === "intelligent_mode" ? "🧠 Inteligente" : appState === ("functional_mode" as AppState) ? "🔧 Funcional" : "✨ Normal"}
            </span>
            {/* Subtítulo animado solo si hay mensaje y música en segundo plano */}
            {backgroundSubtitle && (
              <div className="absolute left-1/2 -translate-x-1/2 bottom-20 bg-black/80 text-white px-4 py-2 rounded-xl text-lg shadow-lg z-50 transition-opacity duration-300">
                {backgroundSubtitle}
              </div>
            )}
            <span className={`text-xs flex items-center mt-1 ${isListening ? "text-green-400" : "text-gray-400"}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M12 1v22"/><rect x="8" y="5" width="8" height="14" rx="4"/></svg>
              {isListening ? "Escuchando" : "En espera"}
            </span>
          </div>
          
          {/* Botones para cambiar de modo */}
          <div className="flex items-center gap-1 mr-2 border-r border-cyan-700/50 pr-3">
            <button
              className="bg-cyan-700 hover:bg-cyan-800 text-white rounded-full p-2 shadow-md border border-cyan-400 w-7 h-7 flex items-center justify-center"
              onClick={() => handleNormalMode({ silent: true, subtitle: "Cambiando a modo normal" })}
              title="Modo Normal"
            >
              <Unlock className="w-3 h-3" />
            </button>
            <button
              className="bg-purple-700 hover:bg-purple-800 text-white rounded-full p-2 shadow-md border border-purple-400 w-7 h-7 flex items-center justify-center"
              onClick={() => handleIntelligentMode({ silent: true, subtitle: "Cambiando a modo inteligente" })}
              title="Modo Inteligente"
            >
              <Brain className="w-3 h-3" />
            </button>
            <button
              className="bg-orange-700 hover:bg-orange-800 text-white rounded-full p-2 shadow-md border border-orange-400 w-7 h-7 flex items-center justify-center"
              onClick={() => handleFunctionalMode({ silent: true, subtitle: "Cambiando a modo funcional" })}
              title="Modo Funcional"
            >
              <Mail className="w-3 h-3" />
            </button>
          </div>

          <Music className="mr-1 text-cyan-300" />
          <span className="text-cyan-100 font-medium mr-2 truncate max-w-[140px]">{currentSongTitle || "Música en segundo plano"}</span>

          {/* Controles de reproducción */}
          <div className="flex items-center gap-2 border-l border-cyan-700/50 pl-3">
            {/* Botón anterior */}
            <Button size="icon" variant="ghost" className="hover:bg-cyan-800/50" aria-label="Anterior"
              disabled={!playlistMode || !currentPlaylist || currentPlaylistIndex === 0}
              onClick={() => {
                if (playlistMode && currentPlaylist && currentPlaylistIndex > 0) {
                  const prevIndex = currentPlaylistIndex - 1
                  setCurrentPlaylistIndex(prevIndex)
                  setCurrentSongTitle(currentPlaylist.songs[prevIndex].title)
                  setCurrentVideoId(currentPlaylist.songs[prevIndex].videoId)
                }
              }}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 19l-7-7 7-7" /><path d="M19 5v14" /></svg>
            </Button>

            {/* Botón play/pause */}
            <Button size="icon" variant="ghost" className="hover:bg-cyan-800/50" aria-label="Play/Pause"
              onClick={() => {
                if (youtubePlayerRef.current) {
                  const player = youtubePlayerRef.current;
                  // @ts-ignore
                  if (player.getPlayerState && player.getPlayerState() === 1) {
                    // playing
                    player.pause();
                  } else {
                    player.play();
                  }
                }
              }}
            >
              {/* Icono dinámico play/pause */}
              {youtubePlayerRef.current && youtubePlayerRef.current.getPlayerState && youtubePlayerRef.current.getPlayerState() === 1 ? (
                // Pausa
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              ) : (
                // Play
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
              )}
            </Button>

            {/* Botón siguiente */}
            <Button size="icon" variant="ghost" className="hover:bg-cyan-800/50" aria-label="Siguiente"
              disabled={!playlistMode || !currentPlaylist || currentPlaylistIndex >= (currentPlaylist?.songs.length - 1)}
              onClick={() => {
                if (playlistMode && currentPlaylist && currentPlaylistIndex < currentPlaylist.songs.length - 1) {
                  const nextIndex = currentPlaylistIndex + 1
                  setCurrentPlaylistIndex(nextIndex)
                  setCurrentSongTitle(currentPlaylist.songs[nextIndex].title)
                  setCurrentVideoId(currentPlaylist.songs[nextIndex].videoId)
                }
              }}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 5l7 7-7 7" /><path d="M5 5v14" /></svg>
            </Button>
          </div>

          
          <div className="flex items-center gap-2 ml-auto">
            <Button size="sm" variant="outline" className="bg-cyan-950/50 hover:bg-cyan-800" onClick={() => setMusicBackgroundMode(false)}>
              <svg width="16" height="16" className="mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                <polyline points="10 17 15 12 10 7"/>
                <line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
              Primer plano
            </Button>
            <Button size="sm" variant="outline" className="bg-red-950/50 hover:bg-red-900/50" onClick={() => handleMusicControl("quitar")}>
              <svg width="16" height="16" className="mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              Cerrar
            </Button>
          </div>

          {/* Indicador de música en segundo plano */}
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-cyan-400 bg-cyan-950/90 px-2 py-0.5 rounded-b-lg border border-t-0 border-cyan-700/50">
            Música en segundo plano
          </span>
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

      {/* 👤 SISTEMA DE LOGIN CON PERFILES */}
      {showLoginSystem && (
        <NexusLoginSystem 
          onLoginComplete={(profile: UserProfile) => {
            setActiveProfile(profile);
            setShowLoginSystem(false);
            // Activar Nexus después del login
            setAppState("initializing");
            setShowLoadingScreen(true);
          }} 
        />
      )}
    </div>
  )
}


