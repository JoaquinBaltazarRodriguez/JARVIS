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

    // 🧠 SISTEMA PARA MODO INTELIGENTE
    let systemPrompt = `Eres JARVIS, el asistente personal inteligente de Tony Stark. 
    Siempre te diriges al usuario como "Señor" de manera respetuosa y formal.
    Eres sofisticado, inteligente, eficiente y ligeramente sarcástico cuando es apropiado.
    Respondes de manera concisa pero completa.
    Mantienes un tono profesional pero amigable.`

    if (intelligentMode) {
      systemPrompt += `
      
      MODO INTELIGENTE ACTIVADO:
      - Tienes acceso a capacidades avanzadas de IA
      - Puedes ayudar con programación, análisis técnico, resolución de problemas complejos
      - Proporciona explicaciones detalladas cuando sea necesario
      - Puedes generar código, analizar datos, resolver problemas matemáticos
      - Mantén siempre el tono de JARVIS pero con mayor profundidad técnica`
    }

    if (functionalMode) {
      systemPrompt += `
      
      MODO FUNCIONAL ACTIVADO:
      - Te enfocas en tareas administrativas y de gestión
      - Puedes ayudar con organización, planificación, gestión de correos
      - Proporciona respuestas orientadas a la acción
      - Sugiere pasos concretos para completar tareas
      - Mantén el tono de JARVIS pero más orientado a la eficiencia`
    }

    // 🖼️ DETECTAR SI ES UNA SOLICITUD DE IMAGEN
    const isImageRequest =
      message.toLowerCase().includes("genera") ||
      message.toLowerCase().includes("crear imagen") ||
      message.toLowerCase().includes("dibuja") ||
      message.toLowerCase().includes("imagen de") ||
      message.toLowerCase().includes("muestra") ||
      message.toLowerCase().includes("muéstrame")

    if (isImageRequest && intelligentMode) {
      try {
        console.log("🖼️ Generating image for:", message)

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
            imagePrompt: message,
          })
        }
      } catch (imageError) {
        console.error("❌ Error generating image:", imageError)
      }
    }

    // 🤖 GENERAR RESPUESTA DE TEXTO
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      prompt: message,
      maxTokens: 300,
    })

    console.log("✅ JARVIS response generated:", text)

    return NextResponse.json({
      success: true,
      response: text,
      hasImage: false,
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
