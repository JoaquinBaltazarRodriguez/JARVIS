"use client"

import { useState, useEffect, useImperativeHandle, forwardRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, Navigation, X, Volume2, Maximize, Minimize } from "lucide-react"
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet"
import L, { LatLngExpression } from "leaflet"
import "leaflet/dist/leaflet.css"
import { getRouteORS, type LatLng, type RouteStep } from "@/utils/openRouteService"

// Fix default icon for leaflet
if (typeof window !== "undefined" && L) {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png",
  });
}

interface MapViewerProps {
  isActive: boolean
  destination: string
  destinationAddress: string
  onClose: () => void
  onNavigationUpdate?: (instruction: string) => void
}

export interface MapViewerRef {
  startNavigation: () => void
  centerOnUser: () => void
  stopNavigation: () => void
}

export const MapViewer = forwardRef<MapViewerRef, MapViewerProps>(
  ({ isActive, destination, destinationAddress, onClose, onNavigationUpdate }, ref) => {
    const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null)
    const [destinationCoords, setDestinationCoords] = useState<LatLng | null>(null)
    const [route, setRoute] = useState<{ geometry: LatLngExpression[]; steps: RouteStep[] } | null>(null)
    const [navigationStep, setNavigationStep] = useState(0)
    const [isNavigating, setIsNavigating] = useState(false)
    const [loadingRoute, setLoadingRoute] = useState(false)
    const [locationError, setLocationError] = useState<string | null>(null)
    const [isFullscreen, setIsFullscreen] = useState(false)

    // Convertir address a coordenadas (usando Nominatim OSM)
    async function geocodeAddress(address: string): Promise<LatLng | null> {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
        const res = await fetch(url)
        const data = await res.json()
        if (data && data.length > 0) {
          return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
        }
      } catch (e) { /* ignore */ }
      return null
    }

    // Obtener ubicación actual
    useEffect(() => {
      if (isActive) {
        setLocationError(null)
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            }
            setCurrentLocation(location)
          },
          (error) => {
            setLocationError("No se pudo obtener su ubicación actual.")
            setCurrentLocation({ lat: -34.6037, lng: -58.3816 }) // Default: Buenos Aires
          }
        )
      }
    }, [isActive])

    // Geocodificar destino
    useEffect(() => {
      if (destinationAddress && isActive) {
        geocodeAddress(destinationAddress).then((coords) => {
          setDestinationCoords(coords)
          if (!coords) {
            setLocationError("No se pudo encontrar la dirección indicada. Por favor, verifica el nombre o intenta con una dirección más precisa.")
          } else {
            setLocationError(null)
          }
        })
      }
    }, [destinationAddress, isActive])

    // Consultar ruta real
    useEffect(() => {
      async function fetchRoute() {
        if (currentLocation && destinationCoords) {
          setLoadingRoute(true)
          const res = await getRouteORS(currentLocation, destinationCoords)
          if (res && res.geometry && res.steps) {
            // Decodificar geometry (GeoJSON LineString)
            const coords: LatLngExpression[] = res.geometry.coordinates.map((c: number[]) => [c[1], c[0]])
            setRoute({ geometry: coords, steps: res.steps })
          } else {
            setRoute(null)
          }
          setLoadingRoute(false)
        }
      }
      if (currentLocation && destinationCoords) fetchRoute()
    }, [currentLocation, destinationCoords])

    // Navegación giro a giro real
    useEffect(() => {
      if (isActive && isNavigating && route && route.steps.length > 0) {
        let step = 0
        onNavigationUpdate?.(route.steps[0].instruction)
        const interval = setInterval(() => {
          step++
          if (step < route.steps.length) {
            setNavigationStep(step)
            onNavigationUpdate?.(route.steps[step].instruction)
          } else {
            setIsNavigating(false)
            onNavigationUpdate?.("Navegación completada. Has llegado a tu destino.")
            clearInterval(interval)
          }
        }, 8000)
        return () => clearInterval(interval)
      }
    }, [isActive, isNavigating, route])

    const handleCenterOnUser = () => {
      if (navigator.geolocation) {
        setLocationError(null)
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setCurrentLocation({ lat: position.coords.latitude, lng: position.coords.longitude })
          },
          () => setLocationError("No se pudo obtener su ubicación actual.")
        )
      }
    }

    // Exponer funciones para control externo (centrar en usuario, iniciar/detener navegación)
    useImperativeHandle(ref, () => ({
      startNavigation: () => setIsNavigating(true),
      stopNavigation: () => setIsNavigating(false),
      centerOnUser: handleCenterOnUser,
    }))

    if (!isActive) return null

    // Overlay de error si hay problemas de ubicación o geocodificación
    if (locationError) {
      return (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/80">
          <Card className="bg-red-900/90 border-red-500/50 p-8">
            <div className="flex flex-col items-center">
              <X className="h-12 w-12 text-red-400 mb-4 animate-pulse" />
              <p className="text-red-100 font-bold text-xl mb-2">Error de ubicación</p>
              <p className="text-red-200 mb-2">{locationError}</p>
              <Button onClick={onClose} className="mt-4 bg-red-500 hover:bg-red-600 text-white">Cerrar mapa</Button>
            </div>
          </Card>
        </div>
      )
    }

    // --- COMPONENTE PARA CENTRAR MAPA EN UBICACIÓN ---
    function CenterMap({ position }: { position: LatLng }) {
      const map = useMap()
      useEffect(() => {
        map.setView([position.lat, position.lng], 15)
      }, [position.lat, position.lng])
      return null
    }

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
          {currentLocation ? (
            <div className="w-full h-full relative">
              <MapContainer
                center={[currentLocation.lat, currentLocation.lng]}
                zoom={15}
                style={{ width: "100%", height: "100%" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {route && (
                  <Polyline
                    positions={route.geometry}
                    color="blue"
                    weight={5}
                    opacity={0.8}
                    dashArray="3"
                  />
                )}
                {currentLocation && (
                  <Marker
                    position={[currentLocation.lat, currentLocation.lng]}
                    icon={L.icon({
                      iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
                      iconSize: [25, 41],
                      iconAnchor: [12, 41],
                    })}
                  />
                )}
                {destinationCoords && (
                  <Marker
                    position={[destinationCoords.lat, destinationCoords.lng]}
                    icon={L.icon({
                      iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
                      iconSize: [25, 41],
                      iconAnchor: [12, 41],
                    })}
                  />
                )}
              </MapContainer>
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
          {isNavigating && route && route.steps.length > 0 && (
            <div className="absolute bottom-20 left-4 right-4 z-10">
              <Card className="bg-gray-900/90 border-blue-500/40 p-4 backdrop-blur-sm">
                <div className="flex items-center">
                  <Navigation className="h-5 w-5 text-blue-400 mr-3 animate-pulse" />
                  <div className="flex-1">
                    <p className="text-blue-100 font-medium">{route.steps[navigationStep]?.instruction}</p>
                    <p className="text-blue-300 text-sm mt-1">
                      Paso {navigationStep + 1} de {route.steps.length}
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
            <Button
  onClick={async () => {
    handleCenterOnUser();
    if (window.speechSynthesis) {
      const utter = new window.SpeechSynthesisUtterance("Centrando el mapa en su ubicación actual, Señor.");
      utter.lang = "es-ES";
      window.speechSynthesis.speak(utter);
    }
  }}
  variant="outline"
  className="border-blue-400 text-blue-200"
>
  <MapPin className="h-4 w-4 mr-2" /> Centrar en mi ubicación
</Button>
            {!isNavigating ? (
  <Button
    onClick={async () => {
      setIsNavigating(true);
      if (window.speechSynthesis) {
        const utter = new window.SpeechSynthesisUtterance("Iniciando navegación, Señor.");
        utter.lang = "es-ES";
        window.speechSynthesis.speak(utter);
      }
    }}
    className="bg-blue-500 hover:bg-blue-600 text-black"
  >
    <Navigation className="h-4 w-4 mr-2" /> Iniciar Navegación
  </Button>
) : (
  <Button
    onClick={async () => {
      setIsNavigating(false);
      if (window.speechSynthesis) {
        const utter = new window.SpeechSynthesisUtterance("Navegación detenida, Señor.");
        utter.lang = "es-ES";
        window.speechSynthesis.speak(utter);
      }
    }}
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
          {!isNavigating && (
            <p className="text-center text-blue-300 text-xs mt-3">
              🎤 <strong>Control por voz:</strong> "NEXUS quitar mapa" para cerrar | "NEXUS iniciar navegación" para comenzar
            </p>
          )}
          <p className="text-center text-blue-200 text-xs mt-1">
            🗺️ <strong>Mapa:</strong> OpenStreetMap + Rutas reales por OpenRouteService
          </p>
        </div>
      </div>
    )
  },
)

MapViewer.displayName = "MapViewer"
