import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json()
    console.log("🖼️ GENERATING IMAGE FOR:", prompt)

    // Usar una API gratuita de imágenes como Unsplash
    const searchQuery = encodeURIComponent(prompt)
    const imageUrl = `https://source.unsplash.com/800x600/?${searchQuery}`

    console.log("✅ IMAGE URL GENERATED:", imageUrl)

    return NextResponse.json({
      success: true,
      imageUrl,
      prompt,
    })
  } catch (error) {
    console.error("❌ IMAGE GENERATION ERROR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error generando imagen",
      },
      { status: 500 },
    )
  }
}
