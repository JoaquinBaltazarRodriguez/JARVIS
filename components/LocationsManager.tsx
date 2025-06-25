"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { LocationsDB, type Location } from "@/lib/database"
import { MapPin, Plus, Trash2, X } from "lucide-react"

interface LocationsManagerProps {
  isOpen: boolean
  onClose: () => void
}

export function LocationsManager({ isOpen, onClose }: LocationsManagerProps) {
  const [locations, setLocations] = useState<Location[]>([])
  const [newName, setNewName] = useState("")
  const [newAddress, setNewAddress] = useState("")
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setLocations(LocationsDB.getAll())
    }
  }, [isOpen])

  const handleAdd = () => {
    if (newName.trim() && newAddress.trim()) {
      const location = LocationsDB.add({ name: newName, address: newAddress, category: "other" })
      setLocations(LocationsDB.getAll())
      setNewName("")
      setNewAddress("")
      setIsAdding(false)
    }
  }

  const handleDelete = (id: string) => {
    LocationsDB.delete(id)
    setLocations(LocationsDB.getAll())
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="bg-gray-900 border-cyan-500/30 p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-cyan-400 flex items-center">
            <MapPin className="h-5 w-5 mr-2" />
            Ubicaciones Guardadas
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-cyan-400">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Agregar Ubicación */}
        <div className="mb-6">
          {!isAdding ? (
            <Button onClick={() => setIsAdding(true)} className="w-full bg-cyan-500 hover:bg-cyan-600 text-black">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Ubicación
            </Button>
          ) : (
            <div className="space-y-3">
              <Input
                placeholder="Nombre (ej: Casa de Luciana)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="bg-gray-800 border-cyan-500/30 text-white"
              />
              <Input
                placeholder="Dirección (ej: Calle 123, Ciudad)"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
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
                    setNewAddress("")
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

        {/* Lista de Ubicaciones */}
        <div className="space-y-3">
          {locations.length === 0 ? (
            <p className="text-gray-400 text-center py-4">No hay ubicaciones guardadas</p>
          ) : (
            locations.map((location) => (
              <div
                key={location.id}
                className="flex justify-between items-center p-3 bg-gray-800 rounded-lg border border-cyan-500/20"
              >
                <div>
                  <p className="text-cyan-300 font-medium">{location.name}</p>
                  <p className="text-gray-400 text-sm">{location.address}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      window.open(
                        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address)}`,
                        "_blank",
                      )
                    }
                    className="text-blue-400 hover:text-blue-300"
                    title="Ver en Google Maps"
                  >
                    <MapPin className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(location.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                    title="Eliminar ubicación"
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
            <strong>💡 Tip:</strong> Di "JARVIS activa el geolocalizador" y luego "ir a [nombre]" para navegar.
          </p>
        </div>
      </Card>
    </div>
  )
}
