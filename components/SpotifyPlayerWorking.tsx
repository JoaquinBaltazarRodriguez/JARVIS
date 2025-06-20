"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Music, Play, Pause, SkipForward, SkipBack, X, ExternalLink, Volume2 } from "lucide-react"
import { SpotifyAuthFixed } from "./SpotifyAuthFixed"

interface SpotifyPlayerWorkingProps {
  isPlaying: boolean
  playlistUrl: string
  playlistName: string
  onStop: () => void
  onSpotifyControl: (action: string) => void
}

export function SpotifyPlayerWorking({
  isPlaying,
  playlistUrl,
  playlistName,
  onStop,
  onSpotifyControl,
}: SpotifyPlayerWorkingProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentTrack, setCurrentTrack] = useState<any>(null)
  const [isPlaying2, setIsPlaying2] = useState(false)
  const [playlistTracks, setPlaylistTracks] = useState<any[]>([])
  const [audioLevels, setAudioLevels] = useState<number[]>([])

  // Simular niveles de audio
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        const newLevels = Array.from({ length: 20 }, () => Math.random() * 100)
        setAudioLevels(newLevels)
      }, 100)
      return () => clearInterval(interval)
    } else {
      setAudioLevels([])
    }
  }, [isPlaying])

  const handleAuthSuccess = async (token: string) => {
    setIsAuthenticated(true)
    console.log("✅ SPOTIFY AUTH SUCCESS")

    // Si hay una playlist URL, intentar cargar las canciones
    if (playlistUrl) {
      await loadPlaylistTracks(token, playlistUrl)
    }
  }

  const handleAuthError = (error: string) => {
    console.error("❌ SPOTIFY AUTH ERROR:", error)
  }

  const loadPlaylistTracks = async (token: string, url: string) => {
    try {
      // Extraer playlist ID de la URL
      const playlistId = extractPlaylistId(url)
      if (!playlistId) return

      const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setPlaylistTracks(data.items || [])
        console.log(`✅ LOADED ${data.items?.length || 0} TRACKS FROM PLAYLIST`)
      }
    } catch (error) {
      console.error("❌ ERROR LOADING PLAYLIST:", error)
    }
  }

  const extractPlaylistId = (url: string): string | null => {
    const match = url.match(/playlist\/([a-zA-Z0-9]+)/)
    return match ? match[1] : null
  }

  const handleSpotifyWebControl = (action: string) => {
    console.log("🎵 SPOTIFY CONTROL:", action)

    // Abrir Spotify Web con la playlist
    if (playlistUrl) {
      const spotifyWebUrl = playlistUrl.replace("spotify:", "https://open.spotify.com/")
      window.open(spotifyWebUrl, "_blank")
    }

    onSpotifyControl(action)
  }

  const handlePlayTrack = (track: any) => {
    if (track.track?.external_urls?.spotify) {
      window.open(track.track.external_urls.spotify, "_blank")
    }
  }

  if (!isPlaying) return null

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b border-green-500/30 bg-gray-900/80">
        <div className="flex items-center space-x-4">
          <Music className="h-8 w-8 text-green-400 animate-bounce" />
          <div>
            <h2 className="text-2xl font-bold text-green-400">JARVIS - Spotify Player</h2>
            <p className="text-green-200 text-lg">{playlistName}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onStop} className="text-red-400 hover:text-red-300">
          <X className="h-8 w-8" />
        </Button>
      </div>

      <div className="flex-1 flex">
        {/* Panel izquierdo - Autenticación y controles */}
        <div className="w-1/3 p-6 space-y-6 bg-gray-900/60">
          <SpotifyAuthFixed onAuthSuccess={handleAuthSuccess} onError={handleAuthError} />

          {isAuthenticated && (
            <>
              {/* Controles principales */}
              <Card className="bg-gray-800/50 border-green-500/30 p-4">
                <h3 className="text-green-400 font-bold mb-4">🎵 Controles</h3>
                <div className="flex justify-center space-x-4 mb-4">
                  <Button
                    onClick={() => handleSpotifyWebControl("previous")}
                    variant="outline"
                    size="icon"
                    className="border-green-500/50 text-green-400"
                  >
                    <SkipBack className="h-5 w-5" />
                  </Button>
                  <Button
                    onClick={() => handleSpotifyWebControl("play")}
                    variant="outline"
                    size="icon"
                    className="border-green-500/50 text-green-400"
                  >
                    <Play className="h-6 w-6" />
                  </Button>
                  <Button
                    onClick={() => handleSpotifyWebControl("pause")}
                    variant="outline"
                    size="icon"
                    className="border-green-500/50 text-green-400"
                  >
                    <Pause className="h-5 w-5" />
                  </Button>
                  <Button
                    onClick={() => handleSpotifyWebControl("next")}
                    variant="outline"
                    size="icon"
                    className="border-green-500/50 text-green-400"
                  >
                    <SkipForward className="h-5 w-5" />
                  </Button>
                </div>
                <Button
                  onClick={() => handleSpotifyWebControl("open")}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir en Spotify
                </Button>
              </Card>

              {/* Lista de canciones */}
              {playlistTracks.length > 0 && (
                <Card className="bg-gray-800/50 border-green-500/30 p-4">
                  <h3 className="text-green-400 font-bold mb-4">🎵 Canciones ({playlistTracks.length})</h3>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {playlistTracks.slice(0, 10).map((item, index) => (
                      <div
                        key={index}
                        onClick={() => handlePlayTrack(item)}
                        className="flex items-center space-x-3 p-2 rounded hover:bg-green-500/20 cursor-pointer transition-colors"
                      >
                        <div className="w-8 h-8 bg-green-500/30 rounded flex items-center justify-center">
                          <Music className="h-4 w-4 text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-green-300 text-sm font-medium truncate">
                            {item.track?.name || "Canción desconocida"}
                          </p>
                          <p className="text-green-200 text-xs truncate">
                            {item.track?.artists?.[0]?.name || "Artista desconocido"}
                          </p>
                        </div>
                      </div>
                    ))}
                    {playlistTracks.length > 10 && (
                      <p className="text-green-300 text-sm text-center py-2">
                        ... y {playlistTracks.length - 10} canciones más
                      </p>
                    )}
                  </div>
                </Card>
              )}
            </>
          )}
        </div>

        {/* Panel derecho - Visualizador */}
        <div className="flex-1 p-6 bg-gray-900/50 flex items-center justify-center">
          <div className="text-center">
            {/* Visualizador de audio */}
            <div className="flex justify-center items-end space-x-1 h-32 mb-6">
              {audioLevels.map((level, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-t from-green-600 via-green-500 to-green-400 w-4 rounded-t transition-all duration-100"
                  style={{
                    height: `${Math.max(level * 1.2, 10)}px`,
                    opacity: 0.8 + level * 0.002,
                    boxShadow: `0 0 ${level * 0.2}px rgba(34, 197, 94, 0.6)`,
                  }}
                />
              ))}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <Volume2 className="h-6 w-6 text-green-400 animate-pulse" />
                <h3 className="text-xl font-bold text-green-400">
                  {isAuthenticated ? "🎵 Conectado a Spotify" : "⚠️ Conectar Spotify"}
                </h3>
              </div>

              <p className="text-green-200 max-w-md">
                {isAuthenticated
                  ? "Usa los controles o comandos de voz para controlar la reproducción."
                  : "Conecta tu cuenta de Spotify para acceder a todas las funciones."}
              </p>

              <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-4 max-w-md mx-auto">
                <h4 className="text-green-400 font-semibold mb-2">💡 Comandos de Voz:</h4>
                <ul className="text-green-200 text-sm space-y-1">
                  <li>• "JARVIS reproducir música"</li>
                  <li>• "JARVIS pausar música"</li>
                  <li>• "JARVIS siguiente canción"</li>
                  <li>• "JARVIS canción anterior"</li>
                  <li>• "JARVIS abrir Spotify"</li>
                  <li>• "JARVIS quitar música"</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
