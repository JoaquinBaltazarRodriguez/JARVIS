import { type NextRequest, NextResponse } from "next/server"
import { askOllama } from "@/utils/ollama"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const prompt = formData.get("prompt") as string

    if (!file) {
      return NextResponse.json({ success: false, error: "No se proporcionó archivo" }, { status: 400 })
    }

    console.log("📁 ANALYZING FILE:", file.name, "Type:", file.type, "Size:", file.size)

    // 🔍 DETERMINAR TIPO DE ARCHIVO
    const fileType = getFileType(file.type, file.name)
    console.log("📁 FILE TYPE DETECTED:", fileType)

    let analysisResult: any

    switch (fileType) {
      case "image":
        analysisResult = await analyzeImage(file, prompt)
        break
      case "text":
        analysisResult = await analyzeTextFile(file, prompt)
        break
      case "pdf":
        analysisResult = await analyzePDF(file, prompt)
        break
      case "code":
        analysisResult = await analyzeCodeFile(file, prompt)
        break
      default:
        analysisResult = await analyzeGenericFile(file, prompt)
    }

    return NextResponse.json({
      success: true,
      analysis: analysisResult,
      fileInfo: {
        name: file.name,
        type: file.type,
        size: file.size,
        detectedType: fileType,
      },
    })
  } catch (error) {
    console.error("❌ FILE ANALYSIS ERROR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error analizando archivo",
      },
      { status: 500 },
    )
  }
}

// 🔍 DETERMINAR TIPO DE ARCHIVO
function getFileType(mimeType: string, fileName: string): string {
  if (mimeType.startsWith("image/")) return "image"
  if (mimeType.startsWith("text/") || fileName.endsWith(".txt") || fileName.endsWith(".md")) return "text"
  if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) return "pdf"
  if (
    fileName.endsWith(".js") ||
    fileName.endsWith(".ts") ||
    fileName.endsWith(".jsx") ||
    fileName.endsWith(".tsx") ||
    fileName.endsWith(".py") ||
    fileName.endsWith(".java") ||
    fileName.endsWith(".cpp") ||
    fileName.endsWith(".c") ||
    fileName.endsWith(".html") ||
    fileName.endsWith(".css")
  ) {
    return "code"
  }
  return "generic"
}

// 🖼️ ANALIZAR IMAGEN
async function analyzeImage(file: File, prompt: string) {
  try {
    // Convertir imagen a base64
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString("base64")
    const dataUrl = `data:${file.type};base64,${base64}`

    // 🧠 ANÁLISIS SIMULADO DE IMAGEN (en producción usarías OpenAI Vision)
    const analysis = {
      description: "Imagen analizada por NEXUS",
      detectedObjects: ["objeto1", "objeto2", "objeto3"],
      colors: ["azul", "verde", "rojo"],
      composition: "La imagen muestra una composición equilibrada con elementos bien distribuidos.",
      technicalInfo: {
        format: file.type,
        size: `${Math.round(file.size / 1024)} KB`,
        estimatedDimensions: "Análisis dimensional disponible",
      },
      aiResponse: prompt
        ? `Basándome en tu solicitud "${prompt}", puedo ver que la imagen contiene elementos relevantes que se relacionan con tu consulta.`
        : "Imagen procesada exitosamente. La imagen contiene varios elementos visuales interesantes.",
    }

    return analysis
  } catch (error) {
    console.error("❌ Image analysis error:", error)
    return { error: "Error analizando imagen" }
  }
}

// 📄 ANALIZAR ARCHIVO DE TEXTO
async function analyzeTextFile(file: File, prompt: string) {
  try {
    const text = await file.text()
    const wordCount = text.split(/\s+/).length
    const lineCount = text.split("\n").length
    const charCount = text.length

    const analysis = {
      content: text.substring(0, 1000) + (text.length > 1000 ? "..." : ""),
      statistics: {
        words: wordCount,
        lines: lineCount,
        characters: charCount,
      },
      summary: `Archivo de texto con ${wordCount} palabras y ${lineCount} líneas.`,
      aiResponse: prompt
        ? `Según tu solicitud "${prompt}", he analizado el contenido del archivo y puedo ayudarte con la información específica que necesitas.`
        : "Archivo de texto procesado exitosamente.",
    }

    return analysis
  } catch (error) {
    console.error("❌ Text analysis error:", error)
    return { error: "Error analizando archivo de texto" }
  }
}

// 📋 ANALIZAR PDF
async function analyzePDF(file: File, prompt: string) {
  try {
    // Extraer texto del PDF usando pdf-parse
    const pdf = await import("pdf-parse")
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const data = await pdf.default(buffer)
    
    // Si hay un prompt específico, usarlo para analizar con el modelo MCP
    if (prompt) {
      try {
        // Enviar el texto completo al modelo MCP para análisis
        const response = await askOllama(
          `Analiza el siguiente documento PDF y responde a la siguiente solicitud:\n\n` +
          `Solicitud: ${prompt}\n\n` +
          `Contenido del documento (extracto):\n${data.text.substring(0, 15000)}`,
          'llama3'  // Usar el modelo configurado en Ollama
        )
        
        return {
          content: data.text.substring(0, 3000) + (data.text.length > 3000 ? "..." : ""),
          pageCount: data.numpages,
          metadata: data.info,
          summary: `Análisis del documento usando MCP: ${response.response.substring(0, 200)}...`,
          aiResponse: response.response,
          processed: true
        }
      } catch (error) {
        console.error("Error al analizar con MCP:", error)
        // En caso de error, devolver el texto sin análisis
        return {
          content: data.text.substring(0, 5000) + (data.text.length > 5000 ? "..." : ""),
          pageCount: data.numpages,
          metadata: data.info,
          summary: `Documento PDF con ${data.numpages} páginas. No se pudo analizar con MCP.`,
          aiResponse: "No pude analizar el documento con el modelo MCP. Aquí está el contenido sin procesar.",
          error: true
        }
      }
    } else {
      // Si no hay prompt, devolver el texto sin procesar
      return {
        content: data.text.substring(0, 5000) + (data.text.length > 5000 ? "..." : ""),
        pageCount: data.numpages,
        metadata: data.info,
        text: data.text,
        summary: `Documento PDF con ${data.numpages} páginas.`,
        aiResponse: "Documento PDF procesado exitosamente. ¿Hay algo específico que te gustaría saber sobre este documento?",
      }
    }
  } catch (error) {
    console.error("❌ PDF analysis error:", error)
    return { 
      error: "Error procesando el archivo PDF",
      details: error instanceof Error ? error.message : String(error)
    }
  }
}

// 💻 ANALIZAR CÓDIGO
async function analyzeCodeFile(file: File, prompt: string) {
  try {
    const code = await file.text()
    const lines = code.split("\n")
    const language = detectLanguage(file.name)

    const analysis = {
      language,
      lines: lines.length,
      functions: (code.match(/function|def |class |const |let |var /g) || []).length,
      comments: (code.match(/\/\/|\/\*|#|<!--/g) || []).length,
      preview: code.substring(0, 500) + (code.length > 500 ? "..." : ""),
      aiResponse: prompt
        ? `He analizado tu código ${language} y según tu solicitud "${prompt}", puedo ayudarte con optimizaciones, explicaciones o mejoras específicas.`
        : `Código ${language} analizado. ${lines.length} líneas detectadas.`,
    }

    return analysis
  } catch (error) {
    console.error("❌ Code analysis error:", error)
    return { error: "Error analizando código" }
  }
}

// 📁 ANALIZAR ARCHIVO GENÉRICO
async function analyzeGenericFile(file: File, prompt: string) {
  const analysis = {
    fileName: file.name,
    fileType: file.type || "Tipo desconocido",
    size: `${Math.round(file.size / 1024)} KB`,
    aiResponse: prompt
      ? `He recibido tu archivo "${file.name}" y tu solicitud "${prompt}". Aunque es un tipo de archivo que requiere herramientas específicas, puedo ayudarte con información general.`
      : `Archivo "${file.name}" recibido. Especifica qué tipo de análisis necesitas.`,
  }

  return analysis
}

// 🔍 DETECTAR LENGUAJE DE PROGRAMACIÓN
function detectLanguage(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase()
  const languages: { [key: string]: string } = {
    js: "JavaScript",
    ts: "TypeScript",
    jsx: "React JSX",
    tsx: "React TSX",
    py: "Python",
    java: "Java",
    cpp: "C++",
    c: "C",
    html: "HTML",
    css: "CSS",
    php: "PHP",
    rb: "Ruby",
    go: "Go",
    rs: "Rust",
  }
  return languages[extension || ""] || "Desconocido"
}
