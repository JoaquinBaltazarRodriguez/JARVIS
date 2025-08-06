"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";

// import { useCineSound } from "@/hooks/useCineSound" // Comentado temporalmente para optimización de memoria

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
  BookOpen,
  Plus,
  Camera,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Zap,
  Trash2,
  MessageSquare,
  Mic,
  X,
  HelpCircle,
  VolumeX,
  Eye,
  Globe,
  ArrowRight,
  CheckCircle,
  Bold,
  Underline,
  Crown,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { LogoutModal } from "@/components/LogoutModal"
import { useSimpleAudio, setNexusVoiceMuted, isNexusVoiceMuted } from "@/hooks/useSimpleAudio"
import { useAutoSpeech } from "@/hooks/useAutoSpeech"
import { useFuturisticSounds } from "@/hooks/useFuturisticSounds"
import { ContactsManager } from "@/components/ContactsManager"
import YouTubePlayer, { type YouTubePlayerRef } from "@/components/YoutubePlayer"
import { searchYouTube } from "@/lib/youtubeSearch"



import { ContactsDB, CommandDetector, TimeUtils } from "@/lib/database"
import { ConversationsManager } from "@/components/ConversationsManager"
import { ConversationsDB, type Conversation, type ConversationMessage } from "@/lib/conversations"
import { NexusLoginSystem } from "@/components/NexusLoginSystem"
import { ProfilesManager } from "@/lib/profilesManager"
import { getGenderTreatment } from "@/lib/utils"
// UserProfile type imported from firebaseProfileManager below
import { usePillReminder } from "@/hooks/usePillReminder"
// importación eliminada para limpiar la UI
import { TokenManager } from "@/lib/tokenManager"
import { LocalCommands } from "@/lib/localCommands"
import { NexusMemory } from "@/lib/jarvisMemory"
import Starfield from "@/components/Starfield"

// import { useNexusStartupAnimation } from "@/hooks/useNexusStartupAnimation" // Comentado temporalmente para optimización de memoria
import { SettingsModal } from "@/components/SettingsModal"
import { LoadingScreen } from "@/components/LoadingScreen"
import TutorialModal from "@/components/TutorialModal"
import TutorialGuide from "@/components/TutorialGuide"
import { FirebaseProfileManager, type UserProfile } from "@/lib/firebaseProfileManager"
import { FirebaseProjectsManager, type Project } from "@/lib/firebaseProjectsManager"

// --- CONFIGURACIÓN DE CIUDAD Y API WEATHER ---

const DEFAULT_CITY = "Posadas, Misiones, AR"

const WEATHER_API_KEY = "34c011ccd32573ff3d987a6a9b241b2f"

function getFriendlyWeatherMessage(desc: string) {
  // Obtener el perfil activo para usar el tratamiento adecuado según género
  const activeProfile = typeof window !== "undefined" ? ProfilesManager.getActiveProfile() : null;
  const treatment = getGenderTreatment(activeProfile?.gender);
  
  const d = desc.toLowerCase()
  if (d.includes("lluvia")) return `${treatment}, se esperan lluvias. Le recomiendo llevar paraguas.`
  if (d.includes("nublado") && d.includes("parcial"))
    return `${treatment}, estará parcialmente nublado. Ideal para salir, pero lleve abrigo por si acaso.`
  if (d.includes("nublado")) return `${treatment}, el cielo estará mayormente nublado.`
  if (d.includes("despejado") || d.includes("cielo claro") || d.includes("claro"))
    return `${treatment}, se espera un día soleado y despejado. ¡Aproveche el buen clima!`
  if (d.includes("tormenta")) return `${treatment}, hay alerta de tormenta. Le recomiendo precaución.`
  if (d.includes("niebla")) return `${treatment}, habrá niebla. Conduzca con cuidado.`
  return `${treatment}, el clima será: ${desc}.`
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
  | "music_mode"
  | "music_playing"
  | "intelligent_mode" // <- ESTADO PARA EL MODO INTELIGENTE
  | "functional_mode" // <- ESTADO PARA EL MODO FUNCIONAL
  | "image_download_confirmation"
  | "tutorial" // <- ESTADO PARA EL TUTORIAL GUIADO

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
  
  // --- Estado para transición de modo ---
  const [isModeTransitioning, setIsModeTransitioning] = useState(false)
  
  // 🎤 CONTROL MANUAL DE RECONOCIMIENTO DE VOZ
  const [isVoiceControlEnabled, setIsVoiceControlEnabled] = useState(false)
  
  // 📋 ESTADOS PARA NAVEGACIÓN DEL PANEL LATERAL
  const [currentView, setCurrentView] = useState<'inicio' | 'finalizadas' | 'papelera'>('inicio')
  const [customSections, setCustomSections] = useState<{id: string, name: string, createdAt: Date}[]>([])
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [showAddSectionModal, setShowAddSectionModal] = useState(false)
  const [newSectionName, setNewSectionName] = useState('')
  const [isCreatingSection, setIsCreatingSection] = useState(false)
  
  // 📋 ESTADOS PARA CREACIÓN DE PROYECTOS
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [newProject, setNewProject] = useState({
    title: '',
    isCompleted: false,
    responsible: null as UserProfile | null,
    dueDate: '',
    section: null as string | null,
    sections: [] as string[],
    priority: null as 'bajo' | 'medio' | 'alto' | null,
    notes: '',
    collaborators: [] as UserProfile[]
  })
  
  // 📝 ESTADOS PARA EDITOR DE TEXTO ENRIQUECIDO
  const [editorFormat, setEditorFormat] = useState({
    bold: false,
    underline: false,
    fontSize: '14px',
    color: '#ffffff',
    textFormat: 'p' as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p'
  })
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // 📋 ESTADOS PARA MENÚS DESPLEGABLES
  const [showSectionsMenu, setShowSectionsMenu] = useState(false)
  const [showPriorityMenu, setShowPriorityMenu] = useState(false)
  
  // --- Estados para sistema de perfiles ---
  const [showLoginSystem, setShowLoginSystem] = useState(false)
  const [activeProfile, setActiveProfile] = useState<UserProfile | null>(null)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showTutorialModal, setShowTutorialModal] = useState(false)
  const [showTutorialGuide, setShowTutorialGuide] = useState(false)
  
  // --- Estados para configuración de accesibilidad ---
  const [animationsEnabled, setAnimationsEnabled] = useState(true)
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false)
  
  // Región ARIA live para anuncios del lector de pantalla
  const [announcement, setAnnouncement] = useState('')
  
  // Función para manejar el cierre de sesión y reiniciar todos los estados
  
  // Función para manejar el login completado desde el sistema de login
// Función para manejar el tutorial aceptado
const handleTutorialAccepted = () => {
  setShowTutorialModal(false);
  setShowTutorialGuide(true);
  
  // Desactivar la escucha de NEXUS durante el tutorial
  if (isListening) {
    stopListening();
  }
  
  // Pausar cualquier otra funcionalidad mientras el tutorial está activo
  setAppState("tutorial");
};

// Función para manejar el tutorial rechazado
const handleTutorialDeclined = () => {
  setShowTutorialModal(false);
  setShowTutorialGuide(false); // No mostramos la guía del tutorial
  setAppState("active");
  
  // Guardar en localStorage que ya se mostró el tutorial y el mensaje de bienvenida
  if (activeProfile) {
    const tutorialKey = `nexus_tutorial_shown_${activeProfile.id}`;
    localStorage.setItem(tutorialKey, "true");
    
    // Mostrar mensaje de bienvenida después de rechazar el tutorial
    const welcomeMessage = getWelcomeMessage(activeProfile);
    setCurrentText(welcomeMessage);
    speak(welcomeMessage);
    
    // Marcar que ya se mostró el mensaje de bienvenida
    localStorage.setItem(`nexus_welcome_shown_${activeProfile.id}`, "true");
  }
};

// Función para manejar la finalización del tutorial
const handleTutorialCompleted = () => {
  setShowTutorialGuide(false);
  setAppState("active");
  
  // Guardar en localStorage que ya se mostró el tutorial
  if (activeProfile) {
    const tutorialKey = `nexus_tutorial_shown_${activeProfile.id}`;
    localStorage.setItem(tutorialKey, "true");
    
    // Verificar si ya se ha mostrado el mensaje de bienvenida
    const welcomeShown = localStorage.getItem(`nexus_welcome_shown_${activeProfile.id}`);
    
    if (welcomeShown !== "true") {
      // Mostrar mensaje de bienvenida después de completar el tutorial
      const welcomeMessage = getWelcomeMessage(activeProfile);
      setCurrentText(welcomeMessage);
      speak(welcomeMessage);
      
      // Marcar que ya se mostró el mensaje de bienvenida
      localStorage.setItem(`nexus_welcome_shown_${activeProfile.id}`, "true");
    }
  }
};

// Función para mostrar el tutorial manualmente desde el botón del header
const handleShowTutorialManually = () => {
  setShowTutorialGuide(true);
};

const handleLoginComplete = (profile: UserProfile) => {
  console.log("🔓 Login completado para el perfil:", profile.name);
  setActiveProfile(profile);
  setShowLoginSystem(false);
  setHasInitialized(true);
  
  // Activamos la interfaz de NEXUS inmediatamente para todos los usuarios
  setAppState("active");
  
  // Reproducir solo el sonido de inicio en todos los casos
  playStartupSound();
  
  // Verificamos si es un nuevo usuario para mostrar el tutorial
  const tutorialKey = `nexus_tutorial_shown_${profile.id}`;
  const tutorialShown = localStorage.getItem(tutorialKey);
  
  if (!tutorialShown) {
    // Si es la primera vez, mostramos el modal de tutorial
    // No reproducimos mensaje de bienvenida aquí, se hará después del tutorial
    setShowTutorialModal(true);
    // Guardamos que ya se mostró el tutorial una vez para no repetirlo
    localStorage.setItem(tutorialKey, "true");
    localStorage.setItem(`nexus_welcome_shown_${profile.id}`, "true");
  }
  // Eliminamos el bloque else ya que no queremos mostrar el mensaje de bienvenida
  // para usuarios recurrentes ni hacer ningún tipo de saludo
}
  
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

      // Asegurarnos de inicializar el reconocimiento de voz
      setTimeout(() => {
        console.log("🎤 Inicializando sistema de reconocimiento de voz...");
        if (typeof startAutoListening === 'function') {
          startAutoListening();
        }
      }, 3000); // Pequeño delay para asegurar que todo esté listo
    } else {
      // Si no hay perfil activo, mostrar la pantalla de login
      setShowLoginSystem(true);
    }
  }, [])
  
  // Efecto para cargar configuraciones de accesibilidad
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Cargar configuraciones
    const loadAccessibilitySettings = () => {
      // Verificar configuración de voz
      const voiceMuted = localStorage.getItem('nexus_voice_muted') === 'true';
      if (voiceMuted) {
        // Aplicar configuración de voz muda
        // Importamos setNexusVoiceMuted desde useSimpleAudio.ts
        setNexusVoiceMuted(true);
      }
      
      // Verificar configuración de animaciones
      const animations = localStorage.getItem('nexus_animations_enabled');
      if (animations !== null) {
        const animationsOn = animations === 'true';
        setAnimationsEnabled(animationsOn);
        
        // Aplicar configuración de animaciones al documento
        if (!animationsOn && typeof document !== 'undefined') {
          document.documentElement.classList.add('nexus-no-animations');
        }
      } else {
        // Valor predeterminado si no hay configuración
        localStorage.setItem('nexus_animations_enabled', 'true');
      }
      
      // Verificar configuración de lector de pantalla
      const screenReader = localStorage.getItem('nexus_screen_reader_enabled');
      if (screenReader !== null) {
        const screenReaderOn = screenReader === 'true';
        setScreenReaderEnabled(screenReaderOn);
        
        // Aplicar configuración del lector de pantalla al documento
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-nexus-screen-reader', screenReaderOn ? 'true' : 'false');
        }
        
        // Anunciar instrucciones de accesibilidad si el lector de pantalla está activo
        if (screenReaderOn && appState === 'active') {
          // Retrasar el anuncio para que ocurra después de la carga inicial
          setTimeout(() => {
            const accessibilityInstructions = 
              "Bienvenido a Nexus con modo de accesibilidad activado. " +
              "Para navegar por la interfaz, usa las teclas de flecha o Tab para moverte entre elementos. " + 
              "Los botones principales están en la parte inferior de la pantalla. " +
              "Puedes modificar las opciones de accesibilidad en el menú de configuración.";
            
            announceForScreenReader(accessibilityInstructions);
          }, 2000);
        }
      } else {
        // Valor predeterminado si no hay configuración
        localStorage.setItem('nexus_screen_reader_enabled', 'false');
      }
    };
    
    // Cargar configuraciones al montar
    loadAccessibilitySettings();
  }, [])
  
  // useEffect para cerrar menús desplegables al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.relative')) {
        setShowSectionsMenu(false);
        setShowPriorityMenu(false);
      }
    };
    
    if (showSectionsMenu || showPriorityMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showSectionsMenu, showPriorityMenu])

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
      setCurrentText("No pude obtener el pronóstico.")
      await speak("No pude obtener el pronóstico.")
      setCurrentText("")
      return
    }
    const friendly = getFriendlyWeatherMessage(weather.desc)
    const msg = `${friendly} Temperatura mínima de ${Math.round(weather.temp_min)}°C y máxima de ${Math.round(weather.temp_max)}°C.`
    setCurrentText(msg)
    await speak(msg)
    setCurrentText("")
  }

  // 📝 FUNCIONES PARA EDITOR DE TEXTO ENRIQUECIDO
  const applyTextFormat = (formatType: string, value?: string) => {
    const textarea = textareaRef.current
    if (!textarea) return
    
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = textarea.value.substring(start, end)
    const beforeText = textarea.value.substring(0, start)
    const afterText = textarea.value.substring(end)
    
    let formattedText = selectedText
    
    switch (formatType) {
      case 'bold':
        if (selectedText) {
          formattedText = editorFormat.bold 
            ? selectedText.replace(/\*\*(.*?)\*\*/g, '$1')
            : `**${selectedText}**`
        }
        setEditorFormat(prev => ({ ...prev, bold: !prev.bold }))
        break
        
      case 'underline':
        if (selectedText) {
          formattedText = editorFormat.underline
            ? selectedText.replace(/<u>(.*?)<\/u>/g, '$1')
            : `<u>${selectedText}</u>`
        }
        setEditorFormat(prev => ({ ...prev, underline: !prev.underline }))
        break
        
      case 'fontSize':
        if (value) {
          setEditorFormat(prev => ({ ...prev, fontSize: value }))
        }
        break
        
      case 'color':
        if (value && selectedText) {
          formattedText = `<span style="color: ${value}">${selectedText}</span>`
          setEditorFormat(prev => ({ ...prev, color: value }))
        }
        break
        
      case 'textFormat':
        if (value && selectedText) {
          const tag = value === 'p' ? '' : value
          if (tag) {
            formattedText = `<${tag}>${selectedText}</${tag}>`
          }
          setEditorFormat(prev => ({ ...prev, textFormat: value as any }))
        }
        break
    }
    
    if (selectedText) {
      const newText = beforeText + formattedText + afterText
      setNewProject(prev => ({ ...prev, notes: newText }))
      
      // Restaurar posición del cursor
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start, start + formattedText.length)
      }, 0)
    }
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

  // Ya no tenemos playlists predefinidas, cada perfil comenzará con su propia colección

// --- PLAYLISTS DINÁMICAS 
  // Estado para playlists
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  // Asegurarse de que cada playlist tenga un ID
  const ensurePlaylistId = (playlist: any): Playlist => {
    if (!playlist.id) {
      return {
        ...playlist,
        id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        songs: playlist.songs || []
      };
    }
    return playlist;
  };
  const [selectedPlaylistIdx, setSelectedPlaylistIdx] = useState<number | null>(null)
  const [newPlaylistName, setNewPlaylistName] = useState("")
  const [newSongTitle, setNewSongTitle] = useState("")
  const [newSongLink, setNewSongLink] = useState("")
  // Estados para mostrar/ocultar el selector de playlists
  const [showPlaylistSelector, setShowPlaylistSelector] = useState(false)

  // Cargar playlists del usuario actual desde Firebase
  useEffect(() => {
    // Si no hay usuario activo, no hacemos nada
    if (!activeProfile?.id) return;

    // Cargar playlists del usuario desde Firebase
    const loadUserPlaylists = async () => {
      try {
        const userPlaylists = await FirebaseProfileManager.getUserPlaylists(activeProfile.id);
        // Garantizar que todas las playlists tengan un ID
        const validPlaylists = userPlaylists.map(ensurePlaylistId);
        setPlaylists(validPlaylists);
      } catch (error) {
        console.error('Error al cargar playlists del usuario:', error);
        setPlaylists([]);
      }
    };

    loadUserPlaylists();
  }, [activeProfile?.id]);

  // Cargar secciones del usuario actual desde Firebase
  useEffect(() => {
    // Si no hay usuario activo, no hacemos nada
    if (!activeProfile?.id) return;

    // Cargar secciones del usuario desde Firebase
    const loadUserSections = async () => {
      try {
        const userSections = await FirebaseProfileManager.getUserSections(activeProfile.id);
        setCustomSections(userSections);
      } catch (error) {
        console.error('Error al cargar secciones del usuario:', error);
        setCustomSections([]);
      }
    };

    loadUserSections();
  }, [activeProfile?.id]);

  // Cargar proyectos del usuario actual desde Firebase
  useEffect(() => {
    // Si no hay usuario activo, no hacemos nada
    if (!activeProfile?.id) return;

    // Cargar proyectos del usuario desde Firebase
    const loadUserProjects = async () => {
      try {
        const userProjects = await FirebaseProjectsManager.getUserProjects(activeProfile.id);
        setProjects(userProjects);
        console.log('✅ Proyectos cargados:', userProjects.length);
      } catch (error) {
        console.error('❌ Error al cargar proyectos del usuario:', error);
        setProjects([]);
      }
    };

    loadUserProjects();
  }, [activeProfile?.id]);

  // Función para crear una nueva playlist
  const createNewPlaylist = async (name: string) => {
    if (!activeProfile?.id || !name.trim()) {
      console.error("No se puede crear playlist: falta perfil activo o nombre");
      return;
    }
    
    console.log("Creando playlist:", name, "para usuario:", activeProfile.id);
    
    try {
      // Crear la playlist en Firebase
      const newPlaylist = await FirebaseProfileManager.createPlaylist(activeProfile.id, name.trim());
      console.log("Respuesta de Firebase createPlaylist:", newPlaylist);
      
      if (!newPlaylist || !newPlaylist.id) {
        console.error("No se recibió una playlist válida desde Firebase");
        return;
      }
      
      // Crear una copia local para actualizar el estado
      const playlistToAdd: Playlist = {
        id: newPlaylist.id,
        name: newPlaylist.name,
        songs: []
      };
      
      console.log("Actualizando estado local con la nueva playlist:", playlistToAdd);
      
      // Actualizar el estado con la nueva playlist
      setPlaylists(prevPlaylists => {
        const updatedPlaylists = [...prevPlaylists, playlistToAdd];
        console.log("Nuevo estado de playlists:", updatedPlaylists);
        return updatedPlaylists;
      });
      
      // Seleccionar la nueva playlist automáticamente
      setTimeout(() => {
        setSelectedPlaylistIdx(playlists.length);
      }, 100);
      
    } catch (error) {
      console.error('Error al crear playlist:', error);
      alert('Hubo un error al crear la playlist. Por favor intenta nuevamente.');
    }
  };

  // Función para eliminar una playlist
  const deletePlaylist = async (playlistId: string) => {
    if (!activeProfile?.id) return;
    console.log("Eliminando playlist ID:", playlistId);

    try {
      const success = await FirebaseProfileManager.deletePlaylist(activeProfile.id, playlistId);
      console.log("Resultado de eliminación:", success);
      
      if (success) {
        // Actualizar estado local eliminando la playlist del array
        setPlaylists(prev => {
          const filtered = prev.filter(pl => pl.id !== playlistId);
          console.log("Playlists restantes:", filtered);
          return filtered;
        });
        
        // Resetear el índice seleccionado si estaba seleccionada
        setSelectedPlaylistIdx(null);
      } else {
        console.error("Firebase no pudo eliminar la playlist");
        alert("No se pudo eliminar la playlist. Intenta nuevamente.");
      }
    } catch (error) {
      console.error('Error al eliminar playlist:', error);
      alert("Error al eliminar la playlist. Intenta nuevamente.");
    }
  };

  // Función para añadir una canción a una playlist mediante Firebase
  const addSongToPlaylistFB = async (playlistId: string, song: Song) => {
    if (!activeProfile?.id) return false;

    try {
      await FirebaseProfileManager.addSongToPlaylist(activeProfile.id, playlistId, song);
      // Actualizar estado local
      setPlaylists(prev => prev.map(pl => 
        pl.id === playlistId ? {
          ...pl,
          songs: [...pl.songs, song]
        } : pl
      ));
      return true; // Indica éxito
    } catch (error) {
      console.error('Error al añadir canción a playlist:', error);
      return false; // Indica fallo
    }
  };

  // Estado para el modal de error de YouTube
  const [showYoutubeError, setShowYoutubeError] = useState(false);
  const [youtubeErrorMessage, setYoutubeErrorMessage] = useState("");

  // Función para manejar la adición de canciones desde la UI
  const handleAddSongToPlaylist = async () => {
    // Validaciones básicas
    if (!newSongTitle.trim()) {
      setYoutubeErrorMessage('Por favor ingresa un título para la canción');
      setShowYoutubeError(true);
      return;
    }
    
    if (!newSongLink.trim()) {
      setYoutubeErrorMessage('Por favor ingresa un enlace de YouTube');
      setShowYoutubeError(true);
      return;
    }
    
    if (selectedPlaylistIdx === null || !playlists[selectedPlaylistIdx]) {
      setYoutubeErrorMessage('Por favor selecciona una playlist primero');
      setShowYoutubeError(true);
      return;
    }
    
    if (!activeProfile?.id) {
      console.error('No hay perfil activo');
      return;
    }
    
    // Extraer el ID del video de YouTube del enlace
    const videoId = extractYoutubeVideoId(newSongLink.trim());
    if (!videoId) {
      setYoutubeErrorMessage('El link de YouTube no es válido. Asegúrate de copiar la URL completa.');
      setShowYoutubeError(true);
      return;
    }
    
    console.log(`Intentando añadir canción "${newSongTitle}" a playlist ${playlists[selectedPlaylistIdx].name}`);
    
    // Crear objeto de la canción
    const song = {
      title: newSongTitle.trim(),
      videoId
    };
    
    try {
      // Añadir a Firebase
      const success = await addSongToPlaylistFB(playlists[selectedPlaylistIdx].id, song);
      
      if (success) {
        console.log('Canción añadida correctamente');
        // Limpiar inputs
        setNewSongTitle('');
        setNewSongLink('');
      } else {
        setYoutubeErrorMessage('No se pudo añadir la canción. Inténtalo nuevamente.');
        setShowYoutubeError(true);
      }
    } catch (error) {
      console.error('Error al añadir canción:', error);
      setYoutubeErrorMessage('Ocurrió un error al añadir la canción. Inténtalo nuevamente.');
      setShowYoutubeError(true);
    }
  };
  
  // Función para extraer el ID de un video de YouTube desde varios formatos de URL
  const extractYoutubeVideoId = (url: string): string | null => {
    // Formatos posibles de URLs de YouTube:
    // - https://www.youtube.com/watch?v=VIDEO_ID
    // - https://youtu.be/VIDEO_ID
    // - https://youtube.com/shorts/VIDEO_ID
    // - youtube.com/v/VIDEO_ID
    
    let videoId: string | null = null;
    
    // Patrón para www.youtube.com/watch?v=VIDEO_ID
    const regExp1 = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match1 = url.match(regExp1);
    
    if (match1 && match1[2].length === 11) {
      return match1[2];
    }
    
    // Patrón para shorts y otros formatos
    const regExp2 = /^.*(youtube\.com\/shorts\/|youtu\.be\/)([^#\&\?]*).*/;
    const match2 = url.match(regExp2);
    
    if (match2 && match2[2].length === 11) {
      return match2[2];
    }
    
    // Patrón para youtube.com/shorts/VIDEO_ID
    const regExp3 = /\/shorts\/([^\/\?]+)/;
    const match3 = url.match(regExp3);
    
    if (match3 && match3[1].length === 11) {
      return match3[1];
    }
    
    // Si no se encuentra el ID, devolver null
    return null;
  };

  // Función para reproducir videos de YouTube
  const playYouTubeVideo = (videoId: string, title: string, playlist?: any, playlistIndex: number = 0) => {
    if (!videoId) {
      console.error("❌ No se proporcionó videoId para reproducir");
      return;
    }
    
    // 🚨 LIMPIEZA AGRESIVA ANTES DE REPRODUCIR
    console.log('🧹 Limpieza agresiva de memoria antes de reproducir...');
    
    // Forzar garbage collection múltiples veces
    if ('gc' in window) {
      for (let i = 0; i < 3; i++) {
        setTimeout(() => (window as any).gc(), i * 100);
      }
    }
    
    // Limpiar reproductor anterior si existe
    if (youtubePlayerRef.current) {
      try {
        youtubePlayerRef.current.stopVideo();
        youtubePlayerRef.current.pauseVideo();
      } catch (error) {
        console.log('⚠️ Error limpiando reproductor anterior:', error);
      }
    }
    
    console.log(`🎧 Reproduciendo video de YouTube: ${videoId} - ${title}`);
    
    // Establecer los estados necesarios para la reproducción
    setCurrentVideoId(videoId);
    setCurrentSongTitle(title);
    setIsPlayingMusic(true);
    
    // Establecer información de playlist si está disponible
    if (playlist) {
      setPlaylistMode(true);
      setCurrentPlaylist(playlist);
      setCurrentPlaylistIndex(playlistIndex);
      
      // Si hay una playlist, cargarla en el reproductor
      setTimeout(() => {
        if (youtubePlayerRef.current && playlist.songs && playlist.songs.length > 0) {
          const videoIds = playlist.songs.map(song => song.videoId);
          youtubePlayerRef.current.loadPlaylist(videoIds, playlistIndex);
        }
      }, 500); // Pequeño timeout para asegurar que el reproductor está listo
    }
    
    // 🚨 GESTIÓN DE SEGUNDO PLANO MEJORADA
    // Si hay playlist, ir automáticamente a segundo plano
    if (playlist && playlist.songs && playlist.songs.length > 1) {
      console.log('🎧 Playlist detectada, activando modo segundo plano');
      setMusicBackgroundMode(true);
    }
    
    // MANTENER EL MODO ACTUAL - NO CAMBIAR ESTADO CUANDO SE REPRODUCE MÚSICA
    // Solo cambiar a music_playing si estamos en music_mode específicamente
    if (appState === "music_mode") {
      setAppState("music_playing");
    }
  };
  
  // Función para reproducir la playlist completa
  const playPlaylist = (playlist: any, startIndex: number = 0) => {
    if (!playlist || !playlist.songs || playlist.songs.length === 0) {
      setShowYoutubeError(true);
      setYoutubeErrorMessage("La playlist está vacía o es inválida.");
      return;
    }
    
    console.log(`🎵 Reproduciendo playlist: ${playlist.name} (${playlist.songs.length} canciones)`);
    
    // 🚨 CERRAR AUTOMÁTICAMENTE EL PANEL DE PLAYLIST
    setShowPlaylistSelector(false);
    
    // 🚨 IR A SEGUNDO PLANO DIRECTAMENTE
    setMusicBackgroundMode(true);
    
    // Reproducir la primera canción de la playlist
    const song = playlist.songs[startIndex];
    playYouTubeVideo(song.videoId, song.title, playlist, startIndex);
    
    // Establecer información de playlist
    setPlaylistMode(true);
    setCurrentPlaylist(playlist);
    setCurrentPlaylistIndex(startIndex);
    
    console.log(`🎧 Iniciando playlist en segundo plano: ${song.title}`);
  };

  // Función para borrar todas las playlists (solo para propósitos de debug)
  const clearAllPlaylists = async () => {
    if (!activeProfile?.id) return;
    
    try {
      for (const playlist of playlists) {
        await FirebaseProfileManager.deletePlaylist(activeProfile.id, playlist.id);
      }
      setPlaylists([]);
    } catch (error) {
      console.error('Error al limpiar playlists:', error);
    }
  };

  // ===== FUNCIONES PARA MANEJAR SECCIONES PERSONALIZADAS =====
  
  // Función para crear una nueva sección
  const createCustomSection = async () => {
    if (!activeProfile?.id || !newSectionName.trim()) {
      console.error("No se puede crear sección: falta perfil activo o nombre");
      return;
    }
    
    if (newSectionName.trim().length > 30) {
      alert("El nombre de la sección no puede exceder 30 caracteres");
      return;
    }
    
    setIsCreatingSection(true);
    
    try {
      // Crear la sección en Firebase - IMPORTANTE: pasar solo el string nombre
      const newSection = await FirebaseProfileManager.createSection(
        activeProfile.id,
        newSectionName.trim() // ✅ String, no objeto
      );
      
      if (newSection) {
        // Actualizar el estado local
        setCustomSections(prev => [...prev, newSection]);
        
        // Limpiar y cerrar modal
        setNewSectionName("");
        setShowAddSectionModal(false);
        
        console.log(`Sección "${newSection.name}" creada exitosamente`);
      } else {
        alert("No se pudo crear la sección. Inténtalo nuevamente.");
      }
    } catch (error) {
      console.error('Error al crear sección:', error);
      alert('Hubo un error al crear la sección. Por favor intenta nuevamente.');
    } finally {
      setIsCreatingSection(false);
    }
  };
  
  // Función para eliminar una sección
  const deleteCustomSection = async (sectionId: string) => {
    if (!activeProfile?.id) return;
    
    try {
      const success = await FirebaseProfileManager.deleteSection(activeProfile.id, sectionId);
      
      if (success) {
        // Actualizar estado local eliminando la sección del array
        setCustomSections(prev => prev.filter(section => section.id !== sectionId));
        
        // Si la sección eliminada estaba seleccionada, deseleccionar
        if (selectedSection === sectionId) {
          setSelectedSection(null);
        }
        
        console.log(`Sección ${sectionId} eliminada exitosamente`);
      } else {
        alert("No se pudo eliminar la sección. Intenta nuevamente.");
      }
    } catch (error) {
      console.error('Error al eliminar sección:', error);
      alert("Error al eliminar la sección. Intenta nuevamente.");
    }
  };
  
  // Función para seleccionar una sección
  const selectCustomSection = (sectionId: string) => {
    setSelectedSection(sectionId);
    // Aquí podrías agregar lógica adicional para filtrar proyectos por sección
  };
  
  // Función para cambiar vista principal (inicio, finalizadas, papelera)
  const changeMainView = (view: 'inicio' | 'finalizadas' | 'papelera') => {
    setCurrentView(view);
    setSelectedSection(null); // Limpiar selección de sección al cambiar vista
  };

  // ===== FUNCIONES PARA MANEJAR PROYECTOS =====
  
  // Función para abrir el modal de creación de proyecto
  const handleCreateProject = () => {
    setShowCreateProject(true);
    // Establecer el perfil activo como responsable por defecto
    if (activeProfile) {
      setNewProject(prev => ({
        ...prev,
        responsible: activeProfile,
        collaborators: [activeProfile] // El creador siempre es colaborador
      }));
    }
  };
  
  // Función para cerrar el modal de creación
  const handleCloseCreateProject = () => {
    setShowCreateProject(false);
    // Cerrar menús desplegables
    setShowSectionsMenu(false);
    setShowPriorityMenu(false);
    // Resetear el formulario
    setNewProject({
      title: '',
      isCompleted: false,
      responsible: null,
      dueDate: '',
      section: null,
      sections: [],
      priority: null,
      notes: '',
      collaborators: []
    });
    // Resetear formato del editor
    setEditorFormat({
      bold: false,
      underline: false,
      fontSize: '14px',
      color: '#ffffff',
      textFormat: 'p'
    });
  };
  
  // Función para actualizar campos del proyecto
  const updateProjectField = (field: string, value: any) => {
    setNewProject(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Función para agregar colaborador
  const addCollaborator = (profile: UserProfile) => {
    setNewProject(prev => ({
      ...prev,
      collaborators: [...prev.collaborators.filter(c => c.id !== profile.id), profile]
    }));
  };
  
  // Función para remover colaborador
  const removeCollaborator = (profileId: string) => {
    setNewProject(prev => ({
      ...prev,
      collaborators: prev.collaborators.filter(c => c.id !== profileId)
    }));
  };
  
  // Función para guardar el proyecto
  const saveProject = async () => {
    if (!newProject.title.trim()) {
      alert('El título del proyecto es obligatorio');
      return;
    }
    
    if (!activeProfile) {
      alert('No hay un perfil activo');
      return;
    }
    
    try {
      // Buscar el nombre de la sección si se seleccionó una
      const selectedSection = newProject.section 
        ? customSections.find(s => s.id === newProject.section)
        : null;
      
      // Preparar datos del proyecto para Firebase
      const projectData = {
        title: newProject.title.trim(),
        isCompleted: newProject.isCompleted,
        responsibleUserId: activeProfile.id,
        responsibleUserName: activeProfile.name,
        dueDate: newProject.dueDate || null,
        sectionId: newProject.section,
        sectionName: selectedSection?.name || null,
        sections: newProject.sections || [],
        priority: newProject.priority,
        notes: newProject.notes.trim(),
        collaborators: newProject.collaborators.map(c => c.id)
      };
      
      // Guardar en Firebase
      const savedProject = await FirebaseProjectsManager.createProject(
        activeProfile.id,
        projectData
      );
      
      if (savedProject) {
        // Agregar a la lista local
        setProjects(prev => [savedProject, ...prev]);
        
        // Cerrar la vista de creación
        handleCloseCreateProject();
        
        // Feedback al usuario
        if (typeof speak === 'function') {
          speak('Proyecto creado exitosamente');
        }
        
        console.log('✅ Proyecto guardado en Firebase:', savedProject);
      } else {
        throw new Error('No se pudo guardar el proyecto');
      }
    } catch (error) {
      console.error('❌ Error al crear proyecto:', error);
      alert('Error al crear el proyecto. Intenta nuevamente.');
    }
  };

  // --- ACCESIBILIDAD GLOBAL ---
  // Ya se declaró screenReaderEnabled arriba en los estados de configuración
  const [focusedElement, setFocusedElement] = useState<string | null>(null)
  
  // Función para anunciar mensajes con el lector de pantalla
  function announceForScreenReader(message: string) {
    // Actualizar el estado para el región ARIA live
    setAnnouncement(message);
    
    // Si el lector de pantalla no está activado o no estamos en el navegador, salir
    if (!screenReaderEnabled || typeof window === 'undefined') return;
    
    // Método 1: Usar un elemento dinámico para anuncios (mejor compatibilidad con lectores de pantalla)
    try {
      // Crear un elemento para anuncios accesibles
      const announcer = document.createElement('div');
      announcer.setAttribute('aria-live', 'assertive');
      announcer.setAttribute('role', 'alert');
      announcer.classList.add('sr-only'); // Ocultar visualmente pero disponible para lectores
      announcer.textContent = message;
      
      // Añadir al DOM, anunciar y luego eliminar
      document.body.appendChild(announcer);
      
      // Dar tiempo al lector de pantalla para procesar y luego limpiar
      setTimeout(() => {
        if (document.body.contains(announcer)) {
          document.body.removeChild(announcer);
        }
      }, 5000);
    } catch (error) {
      console.error('Error al crear elemento de anuncio para lector de pantalla:', error);
    }
    
    // Método 2: Usar la API de síntesis de voz si está disponible y no está silenciada
    if ('speechSynthesis' in window && !isNexusVoiceMuted()) {
      try {
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = 'es-ES';
        utterance.volume = 0.9;
        utterance.rate = 0.95; // Ligeramente más lento para mejor comprensión
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (error) {
        console.error('Error al usar síntesis de voz:', error);
      }
    }
    
    // Limpiar el anuncio del estado después de un tiempo
    setTimeout(() => {
      setAnnouncement('');
    }, 7000);
  }

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

  // 🎤 FUNCIÓN PARA TOGGLE SIMPLE DE CONTROL DE VOZ NEXUS
  const toggleNexusVoiceControl = () => {
    if (!isVoiceControlEnabled) {
      // ACTIVAR: Habilitar control de voz y cambiar a estado activo
      setIsVoiceControlEnabled(true);
      setAppState("active");
      
      // Mensaje de confirmación y luego iniciar escucha
      if (typeof speak === "function") {
        speak("NEXUS activado y escuchando").then(() => {
          // Iniciar escucha después de que termine de hablar
          setTimeout(() => {
            if (typeof startAutoListening === "function" && !isListening && !isSpeaking) {
              console.log("🎤 Iniciando escucha automática después de activar NEXUS");
              startAutoListening();
            }
          }, 300);
        });
      } else {
        // Si no hay función speak, iniciar escucha inmediatamente
        setTimeout(() => {
          if (typeof startAutoListening === "function" && !isListening) {
            console.log("🎤 Iniciando escucha automática (sin speak)");
            startAutoListening();
          }
        }, 300);
      }
    } else {
      // DESACTIVAR: Deshabilitar control de voz y mantener estado activo
      setIsVoiceControlEnabled(false);
      // NO cambiar appState a "sleeping" - mantener "active"
      
      // Parar cualquier escucha activa
      if (typeof stopListening === "function") {
        stopListening();
      }
      
      // Mensaje de confirmación
      if (typeof speak === "function") {
        speak("NEXUS desactivado");
      }
    }
  };

  // 💬 ESTADOS PARA CONVERSACIONES
  const [showConversationsManager, setShowConversationsManager] = useState(false)
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [conversationMessages, setConversationMessages] = useState<ConversationMessage[]>([])

  // 🖼️ NUEVOS ESTADOS PARA DESCARGA DE IMÁGENES
  const [pendingImageDownload, setPendingImageDownload] = useState<{ url: string; prompt: string } | null>(null)
  const [waitingImageDownloadConfirmation, setWaitingImageDownloadConfirmation] = useState(false)



  // 🚨 OPTIMIZACIÓN DE MEMORIA: Solo cargar hooks cuando sea necesario
  const { speak, isSpeaking } = useSimpleAudio()
  
  // 🚨 OPTIMIZACIÓN DE MEMORIA: Hooks siempre llamados pero con lógica condicional
  // Hooks de audio - siempre llamados para cumplir reglas de React
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
  
  // Hooks de sonido - comentados temporalmente para reducir memoria
  // useCineSound(isSpeaking)
  // useNexusStartupAnimation(startupAnim, () => setStartupAnim(false))

  const { playStartupSound, playShutdownSound, playClickSound, playHoverSound } = useFuturisticSounds()

  // Hook de recordatorio de pastillas - siempre llamado para cumplir reglas de React
  const { showReminder, currentTime, dismissReminder } = usePillReminder((message: string) => {
    // Solo procesar si el usuario está inicializado
    if (hasInitialized) {
      console.log("💊 PILL REMINDER TRIGGERED:", message)
      speak(message)
    }
  })

  // 🚨 OPTIMIZACIÓN DE MEMORIA: Limitar arrays para evitar acumulación
  useEffect(() => {
    // Limitar mensajes a máximo 50 para evitar acumulación de memoria
    if (messages.length > 50) {
      setMessages(prev => prev.slice(-50))
    }
    
    // Limitar archivos seleccionados
    if (selectedFiles.length > 10) {
      setSelectedFiles(prev => prev.slice(-10))
    }
  }, [messages.length, selectedFiles.length])
  
  // 🚨 LIMPIEZA DE MEMORIA: Limpiar recursos no utilizados
  useEffect(() => {
    const cleanup = () => {
      // Limpiar URLs de objetos que ya no se usan
      selectedFiles.forEach(file => {
        if (file.url && file.url.startsWith('blob:')) {
          URL.revokeObjectURL(file.url)
        }
      })
    }
    
    return cleanup
  }, [selectedFiles])
  
  // 🚨 MONITOR DE MEMORIA AUTOMÁTICO: Ejecutar cada 30 segundos
  useEffect(() => {
    const memoryMonitor = setInterval(() => {
      // Forzar garbage collection si está disponible
      if ('gc' in window) {
        (window as any).gc()
        console.log('🗑️ Garbage collection forzado')
      }
      
      // 🎥 LIMPIEZA ESPECÍFICA PARA YOUTUBE: Limpiar caché de video si hay música
      if (isPlayingMusic && youtubePlayerRef.current) {
        try {
          // Intentar limpiar buffers de video no utilizados
          const player = youtubePlayerRef.current
          if (player.getPlayerState && player.getPlayerState() === 1) { // Si está reproduciendo
            console.log('🎥 Limpiando buffers de YouTube...')
            // No interrumpir reproducción, solo limpiar caché
          }
        } catch (error) {
          console.log('⚠️ Error limpiando buffers YouTube:', error)
        }
      }
      
      // Limpiar localStorage si se vuelve muy grande (>1MB)
      const storageSize = JSON.stringify(localStorage).length
      if (storageSize > 1024 * 1024) {
        console.log('🧹 LocalStorage muy grande, limpiando...', storageSize)
        // Mantener solo datos esenciales
        const essentialKeys = ['nexus_profiles', 'nexus_active_profile', 'nexus_voice_muted']
        const backup: {[key: string]: string} = {}
        essentialKeys.forEach(key => {
          const value = localStorage.getItem(key)
          if (value) backup[key] = value
        })
        localStorage.clear()
        Object.entries(backup).forEach(([key, value]) => {
          localStorage.setItem(key, value)
        })
      }
    }, 30000) // Cada 30 segundos
    
    return () => clearInterval(memoryMonitor)
  }, [isPlayingMusic])

  // Detecta transición de waiting_password a active para animación de inicio
  useEffect(() => {
    if (appState === "active" && mounted) {
      setStartupAnim(true)
      // Se ha eliminado el código de reproducción del sonido de inicialización
      // manteniendo la animación de inicio
    }
  }, [appState, mounted])

  useEffect(() => {
    // Solo actualizar estado de habla si el control de voz está habilitado
    if (isVoiceControlEnabled) {
      setSpeakingState(isSpeaking)
    }
  }, [isSpeaking, setSpeakingState, isVoiceControlEnabled])

  useEffect(() => {
    setMounted(true)
  }, [])

  // 🔄 useEffect para mantener escucha automática cuando esté activado
  useEffect(() => {
    if (isVoiceControlEnabled && !isListening && !isSpeaking && !isProcessing && appState === "active") {
      // Reiniciar escucha automática si se detiene
      const timeoutId = setTimeout(() => {
        if (isVoiceControlEnabled && !isListening && !isSpeaking && !isProcessing) {
          console.log("🔄 Reiniciando escucha automática");
          if (typeof startAutoListening === "function") {
            startAutoListening();
          }
        }
      }, 1000); // Esperar 1 segundo antes de reiniciar
      
      return () => clearTimeout(timeoutId);
    }
  }, [isVoiceControlEnabled, isListening, isSpeaking, isProcessing, appState, startAutoListening]);

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

  // DESACTIVADO: No escuchar automáticamente para evitar consumo de memoria
  // useEffect(() => {
  //   if (mounted && appState === "sleeping" && isSupported) {
  //     console.log("🌙 Starting continuous listening for wake word...")
  //     startContinuousListening(handleWakeWordDetected)
  //   }
  // }, [mounted, appState, isSupported])

  // DESACTIVADO: Escucha selectiva automática para evitar consumo de memoria
  // Solo se activará manualmente cuando el usuario haga clic
  // useEffect(() => {
  //   // PREVENIR BUCLE INFINITO: Solo iniciar escucha si no está activa
  //   if (isListening || isSpeaking || isProcessing) {
  //     return
  //   }

  //   let timeoutId: NodeJS.Timeout

  //   if (
  //     appState === "waiting_password" ||
  //     appState === "active" ||
  //     appState === "navigation_mode" ||
  //     appState === "music_mode" ||
  //     appState === "intelligent_mode" ||
  //     appState === "functional_mode" ||
  //     appState === "image_download_confirmation"
  //   ) {
  //     // SOLO iniciar si NO está reproduciendo música
  //     if (!isPlayingMusic) {
  //       console.log("🎤 STARTING AUTO LISTENING - NORMAL MODE")
  //       timeoutId = setTimeout(() => {
  //         if (!isPlayingMusic && !isListening && !isSpeaking && !isProcessing) {
  //           startAutoListening()
  //         }
  //       }, 1000)
  //     }
  //   }
  //   // 🎵 ESCUCHA ESPECIAL CUANDO ESTÁ REPRODUCIENDO MÚSICA (SIN BUCLE)
  //   else if (appState === "music_playing") {
  //     console.log("🎵 STARTING MUSIC-ONLY LISTENING")
  //     timeoutId = setTimeout(() => {
  //       if (!isListening && !isSpeaking && !isProcessing) {
  //         startAutoListening()
  //       }
  //     }, 1000)
  //   }

  //   // CLEANUP: Limpiar timeout al desmontar
  //   return () => {
  //     if (timeoutId) {
  //       clearTimeout(timeoutId)
  //     }
  //   }
  // }, [appState, isListening, isSpeaking, isProcessing]) // REMOVIDO isPlayingMusic de dependencias

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



  // INICIAR ESCUCHA MANUAL (SOLO CUANDO ESTÉ ACTIVADO)
  const startManualListening = () => {
    if (!isVoiceControlEnabled || isSpeaking || isListening || isProcessing) return
    
    console.log("🎤 INICIANDO ESCUCHA MANUAL")
    startAutoListening()
  }

  // 🧠 OPTIMIZADO: useEffect con dependencias específicas para prevenir bucles infinitos
  useEffect(() => {
    if (transcript && !isProcessing) {
      const text = transcript.toLowerCase().trim()
      console.log("💬 PROCESSING:", text, "| STATE:", appState)
      
      // Resetear transcript inmediatamente para prevenir re-procesamiento
      resetTranscript()

      // --- NUEVO FLUJO PARA PLAYLISTS ---
      if (awaitingPlaylistName) {
        handleYouTubeMusicSelection(text)
        return
      }

      if (appState === "waiting_password") {
        handlePasswordCheck(text)
      } else if (appState === "calling_confirmation") {
        handleCallConfirmation(text)
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
        const downloadMsg = "Descargando imagen..."
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

          const successMsg = "Imagen descargada exitosamente."
          setCurrentText(successMsg)
          await speak(successMsg)
          setCurrentText("")
        } catch (error) {
          const errorMsg = "Error descargando la imagen."
          setCurrentText(errorMsg)
          await speak(errorMsg)
          setCurrentText("")
        }

        setPendingImageDownload(null)
        setWaitingImageDownloadConfirmation(false)
        setAppState("intelligent_mode") // Volver al modo inteligente
      }
    } else if (text.includes("no") || text.includes("cancela") || text.includes("cancelar")) {
      const cancelMsg = "Descarga cancelada. Continuando..."
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
    if (isSpeaking || isModeTransitioning) return
    
    setIsModeTransitioning(true)
    setAppState("intelligent_mode");
    
    // Mensaje adaptado al género del perfil
    const tratamiento = activeProfile?.gender === "feminine" ? "Señora" : "Señor";
    const intelligentMsg =
      `Portal NEXUS activado ${tratamiento}. Bienvenid${activeProfile?.gender === "feminine" ? "a" : "o"} al PORTAL-NEXUS, ¿en qué proyecto quiere trabajar hoy?`;
    
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
    
    setTimeout(() => setIsModeTransitioning(false), 800)
  }

  // 🔧 MANEJAR MODO FUNCIONAL
  const handleFunctionalMode = async ({ silent = false, subtitle = "", forceListen = false }: ModeHandlerOptions = {}) => {
    if (isSpeaking || isModeTransitioning) return
    
    setIsModeTransitioning(true)
    setAppState("functional_mode");
    const functionalMsg =
      "Modo Workspace activado. Tiene a su disposición un gestor de espacio de trabajo, con acceso a calendario, notas, y mas funcionalidades.";
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
    
    setTimeout(() => setIsModeTransitioning(false), 800)
  }

  // 🔄 VOLVER AL MODO NORMAL
  type ModeHandlerOptions = { silent?: boolean; subtitle?: string; forceListen?: boolean };

const handleNormalMode = async ({ silent = false, subtitle = "", forceListen = false }: ModeHandlerOptions = {}) => {
  if (isSpeaking || isModeTransitioning) return
  
  setIsModeTransitioning(true)
  setAppState("active");
  const normalMsg = "Modo Mi NEXUS activado. ¿En qué más puedo asistirle?";
  setMessages((prev) => [...prev, { text: normalMsg, type: "nexus" }]);
  if (silent) {
    stopListening();
    if (subtitle) {
      setBackgroundSubtitle(subtitle);
      setTimeout(() => setBackgroundSubtitle(""), 3000);
    }
    if (forceListen && isVoiceControlEnabled) {
      startAutoListening();
      setTimeout(() => setIsModeTransitioning(false), 800)
      return;
    }
    if (isVoiceControlEnabled) {
      setTimeout(() => {
        startAutoListening();
      }, 500);
    }
    setTimeout(() => setIsModeTransitioning(false), 800)
    return;
  }
  setCurrentText(normalMsg);
  await speak(normalMsg);
  setCurrentText("");
  setTimeout(() => setIsModeTransitioning(false), 800)
} 

// FUNCIÓN ELIMINADA: toggleVoiceControl duplicada - usando la nueva versión manual

// 🚺 FUNCIÓN PARA CERRAR SESIÓN
const handleLogout = () => {
  // Mostrar modal de confirmación
  setShowLogoutModal(true);
};

// Función mejorada para confirmar cierre de sesión y reiniciar todos los estados
const confirmLogout = async () => {
  // Ocultar modal
  setShowLogoutModal(false);
  console.log("🔒 Cerrando sesión y reiniciando sistema completo");
  
  // Detener reproducción de música
  if (youtubePlayerRef.current && typeof youtubePlayerRef.current.stopVideo === 'function') {
    youtubePlayerRef.current.stopVideo();
  }
  
  // Reiniciar TODOS los estados relacionados con la música
  setIsPlayingMusic(false);
  setCurrentSongTitle("");
  setCurrentVideoId("");
  setPlaylistMode(false);
  setCurrentPlaylist(null);
  setCurrentPlaylistIndex(0);
  setMusicBackgroundMode(false);
  
  // CRUCIAL: Reiniciar estado de espera de playlist
  setAwaitingPlaylistName(false);
  setWaitingForSong(false);
  
  // Detener la escucha y síntesis de voz
  if (isListening) {
    stopListening();
  }
  
  // Detener cualquier síntesis de voz en curso
  if (speechSynthesis) {
    speechSynthesis.cancel();
  }
  
  // Mensaje de cierre adaptado al género
  const closeMessage = activeProfile?.gender === "feminine" ? 
    "Cerrando sesión... Hasta pronto." : 
    "Cerrando sesión... Hasta pronto.";
  
  setCurrentText("Cerrando sesión...");
  await speak(closeMessage);
  
  // Limpiar mensajes e imágenes
  setMessages([]);
  setCurrentText("");
  setCurrentImage(null);
  
  // Reiniciar todos los estados de procesamiento
  setIsProcessing(false);
  
  // Asegurar que no queden estados de escucha o habla activos
  // Usamos las variables de estado directamente si existen o verificamos los métodos disponibles
  if (typeof stopListening === 'function') {
    stopListening();
  }
  if (speechSynthesis) {
    speechSynthesis.cancel();
  }
  
  // Cerrar sesión en el ProfileManager
  ProfilesManager.clearActiveProfile();
  
  // Reiniciar estados principales y mostrar login
  setActiveProfile(null);
  setAppState("sleeping");
  setHasInitialized(false);
  setShowLoginSystem(true);
}

  // Función para completar la carga e iniciar NEXUS cuando se inicia directamente con perfil
  const handleSystemLoadingComplete = () => {
    console.log("✅ Carga completada, iniciando NEXUS...");
    // Ocultar pantalla de carga
    setShowLoadingScreen(false);
    // Cambiar al estado activo
    setAppState("active");
    // Inicializar NEXUS
    setHasInitialized(true);
    
    // Se ha eliminado completamente el mensaje de bienvenida como solicitado por el usuario
    // No mostramos ningún mensaje al iniciar
  };
  
  // Función para generar mensaje de bienvenida según el género del perfil
  const getWelcomeMessage = (profile?: UserProfile) => {
    // Usar el perfil proporcionado o el perfil activo actual
    const targetProfile = profile || activeProfile;
    
    if (targetProfile?.gender === "feminine") {
      return `Bienvenida Señora ${targetProfile.name}. NEXUS está listo para asistirle.`;
    } else {
      return `Bienvenido Señor ${targetProfile?.name || ""}. NEXUS está listo para asistirle.`;
    }
  };

  // 📱 MANEJAR COMANDO DE LLAMADA
  const handleCallCommand = async (text: string) => {
    const contactName = CommandDetector.extractContactName(text);
    console.log("📱 EXTRACTED CONTACT NAME:", contactName);

    if (!contactName) {
      const msg = "¿A quién desea llamar?";
      setCurrentText(msg);
      await speak(msg);
      setCurrentText("");
      return;
    }

    const contact = ContactsDB.findByName(contactName);
    if (contact) {
      setPendingCall({ name: contact.name, phone: contact.phone });
      setAppState("calling_confirmation");
      const confirmMsg = `¿Desea llamar a ${contact.name}?`;
      setCurrentText(confirmMsg);
      await speak(confirmMsg);
      setCurrentText("");
    } else {
      const notFoundMsg = `No encontré a ${contactName} en su agenda. ¿Desea que abra el gestor de contactos?`;
      setCurrentText(notFoundMsg);
      await speak(notFoundMsg);
      setCurrentText("");
    }
  };

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
  // 🔄 NUEVA FUNCIÓN PARA MANEJAR COMPLETADO DE CARGA
  const handleLoadingComplete = async () => {
    console.log("🚀 LOADING COMPLETE!")

    setShowLoadingScreen(false)
    setAppState("active")
    setHasInitialized(true)

    const welcomeMsg = "Bienvenido. NEXUS está ahora completamente operativo. ¿En qué puedo asistirle hoy?"
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
    const goodbye = "Desactivando NEXUS. Hasta luego."
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

  // 🎵 COMANDO PARA QUITAR MÚSICA
  if (isPlayingMusic && (
    normalized.includes("quitar música") || normalized.includes("quitar musica") ||
    normalized.includes("cerrar música") || normalized.includes("cerrar musica") ||
    normalized.includes("parar música") || normalized.includes("parar musica") ||
    normalized.includes("apagar música") || normalized.includes("apagar musica")
  )) {
    const stopMsg = "Cerrando reproductor de música."
    setCurrentText(stopMsg)
    await speak(stopMsg)
    setCurrentText("")
    
    // Detener reproductor de YouTube
    if (youtubePlayerRef.current && typeof youtubePlayerRef.current.stopVideo === 'function') {
      youtubePlayerRef.current.stopVideo()
    }
    
    // Resetear todos los estados de música
    setIsPlayingMusic(false)
    setCurrentSongTitle("")
    setCurrentVideoId("")
    setPlaylistMode(false)
    setCurrentPlaylist(null)
    setCurrentPlaylistIndex(0)
    setMusicBackgroundMode(false)
    setAwaitingPlaylistName(false)
    setWaitingForSong(false)
    
    // NO CAMBIAR EL ESTADO DE LA APLICACIÓN - mantener en el modo actual
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
      setCurrentText("Lector de pantalla activado.")
      if (typeof speak === "function") await speak("Lector de pantalla activado.")
      setCurrentText("")
      return
    }

    if (desactivarLector.some((variant) => normalized.includes(variant))) {
      setScreenReaderEnabled(false)
      setCurrentText("Lector de pantalla desactivado.")
      if (typeof speak === "function") await speak("Lector de pantalla desactivado.")
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
      setCurrentText("Lector de pantalla activado.")
      if (typeof speak === "function") await speak("Lector de pantalla activado.")
      setCurrentText("")
      return
    }

    if (desactivarLector.some((variant) => normalized.includes(variant))) {
      setScreenReaderEnabled(false)
      setCurrentText("Lector de pantalla desactivado.")
      if (typeof speak === "function") await speak("Lector de pantalla desactivado.")
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
            ? "Para consultas libres debe activar el modo inteligente. En modo funcional solo ejecuto comandos específicos."
            : "Para consultas libres debe activar el modo inteligente. En modo normal solo ejecuto comandos básicos."

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
        const limitMsg = `${tokenCheck.reason} Por favor, revise su panel de OpenAI.`
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
            const downloadQuestion = "¿Desea descargar esta imagen?"
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

          saveMessageToConversation(data.response, "nexus")
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
      const errorMsg = "Lo siento tuve un problema técnico. Inténtelo de nuevo."
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
    const cancelMsg = "Acción cancelada, Volviendo al modo normal."
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
    const agendaMsg = "Abriendo su agenda de contactos."
    setCurrentText(agendaMsg)
    await speak(agendaMsg)
    setCurrentText("")
    setShowContactsManager(true)
  }

  const handleYouTubeMusicCommand = async () => {
    console.log("🎵 YOUTUBE MUSIC COMMAND DETECTED")
    setAppState("music_mode")
    setWaitingForSong(true)
    const youtubeMsg = "¿Qué canción o artista desea escuchar?"
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
          "No encontré la playlist mencionada. ¿Puede repetir el nombre? (Solo nombres registrados)",
        )
        await speak("No encontré la playlist mencionada. ¿Puede repetir el nombre? (Solo nombres registrados)")
        setCurrentText("")
        return
      }
    }

    // Si el usuario pide "reproduce una playlist" o similar
    if (isPlaylistRequest && /reproduce una playlist|pon una playlist|quiero escuchar una playlist/i.test(text)) {
      setAwaitingPlaylistName(true)
      setCurrentText(
        "¿Qué playlist desea reproducir? (Opciones: " + playlists.map((pl: { name: string }) => pl.name).join(", ") + ")",
      )
      await speak("¿Qué playlist desea reproducir?")
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
        setCurrentText("No encontré la playlist mencionada. ¿Puede repetir el nombre?")
        await speak("No encontré la playlist mencionada. ¿Puede repetir el nombre?")
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
      // MANTENER EL MODO ACTUAL - NO CAMBIAR NUNCA EL ESTADO CUANDO SE REPRODUCE MÚSICA
      // Esto permite que Mi NEXUS mantenga su interfaz Figma incluso con música
      // Solo cambiar a music_playing si estamos en music_mode específicamente
      if (appState === "music_mode") {
        setAppState("music_playing")
      }
      
      setCurrentText(`Reproduciendo: ${result.title}`)
      await speak(`Reproduciendo: ${result.title}`)
      setCurrentText("")
    } else {
      setCurrentText("No encontré la canción. ¿Puede repetir el nombre?")
      await speak("No encontré la canción. ¿Puede repetir el nombre?")
      setCurrentText("")
    }
  }

  const handleMusicControl = async (text: string) => {
    if (text.includes("quitar") || text.includes("cerrar") || text.includes("apagar")) {
      const stopMsg = "Cerrando reproductor de música."
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
    if (appState === "initializing") return <Loader2 className="h-20 w-20 text-cyan-400 animate-spin" />
    if (appState === "calling_confirmation") return <Phone className="h-20 w-20 text-green-400 animate-pulse" />
    if (appState === "music_mode" || appState === "music_playing") return <Music className="h-20 w-20 text-green-400" />
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

  if (appState === "music_mode") {
    return `${baseClasses} border-green-500 shadow-green-500/50 animate-pulse`;
  }

  if (appState === "music_playing") {
    return `${baseClasses} border-green-500 shadow-green-500/70 animate-pulse`;
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
  if (!isVoiceControlEnabled) return "NEXUS desactivado - Clic para activar"
  
  if (appState === "waiting_password") {
    if (isListening) return "Escuchando contraseña..."
    if (isProcessing) return "Verificando contraseña..."
    return "Di la contraseña (manual)"
  }
  if (appState === "initializing") return "Inicializando NEXUS..."
  if (appState === "calling_confirmation") {
    return pendingCall ? `¿Llamar a ${pendingCall.name}? (Sí/No)` : "Confirmando llamada..."
  }
  if (appState === "music_mode") {
    if (isListening) return "Modo música - Escuchando..."
    return "Modo música - Clic para hablar"
  }
  if (appState === "music_playing") {
    return "Reproduciendo música - Clic para comandos"
  }
  if (appState === "intelligent_mode") {
    if (isSpeaking) return "NEXUS hablando..."
    if (isProcessing) return "Procesando con IA avanzada..."
    if (isListening) return "Modo inteligente - Escuchando..."
    return "Modo inteligente - Clic para hablar"
  }
  if (appState === "functional_mode") {
    if (isListening) return "Modo funcional - Escuchando..."
    return "Modo funcional - Clic para hablar"
  }
  if (isSpeaking) return "NEXUS hablando..."
  if (isProcessing) return "Procesando con ChatGPT..."
  if (isListening) return "Escuchando..."
  return "NEXUS activado - Clic para hablar"
}

// 📋 FUNCIONES PARA MANEJO DEL PANEL LATERAL
const handleViewChange = (view: 'inicio' | 'finalizadas' | 'papelera') => {
  setCurrentView(view)
  setSelectedSection(null) // Limpiar selección de sección al cambiar vista
}

const handleSectionSelect = (sectionId: string) => {
  setSelectedSection(sectionId)
  setCurrentView('inicio') // Las secciones se muestran en la vista de inicio
}

const handleAddSection = () => {
  if (newSectionName.trim()) {
    const newSection = {
      id: Date.now().toString(),
      name: newSectionName.trim()
    }
    setCustomSections(prev => [...prev, newSection])
    setNewSectionName('')
    setShowAddSectionModal(false)
  }
}

const handleDeleteSection = (sectionId: string) => {
  setCustomSections(prev => prev.filter(section => section.id !== sectionId))
  if (selectedSection === sectionId) {
    setSelectedSection(null)
  }
}

// 🔄 FUNCIÓN PARA ALTERNAR ENTRE MODOS
const toggleMode = async () => {
  if (isSpeaking) return
  
  if (appState === "active") {
    await handleFunctionalMode({ silent: false })
  } else if (appState === "functional_mode") {
    await handleNormalMode({ silent: false })
  }
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
      {/* Render universal para todos los modos */}
      <>
          {/* Fondo estático de estrellas (excepto en pantalla de carga) */}
          <Starfield startupMode={startupAnim} />

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
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b border-cyan-500/20 relative z-10">
        <div className="flex items-center space-x-4">
          <h1 className="text-3xl font-bold text-cyan-400 tracking-wider">NEXUS</h1>
          {/* Status text e indicador de modo en el header */}
          <div className="flex items-center ml-6 gap-3">
            <span className="text-cyan-200 text-base font-semibold drop-shadow-md" style={{textShadow:'0 2px 8px #000'}}>{getStatusText()}</span>
            {appState === "intelligent_mode" && (
              <span className="flex items-center gap-1 px-3 py-1 bg-purple-900/60 rounded-full border border-purple-500 ml-2">
                <Globe className="w-5 h-5 text-purple-400" />
                <span className="text-purple-300 text-xs font-semibold">PORTAL NEXUS</span>
              </span>
            )}
            {appState === "functional_mode" && (
              <span className="flex items-center gap-1 px-3 py-1 bg-orange-900/60 rounded-full border border-orange-500 ml-2">
                <Mail className="w-5 h-5 text-orange-400" />
                <span className="text-orange-300 text-xs font-semibold">WORKSPACE</span>
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

          {/* Botón Portal NEXUS */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleAccessibleAction("portal", "Portal NEXUS", () => { if (!isSpeaking && appState !== "intelligent_mode") handleIntelligentMode({silent:false}) })}
            className={`rounded-full p-2 hover:bg-purple-900 ${focusedElement === "portal" && screenReaderEnabled ? "border-2 border-green-400 bg-green-900/30" : ""} ${appState === "intelligent_mode" ? "bg-purple-900/50 border border-purple-500" : ""}`}
            title="Portal NEXUS"
            aria-label="Portal NEXUS"
            tabIndex={0}
            onKeyDown={(e) =>
              (e.key === "Enter" || e.key === " ") &&
              handleAccessibleAction("portal", "Portal NEXUS", () => { if (!isSpeaking && appState !== "intelligent_mode") handleIntelligentMode({silent:false}) })
            }
          >
            <Globe className={`w-6 h-6 ${appState === "intelligent_mode" ? "text-purple-300" : "text-purple-400"}`} />
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

          {/* Botón Cerrar Sesión */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleAccessibleAction("logout", "Cerrar Sesión", handleLogout)}
            className={`rounded-full p-2 hover:bg-red-900 ${focusedElement === "logout" && screenReaderEnabled ? "border-2 border-green-400 bg-green-900/30" : ""}`}
            title="Cerrar Sesión"
            aria-label="Cerrar Sesión"
            tabIndex={0}
            onKeyDown={(e) =>
              (e.key === "Enter" || e.key === " ") &&
              handleAccessibleAction("logout", "Cerrar Sesión", handleLogout)
            }
          >
            <LogOut className="w-6 h-6 text-red-400" />
          </Button>

          {/* Botón Tutorial */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleAccessibleAction("tutorial", "Tutorial Guiado", handleShowTutorialManually)}
            className={`rounded-full p-2 hover:bg-blue-900 ${focusedElement === "tutorial" && screenReaderEnabled ? "border-2 border-green-400 bg-green-900/30" : ""}`}
            title="Tutorial Guiado"
            aria-label="Tutorial Guiado"
            tabIndex={0}
            onKeyDown={(e) =>
              (e.key === "Enter" || e.key === " ") &&
              handleAccessibleAction("tutorial", "Tutorial Guiado", handleShowTutorialManually)
            }
          >
            <BookOpen className="w-6 h-6 text-blue-400" />
          </Button>

          {/* Panel de indicadores de accesibilidad */}
          <div className="flex items-center mr-2 bg-black/30 rounded-full px-2 py-1">
            {/* Indicador de voz */}
            {isNexusVoiceMuted() ? (
              <span title="Voz desactivada" className="text-red-400 mr-1" aria-hidden="true">
                <VolumeX size={14} />
              </span>
            ) : null}
            
            {/* Indicador de animaciones */}
            {typeof window !== 'undefined' && localStorage.getItem('nexus_animations_enabled') === 'false' ? (
              <span title="Animaciones desactivadas" className="text-amber-400 mr-1" aria-hidden="true">
                <Zap size={14} />
              </span>
            ) : null}
            
            {/* Indicador de lector de pantalla */}
            {screenReaderEnabled ? (
              <span title="Lector de pantalla activado" className="text-emerald-400 mr-1" aria-hidden="true">
                <Eye size={14} />
              </span>
            ) : null}
          </div>
          
          {/* Botón Settings */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleAccessibleAction("settings", "Configuraciones", () => {
              setShowSettings(true);
              if (screenReaderEnabled) {
                announceForScreenReader("Abriendo panel de configuración. Aquí podrás ajustar las preferencias de voz, animaciones y accesibilidad.");
              }
            })}
            className={`rounded-full p-2 hover:bg-cyan-900 ${focusedElement === "settings" && screenReaderEnabled ? "border-2 border-green-400 bg-green-900/30" : ""}`}
            title="Configuraciones"
            aria-label="Configuraciones"
            tabIndex={0}
            onKeyDown={(e) =>
              (e.key === "Enter" || e.key === " ") &&
              handleAccessibleAction("settings", "Configuraciones", () => {
                setShowSettings(true);
                if (screenReaderEnabled) {
                  announceForScreenReader("Abriendo panel de configuración. Aquí podrás ajustar las preferencias de voz, animaciones y accesibilidad.");
                }
              })
            }
          >
            <Settings className={`w-6 h-6 text-cyan-400 ${typeof window !== 'undefined' && !animationsEnabled ? '' : 'animate-spin-slow'}`} />
          </Button>
        </div>
      </div>

      {/* Modal de Playlists */}
      {showPlaylistSelector && (
  <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
    <div className="bg-gray-900 rounded-lg p-8 shadow-xl border border-cyan-800 relative min-w-[340px] max-w-[90vw] min-h-[400px]">
      {/* Botón de cerrar en la esquina superior derecha */}
      <button
        onClick={() => { setShowPlaylistSelector(false); setSelectedPlaylistIdx(null); }}
        className="absolute top-4 right-4 text-cyan-400 hover:text-cyan-300 transition-colors duration-200 z-10"
        aria-label="Cerrar panel de playlists"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      
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
          onKeyDown={async e => { 
            if(e.key==="Enter" && newPlaylistName.trim() && activeProfile?.id){ 
              await createNewPlaylist(newPlaylistName.trim());
              setNewPlaylistName("");
            }
          }}
        />
        <Button
          className="bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600 hover:border-gray-500 transition-all duration-200"
          disabled={!newPlaylistName.trim() || !activeProfile?.id}
          onClick={async () => { 
            if (newPlaylistName.trim() && activeProfile?.id) {
              await createNewPlaylist(newPlaylistName.trim());
              setNewPlaylistName("");
            }
          }}
        >Crear</Button>
      </div>
      {/* LISTA DE PLAYLISTS */}
      <ul className="space-y-2 mb-4">
        {playlists.map((pl: Playlist, idx: number) => (
          <li key={pl.id || pl.name} className={`flex items-center justify-between bg-cyan-950/40 rounded px-4 py-2 ${selectedPlaylistIdx===idx?"border-2 border-cyan-400":""}`}>
            <span className="text-cyan-100 font-semibold cursor-pointer" onClick={()=>setSelectedPlaylistIdx(idx)}>{pl.name}</span>
            <span className="text-cyan-400 text-xs">{pl.songs?.length || 0} canciones</span>
            {/* Contenedor de acciones */}
            <div className="flex items-center gap-1">
              {/* Botón de reproducción */}
              <button
                className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-green-400 hover:bg-gray-800/50 rounded transition-all duration-200"
                onClick={() => {
                  if (pl.songs && pl.songs.length > 0) {
                    // Reproducir la playlist completa empezando por la primera canción
                    playPlaylist(pl, 0);
                    setShowPlaylistSelector(false);
                  }
                }}
                title="Reproducir playlist"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              </button>
              
              {/* Botón de eliminar */}
              <button
                className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-red-400 hover:bg-gray-800/50 rounded transition-all duration-200"
                onClick={() => {
                  if (pl.id) {
                    deletePlaylist(pl.id);
                    if(selectedPlaylistIdx===idx) setSelectedPlaylistIdx(null)
                    else if(selectedPlaylistIdx && selectedPlaylistIdx>idx) setSelectedPlaylistIdx(selectedPlaylistIdx-1)
                  } else {
                    console.error('No se pudo eliminar la playlist: falta ID');
                  }
                }}
                title="Eliminar playlist"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
              </button>
            </div>
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
                <span className="truncate max-w-[200px]" title={song.title}>{song.title}</span>
                <div className="flex items-center gap-1">
                  {/* Botón reproducir */}
                  <button
                    className="flex items-center justify-center w-6 h-6 text-gray-500 hover:text-cyan-400 hover:bg-gray-800/30 rounded transition-all duration-200"
                    onClick={() => playYouTubeVideo(song.videoId, song.title)}
                    title="Reproducir"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                  </button>
                  
                  {/* Botón eliminar */}
                  <button
                    className="flex items-center justify-center w-6 h-6 text-gray-500 hover:text-red-400 hover:bg-gray-800/30 rounded transition-all duration-200"
                    onClick={async () => {
                      if (playlists[selectedPlaylistIdx].id && playlists[selectedPlaylistIdx].songs) {
                        // Crear una nueva lista de canciones sin la que queremos eliminar
                        const updatedSongs = [...playlists[selectedPlaylistIdx].songs];
                        updatedSongs.splice(sidx, 1);
                        
                        // Actualizar la playlist en Firebase
                        const currentPlaylist = playlists[selectedPlaylistIdx];
                        const playlistToUpdate = {
                          ...currentPlaylist,
                          songs: updatedSongs
                        };
                        
                        try {
                          // Llamar a la función correctamente con los parámetros esperados
                          const success = await FirebaseProfileManager.updatePlaylist(
                            activeProfile!.id,
                            playlistToUpdate
                          );
                          
                          if (success) {
                            console.log('✅ Canción eliminada correctamente en Firebase');
                            // Actualizar el estado local
                            const updatedPlaylists = [...playlists];
                            updatedPlaylists[selectedPlaylistIdx].songs = updatedSongs;
                            setPlaylists(updatedPlaylists);
                          } else {
                            console.error('❌ Error al eliminar la canción en Firebase');
                            // Si hay error, recargar las playlists para sincronizar con Firebase
                            const refreshedPlaylists = await FirebaseProfileManager.getUserPlaylists(activeProfile!.id);
                            setPlaylists(refreshedPlaylists);
                          }
                        } catch (error) {
                          console.error('Error al eliminar canción:', error);
                        }
                      }
                    }}
                    title="Eliminar canción"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>
              </li>
            ))}{playlists[selectedPlaylistIdx].songs.length===0 && <li className="text-cyan-400 text-xs">Sin canciones</li>}
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
              onKeyDown={e=>{if(e.key==="Enter"){handleAddSongToPlaylist()}}}
            />
            <Button
              className="bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600 hover:border-gray-500 transition-all duration-200"
              disabled={!newSongTitle.trim()||!newSongLink.trim()}
              onClick={handleAddSongToPlaylist}
            >Añadir</Button>
          </div>
        </div>
      )}

    </div>
  </div>
)}
      {/* Selector de Modo NEXUS */}

      {/* Main Interface - Solo mostrar si no hay mapa o música activa */}


      {/* 🎨 NUEVA INTERFAZ TIPO FIGMA - Solo para Mi NEXUS (appState === "active") */}
      {appState === "active" && !showCreateProject && (
        <div className="flex-1 flex min-h-screen relative z-10">
          {/* 📂 PANEL LATERAL IZQUIERDO */}
          <div className="w-80 bg-gray-900/50 border-r border-gray-700/50 backdrop-blur-sm flex flex-col">
            {/* Círculo NEXUS más pequeño debajo del título */}
            <div className="p-6 border-b border-gray-700/50">
              <div className="flex flex-col items-center">
                {/* Círculo NEXUS compacto con toggle de voz */}
                <div className="relative mb-4">
                  <button 
                    onClick={toggleNexusVoiceControl}
                    disabled={isSpeaking || isModeTransitioning}
                    className={`w-24 h-24 rounded-full bg-black flex items-center justify-center border-2 transition-all duration-300 hover:scale-105 ${
                      isVoiceControlEnabled 
                        ? (isListening ? "border-red-500/70 shadow-red-500/30 shadow-lg" : "border-green-500/70 shadow-green-500/30 shadow-lg") 
                        : "border-gray-600 hover:border-cyan-500/50"
                    } ${isSpeaking || isModeTransitioning ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    title={
                      !isVoiceControlEnabled ? "Activar NEXUS" :
                      "Desactivar NEXUS"
                    }
                    aria-label={
                      !isVoiceControlEnabled ? "Activar NEXUS" :
                      "Desactivar NEXUS"
                    }
                  >
                    {/* Efectos cuando habla - versión compacta */}
                    {isSpeaking && (
                      <>
                        <div className="absolute inset-0 rounded-full border-2 border-cyan-400/30 animate-ping"></div>
                        <div className="absolute inset-2 rounded-full border-2 border-cyan-400/20 animate-ping delay-75"></div>
                        <div className="absolute top-2 left-2 w-1 h-1 bg-cyan-400 rounded-full animate-bounce delay-100"></div>
                        <div className="absolute top-3 right-3 w-0.5 h-0.5 bg-cyan-300 rounded-full animate-bounce delay-200"></div>
                        <div className="absolute bottom-3 left-3 w-1 h-1 bg-cyan-500 rounded-full animate-bounce delay-300"></div>
                        <div className="absolute bottom-2 right-2 w-0.5 h-0.5 bg-cyan-200 rounded-full animate-bounce delay-400"></div>
                      </>
                    )}
                    <div className="w-16 h-16 flex items-center justify-center">
                      {getMainIcon()}
                    </div>
                  </button>
                </div>
                
                {/* Status Text compacto */}
                <div className="text-center">
                  <p className={`text-xs font-medium ${
                    appState === "sleeping" ? "text-gray-400" :
                    appState === "waiting_password" ? "text-yellow-400" :
                    appState === "initializing" ? "text-cyan-400" :
                    appState === "calling_confirmation" ? "text-green-400" :
                    appState === "music_mode" ? "text-green-400" :
                    appState === "music_playing" ? "text-green-400" :
                    appState === "intelligent_mode" ? "text-purple-400" :
                    appState === "functional_mode" ? "text-orange-400" :
                    appState === "image_download_confirmation" ? "text-cyan-400" :
                    "text-cyan-400"
                  }`}>
                    {getStatusText()}
                  </p>
                </div>
              </div>
            </div>
            
            {/* 📋 NAVEGACIÓN DEL PANEL LATERAL */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Navegación principal */}
              <div className="p-4 border-b border-gray-700/50">
                <nav className="space-y-2">
                  {/* Inicio */}
                  <button
                    onClick={() => handleViewChange('inicio')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      currentView === 'inicio' && !selectedSection
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
                    }`}
                  >
                    <Power className="w-4 h-4" />
                    Inicio
                  </button>
                  
                  {/* Tareas finalizadas */}
                  <button
                    onClick={() => handleViewChange('finalizadas')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      currentView === 'finalizadas'
                        ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                        : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Tareas finalizadas
                  </button>
                  
                  {/* Papelera */}
                  <button
                    onClick={() => handleViewChange('papelera')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      currentView === 'papelera'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                        : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                    Papelera
                  </button>
                </nav>
              </div>
              
              {/* Sección de Secciones Personalizadas */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-700/50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-300">Secciones</h3>
                    <button
                      onClick={() => setShowAddSectionModal(true)}
                      className="w-6 h-6 rounded-md bg-gray-700/50 hover:bg-cyan-500/20 flex items-center justify-center transition-all duration-200 group"
                      title="Agregar sección"
                    >
                      <Plus className="w-3 h-3 text-gray-400 group-hover:text-cyan-400" />
                    </button>
                  </div>
                  
                  {/* Lista de secciones con scroll */}
                  <div className="max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                    <div className="space-y-1">
                      {customSections.map((section) => (
                        <div key={section.id} className="group flex items-center gap-2">
                          <button
                            onClick={() => handleSectionSelect(section.id)}
                            className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-all duration-200 ${
                              selectedSection === section.id
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-300'
                            }`}
                          >
                            <div className="w-2 h-2 rounded-full bg-purple-400 opacity-60"></div>
                            <span className="truncate">{section.name}</span>
                          </button>
                          <button
                            onClick={() => handleDeleteSection(section.id)}
                            className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded bg-red-500/20 hover:bg-red-500/30 flex items-center justify-center transition-all duration-200"
                            title="Eliminar sección"
                          >
                            <X className="w-3 h-3 text-red-400" />
                          </button>
                        </div>
                      ))}
                      
                      {customSections.length === 0 && (
                        <div className="text-xs text-gray-500 text-center py-4 opacity-60">
                          No hay secciones
                          <br />
                          <span className="text-[10px]">Haz clic en + para agregar</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Sección de Equipo */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-300">Equipo</h3>
                    <button
                      className="w-6 h-6 rounded-md bg-gray-700/50 hover:bg-orange-500/20 flex items-center justify-center transition-all duration-200 group opacity-50 cursor-not-allowed"
                      title="Próximamente"
                      disabled
                    >
                      <Plus className="w-3 h-3 text-gray-500" />
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-gray-500">
                      <User className="w-3 h-3" />
                      <span>Mi espacio de trabajo</span>
                    </div>
                    
                    <div className="text-xs text-gray-600 text-center py-2 opacity-50">
                      Colaboración en equipo
                      <br />
                      <span className="text-[10px]">(Próximamente)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* 🎯 ÁREA PRINCIPAL DERECHA - Grid de Proyectos */}
          <div className="flex-1 bg-gray-950/30 backdrop-blur-sm">
            <div className="h-full p-8">
              {/* Header del área de proyectos - Dinámico según vista */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">
                  {selectedSection 
                    ? customSections.find(s => s.id === selectedSection)?.name || 'Sección'
                    : currentView === 'inicio' 
                      ? 'Proyectos'
                      : currentView === 'finalizadas'
                        ? 'Tareas Finalizadas'
                        : 'Papelera'
                  }
                </h2>
                <p className="text-gray-400 text-sm">
                  {selectedSection 
                    ? 'Proyectos organizados en esta sección personalizada'
                    : currentView === 'inicio'
                      ? 'Crea y gestiona tus proyectos de trabajo'
                      : currentView === 'finalizadas'
                        ? 'Proyectos que has marcado como completados'
                        : 'Proyectos eliminados que puedes restaurar'
                  }
                </p>
              </div>
              
              {/* Grid de proyectos - Dinámico según vista */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                {/* Ventanita para crear nuevo proyecto - Solo en inicio */}
                {(currentView === 'inicio') && (
                  <div className="group">
                    <div 
                      onClick={handleCreateProject}
                      className="aspect-square bg-gray-800/40 border-2 border-dashed border-gray-600 hover:border-cyan-500/50 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:bg-gray-800/60 hover:scale-105 max-w-[220px]"
                    >
                      {/* Icono + */}
                      <div className="w-8 h-8 rounded-full bg-gray-700/50 group-hover:bg-cyan-500/20 flex items-center justify-center mb-2 transition-all duration-300">
                        <Plus className="w-4 h-4 text-gray-400 group-hover:text-cyan-400 transition-colors duration-300" />
                      </div>
                      
                      {/* Texto */}
                      <p className="text-gray-400 group-hover:text-cyan-300 text-xs font-medium transition-colors duration-300 text-center px-2">
                        Nuevo Proyecto
                      </p>
                      <p className="text-gray-600 group-hover:text-gray-400 text-[10px] mt-1 transition-colors duration-300 text-center px-2">
                        Haz clic para crear
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Proyectos creados - Solo en inicio */}
                {currentView === 'inicio' && !selectedSection && projects.map((project) => (
                  <div key={project.id} className="group">
                    <div className="aspect-square bg-gray-800/60 border border-gray-700/50 hover:border-cyan-500/50 rounded-xl p-4 cursor-pointer transition-all duration-300 hover:bg-gray-800/80 hover:scale-105 max-w-[220px] flex flex-col relative">
                      {/* Header con foto de perfil y creador */}
                      <div className="flex items-center gap-2 mb-4">
                        {/* Foto de perfil del usuario que creó el proyecto */}
                        {activeProfile?.photoUrl ? (
                          <img 
                            src={activeProfile.photoUrl} 
                            alt={activeProfile.name}
                            className="w-6 h-6 rounded-full object-cover border border-gray-600"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                            {activeProfile?.name?.charAt(0).toUpperCase() || project.responsible?.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}
                        <span className="text-xs text-gray-400 truncate flex-1">
                          Creado por {project.responsible?.name || activeProfile?.name || 'Usuario'}
                        </span>
                      </div>
                      
                      {/* Título del proyecto - Estilo elegante y profesional */}
                      <div className="flex-1 flex items-center justify-center mb-4">
                        <h3 className="text-lg font-semibold text-white text-center leading-tight tracking-wide">
                          <span className="bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
                            {project.title}
                          </span>
                        </h3>
                      </div>
                      
                      {/* Fechas con formato completo */}
                      <div className="space-y-1 mt-auto">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <div className="w-1 h-1 bg-cyan-400 rounded-full"></div>
                          <span>Creado: {new Date(project.createdAt).toLocaleDateString('es-ES', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric' 
                          }).replace(/\//g, '/')}</span>
                        </div>
                        {project.dueDate && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <div className="w-1 h-1 bg-orange-400 rounded-full"></div>
                            <span>Vence: {new Date(project.dueDate).toLocaleDateString('es-ES', { 
                              day: '2-digit', 
                              month: '2-digit', 
                              year: 'numeric' 
                            }).replace(/\//g, '/')}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Indicador de prioridad */}
                      {project.priority && (
                        <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
                          project.priority === 'high' ? 'bg-red-400' :
                          project.priority === 'medium' ? 'bg-yellow-400' :
                          'bg-green-400'
                        }`}></div>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Contenido dinámico según vista */}
                {currentView === 'finalizadas' && (
                  <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                    <CheckCircle className="w-16 h-16 text-green-400/50 mb-4" />
                    <h3 className="text-lg font-medium text-gray-300 mb-2">No hay tareas finalizadas</h3>
                    <p className="text-gray-500 text-sm max-w-md">
                      Cuando marques proyectos como completados, aparecerán aquí para que puedas revisarlos.
                    </p>
                  </div>
                )}
                
                {currentView === 'papelera' && (
                  <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                    <Trash2 className="w-16 h-16 text-red-400/50 mb-4" />
                    <h3 className="text-lg font-medium text-gray-300 mb-2">La papelera está vacía</h3>
                    <p className="text-gray-500 text-sm max-w-md">
                      Los proyectos eliminados aparecerán aquí. Podrás restaurarlos o eliminarlos permanentemente.
                    </p>
                  </div>
                )}
                
                {selectedSection && (
                  <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mb-4">
                      <div className="w-8 h-8 rounded-full bg-purple-400/60"></div>
                    </div>
                    <h3 className="text-lg font-medium text-gray-300 mb-2">
                      Sección: {customSections.find(s => s.id === selectedSection)?.name}
                    </h3>
                    <p className="text-gray-500 text-sm max-w-md">
                      Esta sección está vacía. Los proyectos que asignes a esta sección aparecerán aquí.
                    </p>
                  </div>
                )}
                
                {currentView === 'inicio' && !selectedSection && customSections.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center py-8 text-center">
                    <p className="text-gray-500 text-sm">
                      Crea tu primer proyecto haciendo clic en el botón de arriba
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 📋 VISTA DE CREACIÓN DE PROYECTO - Ocupa todo el espacio */}
      {appState === "active" && showCreateProject && (
        <div className="flex-1 min-h-screen bg-gray-950/30 backdrop-blur-sm relative z-10">
          {/* Header con botón de cerrar */}
          <div className="sticky top-0 z-20 bg-gray-900/80 backdrop-blur-sm border-b border-gray-700/50">
            <div className="flex items-center justify-between p-4">
              <div>
                <h1 className="text-2xl font-bold text-white">Crear Nuevo Proyecto</h1>
                <p className="text-gray-400 text-sm">Completa la información para crear tu proyecto</p>
              </div>
              <button
                onClick={handleCloseCreateProject}
                className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors duration-200 group"
                title="Cancelar y volver"
              >
                <X className="w-5 h-5 text-gray-400 group-hover:text-white" />
              </button>
            </div>
          </div>
          
          {/* Contenido principal */}
          <div className="flex h-[calc(100vh-80px)]">
            {/* Panel lateral izquierdo - Configuración del proyecto */}
            <div className="w-80 bg-gray-900/40 backdrop-blur-sm border-r border-gray-700/50 p-6 overflow-y-auto">
              <div className="space-y-8">
                {/* Título del proyecto */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Escribe el nombre de la tarea
                  </label>
                  <input
                    type="text"
                    value={newProject.title}
                    onChange={(e) => updateProjectField('title', e.target.value)}
                    placeholder="Ej: Rediseño de la página web"
                    className="w-full px-0 py-2 bg-transparent border-0 border-b border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 text-sm transition-colors"
                    maxLength={100}
                    autoFocus
                  />
                </div>
                
                {/* Responsable */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Responsable
                  </label>
                  <div className="flex items-center gap-3">
                    {activeProfile && (
                      <div className="relative">
                        <button
                          onClick={() => {
                            // Toggle responsable
                            const isCurrentlyResponsible = newProject.responsible?.id === activeProfile.id;
                            updateProjectField('responsible', isCurrentlyResponsible ? null : activeProfile);
                          }}
                          className="relative group"
                        >
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm border-2 transition-all duration-200 hover:scale-105"
                            style={{
                              backgroundImage: activeProfile.photoUrl 
                                ? `url(${activeProfile.photoUrl})` 
                                : 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              borderColor: newProject.responsible?.id === activeProfile.id ? '#fbbf24' : '#374151'
                            }}
                          >
                            {!activeProfile.photoUrl && activeProfile.name.charAt(0).toUpperCase()}
                          </div>
                          {newProject.responsible?.id === activeProfile.id && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                              <Crown className="w-3 h-3 text-yellow-900" />
                            </div>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Fecha de entrega */}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <label className="text-sm font-medium text-gray-300">
                      Fecha de entrega
                    </label>
                    <button 
                      onClick={() => {
                        // Crear un input temporal para seleccionar fecha
                        const input = document.createElement('input');
                        input.type = 'date';
                        input.style.position = 'absolute';
                        input.style.left = '-9999px';
                        input.value = newProject.dueDate;
                        document.body.appendChild(input);
                        input.showPicker();
                        input.addEventListener('change', (e) => {
                          updateProjectField('dueDate', (e.target as HTMLInputElement).value);
                          document.body.removeChild(input);
                        });
                        input.addEventListener('blur', () => {
                          if (document.body.contains(input)) {
                            document.body.removeChild(input);
                          }
                        });
                      }}
                      className="text-gray-400 hover:text-cyan-400 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                  {/* Mostrar fecha seleccionada */}
                  {newProject.dueDate && (
                    <div className="flex items-center justify-between bg-gray-800/30 rounded px-3 py-2">
                      <span className="text-sm text-cyan-400">
                        {new Date(newProject.dueDate).toLocaleDateString('es-ES', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                      <button
                        onClick={() => updateProjectField('dueDate', '')}
                        className="text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Sección */}
                <div className="relative">
                  <div className="flex items-center gap-3 mb-3">
                    <label className="text-sm font-medium text-gray-300">
                      Sección
                    </label>
                    <button 
                      onClick={() => setShowSectionsMenu(!showSectionsMenu)}
                      className="text-gray-400 hover:text-cyan-400 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Menú desplegable de secciones */}
                  {showSectionsMenu && (
                    <div className="absolute top-full left-0 right-0 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-10 mb-3">
                      <div className="p-2">
                        {/* Secciones predefinidas */}
                        {customSections.length > 0 && (
                          <>
                            <div className="text-xs text-gray-400 mb-2 px-2">Secciones existentes:</div>
                            {customSections.map((section) => (
                              <button
                                key={section.id}
                                onClick={() => {
                                  if (!newProject.sections.includes(section.name)) {
                                    updateProjectField('sections', [...(newProject.sections || []), section.name]);
                                  }
                                  setShowSectionsMenu(false);
                                }}
                                className="w-full text-left px-2 py-1 text-sm text-white hover:bg-gray-700 rounded transition-colors"
                              >
                                {section.name}
                              </button>
                            ))}
                            <div className="border-t border-gray-600 my-2"></div>
                          </>
                        )}
                        
                        {/* Opción para crear nueva sección */}
                        <button
                          onClick={() => {
                            const sectionName = prompt('Nombre de la nueva sección:');
                            if (sectionName && sectionName.trim()) {
                              updateProjectField('sections', [...(newProject.sections || []), sectionName.trim()]);
                            }
                            setShowSectionsMenu(false);
                          }}
                          className="w-full text-left px-2 py-1 text-sm text-cyan-400 hover:bg-gray-700 rounded transition-colors"
                        >
                          + Crear nueva sección
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Mostrar secciones agregadas */}
                  {newProject.sections && newProject.sections.length > 0 && (
                    <div className="space-y-2">
                      {newProject.sections.map((section, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-800/30 rounded px-3 py-2">
                          <span className="text-sm text-cyan-400">• {section}</span>
                          <button
                            onClick={() => {
                              const updatedSections = newProject.sections.filter((_, i) => i !== index);
                              updateProjectField('sections', updatedSections);
                            }}
                            className="text-gray-400 hover:text-red-400 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Prioridad */}
                <div className="relative">
                  <div className="flex items-center gap-3 mb-3">
                    <label className="text-sm font-medium text-gray-300">
                      Prioridad
                    </label>
                    <button 
                      onClick={() => setShowPriorityMenu(!showPriorityMenu)}
                      className="text-gray-400 hover:text-cyan-400 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Menú desplegable de prioridades */}
                  {showPriorityMenu && (
                    <div className="absolute top-full left-0 right-0 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-10 mb-3">
                      <div className="p-2">
                        <div className="text-xs text-gray-400 mb-2 px-2">Seleccionar prioridad:</div>
                        
                        {/* Opción Bajo */}
                        <button
                          onClick={() => {
                            updateProjectField('priority', 'bajo');
                            setShowPriorityMenu(false);
                          }}
                          className="w-full text-left px-2 py-2 text-sm text-white hover:bg-gray-700 rounded transition-colors flex items-center gap-2"
                        >
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <span>Bajo</span>
                        </button>
                        
                        {/* Opción Medio */}
                        <button
                          onClick={() => {
                            updateProjectField('priority', 'medio');
                            setShowPriorityMenu(false);
                          }}
                          className="w-full text-left px-2 py-2 text-sm text-white hover:bg-gray-700 rounded transition-colors flex items-center gap-2"
                        >
                          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                          <span>Medio</span>
                        </button>
                        
                        {/* Opción Alto */}
                        <button
                          onClick={() => {
                            updateProjectField('priority', 'alto');
                            setShowPriorityMenu(false);
                          }}
                          className="w-full text-left px-2 py-2 text-sm text-white hover:bg-gray-700 rounded transition-colors flex items-center gap-2"
                        >
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                          <span>Alto</span>
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Mostrar prioridad seleccionada */}
                  {newProject.priority && (
                    <div className="flex items-center gap-2 bg-gray-800/30 rounded px-3 py-2">
                      <div className={`w-3 h-3 rounded-full ${
                        newProject.priority === 'alto' ? 'bg-red-500' :
                        newProject.priority === 'medio' ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}></div>
                      <span className="text-sm text-cyan-400 capitalize">{newProject.priority}</span>
                      <button
                        onClick={() => updateProjectField('priority', null)}
                        className="ml-auto text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Colaboradores */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Colaboradores
                  </label>
                  <div className="flex items-center gap-2">
                    {/* Fotos de colaboradores existentes */}
                    {newProject.collaborators.map((collaborator) => (
                      <div key={collaborator.id} className="relative">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                          style={{
                            backgroundImage: collaborator.photoUrl 
                              ? `url(${collaborator.photoUrl})` 
                              : 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                          }}
                        >
                          {!collaborator.photoUrl && collaborator.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                    ))}
                    
                    {/* Botón agregar colaborador */}
                    <button className="w-8 h-8 rounded-full border-2 border-dashed border-gray-500 flex items-center justify-center text-gray-400 hover:border-cyan-400 hover:text-cyan-400 transition-colors">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Botón de guardar */}
              <div className="mt-8 pt-6 border-t border-gray-700/50">
                <button
                  onClick={saveProject}
                  disabled={!newProject.title.trim()}
                  className="w-full px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 font-medium text-sm"
                >
                  Crear Proyecto
                </button>
              </div>
            </div>
            
            {/* Área principal - Editor de notas */}
            <div className="flex-1 flex flex-col">
              {/* Barra de herramientas funcional */}
              <div className="bg-gray-900/40 border-b border-gray-700/50 p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Botón Bold */}
                  <button 
                    onClick={() => applyTextFormat('bold')}
                    className={`p-2 rounded hover:bg-gray-700 transition-colors ${
                      editorFormat.bold ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                    title="Negrita (Ctrl+B)"
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  
                  {/* Botón Underline */}
                  <button 
                    onClick={() => applyTextFormat('underline')}
                    className={`p-2 rounded hover:bg-gray-700 transition-colors ${
                      editorFormat.underline ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                    title="Subrayado (Ctrl+U)"
                  >
                    <Underline className="w-4 h-4" />
                  </button>
                  
                  <div className="w-px h-6 bg-gray-600 mx-2"></div>
                  
                  {/* Selector de tamaño de fuente */}
                  <select 
                    value={editorFormat.fontSize}
                    onChange={(e) => applyTextFormat('fontSize', e.target.value)}
                    className="bg-gray-700 text-gray-300 text-sm px-3 py-1 rounded border-none outline-none hover:bg-gray-600 transition-colors"
                    title="Tamaño de fuente"
                  >
                    <option value="12px">12px</option>
                    <option value="14px">14px</option>
                    <option value="16px">16px</option>
                    <option value="18px">18px</option>
                    <option value="20px">20px</option>
                    <option value="24px">24px</option>
                  </select>
                  
                  {/* Selector de color */}
                  <div className="relative">
                    <input
                      type="color"
                      value={editorFormat.color}
                      onChange={(e) => applyTextFormat('color', e.target.value)}
                      className="w-8 h-8 rounded border-2 border-gray-600 hover:border-gray-500 outline-none cursor-pointer transition-colors"
                      title="Color del texto"
                    />
                  </div>
                  
                  <div className="w-px h-6 bg-gray-600 mx-2"></div>
                  
                  {/* Selector de formato de bloque */}
                  <select 
                    value={editorFormat.textFormat}
                    onChange={(e) => applyTextFormat('textFormat', e.target.value)}
                    className="bg-gray-700 text-gray-300 text-sm px-3 py-1 rounded border-none outline-none hover:bg-gray-600 transition-colors min-w-[100px]"
                    title="Formato de texto"
                  >
                    <option value="p">Párrafo</option>
                    <option value="h1">Título 1</option>
                    <option value="h2">Título 2</option>
                    <option value="h3">Título 3</option>
                    <option value="h4">Título 4</option>
                    <option value="h5">Título 5</option>
                    <option value="h6">Título 6</option>
                  </select>
                  
                  {/* Indicador de estado */}
                  <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
                    {editorFormat.bold && <span className="px-2 py-1 bg-cyan-600/20 text-cyan-400 rounded">B</span>}
                    {editorFormat.underline && <span className="px-2 py-1 bg-cyan-600/20 text-cyan-400 rounded">U</span>}
                    <span>{editorFormat.fontSize}</span>
                  </div>
                </div>
              </div>
              
              {/* Área de texto principal con referencia */}
              <div className="flex-1 p-6">
                {/* Contenedor con borde y márgenes */}
                <div className="bg-gray-900/30 border border-gray-700/50 rounded-lg mx-4 mb-20 relative">
                  
                  
                  <textarea
                    ref={textareaRef}
                    value={newProject.notes}
                    onChange={(e) => updateProjectField('notes', e.target.value)}
                    className="w-full bg-transparent text-white placeholder-gray-400 resize-none focus:outline-none text-sm leading-relaxed font-mono p-4 custom-scrollbar relative z-10"
                    style={{ 
                      height: '500px', // Altura perfecta como solicitaste
                      maxHeight: '500px', // Altura máxima
                      fontSize: editorFormat.fontSize,
                      color: editorFormat.color,
                      lineHeight: '32px' // Altura de línea consistente con las nuevas guías
                    }}
                  onKeyDown={(e) => {
                    // Atajos de teclado
                    if (e.ctrlKey || e.metaKey) {
                      if (e.key === 'b') {
                        e.preventDefault();
                        applyTextFormat('bold');
                      } else if (e.key === 'u') {
                        e.preventDefault();
                        applyTextFormat('underline');
                      }
                    }
                  }}
                />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      
      {/* INTERFAZ ORIGINAL PARA OTROS MODOS */}
      {(appState === "intelligent_mode" || appState === "functional_mode") && (
        <div className="flex-1 flex flex-col items-center justify-center min-h-screen p-8 relative z-10">
          {/* Central Circle con toggle de voz */}
          <div className="relative flex flex-col items-center justify-center mb-20 w-full mt-[-70px]">
            <button 
              onClick={toggleNexusVoiceControl}
              disabled={isSpeaking || isModeTransitioning}
              className={`${getCircleClasses()} transition-all duration-300 hover:scale-105 ${
                isVoiceControlEnabled 
                  ? "shadow-green-500/30 shadow-2xl" 
                  : "hover:shadow-cyan-500/30 hover:shadow-xl"
              } ${isSpeaking || isModeTransitioning ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              title={isVoiceControlEnabled ? "Desactivar reconocimiento de voz" : "Activar reconocimiento de voz"}
              aria-label={isVoiceControlEnabled ? "Desactivar reconocimiento de voz" : "Activar reconocimiento de voz"}
            >
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
                    <div className="text-cyan-400 text-xs font-mono animate-pulse opacity-70">{">"}  NEXUS_SPEAKING</div>
                  </div>
                  <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2">
                    <div className="text-cyan-400 text-xs font-mono animate-pulse opacity-70">
                      {">"} AUDIO_OUTPUT_ACTIVE
                    </div>
                  </div>
                  <div className="absolute top-1/2 -left-20 transform -translate-y-1/2 rotate-90">
                    <div className="text-cyan-400 text-xs font-mono animate-pulse opacity-50">{">"}  AI_PROCESSING</div>
                  </div>
                  <div className="absolute top-1/2 -right-20 transform -translate-y-1/2 -rotate-90">
                    <div className="text-cyan-400 text-xs font-mono animate-pulse opacity-50">
                      {">"} VOICE_SYNTHESIS
                    </div>
                  </div>
                </>
              )}
              <div className="w-48 h-48 rounded-full bg-black flex items-center justify-center">{getMainIcon()}</div>
            </button>

            {/* Status Text */}
            <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 text-center w-full">
              <p
                className={`text-sm font-medium ${
                  appState === "sleeping"
                    ? "text-gray-400"
                    : appState === "waiting_password"
                      ? "text-yellow-400"
                      : appState === "initializing"
                        ? "text-cyan-400"
                        : appState === "calling_confirmation"
                          ? "text-green-400"
                          : appState === "music_mode"
                            ? "text-green-400"
                            : appState === "music_playing"
                              ? "text-green-400"
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

          {/* 🖼️ MOSTRAR IMAGEN ACTUAL - SIN BOTÓN DE DESCARGA MANUAL */}
          {currentImage && !waitingImageDownloadConfirmation && (
            <Card className="mb-8 bg-gray-900/80 border-cyan-500/30 p-6 max-w-md backdrop-blur-sm relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-cyan-500/5 animate-pulse"></div>
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse"></div>
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse delay-500"></div>
              <div className="text-center relative z-10">
                <div className="flex items-center justify-center mb-3">
                  <ImageIcon className="h-4 w-4 text-cyan-400 mr-2" />
                  <p className="text-cyan-100 text-sm font-medium font-mono">{">"}  IMAGE_DISPLAY:</p>
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



      

      {/* Modal de confirmación de cierre de sesión */}
      <LogoutModal 
        isOpen={showLogoutModal} 
        onConfirm={confirmLogout} 
        onCancel={() => setShowLogoutModal(false)}
      />
      
      {/* Modal de error de YouTube */}
      {showYoutubeError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-slate-900 to-cyan-950 p-6 rounded-xl shadow-xl border border-cyan-600/40 max-w-md w-full transform transition-all animate-fadeIn">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-500/20 p-2 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff5757" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">Error</h2>
            </div>
            
            <p className="text-cyan-100 mb-6">{youtubeErrorMessage}</p>
            
            <div className="flex justify-end">
              <button 
                onClick={() => setShowYoutubeError(false)}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg shadow-lg transition-all duration-200 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Aceptar
              </button>
            </div>
          </div>
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

      {/* Reproductor YouTube siempre montado (oculto en segundo plano) */}
      {isPlayingMusic && currentVideoId && (
        <div className={musicBackgroundMode ? "hidden" : "fixed inset-0 z-50 flex items-center justify-center bg-black/80"}>
          <div className="relative w-full max-w-xl">
            <YouTubePlayer
              ref={youtubePlayerRef}
              videoId={currentVideoId}
              title={currentSongTitle}
              playlist={playlistMode && currentPlaylist ? currentPlaylist.songs.map(song => song.videoId) : []}
              currentPlaylistIndex={currentPlaylistIndex}
              onEnd={() => {
                console.log("🎵 Canción finalizada, avanzando a la siguiente...");
                // La reproducción automática ahora está implementada en el componente YouTubePlayer
                // pero mantenemos estos estados sincronizados
                if (playlistMode && currentPlaylist && currentPlaylistIndex < currentPlaylist.songs.length - 1) {
                  const nextIndex = currentPlaylistIndex + 1;
                  setCurrentPlaylistIndex(nextIndex);
                  setCurrentSongTitle(currentPlaylist.songs[nextIndex].title);
                  setCurrentVideoId(currentPlaylist.songs[nextIndex].videoId);
                } else if (!playlistMode || (currentPlaylist && currentPlaylistIndex >= currentPlaylist.songs.length - 1)) {
                  // Solo si no hay más canciones en la playlist
                  setIsPlayingMusic(false);
                  setCurrentSongTitle("");
                  setCurrentVideoId("");
                  setPlaylistMode(false);
                  setCurrentPlaylist(null);
                  setCurrentPlaylistIndex(0);
                  setMusicBackgroundMode(false);
                  
                  // Mantener el modo actual si estamos en modo funcional o inteligente
                  if (appState !== ("functional_mode" as AppState) && appState !== "intelligent_mode") {
                    setAppState("active");
                  }
                }
              }}
              onNextSong={(videoId, index) => {
                if (currentPlaylist && currentPlaylist.songs[index]) {
                  setCurrentPlaylistIndex(index);
                  setCurrentSongTitle(currentPlaylist.songs[index].title);
                  setCurrentVideoId(videoId);
                }
              }}
              onPrevSong={(videoId, index) => {
                if (currentPlaylist && currentPlaylist.songs[index]) {
                  setCurrentPlaylistIndex(index);
                  setCurrentSongTitle(currentPlaylist.songs[index].title);
                  setCurrentVideoId(videoId);
                }
              }}
            />
            {!musicBackgroundMode && (
              <div className="flex justify-between mt-4">
                {/* Botones de control */}
                <div className="flex gap-2">
                  <Button 
                    onClick={() => youtubePlayerRef.current?.previous()}
                    className="bg-cyan-800 hover:bg-cyan-700 text-white rounded-full p-2 w-10 h-10 flex items-center justify-center" 
                    title="Anterior">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5"></line></svg>
                  </Button>
                  <Button 
                    onClick={() => youtubePlayerRef.current?.play()}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-full p-2 w-10 h-10 flex items-center justify-center"
                    title="Reproducir">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                  </Button>
                  <Button 
                    onClick={() => youtubePlayerRef.current?.pause()}
                    className="bg-amber-600 hover:bg-amber-500 text-white rounded-full p-2 w-10 h-10 flex items-center justify-center"
                    title="Pausar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                  </Button>
                  <Button 
                    onClick={() => youtubePlayerRef.current?.next()}
                    className="bg-cyan-800 hover:bg-cyan-700 text-white rounded-full p-2 w-10 h-10 flex items-center justify-center"
                    title="Siguiente">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>
                  </Button>
                </div>
                
                {/* Botón de modo background */}
                <Button onClick={() => setMusicBackgroundMode(true)} variant="secondary">
                  Reproducir en segundo plano
                </Button>
                <Button onClick={() => handleMusicControl("quitar")}>Quitar música</Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mini barra de música en segundo plano con controles - SIEMPRE VISIBLE CUANDO HAY MÚSICA */}
      {isPlayingMusic && currentVideoId && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-cyan-900/95 rounded-lg shadow-2xl flex items-center px-4 py-3 z-[9998] border-2 border-cyan-500 gap-3">
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
            {/* Botón primer plano - minimalista */}
            <button
              onClick={() => setMusicBackgroundMode(false)}
              className="flex items-center gap-1 px-2 py-1 text-gray-400 hover:text-cyan-400 hover:bg-gray-800/30 rounded transition-all duration-200 text-xs"
              title="Primer plano"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                <polyline points="10 17 15 12 10 7"/>
                <line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
            </button>
            
            {/* Botón cerrar - minimalista */}
            <button
              onClick={() => handleMusicControl("quitar")}
              className="flex items-center gap-1 px-2 py-1 text-gray-400 hover:text-red-400 hover:bg-gray-800/30 rounded transition-all duration-200 text-xs"
              title="Cerrar música"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Indicador de música en segundo plano */}
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-cyan-400 bg-cyan-950/90 px-2 py-0.5 rounded-b-lg border border-t-0 border-cyan-700/50">
            Música en segundo plano
          </span>
        </div>
      )}

      {/* 🔄 BOTÓN FLOTANTE DE CAMBIO DE MODO - MINIMALISTA */}
      {hasInitialized && (
        <div className="fixed bottom-6 right-6 z-[9999]">
          <button
            onClick={toggleMode}
            disabled={isSpeaking}
            className="
              flex items-center gap-2 px-4 py-2 rounded-lg
              bg-gray-800/80 hover:bg-gray-700/90 text-gray-300 hover:text-white
              border border-gray-600 hover:border-gray-500
              backdrop-blur-sm transition-all duration-200
              text-sm font-medium
            "
          >
            <ArrowRight 
              size={16} 
              className={appState === "functional_mode" ? 'rotate-180' : ''} 
            />
            <span>
              {appState === "active" ? "Workspace" : "Mi NEXUS"}
            </span>
          </button>
        </div>
      )}

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

      {/* ⚙️ SETTINGS MODAL */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      
      {/* 🔊 REGIÓN ARIA LIVE PARA ACCESIBILIDAD */}
      <div 
        className="sr-only" 
        role="status" 
        aria-live="polite" 
        aria-atomic="true"
      >
        {announcement}
      </div>

      {/* 🔒 MODAL DE CIERRE DE SESIÓN */}
      <LogoutModal 
        isOpen={showLogoutModal} 
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutModal(false)} 
      />
      
      {/* 🔄 PANTALLA DE CARGA NEXUS - Ahora con z-index mayor para garantizar que está por encima */}
      <LoadingScreen isVisible={showLoadingScreen} onComplete={handleSystemLoadingComplete} />

      {/* 🔓 SISTEMA DE LOGIN NEXUS */}
      {showLoginSystem && (
        <NexusLoginSystem 
          onLoginComplete={handleLoginComplete}
        />
      )}
      
      {/* 📚 MODAL DE TUTORIAL */}
      <TutorialModal 
        isOpen={showTutorialModal}
        onAccept={handleTutorialAccepted}
        onDecline={handleTutorialDeclined}
        profileName={activeProfile?.name}
      />
      
      {/* 📚 GUÍA DE TUTORIAL */}
      <TutorialGuide 
        isActive={showTutorialGuide}
        onComplete={handleTutorialCompleted}
        profileName={activeProfile?.name || ""}
        isFeminine={activeProfile?.gender === "feminine"}
      />
      
      {/* 📋 MODAL PARA AGREGAR SECCIÓN */}
      {showAddSectionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Nueva Sección</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nombre de la sección
              </label>
              <input
                type="text"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="Ej: Desarrollo Web, Diseño, Marketing..."
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                maxLength={30}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    createCustomSection()
                  } else if (e.key === 'Escape') {
                    setShowAddSectionModal(false)
                    setNewSectionName('')
                  }
                }}
              />
              <p className="text-xs text-gray-500 mt-1">
                {newSectionName.length}/30 caracteres
              </p>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowAddSectionModal(false)
                  setNewSectionName('')
                }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={createCustomSection}
                disabled={!newSectionName.trim()}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200"
              >
                Crear Sección
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

