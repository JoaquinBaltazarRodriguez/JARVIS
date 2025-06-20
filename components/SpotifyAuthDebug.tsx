"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Music, ExternalLink, CheckCircle, AlertCircle } from "lucide-react"

interface SpotifyAuthDebugProps {
  onAuthSuccess: (token: string) => void
  onError: (error: string) => void
}

export function SpotifyAuthDebug({ onAuthSuccess, onError }: SpotifyAuthDebugProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [authStatus, setAuthStatus] = useState<string>("disconnected")
  const [debugLogs, setDebugLogs] = useState<string[]>([])
  const [tokens, setTokens] = useState<any>(null)

  const addLog = (message: string) => {
    console.log("🎵 SPOTIFY DEBUG:", message)
    setDebugLogs((prev) => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${message}`])
  }

  // Verificar tokens existentes al cargar
  useEffect(() => {
    const accessToken = localStorage.getItem("spotify_access_token")
    const refreshToken = localStorage.getItem("spotify_refresh_token")
    const expiresAt = localStorage.getItem("spotify_expires_at")

    if (accessToken) {
      const isExpired = expiresAt ? Date.now() > Number.parseInt(expiresAt) : false
      setAuthStatus(isExpired ? "expired" : "connected")
      setTokens({ accessToken, refreshToken, expiresAt, isExpired })
      addLog(`Tokens encontrados - Expirado: ${isExpired}`)

      if (!isExpired) {
        onAuthSuccess(accessToken)
      }
    } else {
      addLog("No se encontraron tokens guardados")
    }
  }, [onAuthSuccess])

  // Escuchar mensajes de la ventana de callback
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      addLog(`Mensaje recibido: ${event.data.type}`)

      if (event.data.type === "SPOTIFY_AUTH_SUCCESS") {
        addLog("¡Autenticación exitosa!")
        setAuthStatus("connected")
        setIsConnecting(false)

        if (event.data.tokens?.access_token) {
          setTokens(event.data.tokens)
          onAuthSuccess(event.data.tokens.access_token)
          addLog("Tokens procesados correctamente")
        } else {
          addLog("ERROR: No se recibieron tokens en el mensaje")
          onError("No se recibieron tokens")
        }
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [onAuthSuccess, onError])

  const handleConnect = async () => {
    try {
      setIsConnecting(true)
      addLog("Iniciando proceso de autenticación...")

      const response = await fetch("/api/spotify/auth")
      const data = await response.json()

      addLog(`Respuesta de auth API: ${data.configured ? "OK" : "ERROR"}`)

      if (data.configured && data.authUrl) {
        addLog("Abriendo ventana de Spotify...")

        const popup = window.open(data.authUrl, "spotify-auth", "width=600,height=700,scrollbars=yes,resizable=yes")

        if (!popup) {
          throw new Error("No se pudo abrir la ventana popup")
        }

        addLog("Ventana popup abierta correctamente")

        // Verificar si la ventana se cierra manualmente
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed)
            if (authStatus !== "connected") {
              addLog("Ventana cerrada sin completar autenticación")
              setIsConnecting(false)
            }
          }
        }, 1000)
      } else {
        throw new Error(data.error || "Error configurando Spotify")
      }
    } catch (error) {
      addLog(`ERROR: ${error}`)
      onError(error instanceof Error ? error.message : "Error desconocido")
      setIsConnecting(false)
    }
  }

  const handleDisconnect = () => {
    localStorage.removeItem("spotify_access_token")
    localStorage.removeItem("spotify_refresh_token")
    localStorage.removeItem("spotify_expires_at")
    setAuthStatus("disconnected")
    setTokens(null)
    addLog("Tokens eliminados - Desconectado")
  }

  const getStatusIcon = () => {
    switch (authStatus) {
      case "connected":
        return <CheckCircle className="h-5 w-5 text-green-400" />
      case "expired":
        return <AlertCircle className="h-5 w-5 text-yellow-400" />
      default:
        return <Music className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusText = () => {
    switch (authStatus) {
      case "connected":
        return "✅ Conectado"
      case "expired":
        return "⚠️ Token expirado"
      default:
        return "❌ Desconectado"
    }
  }

  return (
    <Card className="bg-gray-800/50 border-green-500/30 p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span className="text-green-400 font-bold">Spotify Debug</span>
          </div>
          <span className="text-sm text-green-300">{getStatusText()}</span>
        </div>

        {authStatus === "connected" ? (
          <div className="space-y-2">
            <p className="text-green-300 text-sm">🎵 Spotify conectado correctamente</p>
            <Button
              onClick={handleDisconnect}
              variant="outline"
              size="sm"
              className="border-red-500/50 text-red-400 hover:bg-red-500/20"
            >
              Desconectar
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            {isConnecting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Conectando...
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4 mr-2" />
                Conectar Spotify
              </>
            )}
          </Button>
        )}

        {/* Debug Info */}
        <div className="bg-gray-900/50 p-3 rounded text-xs">
          <p className="text-green-400 font-bold mb-2">🔍 Debug Logs:</p>
          {debugLogs.length > 0 ? (
            <div className="space-y-1">
              {debugLogs.map((log, index) => (
                <p key={index} className="text-green-200">
                  {log}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">No hay logs aún...</p>
          )}
        </div>

        {/* Token Info */}
        {tokens && (
          <div className="bg-gray-900/50 p-3 rounded text-xs">
            <p className="text-green-400 font-bold mb-2">🔑 Token Info:</p>
            <p className="text-green-200">Access Token: {tokens.accessToken ? "✅ Presente" : "❌ Faltante"}</p>
            <p className="text-green-200">Refresh Token: {tokens.refreshToken ? "✅ Presente" : "❌ Faltante"}</p>
            <p className="text-green-200">
              Expira: {tokens.expiresAt ? new Date(Number.parseInt(tokens.expiresAt)).toLocaleString() : "N/A"}
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}
