import { type NextRequest, NextResponse } from "next/server"
import { addMCPEntry, findBestMatch } from "@/utils/mcpMemory"
import { askOllama } from "@/utils/ollama"
import axios from "axios"
// import { generateText } from "ai"
// import { openai } from "@ai-sdk/openai"

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

    // 🧠 MCP LOGIC: 1. Buscar en memoria MCP
    const memoryMatch = findBestMatch(message, 0.7);
    if (memoryMatch && memoryMatch.answer) {
      return NextResponse.json({
        success: true,
        response: limitSentences(memoryMatch.answer, 3),
        hasImage: false,
        source: "memory",
      });
    }

    // 🤖 2. Consultar modelo local (Ollama)
    try {
      const ollamaResult = await askOllama(message);
      if (ollamaResult?.response) {
        const concise = limitSentences(ollamaResult.response, 3);
        addMCPEntry(message, conversationContext || null, concise);
        return NextResponse.json({
          success: true,
          response: concise,
          hasImage: ollamaResult.hasImage || false,
          imageUrl: ollamaResult.imageUrl,
          imagePrompt: ollamaResult.imagePrompt || message,
          source: "ollama",
        });
      }
    } catch (err) {
      console.error("Ollama error:", err);
    }

    // 🌐 3. Consultar Wikipedia como fuente externa
    try {
      const wikiSummary = await getWikipediaSummary(message);
      if (wikiSummary) {
        const concise = limitSentences(wikiSummary, 3);
        addMCPEntry(message, conversationContext || null, concise);
        return NextResponse.json({
          success: true,
          response: concise,
          hasImage: false,
          source: "wikipedia",
        });
      }
    } catch (err) {
      console.error("Wikipedia error:", err);
    }

    // (Opcional) 4. Fallback a OpenAI (comentado, dejar para futuro)
    /*
    try {
      const systemPrompt = `Eres JARVIS, el asistente personal inteligente de Tony Stark.\nSiempre te diriges al usuario como \"Señor\" de manera respetuosa y formal.\nEres sofisticado, inteligente, eficiente y ligeramente sarcástico cuando es apropiado.\n\nMODO INTELIGENTE ACTIVADO:\n- Tienes acceso a capacidades avanzadas de IA\n- Puedes ayudar con programación, análisis técnico, resolución de problemas complejos\n- Proporciona explicaciones detalladas cuando sea necesario\n- Mantén siempre el tono de JARVIS pero con mayor profundidad técnica\n\nContexto de conversación: ${conversationContext || "Nueva conversación"}`;
      const { text } = await generateText({
        model: openai("gpt-4o-mini"),
        system: systemPrompt,
        prompt: message,
        maxTokens: 300,
      });
      const concise = limitSentences(text, 3);
      addMCPEntry(message, conversationContext || null, concise);
      return NextResponse.json({
        success: true,
        response: concise,
        hasImage: false,
        source: "openai",
      });
    } catch (err) {
      console.error("OpenAI error:", err);
    }
    */

    // ❌ Si todo falla, respuesta por defecto
    addMCPEntry(message, conversationContext || null, null);
    return NextResponse.json({
      success: true,
      response: "Señor, no he podido obtener una respuesta precisa en este momento. ¿Desea que lo intente de otra manera?",
      hasImage: false,
      source: "none",
    });

// --- Utilidades internas ---

function limitSentences(text: string, maxSentences = 3): string {
  if (!text) return "";
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  return sentences.slice(0, maxSentences).join(" ").trim();
}

async function getWikipediaSummary(query: string): Promise<string | null> {
  try {
    const apiUrl = `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
    const { data } = await axios.get(apiUrl);
    if (data && data.extract) {
      return data.extract;
    }
    return null;
  } catch (err) {
    return null;
  }
}

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
