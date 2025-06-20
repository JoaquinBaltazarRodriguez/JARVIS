import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // Verificar si hay tokens en localStorage (esto se maneja en el cliente)
    // Este endpoint devuelve el estado de autenticación

    return NextResponse.json({
      message: "Token endpoint - use client-side localStorage",
      authenticated: false,
    })
  } catch (error) {
    console.error("❌ Token endpoint error:", error)
    return NextResponse.json(
      {
        error: "Error en endpoint de token",
      },
      { status: 500 },
    )
  }
}
