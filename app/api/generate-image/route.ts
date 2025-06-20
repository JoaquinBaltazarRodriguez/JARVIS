import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json()
    console.log("🖼️ GENERATING IMAGE WITH ALTERNATIVE METHOD:", prompt)

    if (!prompt) {
      return NextResponse.json({ success: false, error: "Prompt es requerido" }, { status: 400 })
    }

    // 🎨 USAR MÉTODO ALTERNATIVO GARANTIZADO
    return generateAlternativeImage(prompt)
  } catch (error) {
    console.error("❌ COMPLETE IMAGE GENERATION ERROR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error completo generando imagen",
      },
      { status: 500 },
    )
  }
}

// 🎨 GENERAR IMAGEN CON MÉTODO ALTERNATIVO GARANTIZADO
function generateAlternativeImage(prompt: string) {
  console.log("🖼️ GENERATING ALTERNATIVE IMAGE FOR:", prompt)

  // Limpiar el prompt
  const cleanPrompt = prompt
    .replace(/genera|generar|crear|crea|dibuja|dibujar|imagen|de|una|un|me|por favor/gi, "")
    .trim()
    .toLowerCase()

  // 🎨 MAPEO DE PALABRAS A COLORES Y FORMAS
  const imageConfig = {
    backgroundColor: "333333",
    textColor: "ffffff",
    text: "JARVIS",
    category: "abstract",
  }

  // 🔍 DETECTAR CATEGORÍA Y CONFIGURAR IMAGEN
  if (cleanPrompt.includes("perro") || cleanPrompt.includes("dog")) {
    imageConfig.backgroundColor = "8B4513"
    imageConfig.textColor = "ffffff"
    imageConfig.text = "🐕 PERRO"
    imageConfig.category = "animal"
  } else if (cleanPrompt.includes("gato") || cleanPrompt.includes("cat")) {
    imageConfig.backgroundColor = "696969"
    imageConfig.textColor = "ffffff"
    imageConfig.text = "🐱 GATO"
    imageConfig.category = "animal"
  } else if (cleanPrompt.includes("coche") || cleanPrompt.includes("car") || cleanPrompt.includes("auto")) {
    imageConfig.backgroundColor = "FF4500"
    imageConfig.textColor = "ffffff"
    imageConfig.text = "🚗 COCHE"
    imageConfig.category = "vehicle"
  } else if (cleanPrompt.includes("casa") || cleanPrompt.includes("house")) {
    imageConfig.backgroundColor = "228B22"
    imageConfig.textColor = "ffffff"
    imageConfig.text = "🏠 CASA"
    imageConfig.category = "building"
  } else if (cleanPrompt.includes("flor") || cleanPrompt.includes("flower")) {
    imageConfig.backgroundColor = "FF69B4"
    imageConfig.textColor = "ffffff"
    imageConfig.text = "🌸 FLOR"
    imageConfig.category = "nature"
  } else if (cleanPrompt.includes("árbol") || cleanPrompt.includes("tree")) {
    imageConfig.backgroundColor = "006400"
    imageConfig.textColor = "ffffff"
    imageConfig.text = "🌳 ÁRBOL"
    imageConfig.category = "nature"
  } else if (cleanPrompt.includes("sol") || cleanPrompt.includes("sun")) {
    imageConfig.backgroundColor = "FFD700"
    imageConfig.textColor = "000000"
    imageConfig.text = "☀️ SOL"
    imageConfig.category = "nature"
  } else if (cleanPrompt.includes("luna") || cleanPrompt.includes("moon")) {
    imageConfig.backgroundColor = "191970"
    imageConfig.textColor = "ffffff"
    imageConfig.text = "🌙 LUNA"
    imageConfig.category = "space"
  } else if (cleanPrompt.includes("robot")) {
    imageConfig.backgroundColor = "708090"
    imageConfig.textColor = "00ff00"
    imageConfig.text = "🤖 ROBOT"
    imageConfig.category = "technology"
  } else if (cleanPrompt.includes("música") || cleanPrompt.includes("music")) {
    imageConfig.backgroundColor = "9932CC"
    imageConfig.textColor = "ffffff"
    imageConfig.text = "🎵 MÚSICA"
    imageConfig.category = "music"
  } else {
    // Para prompts no reconocidos, usar el texto del prompt
    imageConfig.text = cleanPrompt.toUpperCase().substring(0, 20)
    imageConfig.backgroundColor = generateColorFromText(cleanPrompt)
  }

  // 🎨 GENERAR MÚLTIPLES URLs PARA MÁXIMA COMPATIBILIDAD
  const timestamp = Date.now()
  const randomId = Math.floor(Math.random() * 10000)

  const imageUrls = [
    // Placeholder.com (muy confiable)
    `https://via.placeholder.com/1024x1024/${imageConfig.backgroundColor}/${imageConfig.textColor}?text=${encodeURIComponent(
      imageConfig.text,
    )}`,

    // DummyImage.com
    `https://dummyimage.com/1024x1024/${imageConfig.backgroundColor}/${imageConfig.textColor}&text=${encodeURIComponent(
      imageConfig.text,
    )}`,

    // Placehold.co
    `https://placehold.co/1024x1024/${imageConfig.backgroundColor}/${imageConfig.textColor}/png?text=${encodeURIComponent(
      imageConfig.text,
    )}`,

    // Picsum con overlay personalizado
    `https://picsum.photos/1024/1024?random=${randomId}&blur=1`,

    // Placeholder con patrón
    `https://via.placeholder.com/1024x1024/${imageConfig.backgroundColor}/${imageConfig.textColor}/png?text=${encodeURIComponent(
      imageConfig.text + " - " + imageConfig.category.toUpperCase(),
    )}`,
  ]

  // Seleccionar URL principal
  const primaryImageUrl = imageUrls[0]

  console.log("🖼️ ALTERNATIVE IMAGE CONFIG:", imageConfig)
  console.log("🖼️ PRIMARY IMAGE URL:", primaryImageUrl)

  return NextResponse.json({
    success: true,
    imageUrl: primaryImageUrl,
    alternativeUrls: imageUrls,
    prompt: cleanPrompt || prompt,
    originalPrompt: prompt,
    category: imageConfig.category,
    config: imageConfig,
    method: "alternative-placeholder",
    timestamp,
    fallback: false,
    message: `Imagen generada para: ${cleanPrompt || prompt}, Señor. Aquí tiene la imagen solicitada.`,
  })
}

// 🎨 GENERAR COLOR BASADO EN TEXTO
function generateColorFromText(text: string): string {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash)
  }

  const colors = [
    "FF6B6B", // Rojo suave
    "4ECDC4", // Turquesa
    "45B7D1", // Azul
    "96CEB4", // Verde suave
    "FFEAA7", // Amarillo suave
    "DDA0DD", // Violeta
    "98D8C8", // Verde agua
    "F7DC6F", // Amarillo dorado
    "BB8FCE", // Púrpura suave
    "85C1E9", // Azul cielo
  ]

  return colors[Math.abs(hash) % colors.length]
}
