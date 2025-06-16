"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Music, Square, Volume2 } from "lucide-react"

interface MusicPlayerProps {
  isPlaying: boolean
  currentPlaylist: string
  onStop: () => void
}

export function MusicPlayer({ isPlaying, currentPlaylist, onStop }: MusicPlayerProps) {
  const [currentSong, setCurrentSong] = useState("Conectando con Spotify...")
  const [audioLevels, setAudioLevels] = useState<number[]>([])

  // 🎵 CANCIONES REALISTAS PARA "MÚSICA DE LOS 80"
  const songs80s = [
    "Sweet Child O' Mine - Guns N' Roses",
    "Billie Jean - Michael Jackson",
    "Don't Stop Believin' - Journey",
    "Livin' on a Prayer - Bon Jovi",
    "Take On Me - a-ha",
    "Girls Just Want to Have Fun - Cyndi Lauper",
    "Every Breath You Take - The Police",
    "Footloose - Kenny Loggins",
    "I Want Candy - Bow Wow Wow",
    "Tainted Love - Soft Cell",
  ]

  // Simular niveles de audio animados
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        const newLevels = Array.from({ length: 8 }, () => Math.random() * 100)
        setAudioLevels(newLevels)
      }, 150) // Más rápido para mejor efecto

      return () => clearInterval(interval)
    } else {
      setAudioLevels([])
    }
  }, [isPlaying])

  // 🎵 CAMBIO DE CANCIÓN MÁS REALISTA
  useEffect(() => {
    if (isPlaying) {
      // Mostrar mensaje inicial
      setCurrentSong("Conectando con Spotify...")

      setTimeout(() => {
        setCurrentSong("Cargando playlist...")
      }, 2000)

      setTimeout(() => {
        let songIndex = 0
        setCurrentSong(songs80s[songIndex])

        const interval = setInterval(() => {
          songIndex = (songIndex + 1) % songs80s.length
          setCurrentSong(songs80s[songIndex])
        }, 25000) // 🎵 CAMBIAR CADA 25 SEGUNDOS (más realista)

        return () => clearInterval(interval)
      }, 4000)
    } else {
      setCurrentSong("Conectando con Spotify...")
    }
  }, [isPlaying])

  if (!isPlaying) return null

  return (
    <Card className="mb-8 bg-gray-900/90 border-green-500/40 p-6 max-w-lg backdrop-blur-sm relative overflow-hidden">
      {/* Efectos de fondo musical */}
      <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-transparent to-green-500/5 animate-pulse"></div>
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-pulse"></div>
      <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-pulse delay-500"></div>

      <div className="text-center relative z-10">
        {/* Icono de música con animación */}
        <div className="flex items-center justify-center mb-4">
          <Music className="h-6 w-6 text-green-400 mr-2 animate-bounce" />
          <p className="text-green-100 text-sm font-medium font-mono">{">"} SPOTIFY_ACTIVE:</p>
        </div>

        {/* Visualizador de audio MEJORADO */}
        <div className="flex justify-center items-end space-x-1 mb-6 h-16">
          {audioLevels.map((level, index) => (
            <div
              key={index}
              className="bg-gradient-to-t from-green-600 to-green-400 w-3 rounded-t transition-all duration-150"
              style={{
                height: `${Math.max(level * 0.6, 8)}px`,
                opacity: 0.6 + level * 0.004,
              }}
            />
          ))}
        </div>

        {/* Información de la playlist */}
        <div className="mb-4">
          <p className="text-green-300 font-bold text-lg mb-2">{currentPlaylist}</p>
          <div className="bg-gray-800/50 rounded-lg p-3 border border-green-500/20">
            <p className="text-green-200 text-sm font-medium">🎵 Reproduciendo ahora:</p>
            <p className="text-green-100 font-semibold mt-1">{currentSong}</p>
          </div>
        </div>

        {/* Controles */}
        <div className="flex justify-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-green-400 hover:text-green-300 border border-green-500/30"
            title="Volumen (Controlar desde Spotify)"
          >
            <Volume2 className="h-4 w-4" />
          </Button>
          <Button
            onClick={onStop}
            variant="ghost"
            size="icon"
            className="text-red-400 hover:text-red-300 border border-red-500/30"
            title="Detener música"
          >
            <Square className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-4 p-2 bg-green-500/10 rounded border border-green-500/20">
          <p className="text-green-300 text-xs">
            <strong>🎧 Música real:</strong> Se reproduce en Spotify
          </p>
          <p className="text-green-300 text-xs mt-1">
            <strong>🎤 Control:</strong> Solo "JARVIS quitar música"
          </p>
        </div>
      </div>
    </Card>
  )
}
