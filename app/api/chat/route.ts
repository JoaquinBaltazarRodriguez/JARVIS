import { askOllama } from '@/utils/ollama';
import { findFuzzyAnswer, saveQA, isAmbiguousQuestion, setContext, getContext } from '../../../utils/jarvisMemory';

// Consulta resumen de Wikipedia para un término
async function fetchWikipediaSummary(query: string): Promise<string | null> {
  try {
    const title = encodeURIComponent(query.trim().replace(/\s+/g, '_'));
    const url = `https://es.wikipedia.org/api/rest_v1/page/summary/${title}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.extract && typeof data.extract === 'string' && data.extract.length > 0) {
      return data.extract.length > 350 ? data.extract.slice(0, 350) + '...' : data.extract;
    }
    return null;
  } catch (e) {
    return null;
  }
}

import { type NextRequest, NextResponse } from "next/server"
import fs from 'fs';
import path from 'path';

// --- Memoria de contexto corto ---
const CONTEXT_FILE = path.join(process.cwd(), 'context.json');
function getContext() {
  if (!fs.existsSync(CONTEXT_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(CONTEXT_FILE, 'utf-8')) || null;
  } catch { return null; }
}
function setContext(topic: string, lastQ?: string, lastA?: string) {
  const ctx = { lastTopic: topic };
  if (lastQ) ctx.lastQ = lastQ;
  if (lastA) ctx.lastA = lastA;
  fs.writeFileSync(CONTEXT_FILE, JSON.stringify(ctx, null, 2));
}

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

    // 🤖 GENERAR RESPUESTA DE TEXTO USANDO MEMORIA LOCAL Y OLLAMA
    // --- Manejo de contexto corto ---
    let contextData = getContext();
    let processedMessage = message;
    let contextPrompt = '';
    if (isAmbiguousQuestion(message) && contextData && contextData.lastTopic && contextData.lastQ && contextData.lastA) {
      // Construye un pequeño historial para el modelo
      contextPrompt = `Conversación previa:\nUsuario: ${contextData.lastQ}\nJarvis: ${contextData.lastA}\nUsuario: ${message}\n`;
      processedMessage = `${message} (Se refiere a: ${contextData.lastTopic})`;
      console.log("[CTX] Pregunta ambigua detectada. Se reconstruye como:", processedMessage);
    }

    // Buscar primero en memoria JSON con fuzzy
    let responseText = findFuzzyAnswer(processedMessage);
    console.log("Resultado memoria fuzzy:", responseText);

    if (!responseText) {
      // Prompt aún más estricto para respuestas cortas y directas, y forzando relación con el modelo/tema
      let concisePrompt = '';
      if (contextPrompt && contextData && contextData.lastTopic) {
        concisePrompt = `${contextPrompt}Responde SOLO sobre el modelo o tema "${contextData.lastTopic}". No cambies de tema. Sé muy breve, preciso y profesional. NO uses más de 2 frases. Sé directo y sin rodeos.`;
      } else {
        concisePrompt = `Responde de forma muy breve, precisa y profesional. NO uses más de 2 frases. Sé directo y sin rodeos.\nPregunta: ${processedMessage}`;
      }
      console.log("🧠 Consultando modelo local con prompt:", concisePrompt);
      responseText = await askOllama(concisePrompt, 'phi3');
      console.log("Respuesta modelo local (original):", responseText);
      // Recorta la respuesta a máximo 2 frases (usando punto o salto de línea)
      if (responseText) {
        const frases = responseText.split(/(?<=[.!?])\s+/).filter(Boolean);
        responseText = frases.slice(0, 2).join(' ');
      }
      // Solo guardar en memoria si la pregunta NO es ambigua
      if (!isAmbiguousQuestion(message)) {
        saveQA(processedMessage, responseText);
        console.log("Respuesta guardada en memoria JSON.");
      } else {
        console.log("[MEM] Respuesta NO guardada por ambigüedad de pregunta.");
      }
      // Si sigue sin respuesta válida, busca en Wikipedia
      if (!responseText || responseText.toLowerCase().includes('no tengo información') || responseText.length < 15) {
        const wikiSummary = await fetchWikipediaSummary(processedMessage);
        if (wikiSummary) {
          responseText = wikiSummary;
          // NO guardamos en memoria hasta que el usuario lo verifique
          console.log('[WIKI] Mostrando información de Wikipedia como fallback.');
        }
      }
    }

    // Si la pregunta NO es ambigua y parece referirse a un modelo, actualiza el contexto
    if (!isAmbiguousQuestion(message)) {
      // Heurística: si el mensaje menciona "modelo", "auto", "vehículo", "coche", "Citroën", "Ford", "Ranger", etc.
      const topicMatch = message.match(/(citro[eé]n\s*\w+|ford\s*\w+|ranger|modelo\s*\w+|auto\s*\w+|veh[íi]culo\s*\w+|coche\s*\w+)/i);
      if (topicMatch) {
        setContext(topicMatch[0], message, responseText);
        console.log("[CTX] Contexto actualizado a:", topicMatch[0]);
      }
    }

    return NextResponse.json({
      success: true,
      response: responseText,
      hasImage: false,
    });
  } catch (error) {
    console.error("❌ Error in chat API:", error);

    let errorMessage = "Lo siento, Señor. ";
    if (error instanceof Error) {
      errorMessage += "Detalles técnicos: " + error.message;
    } else {
      errorMessage += "Hubo un error inesperado.";
    }
    errorMessage += " Por favor, inténtelo de nuevo.";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
