"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Music, Square, Volume2, Play, Pause, SkipForward, SkipBack } from "lucide-react"

interface SpotifyPlayerProps {
  isPlaying: boolean
  playlistUrl: string
  playlistName: string
  onStop: () => void
  onSpotifyControl?: (action: "play" | "pause" | "next" | "previous") => void
}

export function SpotifyPlayer({ isPlaying, playlistUrl, playlistName, onStop, onSpotifyControl }: SpotifyPlayerProps) {
  const [embedUrl, setEmbedUrl] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [audioLevels, setAudioLevels] = useState<number[]>([])
  const [currentAction, setCurrentAction] = useState<string>("")
  const [isSpotifyReady, setIsSpotifyReady] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // 🎵 CONVERTIR URL DE SPOTIFY A EMBED
  useEffect(() => {
    if (isPlaying && playlistUrl) {
      console.log("🎵 ORIGINAL URL:", playlistUrl)

      let playlistId = ""

      if (playlistUrl.includes("playlist/")) {
        playlistId = playlistUrl.split("playlist/")[1].split("?")[0]
      } else if (playlistUrl.includes("open.spotify.com")) {
        const match = playlistUrl.match(/playlist\/([a-zA-Z0-9]+)/)
        if (match) playlistId = match[1]
      }

      if (playlistId) {
        // 🎵 URL EMBED MEJORADA CON AUTOPLAY
        const embedUrl = `https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator&theme=0&autoplay=1&hide-cover=0&hide-playbar=0`
        setEmbedUrl(embedUrl)
        console.log("🎵 EMBED URL:", embedUrl)

        // Simular que Spotify está listo después de cargar
        setTimeout(() => {
          setIsSpotifyReady(true)
          setIsLoading(false)
        }, 3000)
      } else {
        console.error("❌ NO SE PUDO EXTRAER PLAYLIST ID")
        setIsLoading(false)
      }
    }
  }, [isPlaying, playlistUrl])

  // 🎵 MANEJAR CONTROLES DE SPOTIFY REALES
  const handleSpotifyControl = (action: "play" | "pause" | "next" | "previous") => {
    console.log("🎵 SPOTIFY CONTROL:", action)

    let actionText = ""
    let instruction = ""

    switch (action) {
      case "play":
        actionText = "▶️ Reproduciendo música..."
        instruction = "Presiona ESPACIO en Spotify para reproducir"
        break
      case "pause":
        actionText = "⏸️ Pausando música..."
        instruction = "Presiona ESPACIO en Spotify para pausar"
        break
      case "next":
        actionText = "⏭️ Siguiente canción..."
        instruction = "Presiona → en Spotify para siguiente canción"
        break
      case "previous":
        actionText = "⏮️ Canción anterior..."
        instruction = "Presiona ← en Spotify para canción anterior"
        break
    }

    setCurrentAction(actionText)

    // 🎵 SIMULAR CONTROL REAL DE SPOTIFY
    if (iframeRef.current && isSpotifyReady) {
      try {
        // 🎵 ENVIAR EVENTOS DE TECLADO A SPOTIFY
        const iframe = iframeRef.current

        // Enfocar el iframe de Spotify
        iframe.focus()

        // Simular eventos de teclado según la acción
        setTimeout(() => {
          switch (action) {
            case "play":
            case "pause":
              // Simular presionar ESPACIO
              simulateKeyPress(iframe, " ")
              break
            case "next":
              // Simular presionar flecha derecha
              simulateKeyPress(iframe, "ArrowRight")
              break
            case "previous":
              // Simular presionar flecha izquierda
              simulateKeyPress(iframe, "ArrowLeft")
              break
          }
        }, 500)

        console.log("🎵 Control sent to Spotify:", action)
      } catch (error) {
        console.error("❌ Error controlling Spotify:", error)
        // Mostrar instrucción manual como fallback
        setCurrentAction(actionText + " - " + instruction)
      }
    } else {
      // Fallback: mostrar instrucción manual
      setCurrentAction(actionText + " - " + instruction)
    }

    // Llamar callback si existe
    onSpotifyControl?.(action)

    // Limpiar acción después de 4 segundos
    setTimeout(() => setCurrentAction(""), 4000)
  }

  // 🎵 FUNCIÓN PARA SIMULAR EVENTOS DE TECLADO
  const simulateKeyPress = (iframe: HTMLIFrameElement, key: string) => {
    try {
      // Intentar enviar evento al iframe
      const event = new KeyboardEvent("keydown", {
        key: key,
        code: key === " " ? "Space" : key,
        bubbles: true,
        cancelable: true,
      })

      iframe.contentDocument?.dispatchEvent(event)

      // También intentar con el contenedor
      iframe.dispatchEvent(event)

      console.log("🎵 Key event sent:", key)
    } catch (error) {
      console.error("❌ Error sending key event:", error)
    }
  }

  // 🎵 EXPONER FUNCIÓN DE CONTROL PARA USO EXTERNO
  useEffect(() => {
    // Hacer la función disponible globalmente para que pueda ser llamada desde el componente principal
    ;(window as any).spotifyControl = handleSpotifyControl

    return () => {
      delete (window as any).spotifyControl
    }
  }, [isSpotifyReady])

  // Simular niveles de audio animados
  useEffect(() => {
    if (isPlaying && !isLoading) {
      const interval = setInterval(() => {
        const newLevels = Array.from({ length: 12 }, () => Math.random() * 100)
        setAudioLevels(newLevels)
      }, 120)

      return () => clearInterval(interval)
    } else {
      setAudioLevels([])
    }
  }, [isPlaying, isLoading])

  if (!isPlaying) return null

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
      {/* Header del Reproductor */}
      <div className="flex justify-between items-center p-6 border-b border-green-500/30 bg-gray-900/80">
        <div className="flex items-center">
          <Music className="h-8 w-8 text-green-400 mr-3 animate-bounce" />
          <div>
            <h2 className="text-2xl font-bold text-green-400">Spotify Player</h2>
            <p className="text-green-200 text-lg">{playlistName}</p>
            {currentAction && <p className="text-yellow-300 text-sm animate-pulse mt-1">{currentAction}</p>}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onStop} className="text-red-400 hover:text-red-300">
          <Square className="h-8 w-8" />
        </Button>
      </div>

      {/* Controles de Voz Visuales MEJORADOS */}
      <div className="p-4 bg-gray-900/60 border-b border-green-500/20">
        <div className="flex justify-center space-x-4">
          <Button
            onClick={() => handleSpotifyControl("previous")}
            variant="outline"
            size="sm"
            className="border-green-500/50 text-green-400 hover:bg-green-500/20"
          >
            <SkipBack className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          <Button
            onClick={() => handleSpotifyControl("play")}
            variant="outline"
            size="sm"
            className="border-green-500/50 text-green-400 hover:bg-green-500/20"
          >
            <Play className="h-4 w-4 mr-1" />
            Reproducir
          </Button>
          <Button
            onClick={() => handleSpotifyControl("pause")}
            variant="outline"
            size="sm"
            className="border-green-500/50 text-green-400 hover:bg-green-500/20"
          >
            <Pause className="h-4 w-4 mr-1" />
            Pausar
          </Button>
          <Button
            onClick={() => handleSpotifyControl("next")}
            variant="outline"
            size="sm"
            className="border-green-500/50 text-green-400 hover:bg-green-500/20"
          >
            <SkipForward className="h-4 w-4 mr-1" />
            Siguiente
          </Button>
        </div>
        <p className="text-center text-green-300 text-xs mt-2">
          🎤 <strong>Control por voz:</strong> "Reproducir", "Pausar", "Siguiente", "Anterior"
        </p>
        <p className="text-center text-green-200 text-xs mt-1">
          {isSpotifyReady ? "✅ Spotify listo para controles" : "⏳ Preparando controles de Spotify..."}
        </p>
      </div>

      {/* Visualizador de Audio */}
      <div className="p-6 bg-gray-900/50">
        <div className="flex justify-center items-end space-x-1 h-20">
          {audioLevels.map((level, index) => (
            <div
              key={index}
              className="bg-gradient-to-t from-green-600 to-green-400 w-4 rounded-t transition-all duration-100"
              style={{
                height: `${Math.max(level * 0.8, 10)}px`,
                opacity: 0.7 + level * 0.003,
              }}
            />
          ))}
        </div>
      </div>

      {/* Reproductor de Spotify Integrado */}
      <div className="flex-1 p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Music className="h-16 w-16 text-green-400 mx-auto mb-4 animate-spin" />
              <p className="text-green-300 text-xl">Cargando Spotify...</p>
              <p className="text-green-200 text-sm mt-2">Preparando controles de música</p>
            </div>
          </div>
        ) : embedUrl ? (
          <div className="h-full rounded-lg overflow-hidden border-2 border-green-500/30">
            <iframe
              ref={iframeRef}
              src={embedUrl}
              width="100%"
              height="100%"
              frameBorder="0"
              allowTransparency={true}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="w-full h-full"
              onLoad={() => {
                console.log("🎵 Spotify iframe loaded")
                setTimeout(() => setIsSpotifyReady(true), 2000)
              }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Music className="h-16 w-16 text-red-400 mx-auto mb-4" />
              <p className="text-red-300 text-xl">Error al cargar playlist</p>
              <p className="text-red-200 text-sm mt-2">Verifica la URL de Spotify</p>
            </div>
          </div>
        )}
      </div>

      {/* Controles Inferiores */}
      <div className="p-6 bg-gray-900/80 border-t border-green-500/30">
        <div className="text-center">
          <div className="flex justify-center space-x-4 mb-4">
            <Button variant="outline" className="border-green-500/50 text-green-400">
              <Volume2 className="h-4 w-4 mr-2" />
              Controles Activos
            </Button>
            <Button onClick={onStop} className="bg-red-500 hover:bg-red-600 text-white">
              <Square className="h-4 w-4 mr-2" />
              Detener Música
            </Button>
          </div>
          <p className="text-green-300 text-sm">
            🎵 <strong>Música real de Spotify</strong> | Di "JARVIS quitar música" para cerrar
          </p>
          <p className="text-green-200 text-xs mt-1">
            🎤 <strong>Controles por voz:</strong> "Reproducir", "Pausar", "Siguiente canción", "Canción anterior"
          </p>
          <p className="text-green-100 text-xs mt-1">
            ⌨️ <strong>Controles automáticos:</strong> Los comandos de voz envían teclas a Spotify
          </p>
        </div>
      </div>
    </div>
  )
}
