import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    const { message, conversationContext, intelligentMode, functionalMode } = await request.json()

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    console.log("🧠 MCP Processing:", { message, intelligentMode, functionalMode })

    // 🚫 BLOQUEAR USO DE TOKENS FUERA DEL MODO INTELIGENTE
    if (!intelligentMode) {
      const blockedMessage = functionalMode
        ? "Señor, para consultas libres debe activar el modo inteligente. En modo funcional solo ejecuto comandos específicos como clima, correos y aplicaciones."
        : "Señor, para consultas libres debe activar el modo inteligente. En modo normal solo ejecuto comandos básicos como llamadas, navegación y música."

      return NextResponse.json({
        success: true,
        response: blockedMessage,
        hasImage: false,
        blocked: true,
      })
    }

    // 🌤️ DETECTAR COMANDOS DE CLIMA
    const isWeatherQuery =
      message.toLowerCase().includes("clima") ||
      message.toLowerCase().includes("tiempo") ||
      message.toLowerCase().includes("temperatura") ||
      message.toLowerCase().includes("lluvia") ||
      message.toLowerCase().includes("sol") ||
      message.toLowerCase().includes("pronóstico")

    if (isWeatherQuery) {
      try {
        // Importar dinámicamente el WeatherMCP
        const { WeatherMCP } = await import("@/lib/weatherMCP")
        const weatherResponse = await WeatherMCP.generateWeatherResponse(message)

        return NextResponse.json({
          success: true,
          response: weatherResponse,
          hasImage: false,
          weatherData: true,
        })
      } catch (error) {
        console.error("❌ Weather MCP error:", error)

        // Fallback simple
        const fallbackResponse =
          "Señor, mis sensores meteorológicos están experimentando interferencias. Según los últimos datos disponibles, las condiciones parecen estables."

        return NextResponse.json({
          success: true,
          response: fallbackResponse,
          hasImage: false,
          weatherData: false,
        })
      }
    }

    // 🎵 DETECTAR COMANDOS DE SPOTIFY
    const isSpotifyQuery =
      message.toLowerCase().includes("música") ||
      message.toLowerCase().includes("reproduce") ||
      message.toLowerCase().includes("playlist")

    if (isSpotifyQuery) {
      // Buscar playlist mencionada
      const playlistKeywords = ["80", "rock", "pop", "jazz", "clásica", "electrónica"]
      const foundKeyword = playlistKeywords.find((keyword) => message.toLowerCase().includes(keyword))

      if (foundKeyword) {
        const spotifyAction = {
          action: "play",
          playlist: {
            name: `Música de los ${foundKeyword}`,
            spotifyUrl: `https://open.spotify.com/playlist/example-${foundKeyword}`,
            uri: `spotify:playlist:example-${foundKeyword}`,
          },
        }

        return NextResponse.json({
          success: true,
          response: `Reproduciendo ${spotifyAction.playlist.name}, Señor. Iniciando reproductor...`,
          hasImage: false,
          spotifyAction,
        })
      }
    }

    // 🖼️ DETECTAR SOLICITUDES DE IMAGEN
    const isImageRequest =
      message.toLowerCase().includes("genera") ||
      message.toLowerCase().includes("imagen") ||
      message.toLowerCase().includes("dibuja") ||
      message.toLowerCase().includes("crea")

    if (isImageRequest) {
      try {
        const imageResponse = await fetch(`${request.nextUrl.origin}/api/generate-image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: message }),
        })

        const imageData = await imageResponse.json()

        if (imageData.success) {
          return NextResponse.json({
            success: true,
            response: "Imagen generada exitosamente, Señor. La imagen se muestra a continuación.",
            hasImage: true,
            imageUrl: imageData.imageUrl,
            imagePrompt: imageData.prompt || message,
          })
        }
      } catch (error) {
        console.error("❌ Image generation error:", error)
      }
    }

    // 🤖 GENERAR RESPUESTA CON OPENAI
    const systemPrompt = `Eres JARVIS, el asistente personal inteligente de Tony Stark.
    Siempre te diriges al usuario como "Señor" de manera respetuosa y formal.
    Eres sofisticado, inteligente, eficiente y ligeramente sarcástico cuando es apropiado.
    
    MODO INTELIGENTE ACTIVADO:
    - Tienes acceso a capacidades avanzadas de IA
    - Puedes ayudar con programación, análisis técnico, resolución de problemas complejos
    - Proporciona explicaciones detalladas cuando sea necesario
    - Mantén siempre el tono de JARVIS pero con mayor profundidad técnica
    
    Contexto de conversación: ${conversationContext || "Nueva conversación"}`

    const { text, usage } = await generateText({
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      prompt: message,
      maxTokens: 300,
    })

    console.log("✅ MCP Response generated:", text)
    console.log("💰 Tokens used:", usage)

    return NextResponse.json({
      success: true,
      response: text,
      hasImage: false,
      tokensUsed: usage?.totalTokens || 0,
    })
  } catch (error) {
    console.error("❌ MCP Error:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Error en el sistema MCP. Inténtelo de nuevo.",
      },
      { status: 500 },
    )
  }
}
