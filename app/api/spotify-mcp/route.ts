import { type NextRequest, NextResponse } from "next/server"
import { SpotifyDB } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const { command, playlistName } = await request.json()

    console.log("🎵 SPOTIFY MCP COMMAND:", { command, playlistName })

    if (command === "search_playlist") {
      const playlists = SpotifyDB.getAll()
      const lowerPlaylistName = (playlistName as string).toLowerCase().trim()

      console.log("🔍 SEARCHING FOR:", lowerPlaylistName)
      console.log(
        "🎵 AVAILABLE PLAYLISTS:",
        playlists.map((p) => p.name),
      )

      // 🔍 BÚSQUEDA INTELIGENTE MCP
      const foundPlaylist = playlists.find((playlist) => {
        const playlistNameLower = playlist.name.toLowerCase()

        // Búsqueda exacta
        if (lowerPlaylistName === playlistNameLower) return true

        // Búsqueda por inclusión
        if (playlistNameLower.includes(lowerPlaylistName) || lowerPlaylistName.includes(playlistNameLower)) return true

        // Búsqueda por palabras clave
        const textWords = lowerPlaylistName.split(" ").filter((word: string) => word.length > 2)
        const playlistWords = playlistNameLower.split(" ").filter((word: string) => word.length > 2)

        const matchingWords = textWords.filter((textWord: string) =>
          playlistWords.some(
            (playlistWord: string) => playlistWord.includes(textWord) || textWord.includes(playlistWord),
          ),
        )

        return matchingWords.length >= 1
      })

      if (foundPlaylist) {
        return NextResponse.json({
          success: true,
          playlist: foundPlaylist,
          message: `Playlist "${foundPlaylist.name}" encontrada y lista para reproducir.`,
        })
      } else {
        const availablePlaylists = playlists.map((p: { name: string }) => p.name).join(", ")
        return NextResponse.json({
          success: false,
          message: `No encontré una playlist que coincida con "${playlistName}". Las playlists disponibles son: ${availablePlaylists}. ¿Puede repetir el nombre?`,
        })
      }
    }

    if (command === "list_playlists") {
      const playlists = SpotifyDB.getAll()
      return NextResponse.json({
        success: true,
        playlists: playlists.map((p: { name: string; spotifyUrl: string }) => ({ name: p.name, url: p.spotifyUrl })),
        message: `Tienes ${playlists.length} playlists disponibles.`,
      })
    }

    return NextResponse.json({
      success: false,
      message: "Comando de Spotify no reconocido",
    })
  } catch (error) {
    console.error("❌ Spotify MCP Error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Error en el sistema MCP de Spotify",
      },
      { status: 500 },
    )
  }
}
