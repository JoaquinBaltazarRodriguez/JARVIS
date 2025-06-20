import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    const { message, intelligentMode, functionalMode } = await request.json()

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    console.log("🤖 Processing message:", message)
    console.log("🧠 Intelligent mode:", intelligentMode)
    console.log("🔧 Functional mode:", functionalMode)

    // 🚫 BLOQUEAR USO DE TOKENS FUERA DEL MODO INTELIGENTE
    if (!intelligentMode) {
      console.log("🚫 BLOCKED: Trying to use OpenAI outside intelligent mode")

      const blockedMessage = functionalMode
        ? "Señor, para consultas libres y generación de imágenes debe activar el modo inteligente. En modo funcional solo puedo ejecutar comandos específicos como gestionar correos, WhatsApp y aplicaciones."
        : "Señor, para consultas libres y generación de imágenes debe activar el modo inteligente. En modo normal solo puedo ejecutar comandos como llamadas, navegación y música."

      return NextResponse.json({
        success: true,
        response: blockedMessage,
        hasImage: false,
        blocked: true,
      })
    }

    // 🔑 VERIFICAR API KEY
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        success: true,
        response: "Lo siento, Señor. No tengo acceso a la API de OpenAI. Por favor, configure la clave API.",
        hasImage: false,
      })
    }

    // 🧠 SISTEMA PARA MODO INTELIGENTE
    const systemPrompt = `Eres JARVIS, el asistente personal inteligente de Tony Stark. 
    Siempre te diriges al usuario como "Señor" de manera respetuosa y formal.
    Eres sofisticado, inteligente, eficiente y ligeramente sarcástico cuando es apropiado.
    Respondes de manera concisa pero completa.
    Mantienes un tono profesional pero amigable.
    
    MODO INTELIGENTE ACTIVADO:
    - Tienes acceso a capacidades avanzadas de IA
    - Puedes ayudar con programación, análisis técnico, resolución de problemas complejos
    - Proporciona explicaciones detalladas cuando sea necesario
    - Puedes generar código, analizar datos, resolver problemas matemáticos
    - Mantén siempre el tono de JARVIS pero con mayor profundidad técnica`

    // 🖼️ DETECTAR SI ES UNA SOLICITUD DE IMAGEN - MEJORADO
    const lowerMessage = message.toLowerCase()
    const isImageRequest =
      lowerMessage.includes("genera") ||
      lowerMessage.includes("generar") ||
      lowerMessage.includes("crear imagen") ||
      lowerMessage.includes("crea imagen") ||
      lowerMessage.includes("crea una imagen") ||
      lowerMessage.includes("dibuja") ||
      lowerMessage.includes("dibujar") ||
      lowerMessage.includes("imagen de") ||
      lowerMessage.includes("imagen del") ||
      lowerMessage.includes("imagen con") ||
      lowerMessage.includes("muestra") ||
      lowerMessage.includes("muéstrame") ||
      lowerMessage.includes("mostrar") ||
      lowerMessage.includes("hacer imagen") ||
      lowerMessage.includes("haz imagen") ||
      lowerMessage.includes("diseña") ||
      lowerMessage.includes("diseñar") ||
      (lowerMessage.includes("imagen") && (lowerMessage.includes("de") || lowerMessage.includes("con")))

    console.log("🖼️ IMAGE REQUEST DETECTED:", isImageRequest, "for message:", message)

    if (isImageRequest) {
      try {
        console.log("🖼️ Generating image for:", message)

        const imageResponse = await fetch(`${request.nextUrl.origin}/api/generate-image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: message }),
        })

        console.log("🖼️ IMAGE API RESPONSE STATUS:", imageResponse.status)
        const imageData = await imageResponse.json()
        console.log("🖼️ IMAGE API RESPONSE DATA:", imageData)

        if (imageData.success) {
          const responseMessage = imageData.fallback
            ? `${imageData.message}, Señor. Aquí tiene una imagen de referencia.`
            : "Imagen generada exitosamente con DALL-E, Señor. La imagen se muestra a continuación."

          return NextResponse.json({
            success: true,
            response: responseMessage,
            hasImage: true,
            imageUrl: imageData.imageUrl,
            imagePrompt: imageData.prompt || message,
            canDownload: true,
          })
        } else {
          console.error("❌ Image generation failed:", imageData.error)
          return NextResponse.json({
            success: true,
            response: "Lo siento, Señor. Hubo un problema generando la imagen. Inténtelo de nuevo.",
            hasImage: false,
          })
        }
      } catch (imageError) {
        console.error("❌ Error generating image:", imageError)

        return NextResponse.json({
          success: true,
          response: "Lo siento, Señor. Hubo un problema generando la imagen. Por favor, inténtelo de nuevo.",
          hasImage: false,
        })
      }
    }

    // 🤖 GENERAR RESPUESTA DE TEXTO
    console.log("💰 USING OPENAI TOKENS - INTELLIGENT MODE ONLY")

    const { text, usage } = await generateText({
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      prompt: message,
      maxTokens: 300,
    })

    console.log("✅ JARVIS response generated:", text)
    console.log("💰 TOKENS USED:", usage)

    // 📊 REGISTRAR USO DE TOKENS (si hay información de usage)
    if (usage && usage.totalTokens) {
      // Aquí registrarías el uso real, pero por ahora solo logueamos
      console.log("💰 REAL TOKEN USAGE:", {
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
      })
    }

    return NextResponse.json({
      success: true,
      response: text,
      hasImage: false,
      tokensUsed: usage?.totalTokens || 0,
    })
  } catch (error) {
    console.error("❌ Error in chat API:", error)

    let errorMessage = "Lo siento, Señor. "
    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        errorMessage += "Hay un problema con la configuración de la API."
      } else if (error.message.includes("quota")) {
        errorMessage += "Se ha excedido el límite de uso de la API."
      } else if (error.message.includes("network")) {
        errorMessage += "Hay un problema de conexión."
      } else {
        errorMessage += "Hubo un error técnico."
      }
    } else {
      errorMessage += "Hubo un error inesperado."
    }
    errorMessage += " Por favor, inténtelo de nuevo."

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 },
    )
  }
}
