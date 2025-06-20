"use client"

export interface ConversationMessage {
  id: string
  text: string
  type: "user" | "jarvis"
  timestamp: Date
  imageUrl?: string
  imagePrompt?: string
}

export interface Conversation {
  id: string
  title: string
  messages: ConversationMessage[]
  createdAt: Date
  updatedAt: Date
  context?: string // Para MCP - contexto acumulado
}

export class ConversationsDB {
  private static STORAGE_KEY = "jarvis_conversations"

  static getAll(): Conversation[] {
    if (typeof window === "undefined") return []
    try {
      const data = localStorage.getItem(this.STORAGE_KEY)
      const conversations = data ? JSON.parse(data) : []
      return conversations.map((conv: any) => ({
        ...conv,
        createdAt: new Date(conv.createdAt),
        updatedAt: new Date(conv.updatedAt),
        messages: conv.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })),
      }))
    } catch {
      return []
    }
  }

  static save(conversations: Conversation[]): void {
    if (typeof window === "undefined") return
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(conversations))
  }

  static create(title: string): Conversation {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      context: "",
    }

    const conversations = this.getAll()
    conversations.unshift(newConversation)
    this.save(conversations)

    console.log("💬 NEW CONVERSATION CREATED:", newConversation.title)
    return newConversation
  }

  static addMessage(conversationId: string, message: ConversationMessage): void {
    const conversations = this.getAll()
    const conversation = conversations.find((c) => c.id === conversationId)

    if (conversation) {
      conversation.messages.push(message)
      conversation.updatedAt = new Date()

      // 🧠 ACTUALIZAR CONTEXTO PARA MCP
      conversation.context = this.buildContext(conversation.messages)

      this.save(conversations)
      console.log("💬 MESSAGE ADDED TO CONVERSATION:", conversationId)
    }
  }

  static updateTitle(conversationId: string, newTitle: string): void {
    const conversations = this.getAll()
    const conversation = conversations.find((c) => c.id === conversationId)

    if (conversation) {
      conversation.title = newTitle
      conversation.updatedAt = new Date()
      this.save(conversations)
      console.log("💬 CONVERSATION TITLE UPDATED:", newTitle)
    }
  }

  static delete(conversationId: string): void {
    const conversations = this.getAll().filter((c) => c.id !== conversationId)
    this.save(conversations)
    console.log("💬 CONVERSATION DELETED:", conversationId)
  }

  static getById(conversationId: string): Conversation | null {
    return this.getAll().find((c) => c.id === conversationId) || null
  }

  // 🧠 CONSTRUIR CONTEXTO PARA MCP
  private static buildContext(messages: ConversationMessage[]): string {
    const recentMessages = messages.slice(-10) // Últimos 10 mensajes
    return recentMessages.map((msg) => `${msg.type === "user" ? "Usuario" : "JARVIS"}: ${msg.text}`).join("\n")
  }

  // 🧠 GENERAR TÍTULO AUTOMÁTICO BASADO EN CONTENIDO
  static generateAutoTitle(messages: ConversationMessage[]): string {
    if (messages.length === 0) return "Nueva conversación"

    const firstUserMessage = messages.find((m) => m.type === "user")?.text || ""

    // Extraer palabras clave
    const keywords = firstUserMessage
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(" ")
      .filter((word) => word.length > 3)
      .slice(0, 3)

    if (keywords.length > 0) {
      return keywords.join(" ").substring(0, 30) + "..."
    }

    return "Conversación " + new Date().toLocaleDateString()
  }
}
