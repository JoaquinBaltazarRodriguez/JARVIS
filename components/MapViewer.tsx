"use client"

import { useState, useEffect, useImperativeHandle, forwardRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, Navigation, X, Volume2, Maximize, Minimize } from "lucide-react"

interface MapViewerProps {
  isActive: boolean
  destination: string
  destinationAddress: string
  onClose: () => void
  onNavigationUpdate?: (instruction: string) => void
}

export interface MapViewerRef {
  startNavigation: () => void
}

export const MapViewer = forwardRef<MapViewerRef, MapViewerProps>(
  ({ isActive, destination, destinationAddress, onClose, onNavigationUpdate }, ref) => {
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)
    const [navigationStep, setNavigationStep] = useState(0)
    const [isNavigating, setIsNavigating] = useState(false)
    const [mapUrl, setMapUrl] = useState("")
    const [isFullscreen, setIsFullscreen] = useState(false)

    // 🗺️ INSTRUCCIONES DE NAVEGACIÓN SIMULADAS
    const navigationSteps = [
      "Iniciando navegación hacia " + destination,
      "En 200 metros, gira a la derecha",
      "Continúa recto por 500 metros",
      "En 100 metros, gira a la izquierda",
      "Continúa recto por 300 metros",
      "En 50 metros, gira a la derecha",
      "Has llegado a tu destino: " + destination,
    ]

    // 🌍 OBTENER UBICACIÓN ACTUAL
    useEffect(() => {
      if (isActive) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            }
            setCurrentLocation(location)
            console.log("📍 CURRENT LOCATION:", location)

            // 🗺️ CREAR URL DE OPENSTREETMAP MEJORADA
            const bbox = `${location.lng - 0.01},${location.lat - 0.01},${location.lng + 0.01},${location.lat + 0.01}`
            const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${location.lat},${location.lng}`
            setMapUrl(osmUrl)
          },
          (error) => {
            console.error("❌ GEOLOCATION ERROR:", error)
            // Ubicación por defecto (Buenos Aires)
            const defaultLocation = { lat: -34.6037, lng: -58.3816 }
            setCurrentLocation(defaultLocation)

            // Mapa por defecto
            const bbox = `${defaultLocation.lng - 0.01},${defaultLocation.lat - 0.01},${defaultLocation.lng + 0.01},${defaultLocation.lat + 0.01}`
            const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${defaultLocation.lat},${defaultLocation.lng}`
            setMapUrl(osmUrl)
          },
        )
      }
    }, [isActive])

    // 🧭 FUNCIÓN DE NAVEGACIÓN EXPUESTA
    const startNavigation = () => {
      console.log("🗺️ STARTING NAVIGATION FROM VOICE COMMAND")
      setIsNavigating(true)
      setNavigationStep(0)
      const firstInstruction = navigationSteps[0]
      onNavigationUpdate?.(firstInstruction)
    }

    // 🧭 EXPONER FUNCIÓN A TRAVÉS DE REF
    useImperativeHandle(ref, () => ({
      startNavigation,
    }))

    // 🧭 SIMULACIÓN DE NAVEGACIÓN
    useEffect(() => {
      if (isActive && isNavigating) {
        const interval = setInterval(() => {
          setNavigationStep((prev) => {
            const nextStep = prev + 1
            if (nextStep < navigationSteps.length) {
              const instruction = navigationSteps[nextStep]
              console.log("🧭 NAVIGATION:", instruction)
              onNavigationUpdate?.(instruction)
              return nextStep
            } else {
              setIsNavigating(false)
              onNavigationUpdate?.("Navegación completada. Has llegado a tu destino.")
              return prev
            }
          })
        }, 8000) // Cada 8 segundos una nueva instrucción

        return () => clearInterval(interval)
      }
    }, [isActive, isNavigating, onNavigationUpdate])

    if (!isActive) return null

    return (
      <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
        {/* Header del Mapa */}
        <div className="flex justify-between items-center p-4 border-b border-blue-500/30 bg-gray-900/80">
          <div className="flex items-center">
            <MapPin className="h-6 w-6 text-blue-400 mr-2" />
            <div>
              <h2 className="text-lg font-bold text-blue-400">Navegación Activa</h2>
              <p className="text-blue-200 text-sm">Destino: {destination}</p>
              {isNavigating && <p className="text-yellow-300 text-xs animate-pulse">🧭 Navegación en curso...</p>}
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="text-blue-400"
            >
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-blue-400">
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Mapa Principal */}
        <div className="flex-1 relative">
          {currentLocation && mapUrl ? (
            <div className="w-full h-full relative">
              {/* 🗺️ MAPA DE OPENSTREETMAP */}
              <iframe
                src={mapUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                className="w-full h-full"
                title="Mapa de navegación"
              />

              {/* 🗺️ OVERLAY CON INFORMACIÓN DEL DESTINO */}
              <div className="absolute top-4 left-4 right-4 z-10">
                <Card className="bg-gray-900/90 border-blue-500/40 p-4 backdrop-blur-sm">
                  <div className="text-center">
                    <p className="text-blue-100 font-bold text-lg">{destination}</p>
                    <p className="text-blue-300 text-sm">{destinationAddress}</p>
                    <div className="flex justify-center space-x-2 mt-2">
                      <span className="px-2 py-1 bg-blue-500/20 rounded text-blue-300 text-xs">
                        📍 Ubicación actual detectada
                      </span>
                      <span className="px-2 py-1 bg-green-500/20 rounded text-green-300 text-xs">
                        🎯 Destino marcado
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MapPin className="h-16 w-16 text-blue-400 mx-auto mb-4 animate-pulse" />
                <p className="text-blue-300 text-lg">Obteniendo tu ubicación...</p>
                <p className="text-blue-200 text-sm mt-2">Permite el acceso a la ubicación para continuar</p>
                <div className="mt-4 p-3 bg-blue-500/10 rounded border border-blue-500/30">
                  <p className="text-blue-300 text-xs">
                    <strong>💡 Tip:</strong> Si no aparece el mapa, verifica los permisos de ubicación
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Overlay de Navegación */}
          {isNavigating && (
            <div className="absolute bottom-20 left-4 right-4 z-10">
              <Card className="bg-gray-900/90 border-blue-500/40 p-4 backdrop-blur-sm">
                <div className="flex items-center">
                  <Navigation className="h-5 w-5 text-blue-400 mr-3 animate-pulse" />
                  <div className="flex-1">
                    <p className="text-blue-100 font-medium">{navigationSteps[navigationStep]}</p>
                    <p className="text-blue-300 text-sm mt-1">
                      Paso {navigationStep + 1} de {navigationSteps.length}
                    </p>
                  </div>
                  <Volume2 className="h-4 w-4 text-blue-400 animate-pulse" />
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Controles Inferiores */}
        <div className="p-4 bg-gray-900/80 border-t border-blue-500/30">
          <div className="flex justify-center space-x-4">
            {!isNavigating ? (
              <Button onClick={startNavigation} className="bg-blue-500 hover:bg-blue-600 text-black">
                <Navigation className="h-4 w-4 mr-2" />
                Iniciar Navegación
              </Button>
            ) : (
              <Button
                onClick={() => setIsNavigating(false)}
                variant="outline"
                className="border-red-500/50 text-red-400"
              >
                Detener Navegación
              </Button>
            )}
            <Button onClick={onClose} variant="outline" className="border-blue-500/50 text-blue-400">
              Cerrar Mapa
            </Button>
          </div>
          <p className="text-center text-blue-300 text-xs mt-3">
            🎤 <strong>Control por voz:</strong> "JARVIS quitar mapa" para cerrar | "JARVIS iniciar navegación" para
            comenzar
          </p>
          <p className="text-center text-blue-200 text-xs mt-1">
            🗺️ <strong>Mapa:</strong> OpenStreetMap - Sin límites de API
          </p>
        </div>
      </div>
    )
  },
)

MapViewer.displayName = "MapViewer"
