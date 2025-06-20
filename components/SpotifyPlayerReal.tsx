"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Music, Play, Pause, SkipForward, SkipBack, X, ExternalLink, Volume2, Loader2 } from "lucide-react"

interface SpotifyPlayerRealProps {
  isPlaying: boolean
  playlistUrl: string
  playlistName: string
  onStop: () => void
  onSpotifyControl: (action: string) => void
}

interface SpotifyTrack {
  id: string
  name: string
  artists: { name: string }[]
  duration_ms: number
  uri: string
}

interface SpotifyPlaylist {
  id: string
  name: string
  tracks: {
    items: {
      track: SpotifyTrack
    }[]
    total: number
  }
}

export function SpotifyPlayerReal({
  isPlaying,
  playlistUrl,
  playlistName,
  onStop,
  onSpotifyControl,
}: SpotifyPlayerRealProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null)
  const [isPlaying2, setIsPlaying2] = useState(false)
  const [volume, setVolume] = useState(80)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playlistTracks, setPlaylistTracks] = useState<SpotifyTrack[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [spotifyPlayer, setSpotifyPlayer] = useState<any>(null)
  const [deviceId, setDeviceId] = useState<string>("")
  const [playlistId, setPlaylistId] = useState<string>("")

  // 🎵 EXTRAER PLAYLIST ID DE LA URL
  useEffect(() => {
    if (playlistUrl) {
      const match = playlistUrl.match(/playlist\/([a-zA-Z0-9]+)/)
      if (match) {
        setPlaylistId(match[1])
        console.log("🎵 EXTRACTED PLAYLIST ID:", match[1])
      }
    }
  }, [playlistUrl])

  // 🎵 VERIFICAR AUTENTICACIÓN
  useEffect(() => {
    const token = localStorage.getItem("spotify_access_token")
    setIsAuthenticated(!!token)
    if (token && playlistId) {
      loadPlaylistTracks(playlistId, token)
    }
  }, [playlistId])

  // 🎵 CARGAR SPOTIFY WEB PLAYBACK SDK
  useEffect(() => {
    if (isAuthenticated && !spotifyPlayer) {
      loadSpotifySDK()
    }
  }, [isAuthenticated])

  // 🎵 CARGAR SPOTIFY SDK
  const loadSpotifySDK = () => {
    if ((window as any).Spotify) {
      initializePlayer()
      return
    }

    const script = document.createElement("script")
    script.src = "https://sdk.scdn.co/spotify-player.js"
    script.async = true

    document.body.appendChild(script)
    ;(window as any).onSpotifyWebPlaybackSDKReady = () => {
      initializePlayer()
    }
  }

  // 🎵 INICIALIZAR PLAYER
  const initializePlayer = () => {
    const token = localStorage.getItem("spotify_access_token")
    if (!token) return

    const player = new (window as any).Spotify.Player({
      name: "JARVIS Music Player",
      getOAuthToken: (cb: (token: string) => void) => {
        cb(token)
      },
      volume: volume / 100,
    })

    // Eventos del player
    player.addListener("ready", ({ device_id }: { device_id: string }) => {
      console.log("🎵 SPOTIFY PLAYER READY:", device_id)
      setDeviceId(device_id)
      setSpotifyPlayer(player)
    })

    player.addListener("not_ready", ({ device_id }: { device_id: string }) => {
      console.log("🎵 SPOTIFY PLAYER NOT READY:", device_id)
    })

    player.addListener("player_state_changed", (state: any) => {
      if (!state) return

      console.log("🎵 PLAYER STATE CHANGED:", state)
      setCurrentTrack(state.track_window.current_track)
      setIsPlaying2(!state.paused)
      setProgress((state.position / state.duration) * 100)
      setDuration(state.duration)
    })

    player.addListener("initialization_error", ({ message }: { message: string }) => {
      console.error("❌ Spotify initialization error:", message)
      setAuthError("Error inicializando Spotify: " + message)
    })

    player.addListener("authentication_error", ({ message }: { message: string }) => {
      console.error("❌ Spotify authentication error:", message)
      setAuthError("Error de autenticación: " + message)
      localStorage.removeItem("spotify_access_token")
      setIsAuthenticated(false)
    })

    player.addListener("account_error", ({ message }: { message: string }) => {
      console.error("❌ Spotify account error:", message)
      setAuthError("Error de cuenta: " + message)
    })

    player.connect()
  }

  // 🎵 CARGAR TRACKS DE LA PLAYLIST REAL
  const loadPlaylistTracks = async (playlistId: string, token: string) => {
    setIsLoading(true)
    try {
      console.log("🎵 LOADING PLAYLIST TRACKS:", playlistId)

      // Obtener información de la playlist
      const playlistResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!playlistResponse.ok) {
        throw new Error(`HTTP ${playlistResponse.status}: ${playlistResponse.statusText}`)
      }

      const playlist: SpotifyPlaylist = await playlistResponse.json()
      console.log("🎵 PLAYLIST LOADED:", playlist.name, "Tracks:", playlist.tracks.total)

      // Extraer tracks
      const tracks = playlist.tracks.items.map((item) => item.track).filter((track) => track && track.id) // Filtrar tracks válidos

      setPlaylistTracks(tracks)
      if (tracks.length > 0) {
        setCurrentTrack(tracks[0])
      }

      console.log("🎵 TRACKS LOADED:", tracks.length)
    } catch (error) {
      console.error("❌ Error loading playlist:", error)
      setAuthError("Error cargando playlist: " + error)
    } finally {
      setIsLoading(false)
    }
  }

  // 🎵 REPRODUCIR PLAYLIST EN SPOTIFY
  const playPlaylistOnSpotify = async () => {
    const token = localStorage.getItem("spotify_access_token")
    if (!token || !deviceId || !playlistId) {
      console.log("❌ Missing requirements:", { token: !!token, deviceId, playlistId })
      return
    }

    try {
      console.log("🎵 PLAYING PLAYLIST ON SPOTIFY:", playlistId)

      const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          context_uri: `spotify:playlist:${playlistId}`,
        }),
      })

      if (response.ok) {
        console.log("✅ PLAYLIST PLAYING ON SPOTIFY")
        setIsPlaying2(true)
      } else {
        const errorData = await response.text()
        console.error("❌ Error playing playlist:", response.status, errorData)
        setAuthError("Error reproduciendo playlist: " + response.status)
      }
    } catch (error) {
      console.error("❌ Error playing playlist:", error)
      setAuthError("Error reproduciendo playlist: " + error)
    }
  }

  // 🎵 CONTROLES DE SPOTIFY
  const handlePlayPause = async () => {
    if (!spotifyPlayer) {
      console.log("🎵 No player available, opening Spotify")
      handlePlayInSpotify()
      return
    }

    try {
      if (isPlaying2) {
        await spotifyPlayer.pause()
        console.log("🎵 PAUSED")
      } else {
        if (playlistTracks.length > 0 && !currentTrack) {
          // Si no hay track actual, reproducir la playlist
          await playPlaylistOnSpotify()
        } else {
          await spotifyPlayer.resume()
          console.log("🎵 RESUMED")
        }
      }
      onSpotifyControl(isPlaying2 ? "pause" : "play")
    } catch (error) {
      console.error("❌ Error play/pause:", error)
    }
  }

  const handleNext = async () => {
    if (!spotifyPlayer) return

    try {
      await spotifyPlayer.nextTrack()
      console.log("🎵 NEXT TRACK")
      onSpotifyControl("next")
    } catch (error) {
      console.error("❌ Error next track:", error)
    }
  }

  const handlePrevious = async () => {
    if (!spotifyPlayer) return

    try {
      await spotifyPlayer.previousTrack()
      console.log("🎵 PREVIOUS TRACK")
      onSpotifyControl("previous")
    } catch (error) {
      console.error("❌ Error previous track:", error)
    }
  }

  const handleVolumeChange = async (newVolume: number) => {
    setVolume(newVolume)
    if (spotifyPlayer) {
      try {
        await spotifyPlayer.setVolume(newVolume / 100)
        console.log("🎵 VOLUME CHANGED:", newVolume)
      } catch (error) {
        console.error("❌ Error changing volume:", error)
      }
    }
  }

  // 🎵 REPRODUCIR TRACK ESPECÍFICO
  const playSpecificTrack = async (track: SpotifyTrack, trackIndex: number) => {
    const token = localStorage.getItem("spotify_access_token")
    if (!token || !deviceId || !playlistId) return

    try {
      console.log("🎵 PLAYING SPECIFIC TRACK:", track.name)

      const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          context_uri: `spotify:playlist:${playlistId}`,
          offset: { position: trackIndex },
        }),
      })

      if (response.ok) {
        console.log("✅ SPECIFIC TRACK PLAYING")
        setCurrentTrack(track)
        setIsPlaying2(true)
      } else {
        console.error("❌ Error playing specific track:", response.status)
      }
    } catch (error) {
      console.error("❌ Error playing specific track:", error)
    }
  }

  const handleSpotifyAuth = async () => {
    try {
      setAuthError(null)
      console.log("🎵 STARTING SPOTIFY AUTH...")

      const response = await fetch("/api/spotify/auth")
      const data = await response.json()

      if (data.authUrl) {
        console.log("🎵 OPENING SPOTIFY AUTH URL")
        window.open(data.authUrl, "_blank")
      } else {
        throw new Error("No auth URL received")
      }
    } catch (error) {
      console.error("❌ Spotify auth error:", error)
      setAuthError("Error de autenticación: " + error)
    }
  }

  const handlePlayInSpotify = () => {
    if (playlistUrl) {
      window.open(playlistUrl, "_blank")
    } else {
      window.open("https://open.spotify.com", "_blank")
    }
  }

  // 🎵 EXPONER FUNCIONES PARA COMANDOS DE VOZ
  useEffect(() => {
    ;(window as any).spotifyVoiceControl = {
      play: () => {
        if (!isPlaying2) handlePlayPause()
      },
      pause: () => {
        if (isPlaying2) handlePlayPause()
      },
      next: handleNext,
      previous: handlePrevious,
      isPlaying: isPlaying2,
      currentTrack: currentTrack?.name,
    }

    return () => {
      delete (window as any).spotifyVoiceControl
    }
  }, [isPlaying2, currentTrack, spotifyPlayer])

  // 🎵 LIMPIAR AL DESMONTAR
  useEffect(() => {
    return () => {
      if (spotifyPlayer) {
        spotifyPlayer.disconnect()
      }
    }
  }, [spotifyPlayer])

  // 🎵 FORMATEAR DURACIÓN
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  if (!isPlaying) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black via-gray-900 to-transparent p-4">
      <Card className="bg-gray-900/95 border-green-500/30 backdrop-blur-sm">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Music className="h-8 w-8 text-green-400" />
              </div>
              <div>
                <h3 className="text-green-400 font-bold text-xl">🎵 JARVIS Music Player</h3>
                <p className="text-green-300 text-lg">{playlistName || "Spotify Music"}</p>
                <p className="text-green-200 text-sm">
                  {playlistTracks.length} canciones {isLoading && "(cargando...)"}
                </p>
                {isPlaying2 && currentTrack && (
                  <p className="text-green-400 text-xs animate-pulse">🎵 Reproduciendo en Spotify</p>
                )}
                {deviceId && <p className="text-green-300 text-xs">📱 Dispositivo: {deviceId.slice(0, 8)}...</p>}
              </div>
            </div>
            <Button
              onClick={() => {
                if (spotifyPlayer) {
                  spotifyPlayer.disconnect()
                }
                onStop()
              }}
              variant="ghost"
              size="icon"
              className="text-green-400 hover:text-green-300"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          {/* Error Display */}
          {authError && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-500/50 rounded-lg">
              <p className="text-red-300 text-sm">{authError}</p>
              <Button
                onClick={() => setAuthError(null)}
                size="sm"
                variant="ghost"
                className="text-red-400 hover:text-red-300 mt-2"
              >
                Cerrar
              </Button>
            </div>
          )}

          {/* Información de la canción actual */}
          {currentTrack && (
            <div className="mb-6 p-4 bg-gray-800/50 rounded-lg border border-green-500/20">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="text-green-300 font-bold text-lg">{currentTrack.name}</h4>
                  <p className="text-green-200">
                    {currentTrack.artists?.map((artist) => artist.name).join(", ") || "Artista desconocido"}
                  </p>
                </div>
                <span className="text-green-400 text-sm">{formatDuration(currentTrack.duration_ms || 0)}</span>
              </div>

              {/* Barra de progreso */}
              <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-green-300">
                <span>{formatDuration((progress / 100) * (currentTrack.duration_ms || 0))}</span>
                <span>{formatDuration(currentTrack.duration_ms || 0)}</span>
              </div>
            </div>
          )}

          {!isAuthenticated ? (
            <div className="text-center py-4">
              <p className="text-green-300 mb-4">Conectar con Spotify para reproducir música real</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={handleSpotifyAuth} className="bg-green-600 hover:bg-green-700 text-white">
                  <Music className="h-4 w-4 mr-2" />
                  Conectar Spotify
                </Button>
                <Button onClick={handlePlayInSpotify} variant="outline" className="border-green-500 text-green-400">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir en Spotify
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Controles de reproducción */}
              <div className="flex items-center justify-center space-x-6">
                <Button
                  onClick={handlePrevious}
                  variant="ghost"
                  size="icon"
                  className="text-green-400 hover:text-green-300 w-12 h-12"
                  disabled={!spotifyPlayer}
                >
                  <SkipBack className="h-6 w-6" />
                </Button>
                <Button
                  onClick={handlePlayPause}
                  variant="ghost"
                  size="icon"
                  className="text-green-400 hover:text-green-300 w-16 h-16 bg-green-500/20 rounded-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : isPlaying2 ? (
                    <Pause className="h-8 w-8" />
                  ) : (
                    <Play className="h-8 w-8 ml-1" />
                  )}
                </Button>
                <Button
                  onClick={handleNext}
                  variant="ghost"
                  size="icon"
                  className="text-green-400 hover:text-green-300 w-12 h-12"
                  disabled={!spotifyPlayer}
                >
                  <SkipForward className="h-6 w-6" />
                </Button>
              </div>

              {/* Control de volumen */}
              <div className="flex items-center justify-center space-x-4">
                <Volume2 className="h-5 w-5 text-green-400" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => handleVolumeChange(Number.parseInt(e.target.value))}
                  className="w-32 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #22c55e 0%, #22c55e ${volume}%, #374151 ${volume}%, #374151 100%)`,
                  }}
                />
                <span className="text-green-400 text-sm w-12">{volume}%</span>
              </div>

              {/* Lista de canciones */}
              {playlistTracks.length > 0 && (
                <div className="max-h-40 overflow-y-auto">
                  <h5 className="text-green-300 font-bold mb-2">
                    Lista de reproducción ({playlistTracks.length} canciones):
                  </h5>
                  <div className="space-y-1">
                    {playlistTracks.slice(0, 20).map((track, index) => (
                      <div
                        key={track.id}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                          currentTrack?.id === track.id
                            ? "bg-green-500/20 border border-green-500/30"
                            : "hover:bg-gray-800/50"
                        }`}
                        onClick={() => playSpecificTrack(track, index)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-green-300 text-sm font-medium truncate">{track.name}</p>
                          <p className="text-green-200 text-xs truncate">
                            {track.artists?.map((artist) => artist.name).join(", ") || "Artista desconocido"}
                          </p>
                        </div>
                        <span className="text-green-400 text-xs ml-2">{formatDuration(track.duration_ms)}</span>
                      </div>
                    ))}
                    {playlistTracks.length > 20 && (
                      <p className="text-green-400 text-xs text-center py-2">
                        ... y {playlistTracks.length - 20} canciones más
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Botón para abrir en Spotify */}
              <div className="text-center">
                <Button onClick={handlePlayInSpotify} variant="outline" className="border-green-500 text-green-400">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir en Spotify
                </Button>
              </div>

              {/* Comandos de voz */}
              <div className="text-center">
                <p className="text-green-300 text-sm">
                  🎤 Comandos de voz: "JARVIS reproducir", "JARVIS pausar", "JARVIS siguiente", "JARVIS quitar música"
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
