"use client"

// 📱 CONTACTOS
export interface Contact {
  id: string
  name: string
  phone: string
  email?: string
  category: "family" | "work" | "friend" | "other"
}

export class ContactsDB {
  /**
   * Elimina un contacto por id y actualiza el almacenamiento.
   * Retorna true si eliminó, false si no encontró.
   */
  static delete(id: string): boolean {
    const contacts = this.getAll();
    const idx = contacts.findIndex(contact => contact.id === id);
    if (idx !== -1) {
      contacts.splice(idx, 1);
      this.save(contacts);
      return true;
    }
    return false;
  }

  private static STORAGE_KEY = "nexus_contacts"

  static getAll(): Contact[] {
    if (typeof window === "undefined") return []
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      return stored ? JSON.parse(stored) : this.getDefaultContacts()
    } catch {
      return this.getDefaultContacts()
    }
  }

  private static getDefaultContacts(): Contact[] {
    // Retornamos un arreglo vacío en lugar de contactos predefinidos
    return []
  }

  static save(contacts: Contact[]): void {
    if (typeof window === "undefined") return
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(contacts))
  }

  static add(contact: Omit<Contact, "id">): Contact {
    const contacts = this.getAll()
    const newContact = { ...contact, id: Date.now().toString() }
    contacts.push(newContact)
    this.save(contacts)
    return newContact
  }

  static findByName(name: string): Contact | null {
    const contacts = this.getAll()
    const searchName = name.toLowerCase().trim()

    return (
      contacts.find((contact) => {
        const contactName = contact.name.toLowerCase()
        return contactName.includes(searchName) || searchName.includes(contactName)
      }) || null
    )
  }
}

// 🗺️ UBICACIONES
export interface Location {
  id: string
  name: string
  address: string
  coordinates?: { lat: number; lng: number }
  category: "home" | "work" | "favorite" | "other"
}

export class LocationsDB {
  /**
   * Elimina una ubicación por id y actualiza el almacenamiento.
   * Retorna true si eliminó, false si no encontró.
   */
  static delete(id: string): boolean {
    const locations = this.getAll();
    const idx = locations.findIndex(loc => loc.id === id);
    if (idx !== -1) {
      locations.splice(idx, 1);
      this.save(locations);
      return true;
    }
    return false;
  }

  private static STORAGE_KEY = "nexus_locations"

  static getAll(): Location[] {
    if (typeof window === "undefined") return []
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      return stored ? JSON.parse(stored) : this.getDefaultLocations()
    } catch {
      return this.getDefaultLocations()
    }
  }

  private static getDefaultLocations(): Location[] {
    // Retornamos un arreglo vacío en lugar de ubicaciones predefinidas
    return []
  }

  static save(locations: Location[]): void {
    if (typeof window === "undefined") return
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(locations))
  }

  static add(location: Omit<Location, "id">): Location {
    const locations = this.getAll()
    const newLocation = { ...location, id: Date.now().toString() }
    locations.push(newLocation)
    this.save(locations)
    return newLocation
  }

  static normalize(str: string): string {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^\w\s]/g, "")
      .trim();
  }

  static findByName(name: string): Location | null {
    const locations = this.getAll();
    const searchName = this.normalize(name);

    // 1. Buscar coincidencia exacta normalizada
    let exactMatch = locations.find(location => {
      const locationName = this.normalize(location.name);
      return locationName === searchName;
    });
    if (exactMatch) {
      console.log(`[LocationsDB] Exact match found for '${name}' → '${exactMatch.name}'`);
      return exactMatch;
    }

    // 2. Buscar coincidencia parcial (fallback)
    let partialMatch = locations.find(location => {
      const locationName = this.normalize(location.name);
      return locationName.includes(searchName) || searchName.includes(locationName);
    });
    if (partialMatch) {
      console.log(`[LocationsDB] Partial match found for '${name}' → '${partialMatch.name}'`);
      return partialMatch;
    }

    console.log(`[LocationsDB] No match found for '${name}'`);
    return null;
  }
}

// 🎵 SPOTIFY PLAYLISTS
export interface SpotifyPlaylist {
  id: string
  name: string
  spotifyUrl: string
  description?: string
}

export class SpotifyDB {
  private static STORAGE_KEY = "nexus_spotify_playlists"

  static getAll(): SpotifyPlaylist[] {
    if (typeof window === "undefined") return []
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      return stored ? JSON.parse(stored) : this.getDefaultPlaylists()
    } catch {
      return this.getDefaultPlaylists()
    }
  }

  private static getDefaultPlaylists(): SpotifyPlaylist[] {
    // Retornamos un arreglo vacío en lugar de playlists predefinidas
    return []
  }

  static save(playlists: SpotifyPlaylist[]): void {
    if (typeof window === "undefined") return
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(playlists))
  }

  static add(playlist: Omit<SpotifyPlaylist, "id">): SpotifyPlaylist {
    const playlists = this.getAll()
    const newPlaylist = { ...playlist, id: Date.now().toString() }
    playlists.push(newPlaylist)
    this.save(playlists)
    return newPlaylist
  }
}

// 🎯 DETECTOR DE COMANDOS
export class CommandDetector {
  // ⏰ COMANDOS DE TIEMPO
  static isTimeCommand(text: string): boolean {
    const timeKeywords = [
      "qué hora es",
      "que hora es",
      "hora actual",
      "dime la hora",
      "what time",
      "current time",
      "hora",
      "tiempo actual",
    ]
    return timeKeywords.some((keyword) => text.includes(keyword))
  }

  // 📞 COMANDOS DE LLAMADA
  static isDirectCallCommand(text: string): boolean {
    const callKeywords = ["llama a", "llamar a", "call", "teléfono", "telefono"]
    return callKeywords.some((keyword) => text.includes(keyword))
  }

  static extractContactName(text: string): string {
    const patterns = [/llama a (.+)/i, /llamar a (.+)/i, /call (.+)/i, /teléfono de (.+)/i, /telefono de (.+)/i]

    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) {
        return match[1].trim()
      }
    }

    return ""
  }

  // 🗺️ COMANDOS DE NAVEGACIÓN
  static isNavigationCommand(text: string): boolean {
    const navKeywords = [
      "ir a",
      "navegar a",
      "navigate to",
      "dirección a",
      "direccion a",
      "cómo llegar a",
      "como llegar a",
      "ruta a",
      "vamos a",
    ]
    return navKeywords.some((keyword) => text.includes(keyword))
  }

  static extractDestination(text: string): string {
    const patterns = [
      /ir a (.+)/i,
      /navegar a (.+)/i,
      /navigate to (.+)/i,
      /dirección a (.+)/i,
      /direccion a (.+)/i,
      /cómo llegar a (.+)/i,
      /como llegar a (.+)/i,
      /ruta a (.+)/i,
      /vamos a (.+)/i,
    ]

    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) {
        return match[1].trim()
      }
    }

    return ""
  }

  static extractLocationName(text: string): string {
    return this.extractDestination(text)
  }

  // 🎵 COMANDOS DE SPOTIFY
  static isSpotifyCommand(text: string): boolean {
    const spotifyKeywords = [
      "pon música",
      "reproduce",
      "música",
      "musica",
      "playlist",
      "play music",
      "spotify",
      "canción",
      "cancion",
    ]
    return spotifyKeywords.some((keyword) => text.includes(keyword))
  }

  static isSpotifyControlCommand(text: string): boolean {
    const controlKeywords = [
      "reproducir",
      "pausar",
      "siguiente",
      "anterior",
      "parar",
      "play",
      "pause",
      "next",
      "previous",
      "stop",
    ]
    return controlKeywords.some((keyword) => text.includes(keyword))
  }

  static extractSpotifyControl(text: string): "play" | "pause" | "next" | "previous" | "unknown" {
    if (text.includes("reproducir") || text.includes("play")) return "play"
    if (text.includes("pausar") || text.includes("pause")) return "pause"
    if (text.includes("siguiente") || text.includes("next")) return "next"
    if (text.includes("anterior") || text.includes("previous")) return "previous"
    return "unknown"
  }

  // ❌ COMANDOS DE CANCELACIÓN
  static isCancelCommand(text: string): boolean {
    const cancelKeywords = [
      "cancelar",
      "cancel",
      "parar",
      "stop",
      "salir",
      "exit",
      "no",
      "nada",
      "olvídalo",
      "olvidalo",
    ]
    return cancelKeywords.some((keyword) => text.includes(keyword))
  }

  // 📱 COMANDOS DE AGENDA
  static isAgendaCommand(text: string): boolean {
    const agendaKeywords = ["agenda", "contactos", "contacts", "teléfonos", "telefonos"]
    return agendaKeywords.some((keyword) => text.includes(keyword))
  }

  // 🎵 COMANDOS DE CONTROL DE MÚSICA
  static isMusicControlCommand(text: string): boolean {
    const musicKeywords = [
      "quitar música",
      "quitar musica",
      "cerrar música",
      "cerrar musica",
      "parar música",
      "parar musica",
      "stop music",
    ]
    return musicKeywords.some((keyword) => text.includes(keyword))
  }
}

// ⏰ UTILIDADES DE TIEMPO
import { getGenderTreatment } from "./utils"
import { ProfilesManager } from "./profilesManager"

export class TimeUtils {
  static getTimeResponse(): string {
    // Obtener el perfil activo para usar el tratamiento adecuado según género
    const activeProfile = ProfilesManager.getActiveProfile();
    const treatment = getGenderTreatment(activeProfile?.gender);
    
    const now = new Date()
    const hours = now.getHours()
    const minutes = now.getMinutes()

    const timeString = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`

    let greeting = ""
    if (hours < 12) greeting = "Buenos días"
    else if (hours < 18) greeting = "Buenas tardes"
    else greeting = "Buenas noches"

    return `${greeting}, ${treatment}. Son las ${timeString}.`
  }
}
