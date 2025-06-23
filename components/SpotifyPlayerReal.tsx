"use client"

import React, { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Music, Play, Pause, SkipForward, SkipBack, Loader2 } from "lucide-react"

// Props
interface SpotifyPlayerRealProps {
  playlistUrl: string
  playlistName: string
  onVoiceCommand?: (cmd: string) => void // Puedes conectar aquí tu sistema de voz
}

interface SpotifyTrack {
  id: string
  name: string
  artists: { name: string }[]
  uri: string
}

export function SpotifyPlayerReal({
  playlistUrl,
  playlistName,
  onVoiceCommand,
}: SpotifyPlayerRealProps) {
  const [accessToken, setAccessToken] = useState<string>("")
  const [deviceId, setDeviceId] = useState<string>("")
  const [tracks, setTracks] = useState<SpotifyTrack[]>([])
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [loading, setLoading] = useState(true)
  const playerRef = useRef<any>(null)

  // 1. Obtener accessToken desde localStorage
  useEffect(() => {
    const token = localStorage.getItem("spotify_access_token")
    if (token) setAccessToken(token)
  }, [])

  // 2. Inicializar el Web Playback SDK de Spotify
  useEffect(() => {
    if (!accessToken || playerRef.current) return

    const script = document.createElement("script")
    script.src = "https://sdk.scdn.co/spotify-player.js"
    script.async = true
    document.body.appendChild(script)

    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new window.Spotify.Player({
        name: "JARVIS Player",
        getOAuthToken: (cb: any) => cb(accessToken),
        volume: 0.7,
      })
      playerRef.current = player

      player.addListener("ready", ({ device_id }: any) => {
        setDeviceId(device_id)
      })

      player.addListener("player_state_changed", (state: any) => {
        if (!state) return
        setIsPlaying(!state.paused)
        const current = state.track_window.current_track
        if (current) {
          setCurrentTrack({
            id: current.id,
            name: current.name,
            artists: current.artists,
            uri: current.uri,
          })
        }
      })

      player.connect()
    }
  }, [accessToken])

  // 3. Obtener tracks de la playlist real
  useEffect(() => {
    if (!accessToken || !playlistUrl) return
    const playlistIdMatch = playlistUrl.match(/playlist\/([a-zA-Z0-9]+)/)
    if (!playlistIdMatch) return

    const playlistId = playlistIdMatch[1]
    setLoading(true)
    fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => res.json())
      .then((data) => {
        const tracks = data.items.map((item: any) => ({
          id: item.track.id,
          name: item.track.name,
          artists: item.track.artists,
          uri: item.track.uri,
        }))
        setTracks(tracks)
        setLoading(false)
      })
  }, [accessToken, playlistUrl])

  // 4. Funciones de control de reproducción
  const playTrack = (trackUri?: string) => {
    if (!accessToken || !deviceId) return
    fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        uris: tracks.map((t) => t.uri),
        offset: trackUri
          ? { uri: trackUri }
          : undefined,
      }),
    })
  }

  const pause = () => {
    if (!accessToken || !deviceId) return
    fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  }

  const next = () => {
    if (!accessToken || !deviceId) return
    fetch(`https://api.spotify.com/v1/me/player/next?device_id=${deviceId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  }

  const previous = () => {
    if (!accessToken || !deviceId) return
    fetch(`https://api.spotify.com/v1/me/player/previous?device_id=${deviceId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  }

  // 5. Integración con comandos de voz (ejemplo)
  useEffect(() => {
    if (!onVoiceCommand) return
    // Aquí deberías conectar tu sistema de voz y mapear los comandos a las funciones playTrack, pause, next, previous
    // Ejemplo:
    // onVoiceCommand("play") => playTrack()
    // onVoiceCommand("pause") => pause()
    // onVoiceCommand("next") => next()
    // onVoiceCommand("previous") => previous()
  }, [onVoiceCommand, deviceId, tracks])

  return (
    <Card className="bg-gray-900 border-cyan-500/30 p-6">
      <h2 className="text-xl font-bold text-cyan-400 flex items-center mb-4">
        <Music className="h-5 w-5 mr-2" />
        {playlistName}
      </h2>
      {loading ? (
        <div className="flex items-center">
          <Loader2 className="animate-spin mr-2" />
          Cargando canciones...
        </div>
      ) : (
        <>
          <div className="mb-4">
            <ul>
              {tracks.map((track) => (
                <li
                  key={track.id}
                  className={`py-1 px-2 rounded cursor-pointer ${
                    currentTrack?.id === track.id
                      ? "bg-cyan-800 text-white"
                      : "hover:bg-cyan-900"
                  }`}
                  onClick={() => playTrack(track.uri)}
                >
                  {track.name} —{" "}
                  {track.artists.map((a) => a.name).join(", ")}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={previous} variant="ghost">
              <SkipBack />
            </Button>
            {isPlaying ? (
              <Button onClick={pause} variant="ghost">
                <Pause />
              </Button>
            ) : (
              <Button onClick={() => playTrack()} variant="ghost">
                <Play />
              </Button>
            )}
            <Button onClick={next} variant="ghost">
              <SkipForward />
            </Button>
          </div>
          <div className="mt-4 text-cyan-300">
            {currentTrack
              ? `Reproduciendo: ${currentTrack.name} — ${currentTrack.artists
                  .map((a) => a.name)
                  .join(", ")}`
              : "Selecciona una canción para comenzar"}
          </div>
        </>
      )}
    </Card>
  )
}