"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Music, CheckCircle, AlertCircle, Loader2 } from "lucide-react"

interface SpotifyAuthFixedProps {
  onAuthSuccess: (token: string) => void
  onError: (error: string) => void
}

export function SpotifyAuthFixed({ onAuthSuccess, onError }: SpotifyAuthFixedProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [debugLogs, setDebugLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logMessage = `${timestamp}: ${message}`
    setDebugLogs((prev) => [...prev.slice(-4), logMessage])
    console.log("🎵 SPOTIFY DEBUG:", logMessage)
  }

  useEffect(() => {
    checkExistingTokens()
    checkUrlParams()
  }, [])

  const checkExistingTokens = () => {
    const token = localStorage.getItem("spotify_access_token")
    const expiresAt = localStorage.getItem("spotify_expires_at")

    if (token && expiresAt) {
      const isExpired = Date.now() > Number.parseInt(expiresAt)
      if (!isExpired) {
        addLog("✅ Token válido encontrado")
        setIsAuthenticated(true)
        onAuthSuccess(token)
        return
      } else {
        addLog("⚠️ Token expirado, limpiando...")
        localStorage.removeItem("spotify_access_token")
        localStorage.removeItem("spotify_expires_at")
        localStorage.removeItem("spotify_refresh_token")
      }
    }
    addLog("❌ No se encontraron tokens válidos")
  }

  const checkUrlParams = () => {
    const urlParams = new URLSearchParams(window.location.search)

    // Verificar si hay tokens de éxito
    const accessToken = urlParams.get("access_token")
    const refreshToken = urlParams.get("refresh_token")
    const expiresIn = urlParams.get("expires_in")
    const spotifySuccess = urlParams.get("spotify_success")

    if (spotifySuccess === "true" && accessToken) {
      addLog("✅ Tokens recibidos del callback")

      const expiresAt = Date.now() + Number.parseInt(expiresIn || "3600") * 1000

      localStorage.setItem("spotify_access_token", accessToken)
      localStorage.setItem("spotify_expires_at", expiresAt.toString())

      if (refreshToken) {
        localStorage.setItem("spotify_refresh_token", refreshToken)
      }

      setIsAuthenticated(true)
      onAuthSuccess(accessToken)

      // Limpiar URL
      window.history.replaceState({}, document.title, window.location.pathname)
      return
    }

    // Verificar errores
    const spotifyError = urlParams.get("spotify_error")
    if (spotifyError) {
      addLog(`❌ Error de autenticación: ${spotifyError}`)
      setAuthError(`Error: ${spotifyError}`)
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }

  const handleSpotifyAuth = async () => {
    setIsLoading(true)
    setAuthError(null)
    addLog("🚀 Iniciando autenticación...")

    try {
      // Usar nuestro endpoint de auth
      const response = await fetch("/api/spotify/auth")
      const data = await response.json()

      if (data.configured && data.authUrl) {
        addLog("✅ URL de auth generada")
        addLog(`🔗 Redirigiendo a: ${data.authUrl.substring(0, 50)}...`)
        window.location.href = data.authUrl
      } else {
        throw new Error(data.error || "Error generando URL de autenticación")
      }
    } catch (error) {
      addLog(`❌ Error: ${error}`)
      setAuthError(`Error: ${error}`)
      onError(error.toString())
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("spotify_access_token")
    localStorage.removeItem("spotify_expires_at")
    localStorage.removeItem("spotify_refresh_token")
    setIsAuthenticated(false)
    setAuthError(null)
    addLog("🔓 Sesión cerrada")
  }

  if (isAuthenticated) {
    return (
      <Card className="bg-green-900/30 border-green-500/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-6 w-6 text-green-400" />
            <div>
              <p className="text-green-300 font-medium">✅ Conectado a Spotify</p>
              <p className="text-green-200 text-sm">Listo para reproducir música</p>
            </div>
          </div>
          <Button onClick={handleLogout} variant="ghost" size="sm" className="text-green-400">
            Desconectar
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="bg-gray-900/80 border-cyan-500/30 p-6">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2">
          <Music className="h-8 w-8 text-cyan-400" />
          <h3 className="text-xl font-bold text-cyan-400">Spotify Debug</h3>
        </div>

        <div className="text-left">
          <p className="text-cyan-400 font-semibold mb-2">
            🔍 Estado:
            <span className="text-red-400 ml-2">❌ Desconectado</span>
          </p>

          <div className="bg-gray-800/50 p-3 rounded text-xs space-y-1">
            <p className="text-green-400 font-semibold">📋 Debug Logs:</p>
            {debugLogs.map((log, index) => (
              <p key={index} className="text-green-200">
                {log}
              </p>
            ))}
          </div>
        </div>

        {authError && (
          <div className="bg-red-900/50 border border-red-500/50 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <p className="text-red-300 text-sm">{authError}</p>
            </div>
          </div>
        )}

        <Button
          onClick={handleSpotifyAuth}
          disabled={isLoading}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Conectando...
            </>
          ) : (
            <>
              <Music className="h-4 w-4 mr-2" />
              Conectar Spotify
            </>
          )}
        </Button>
      </div>
    </Card>
  )
}
