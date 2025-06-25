"use client"

interface MemoryEntry {
  id: string
  type: "preference" | "fact" | "context" | "pattern"
  content: string
  timestamp: Date
  relevance: number
  tags: string[]
}

interface UserProfile {
  name: string
  preferences: Record<string, any>
  commonQuestions: string[]
  favoriteTopics: string[]
  interactionPatterns: Record<string, number>
}

export class NexusMemory {
  private static MEMORY_KEY = "nexus_memory"
  private static PROFILE_KEY = "nexus_user_profile"
  private static MAX_MEMORIES = 1000

  // 🧠 GUARDAR MEMORIA
  static saveMemory(type: MemoryEntry["type"], content: string, tags: string[] = []): void {
    if (typeof window === "undefined") return

    const memories = this.getMemories()
    const newMemory: MemoryEntry = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
      relevance: 1.0,
      tags,
    }

    memories.unshift(newMemory)

    // Mantener solo las memorias más relevantes
    if (memories.length > this.MAX_MEMORIES) {
      memories.splice(this.MAX_MEMORIES)
    }

    localStorage.setItem(this.MEMORY_KEY, JSON.stringify(memories))
    console.log("🧠 MEMORY SAVED:", newMemory)
  }

  // 📖 OBTENER MEMORIAS
  static getMemories(): MemoryEntry[] {
    if (typeof window === "undefined") return []

    try {
      const stored = localStorage.getItem(this.MEMORY_KEY)
      if (!stored) return []

      const memories = JSON.parse(stored)
      return memories.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }))
    } catch {
      return []
    }
  }

  // 🔍 BUSCAR MEMORIAS RELEVANTES
  static findRelevantMemories(query: string, limit = 5): MemoryEntry[] {
    const memories = this.getMemories()
    const queryLower = query.toLowerCase()

    return memories
      .filter((memory) => {
        const contentMatch = memory.content.toLowerCase().includes(queryLower)
        const tagMatch = memory.tags.some((tag) => tag.toLowerCase().includes(queryLower))
        return contentMatch || tagMatch
      })
      .sort((a, b) => {
        // Ordenar por relevancia y fecha
        const relevanceDiff = b.relevance - a.relevance
        if (relevanceDiff !== 0) return relevanceDiff
        return b.timestamp.getTime() - a.timestamp.getTime()
      })
      .slice(0, limit)
  }

  // 👤 PERFIL DE USUARIO
  static getUserProfile(): UserProfile {
    if (typeof window === "undefined") {
      return this.getDefaultProfile()
    }

    try {
      const stored = localStorage.getItem(this.PROFILE_KEY)
      if (!stored) return this.getDefaultProfile()
      return JSON.parse(stored)
    } catch {
      return this.getDefaultProfile()
    }
  }

  private static getDefaultProfile(): UserProfile {
    return {
      name: "Señor",
      preferences: {},
      commonQuestions: [],
      favoriteTopics: [],
      interactionPatterns: {},
    }
  }

  // 💾 ACTUALIZAR PERFIL
  static updateProfile(updates: Partial<UserProfile>): void {
    if (typeof window === "undefined") return

    const profile = this.getUserProfile()
    const updatedProfile = { ...profile, ...updates }
    localStorage.setItem(this.PROFILE_KEY, JSON.stringify(updatedProfile))
    console.log("👤 PROFILE UPDATED:", updatedProfile)
  }

  // 📊 REGISTRAR INTERACCIÓN
  static recordInteraction(query: string, response: string): void {
    // Guardar como memoria
    this.saveMemory("context", `Q: ${query} | A: ${response}`, ["conversation"])

    // Actualizar patrones
    const profile = this.getUserProfile()
    const queryType = this.categorizeQuery(query)

    profile.interactionPatterns[queryType] = (profile.interactionPatterns[queryType] || 0) + 1

    // Agregar a preguntas comunes si se repite
    if (!profile.commonQuestions.includes(query) && profile.commonQuestions.length < 20) {
      profile.commonQuestions.push(query)
    }

    this.updateProfile(profile)
  }

  private static categorizeQuery(query: string): string {
    const lowerQuery = query.toLowerCase()

    if (lowerQuery.includes("tiempo") || lowerQuery.includes("clima")) return "weather"
    if (lowerQuery.includes("música") || lowerQuery.includes("canción")) return "music"
    if (lowerQuery.includes("llamar") || lowerQuery.includes("teléfono")) return "calls"
    if (lowerQuery.includes("navegar") || lowerQuery.includes("ir a")) return "navigation"
    if (lowerQuery.includes("imagen") || lowerQuery.includes("generar")) return "images"
    if (lowerQuery.includes("qué") || lowerQuery.includes("cómo")) return "questions"

    return "general"
  }

  // 🧹 LIMPIAR MEMORIA
  static clearMemory(): void {
    if (typeof window === "undefined") return
    localStorage.removeItem(this.MEMORY_KEY)
    localStorage.removeItem(this.PROFILE_KEY)
    console.log("🧹 MEMORY CLEARED")
  }

  // 📈 OBTENER ESTADÍSTICAS
  static getStats() {
    const memories = this.getMemories()
    const profile = this.getUserProfile()

    return {
      totalMemories: memories.length,
      memoryTypes: memories.reduce(
        (acc, m) => {
          acc[m.type] = (acc[m.type] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      ),
      interactionPatterns: profile.interactionPatterns,
      commonQuestions: profile.commonQuestions.slice(0, 5),
      oldestMemory: memories[memories.length - 1]?.timestamp,
      newestMemory: memories[0]?.timestamp,
    }
  }
}
