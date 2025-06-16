"use client"

// 📱 CONTACTOS
export interface Contact {
  id: string
  name: string
  phone: string
  createdAt: Date
}

// 🗺️ UBICACIONES
export interface Location {
  id: string
  name: string
  address: string
  latitude?: number
  longitude?: number
  createdAt: Date
}

// 🎵 PLAYLISTS DE SPOTIFY
export interface SpotifyPlaylist {
  id: string
  name: string
  spotifyUrl: string
  createdAt: Date
}

// 📱 GESTIÓN DE CONTACTOS
export class ContactsDB {
  private static STORAGE_KEY = "jarvis_contacts"

  static getAll(): Contact[] {
    if (typeof window === "undefined") return []
    try {
      const data = localStorage.getItem(this.STORAGE_KEY)
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  }

  static save(contacts: Contact[]): void {
    if (typeof window === "undefined") return
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(contacts))
  }

  static add(name: string, phone: string): Contact {
    const contacts = this.getAll()
    const newContact: Contact = {
      id: Date.now().toString(),
      name: name.toLowerCase().trim(),
      phone: phone.trim(),
      createdAt: new Date(),
    }
    contacts.push(newContact)
    this.save(contacts)
    console.log("📱 CONTACT ADDED:", newContact)
    return newContact
  }

  static findByName(name: string): Contact | null {
    const contacts = this.getAll()
    const searchName = name.toLowerCase().trim()
    return (
      contacts.find(
        (contact) =>
          contact.name.includes(searchName) ||
          searchName.includes(contact.name) ||
          contact.name.split(" ").some((word) => searchName.includes(word)),
      ) || null
    )
  }

  static delete(id: string): void {
    const contacts = this.getAll().filter((c) => c.id !== id)
    this.save(contacts)
  }
}

// 🗺️ GESTIÓN DE UBICACIONES
export class LocationsDB {
  private static STORAGE_KEY = "jarvis_locations"

  static getAll(): Location[] {
    if (typeof window === "undefined") return []
    try {
      const data = localStorage.getItem(this.STORAGE_KEY)
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  }

  static save(locations: Location[]): void {
    if (typeof window === "undefined") return
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(locations))
  }

  static add(name: string, address: string, latitude?: number, longitude?: number): Location {
    const locations = this.getAll()
    const newLocation: Location = {
      id: Date.now().toString(),
      name: name.toLowerCase().trim(),
      address: address.trim(),
      latitude,
      longitude,
      createdAt: new Date(),
    }
    locations.push(newLocation)
    this.save(locations)
    console.log("🗺️ LOCATION ADDED:", newLocation)
    return newLocation
  }

  static findByName(name: string): Location | null {
    const locations = this.getAll()
    const searchName = name.toLowerCase().trim()
    return (
      locations.find(
        (location) =>
          location.name.includes(searchName) ||
          searchName.includes(location.name) ||
          location.name.split(" ").some((word) => searchName.includes(word)),
      ) || null
    )
  }

  static delete(id: string): void {
    const locations = this.getAll().filter((l) => l.id !== id)
    this.save(locations)
  }
}

// 🎵 GESTIÓN DE PLAYLISTS DE SPOTIFY
export class SpotifyDB {
  private static STORAGE_KEY = "jarvis_spotify_playlists"

  static getAll(): SpotifyPlaylist[] {
    if (typeof window === "undefined") return []
    try {
      const data = localStorage.getItem(this.STORAGE_KEY)
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  }

  static save(playlists: SpotifyPlaylist[]): void {
    if (typeof window === "undefined") return
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(playlists))
  }

  static add(name: string, spotifyUrl: string): SpotifyPlaylist {
    const playlists = this.getAll()
    const newPlaylist: SpotifyPlaylist = {
      id: Date.now().toString(),
      name: name.toLowerCase().trim(),
      spotifyUrl: spotifyUrl.trim(),
      createdAt: new Date(),
    }
    playlists.push(newPlaylist)
    this.save(playlists)
    console.log("🎵 PLAYLIST ADDED:", newPlaylist)
    return newPlaylist
  }

  // 🎵 EXTRAER NOMBRE DE PLAYLIST - MEJORADO
  static extractPlaylistName(text: string): string {
    const lowerText = text.toLowerCase()

    // Remover palabras comunes pero mantener el texto más completo
    const cleanText = lowerText
      .replace(/jarvis/gi, "")
      .replace(/\b(pon|poner|reproducir|música|musica|playlist|lista|de|la|el|del|quiero|escuchar)\b/gi, "")
      .trim()

    console.log("🎵 EXTRACTED PLAYLIST NAME:", cleanText)
    return cleanText || lowerText // Si queda vacío, devolver el texto original
  }

  static findByName(name: string): SpotifyPlaylist | null {
    const playlists = this.getAll()
    const searchName = name.toLowerCase().trim()

    console.log("🔍 SEARCHING FOR:", searchName)
    console.log(
      "🔍 IN PLAYLISTS:",
      playlists.map((p) => p.name),
    )

    return (
      playlists.find((playlist) => {
        const playlistName = playlist.name.toLowerCase()

        // Múltiples formas de coincidencia
        const exactMatch = playlistName === searchName
        const contains = playlistName.includes(searchName) || searchName.includes(playlistName)
        const wordMatch = playlist.name
          .split(" ")
          .some((word) => searchName.includes(word.toLowerCase()) && word.length > 2)
        const reverseWordMatch = searchName.split(" ").some((word) => playlistName.includes(word) && word.length > 2)

        console.log(`🔍 CHECKING "${playlistName}":`, {
          exactMatch,
          contains,
          wordMatch,
          reverseWordMatch,
        })

        return exactMatch || contains || wordMatch || reverseWordMatch
      }) || null
    )
  }

  static delete(id: string): void {
    const playlists = this.getAll().filter((p) => p.id !== id)
    this.save(playlists)
  }
}

// 🎯 DETECTORES DE COMANDOS MEJORADOS Y MÁS ESPECÍFICOS
export class CommandDetector {
  // 📱 DETECTAR COMANDOS DE AGENDA/LLAMADA - MÁS ESPECÍFICO
  static isAgendaCommand(text: string): boolean {
    const agendaKeywords = [
      "abre mi agenda",
      "abrir agenda",
      "agenda de contactos",
      "quiero llamar a alguien",
      "quiero hacer una llamada",
      "necesito llamar",
      "abrir contactos",
      "ver contactos",
      "gestionar contactos",
    ]
    const lowerText = text.toLowerCase()
    return agendaKeywords.some((keyword) => lowerText.includes(keyword))
  }

  // 📱 DETECTAR LLAMADA DIRECTA - MUY ESPECÍFICO
  static isDirectCallCommand(text: string): boolean {
    const callKeywords = [
      "llama a ",
      "llamar a ",
      "marca a ",
      "marcar a ",
      "contacta a ",
      "contactar a ",
      "telefono a ",
      "teléfono a ",
    ]
    const lowerText = text.toLowerCase()
    return callKeywords.some((keyword) => lowerText.includes(keyword))
  }

  // 🗺️ DETECTAR COMANDOS DE NAVEGACIÓN - MÁS ESPECÍFICO
  static isNavigationCommand(text: string): boolean {
    const navKeywords = [
      "activa el geolocalizador",
      "activar geolocalizador",
      "abre el mapa",
      "abrir mapa",
      "quiero ir a",
      "necesito ir a",
      "navegar a",
      "navegación",
      "activar navegación",
    ]
    const lowerText = text.toLowerCase()
    return navKeywords.some((keyword) => lowerText.includes(keyword))
  }

  // 🎵 DETECTAR COMANDOS DE SPOTIFY - NUEVO
  static isSpotifyCommand(text: string): boolean {
    const spotifyKeywords = [
      "abre spotify",
      "abrir spotify",
      "pon música",
      "poner música",
      "reproducir música",
      "quiero escuchar música",
      "activa spotify",
      "activar spotify",
    ]
    const lowerText = text.toLowerCase()
    return spotifyKeywords.some((keyword) => lowerText.includes(keyword))
  }

  // 🎵 DETECTAR COMANDOS DE CONTROL DE MÚSICA
  static isMusicControlCommand(text: string): boolean {
    const controlKeywords = [
      "pausa la música",
      "pausar música",
      "detener música",
      "parar música",
      "reanudar música",
      "continuar música",
      "quitar música",
      "cerrar música",
      "apagar música",
    ]
    const lowerText = text.toLowerCase()
    return controlKeywords.some((keyword) => lowerText.includes(keyword))
  }

  // ❌ DETECTAR COMANDO DE CANCELACIÓN - NUEVO
  static isCancelCommand(text: string): boolean {
    const cancelKeywords = [
      "cancela acción",
      "cancelar acción",
      "cancela",
      "cancelar",
      "volver atrás",
      "regresar",
      "salir",
    ]
    const lowerText = text.toLowerCase()
    return cancelKeywords.some((keyword) => lowerText.includes(keyword))
  }

  // 🕐 DETECTAR PREGUNTAS DE TIEMPO - NUEVO
  static isTimeCommand(text: string): boolean {
    const timeKeywords = [
      "qué hora es",
      "que hora es",
      "dime la hora",
      "hora actual",
      "qué fecha es",
      "que fecha es",
      "dime la fecha",
      "fecha actual",
      "día de hoy",
      "hoy es",
    ]
    const lowerText = text.toLowerCase()
    return timeKeywords.some((keyword) => lowerText.includes(keyword))
  }

  // 📱 EXTRAER NOMBRE DE CONTACTO
  static extractContactName(text: string): string {
    const lowerText = text.toLowerCase()
    const cleanText = lowerText
      .replace(/jarvis/gi, "")
      .replace(/llama|llamar|marca|marcar|telefono|teléfono|contacta|contactar/gi, "")
      .replace(/\ba\b/gi, "")
      .trim()

    return cleanText
  }

  // 🗺️ EXTRAER NOMBRE DE UBICACIÓN
  static extractLocationName(text: string): string {
    const lowerText = text.toLowerCase()
    const cleanText = lowerText
      .replace(/jarvis/gi, "")
      .replace(/geolocalizador|mapa|navega|navegación|direccion|dirección|ubicacion|ubicación|ruta/gi, "")
      .replace(/\b(a|la|el|de|del|hacia|ir|vamos|llévame|llevame)\b/gi, "")
      .trim()

    return cleanText
  }

  // 🎵 EXTRAER NOMBRE DE PLAYLIST
  static extractPlaylistName(text: string): string {
    const lowerText = text.toLowerCase()

    // Remover palabras comunes pero mantener el texto más completo
    const cleanText = lowerText
      .replace(/jarvis/gi, "")
      .replace(/\b(pon|poner|reproducir|música|musica|playlist|lista|de|la|el|del|quiero|escuchar)\b/gi, "")
      .trim()

    console.log("🎵 EXTRACTED PLAYLIST NAME:", cleanText)
    return cleanText || lowerText // Si queda vacío, devolver el texto original
  }

  // Agregar nuevos detectores de comandos de Spotify en la clase CommandDetector

  // 🎵 DETECTAR COMANDOS DE CONTROL DE SPOTIFY ESPECÍFICOS - NUEVO
  static isSpotifyControlCommand(text: string): boolean {
    const controlKeywords = [
      "reproducir",
      "reproduce",
      "play",
      "pausar",
      "pausa",
      "pause",
      "siguiente canción",
      "siguiente",
      "next",
      "canción anterior",
      "anterior",
      "previous",
      "reanudar",
      "continuar",
      "resume",
    ]
    const lowerText = text.toLowerCase()
    return controlKeywords.some((keyword) => lowerText.includes(keyword))
  }

  // 🎵 EXTRAER TIPO DE CONTROL DE SPOTIFY - NUEVO
  static extractSpotifyControl(text: string): "play" | "pause" | "next" | "previous" | "unknown" {
    const lowerText = text.toLowerCase()

    if (
      lowerText.includes("reproducir") ||
      lowerText.includes("reproduce") ||
      lowerText.includes("play") ||
      lowerText.includes("reanudar") ||
      lowerText.includes("continuar")
    ) {
      return "play"
    }
    if (lowerText.includes("pausar") || lowerText.includes("pausa") || lowerText.includes("pause")) {
      return "pause"
    }
    if (lowerText.includes("siguiente") || lowerText.includes("next")) {
      return "next"
    }
    if (lowerText.includes("anterior") || lowerText.includes("previous")) {
      return "previous"
    }

    return "unknown"
  }
}

// 🕐 UTILIDADES DE TIEMPO PARA ARGENTINA
export class TimeUtils {
  static getArgentinaTime(): { time: string; date: string; dayName: string } {
    const now = new Date()
    const argentinaTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }))

    const time = argentinaTime.toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })

    const date = argentinaTime.toLocaleDateString("es-AR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    const dayName = argentinaTime.toLocaleDateString("es-AR", { weekday: "long" })

    return { time, date, dayName }
  }

  static getTimeResponse(): string {
    const { time, date, dayName } = this.getArgentinaTime()
    return `Son las ${time} del ${dayName}. Hoy es ${date}.`
  }
}
