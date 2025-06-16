import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()
    console.log("🌐 API RECEIVED MESSAGE:", message)

    // 🖼️ DETECTAR SOLICITUDES DE IMÁGENES
    const imageKeywords = [
      "muestra",
      "muéstrame",
      "imagen",
      "foto",
      "picture",
      "mostrar",
      "ver",
      "enseña",
      "enséñame",
      "busca una imagen",
      "busca una foto",
    ]

    const messageText = message.toLowerCase()
    const isImageRequest = imageKeywords.some((keyword) => messageText.includes(keyword))

    if (isImageRequest) {
      console.log("🖼️ IMAGE REQUEST DETECTED")

      // Extraer qué imagen buscar
      let imagePrompt = message
      imageKeywords.forEach((keyword) => {
        imagePrompt = imagePrompt.replace(new RegExp(keyword, "gi"), "").trim()
      })

      // Limpiar palabras comunes
      imagePrompt = imagePrompt.replace(/^(de|del|la|el|un|una|los|las)\s+/i, "").trim()

      console.log("🔍 EXTRACTED IMAGE PROMPT:", imagePrompt)

      try {
        const imageResponse = await fetch(`${request.nextUrl.origin}/api/generate-image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: imagePrompt }),
        })

        const imageData = await imageResponse.json()

        if (imageData.success) {
          return NextResponse.json({
            response: `Aquí tienes una imagen de ${imagePrompt}, Joaquín.`,
            success: true,
            hasImage: true,
            imageUrl: imageData.imageUrl,
            imagePrompt: imagePrompt,
          })
        }
      } catch (imageError) {
        console.error("❌ IMAGE GENERATION FAILED:", imageError)
        // Continuar con respuesta normal si falla la imagen
      }
    }

    // 🤖 RESPUESTA NORMAL CON CHATGPT
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error("❌ NO OPENAI_API_KEY FOUND")
      return NextResponse.json(
        { response: "Error de configuración: falta la clave de API de OpenAI." },
        { status: 500 },
      )
    }

    console.log("🤖 CALLING OPENAI API...")

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      system: `Eres JARVIS, el asistente personal inteligente de Joaquín, inspirado en Iron Man. 
      
      Características:
      - Eres profesional, inteligente y eficiente
      - Respondes de forma concisa pero completa (máximo 2-3 oraciones)
      - Siempre te diriges a Joaquín con respeto
      - Puedes ayudar con cualquier tema
      - Ocasionalmente puedes ser ingenioso como el JARVIS original
      - Eres útil y directo en tus respuestas
      
      Si te piden mostrar imágenes, explica que puedes buscar imágenes usando comandos como "muéstrame una imagen de..."
      
      Responde en español de manera natural y útil.`,
      prompt: `Joaquín te pregunta: "${message}"`,
      maxTokens: 150,
    })

    console.log("✅ OPENAI RESPONSE SUCCESS:", text)

    return NextResponse.json({
      response: text,
      success: true,
      hasImage: false,
    })
  } catch (error) {
    console.error("❌ API ERROR COMPLETE:", error)

    let errorMessage = "Error técnico desconocido."
    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        errorMessage = "Error de autenticación con OpenAI."
      } else if (error.message.includes("quota")) {
        errorMessage = "Límite de uso de OpenAI alcanzado."
      } else if (error.message.includes("network")) {
        errorMessage = "Error de conexión."
      } else {
        errorMessage = `Error: ${error.message.substring(0, 100)}`
      }
    }

    const fallbackResponse = `Lo siento Joaquín, ${errorMessage} ¿Puedes intentar de nuevo?`

    return NextResponse.json(
      {
        response: fallbackResponse,
        success: false,
        hasImage: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
