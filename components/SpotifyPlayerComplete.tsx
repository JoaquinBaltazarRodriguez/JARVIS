"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Music, Play, Pause, SkipForward, SkipBack, X, Volume2, Loader2 } from "lucide-react"
import { SpotifyAuthFixed } from "./SpotifyAuthFixed"

interface SpotifyPlayerCompleteProps {
  isPlaying: boolean
  playlistUrl: string
  playlistName: string
  onStop: () => void
  onSpotifyControl: (action: string) => void
}

export function SpotifyPlayerComplete({
  isPlaying,
  playlistUrl,
  playlistName,
  onStop,
  onSpotifyControl,
}: SpotifyPlayerCompleteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [accessToken, setAccessToken] = useState<string>("")
  const [currentTrack, setCurrentTrack] = useState<any>(null)
  const [isPlayingTrack, setIsPlayingTrack] = useState(false)
  const [playlistTracks, setPlaylistTracks] = useState<any[]>([])
  const [audioLevels, setAudioLevels] = useState<number[]>([])
  const [player, setPlayer] = useState<any>(null)
  const [deviceId, setDeviceId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [playlistInfo, setPlaylistInfo] = useState<any>(null)

  // Simular niveles de audio
  useEffect(() => {
    if (isPlayingTrack) {
      const interval = setInterval(() => {
        const newLevels = Array.from({ length: 20 }, () => Math.random() * 100)
        setAudioLevels(newLevels)
      }, 100)
      return () => clearInterval(interval)
    } else {
      setAudioLevels([])
    }
  }, [isPlayingTrack])

  // Cargar Spotify Web Playback SDK
  useEffect(() => {
    if (isAuthenticated && accessToken && !player) {
      loadSpotifySDK()
    }
  }, [isAuthenticated, accessToken])

  // Cargar playlist automáticamente cuando se autentica
  useEffect(() => {
    if (isAuthenticated && accessToken && playlistUrl && playlistTracks.length === 0) {
      console.log("🎵 AUTO-LOADING PLAYLIST:", playlistName)
      loadPlaylistTracks(accessToken, playlistUrl)
    }
  }, [isAuthenticated, accessToken, playlistUrl, playlistTracks.length])

  const loadSpotifySDK = () => {
    if (window.Spotify) {
      initializePlayer()
    } else {
      const script = document.createElement("script")
      script.src = "https://sdk.scdn.co/spotify-player.js"
      script.async = true
      document.body.appendChild(script)

      window.onSpotifyWebPlaybackSDKReady = () => {
        initializePlayer()
      }
    }
  }

  const initializePlayer = () => {
    const spotifyPlayer = new window.Spotify.Player({
      name: "JARVIS Spotify Player",
      getOAuthToken: (cb: (token: string) => void) => {
        cb(accessToken)
      },
      volume: 0.8,
    })

    spotifyPlayer.addListener("ready", ({ device_id }: { device_id: string }) => {
      console.log("✅ SPOTIFY PLAYER READY:", device_id)
      setDeviceId(device_id)
      setPlayer(spotifyPlayer)
    })

    spotifyPlayer.addListener("player_state_changed", (state: any) => {
      if (state) {
        setCurrentTrack(state.track_window.current_track)
        setIsPlayingTrack(!state.paused)
        console.log("🎵 TRACK CHANGED:", state.track_window.current_track?.name)
      }
    })

    spotifyPlayer.connect()
  }

  const handleAuthSuccess = async (token: string) => {
    setIsAuthenticated(true)
    setAccessToken(token)
    console.log("✅ SPOTIFY AUTH SUCCESS")

    // Exponer controles globalmente para comandos de voz
    ;(window as any).spotifyVoiceControl = {
      play: () => handlePlay(),
      pause: () => handlePause(),
      next: () => handleNext(),
      previous: () => handlePrevious(),
      currentTrack: currentTrack?.name || playlistName,
    }
  }

  const handleAuthError = (error: string) => {
    console.error("❌ SPOTIFY AUTH ERROR:", error)
  }

  const loadPlaylistTracks = async (token: string, url: string) => {
    setIsLoading(true)
    try {
      const playlistId = extractPlaylistId(url)
      if (!playlistId) {
        console.error("❌ INVALID PLAYLIST URL:", url)
        return
      }

      console.log("🔍 LOADING PLAYLIST ID:", playlistId)

      // Cargar información de la playlist
      const playlistResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (playlistResponse.ok) {
        const playlistData = await playlistResponse.json()
        setPlaylistInfo(playlistData)
        console.log("✅ PLAYLIST INFO LOADED:", playlistData.name)
      }

      // Cargar canciones de la playlist
      const tracksResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (tracksResponse.ok) {
        const data = await tracksResponse.json()
        setPlaylistTracks(data.items || [])
        console.log(`✅ LOADED ${data.items?.length || 0} TRACKS FROM PLAYLIST`)

        // Reproducir automáticamente la primera canción
        if (data.items && data.items.length > 0 && deviceId) {
          setTimeout(() => {
            playPlaylist(playlistId)
          }, 2000)
        }
      } else {
        console.error("❌ ERROR LOADING TRACKS:", tracksResponse.status)
      }
    } catch (error) {
      console.error("❌ ERROR LOADING PLAYLIST:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const extractPlaylistId = (url: string): string | null => {
    // Manejar diferentes formatos de URL de Spotify
    const patterns = [
      /playlist\/([a-zA-Z0-9]+)/,
      /spotify:playlist:([a-zA-Z0-9]+)/,
      /open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }

    return null
  }

  const playPlaylist = async (playlistId: string) => {
    if (!deviceId || !accessToken) {
      console.error("❌ NO DEVICE OR TOKEN AVAILABLE")
      return
    }

    try {
      const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          context_uri: `spotify:playlist:${playlistId}`,
          offset: { position: 0 },
        }),
      })

      if (response.ok) {
        console.log("✅ PLAYLIST STARTED PLAYING")
        setIsPlayingTrack(true)
      } else {
        console.error("❌ ERROR STARTING PLAYLIST:", response.status)
      }
    } catch (error) {
      console.error("❌ ERROR PLAYING PLAYLIST:", error)
    }
  }

  const handlePlay = async () => {
    if (!player || !deviceId) return

    try {
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      console.log("▶️ PLAY COMMAND SENT")
    } catch (error) {
      console.error("❌ ERROR PLAYING:", error)
    }
  }

  const handlePause = async () => {
    if (!player || !deviceId) return

    try {
      await fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      console.log("⏸️ PAUSE COMMAND SENT")
    } catch (error) {
      console.error("❌ ERROR PAUSING:", error)
    }
  }

  const handleNext = async () => {
    if (!player || !deviceId) return

    try {
      await fetch(`https://api.spotify.com/v1/me/player/next?device_id=${deviceId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      console.log("⏭️ NEXT COMMAND SENT")
    } catch (error) {
      console.error("❌ ERROR SKIPPING:", error)
    }
  }

  const handlePrevious = async () => {
    if (!player || !deviceId) return

    try {
      await fetch(`https://api.spotify.com/v1/me/player/previous?device_id=${deviceId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      console.log("⏮️ PREVIOUS COMMAND SENT")
    } catch (error) {
      console.error("❌ ERROR GOING BACK:", error)
    }
  }

  const handlePlayTrack = async (track: any, index: number) => {
    if (!deviceId || !accessToken || !playlistInfo) return

    try {
      const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          context_uri: playlistInfo.uri,
          offset: { position: index },
        }),
      })

      if (response.ok) {
        console.log("✅ TRACK STARTED:", track.track?.name)
      }
    } catch (error) {
      console.error("❌ ERROR PLAYING TRACK:", error)
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
            {currentTrack && (
              <p className="text-green-300 text-sm">
                🎵 {currentTrack.name} - {currentTrack.artists[0]?.name}
              </p>
            )}
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
              {/* Estado de conexión */}
              <Card className="bg-gray-800/50 border-green-500/30 p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-400 font-bold">🎵 Spotify Conectado</span>
                </div>
                {deviceId && <p className="text-green-300 text-xs">Device ID: {deviceId.substring(0, 20)}...</p>}
                {isLoading && (
                  <div className="flex items-center space-x-2 mt-2">
                    <Loader2 className="h-4 w-4 animate-spin text-green-400" />
                    <span className="text-green-300 text-sm">Cargando playlist...</span>
                  </div>
                )}
              </Card>

              {/* Controles principales */}
              <Card className="bg-gray-800/50 border-green-500/30 p-4">
                <h3 className="text-green-400 font-bold mb-4">🎵 Controles</h3>
                <div className="flex justify-center space-x-4 mb-4">
                  <Button
                    onClick={handlePrevious}
                    variant="outline"
                    size="icon"
                    className="border-green-500/50 text-green-400 hover:bg-green-500/20"
                    disabled={!deviceId}
                  >
                    <SkipBack className="h-5 w-5" />
                  </Button>
                  <Button
                    onClick={isPlayingTrack ? handlePause : handlePlay}
                    variant="outline"
                    size="icon"
                    className="border-green-500/50 text-green-400 hover:bg-green-500/20"
                    disabled={!deviceId}
                  >
                    {isPlayingTrack ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                  </Button>
                  <Button
                    onClick={handleNext}
                    variant="outline"
                    size="icon"
                    className="border-green-500/50 text-green-400 hover:bg-green-500/20"
                    disabled={!deviceId}
                  >
                    <SkipForward className="h-5 w-5" />
                  </Button>
                </div>
                <div className="text-center">
                  <p className="text-green-300 text-sm">{isPlayingTrack ? "🎵 Reproduciendo" : "⏸️ Pausado"}</p>
                </div>
              </Card>

              {/* Lista de canciones */}
              {playlistTracks.length > 0 && (
                <Card className="bg-gray-800/50 border-green-500/30 p-4">
                  <h3 className="text-green-400 font-bold mb-4">🎵 Canciones ({playlistTracks.length})</h3>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {playlistTracks.map((item, index) => (
                      <div
                        key={index}
                        onClick={() => handlePlayTrack(item, index)}
                        className={`flex items-center space-x-3 p-2 rounded hover:bg-green-500/20 cursor-pointer transition-colors ${
                          currentTrack?.id === item.track?.id ? "bg-green-500/30 border border-green-500/50" : ""
                        }`}
                      >
                        <div className="w-8 h-8 bg-green-500/30 rounded flex items-center justify-center">
                          {currentTrack?.id === item.track?.id && isPlayingTrack ? (
                            <Volume2 className="h-4 w-4 text-green-400 animate-pulse" />
                          ) : (
                            <Music className="h-4 w-4 text-green-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-green-300 text-sm font-medium truncate">
                            {item.track?.name || "Canción desconocida"}
                          </p>
                          <p className="text-green-200 text-xs truncate">
                            {item.track?.artists?.[0]?.name || "Artista desconocido"}
                          </p>
                        </div>
                        <div className="text-green-400 text-xs">
                          {Math.floor((item.track?.duration_ms || 0) / 60000)}:
                          {String(Math.floor(((item.track?.duration_ms || 0) % 60000) / 1000)).padStart(2, "0")}
                        </div>
                      </div>
                    ))}
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
                  {isAuthenticated ? "🎵 JARVIS Control Activo" : "⚠️ Conectar Spotify"}
                </h3>
              </div>

              {currentTrack && (
                <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-4 max-w-md mx-auto">
                  <h4 className="text-green-400 font-semibold mb-2">🎵 Reproduciendo Ahora:</h4>
                  <p className="text-green-200 font-medium">{currentTrack.name}</p>
                  <p className="text-green-300 text-sm">{currentTrack.artists[0]?.name}</p>
                  <p className="text-green-400 text-xs mt-1">{isPlayingTrack ? "▶️ Reproduciendo" : "⏸️ Pausado"}</p>
                </div>
              )}

              <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-4 max-w-md mx-auto">
                <h4 className="text-green-400 font-semibold mb-2">💡 Comandos de Voz:</h4>
                <ul className="text-green-200 text-sm space-y-1">
                  <li>• "JARVIS reproducir música"</li>
                  <li>• "JARVIS pausar música"</li>
                  <li>• "JARVIS siguiente canción"</li>
                  <li>• "JARVIS canción anterior"</li>
                  <li>• "JARVIS quitar música"</li>
                </ul>
              </div>

              {playlistTracks.length > 0 && (
                <p className="text-green-300 text-sm">✅ {playlistTracks.length} canciones cargadas y listas</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
