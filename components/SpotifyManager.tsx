"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { SpotifyDB, type SpotifyPlaylist } from "@/lib/database"
import { Music, Plus, Trash2, X, ExternalLink } from "lucide-react"

interface SpotifyManagerProps {
  isOpen: boolean
  onClose: () => void
}

export function SpotifyManager({ isOpen, onClose }: SpotifyManagerProps) {
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([])
  const [newName, setNewName] = useState("")
  const [newUrl, setNewUrl] = useState("")
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setPlaylists(SpotifyDB.getAll())
    }
  }, [isOpen])

  const handleAdd = () => {
    if (newName.trim() && newUrl.trim()) {
      const playlist = SpotifyDB.add(newName, newUrl)
      setPlaylists(SpotifyDB.getAll())
      setNewName("")
      setNewUrl("")
      setIsAdding(false)
    }
  }

  const handleDelete = (id: string) => {
    SpotifyDB.delete(id)
    setPlaylists(SpotifyDB.getAll())
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="bg-gray-900 border-cyan-500/30 p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-cyan-400 flex items-center">
            <Music className="h-5 w-5 mr-2" />
            Playlists de Spotify
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-cyan-400">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Agregar Playlist */}
        <div className="mb-6">
          {!isAdding ? (
            <Button onClick={() => setIsAdding(true)} className="w-full bg-cyan-500 hover:bg-cyan-600 text-black">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Playlist
            </Button>
          ) : (
            <div className="space-y-3">
              <Input
                placeholder="Nombre (ej: Rock Clásico)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="bg-gray-800 border-cyan-500/30 text-white"
              />
              <Input
                placeholder="URL de Spotify (ej: https://open.spotify.com/playlist/...)"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="bg-gray-800 border-cyan-500/30 text-white"
              />
              <div className="flex gap-2">
                <Button onClick={handleAdd} className="flex-1 bg-green-500 hover:bg-green-600 text-black">
                  Guardar
                </Button>
                <Button
                  onClick={() => {
                    setIsAdding(false)
                    setNewName("")
                    setNewUrl("")
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Lista de Playlists */}
        <div className="space-y-3">
          {playlists.length === 0 ? (
            <p className="text-gray-400 text-center py-4">No hay playlists guardadas</p>
          ) : (
            playlists.map((playlist) => (
              <div
                key={playlist.id}
                className="flex justify-between items-center p-3 bg-gray-800 rounded-lg border border-cyan-500/20"
              >
                <div className="flex-1">
                  <p className="text-cyan-300 font-medium">{playlist.name}</p>
                  <p className="text-gray-400 text-xs truncate">{playlist.spotifyUrl}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open(playlist.spotifyUrl, "_blank")}
                    className="text-green-400 hover:text-green-300"
                    title="Abrir en Spotify"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(playlist.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                    title="Eliminar playlist"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
          <p className="text-cyan-300 text-sm">
            <strong>💡 Tip:</strong> Di "JARVIS abre Spotify" y luego el nombre de la playlist para reproducir música.
          </p>
          <p className="text-cyan-300 text-xs mt-2">
            <strong>📝 Nota:</strong> Copia la URL completa de Spotify desde la app o web.
          </p>
        </div>
      </Card>
    </div>
  )
}
