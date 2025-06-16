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

// 🎯 DETECTORES DE COMANDOS
export class CommandDetector {
  // 📱 DETECTAR COMANDOS DE LLAMADA
  static isCallCommand(text: string): boolean {
    const callKeywords = [
      "llama",
      "llamar",
      "llámame",
      "marca",
      "marcar",
      "telefono",
      "teléfono",
      "contacta",
      "contactar",
      "comunica",
      "comunicar",
    ]
    const lowerText = text.toLowerCase()
    return callKeywords.some((keyword) => lowerText.includes(keyword))
  }

  // 🗺️ DETECTAR COMANDOS DE NAVEGACIÓN
  static isNavigationCommand(text: string): boolean {
    const navKeywords = [
      "geolocalizador",
      "mapa",
      "navega",
      "navegación",
      "direccion",
      "dirección",
      "ubicacion",
      "ubicación",
      "ruta",
      "ir a",
      "vamos a",
      "llévame",
      "llevame",
    ]
    const lowerText = text.toLowerCase()
    return navKeywords.some((keyword) => lowerText.includes(keyword))
  }

  // 📱 EXTRAER NOMBRE DE CONTACTO
  static extractContactName(text: string): string {
    const lowerText = text.toLowerCase()
    // Remover palabras de comando
    const cleanText = lowerText
      .replace(/jarvis/gi, "")
      .replace(/llama|llamar|llámame|marca|marcar|telefono|teléfono|contacta|contactar/gi, "")
      .replace(/\ba\b/gi, "") // remover "a"
      .trim()

    return cleanText
  }

  // 🗺️ EXTRAER NOMBRE DE UBICACIÓN
  static extractLocationName(text: string): string {
    const lowerText = text.toLowerCase()
    const cleanText = lowerText
      .replace(/jarvis/gi, "")
      .replace(/geolocalizador|mapa|navega|navegación|direccion|dirección|ubicacion|ubicación|ruta/gi, "")
      .replace(/\b(a|la|el|de|del|hacia)\b/gi, "") // remover artículos
      .replace(/\b(ir|vamos|llévame|llevame)\b/gi, "")
      .trim()

    return cleanText
  }
}
