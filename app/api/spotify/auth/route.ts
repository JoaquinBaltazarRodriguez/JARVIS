import { NextResponse } from "next/server"

export async function GET() {
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID
    const redirectUri = "http://localhost:3000/api/spotify/callback"

    console.log("🎵 SPOTIFY AUTH REQUEST")
    console.log("🎵 CLIENT ID:", clientId ? "✅ EXISTS" : "❌ MISSING")
    console.log("🎵 REDIRECT URI:", redirectUri)

    if (!clientId) {
      console.error("❌ SPOTIFY_CLIENT_ID not configured")
      return NextResponse.json({
        error: "Spotify no configurado. Agregue SPOTIFY_CLIENT_ID a las variables de entorno.",
        configured: false,
      })
    }

    // 🎵 SCOPES NECESARIOS PARA REPRODUCIR MÚSICA
    const scopes = [
      "streaming",
      "user-read-email",
      "user-read-private",
      "user-read-playback-state",
      "user-modify-playback-state",
      "playlist-read-private",
      "playlist-read-collaborative",
      "user-library-read",
      "user-read-currently-playing",
    ].join(" ")

    // 🔧 USAR REDIRECT URI EXACTA
    const possibleRedirectUris = ["http://localhost:3000/api/spotify/callback"]

    // Usar la URI exacta
    const finalRedirectUri = "http://localhost:3000/api/spotify/callback"

    const authUrl = `https://accounts.spotify.com/authorize?${new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      scope: scopes,
      redirect_uri: finalRedirectUri,
      show_dialog: "true",
      state: "jarvis-auth-" + Date.now(),
    })}`

    console.log("🎵 GENERATED AUTH URL:", authUrl)

    return NextResponse.json({
      authUrl,
      configured: true,
      message: "URL de autenticación generada correctamente",
      redirectUri: finalRedirectUri,
      possibleUris: possibleRedirectUris,
    })
  } catch (error) {
    console.error("❌ SPOTIFY AUTH ERROR:", error)
    return NextResponse.json(
      {
        error: "Error generando URL de autenticación",
        configured: false,
      },
      { status: 500 },
    )
  }
}
