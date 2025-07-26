"use client"

import { CommandDetector, TimeUtils } from "./database"
import { getGenderTreatment } from "./utils"
import { ProfilesManager } from "./profilesManager"

export interface LocalCommandResponse {
  response: string
  action?: "call" | "navigate" | "spotify" | "time" | "weather" | "cancel"
  data?: any
}

export class LocalCommands {
  // 🎯 PROCESAR COMANDO LOCAL (SIN TOKENS)
  static processCommand(message: string, mode: "normal" | "functional"): LocalCommandResponse | null {
    // Obtener el perfil activo para usar el tratamiento adecuado según género
    const activeProfile = ProfilesManager.getActiveProfile();
    const treatment = getGenderTreatment(activeProfile?.gender);
    const lowerMessage = message.toLowerCase().trim()
    console.log("🔧 PROCESSING LOCAL COMMAND:", lowerMessage, "MODE:", mode)

    // ⏰ COMANDOS DE TIEMPO
    if (CommandDetector.isTimeCommand(lowerMessage)) {
      return {
        response: TimeUtils.getTimeResponse(),
        action: "time",
      }
    }

    // 📞 COMANDOS DE LLAMADA
    if (CommandDetector.isDirectCallCommand(lowerMessage)) {
      const contactName = CommandDetector.extractContactName(lowerMessage)
      return {
        response: `Buscando contacto: ${contactName}`,
        action: "call",
        data: { contactName },
      }
    }

    // 🗺️ COMANDOS DE NAVEGACIÓN
    if (CommandDetector.isNavigationCommand(lowerMessage)) {
      const destination = CommandDetector.extractDestination(lowerMessage)
      return {
        response: `Preparando navegación hacia: ${destination}`,
        action: "navigate",
        data: { destination },
      }
    }

    // 🎵 COMANDOS DE SPOTIFY
    if (CommandDetector.isSpotifyCommand(lowerMessage)) {
      return {
        response: `Abriendo reproductor de música, ${treatment}.`,
        action: "spotify",
      }
    }

    // ❌ COMANDOS DE CANCELACIÓN
    if (CommandDetector.isCancelCommand(lowerMessage)) {
      return {
        response: `Acción cancelada, ${treatment}.`,
        action: "cancel",
      }
    }

    // 🌤️ COMANDOS DE CLIMA (MODO FUNCIONAL)
    if (mode === "functional" && this.isWeatherCommand(lowerMessage)) {
      return {
        response: `Obteniendo información del clima, ${treatment}...`,
        action: "weather",
      }
    }

    // 🔧 COMANDOS ESPECÍFICOS DEL MODO FUNCIONAL
    if (mode === "functional") {
      if (lowerMessage.includes("correo") || lowerMessage.includes("email") || lowerMessage.includes("gmail")) {
        return {
          response: `Abriendo gestor de correos, ${treatment}.`,
        }
      }

      if (lowerMessage.includes("whatsapp") || lowerMessage.includes("mensajes")) {
        return {
          response: `Abriendo WhatsApp, ${treatment}.`,
        }
      }
    }

    // 🤖 RESPUESTAS PREDEFINIDAS PARA CONSULTAS GENERALES
    if (this.isGeneralQuery(lowerMessage)) {
      const suggestion =
        mode === "functional"
          ? "Para consultas libres, active el modo inteligente. En modo funcional puedo gestionar correos, WhatsApp y aplicaciones específicas."
          : "Para consultas libres, active el modo inteligente. En modo normal puedo ejecutar comandos como llamadas, navegación y música."

      return {
        response: `${treatment}, ${suggestion}`,
      }
    }

    return null
  }

  // 🌤️ DETECTAR COMANDOS DE CLIMA
  private static isWeatherCommand(text: string): boolean {
    const weatherKeywords = [
      "clima",
      "tiempo",
      "temperatura",
      "lluvia",
      "sol",
      "nublado",
      "pronóstico",
      "weather",
      "forecast",
    ]
    return weatherKeywords.some((keyword) => text.includes(keyword))
  }

  // 🤔 DETECTAR CONSULTAS GENERALES
  private static isGeneralQuery(text: string): boolean {
    const generalKeywords = [
      "qué es",
      "que es",
      "cómo",
      "como",
      "por qué",
      "por que",
      "explica",
      "dime",
      "cuál",
      "cual",
      "quién",
      "quien",
      "ayuda",
      "help",
      "información",
      "informacion",
    ]
    return generalKeywords.some((keyword) => text.includes(keyword)) && text.length > 10
  }

  // 📋 OBTENER COMANDOS DISPONIBLES
  static getAvailableCommands(mode: "normal" | "functional"): string[] {
    const baseCommands = [
      "¿Qué hora es?",
      "Llama a [contacto]",
      "Navegar a [lugar]",
      "Pon música / Reproduce [playlist]",
      "Cancelar acción",
      "Activar lector de pantalla (Activa el lector para usuarios con discapacidad visual)",
      "Apagar lector de pantalla (Desactiva el lector para volver a modo visual normal)",
    ]

    if (mode === "functional") {
      return [...baseCommands, "Revisar correos", "Abrir WhatsApp", "¿Cómo está el clima?", "Gestionar aplicaciones"]
    }

    return baseCommands
  }
}
