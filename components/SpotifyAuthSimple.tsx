"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Music, CheckCircle, AlertCircle, ExternalLink } from "lucide-react"

interface SpotifyAuthSimple2Props {
  onAuthSuccess: (token: string) => void
  onError: (error: string) => void
}

export function SpotifyAuthSimple2({ onAuthSuccess, onError }: SpotifyAuthSimple2Props) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      checkExistingTokens();
      checkHashParams();
    }
  }, []);

  const checkExistingTokens = () => {
    if (typeof window === 'undefined') return;
    const token = window.localStorage.getItem("spotify_access_token");
    const expiresAt = window.localStorage.getItem("spotify_expires_at");

    if (token && expiresAt) {
      const isExpired = Date.now() > Number.parseInt(expiresAt);
      if (!isExpired) {
        setIsAuthenticated(true);
        onAuthSuccess(token);
        return;
      } else {
        window.localStorage.removeItem("spotify_access_token");
        window.localStorage.removeItem("spotify_expires_at");
      }
    }
  };

  const checkHashParams = () => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);

    const accessToken = params.get("access_token");
    const expiresIn = params.get("expires_in");
    const error = params.get("error");

    if (error) {
      setAuthError(`Error: ${error}`);
      onError(error);
      return;
    }

    if (accessToken && expiresIn) {
      const expiresAt = Date.now() + Number.parseInt(expiresIn) * 1000;

      window.localStorage.setItem("spotify_access_token", accessToken);
      window.localStorage.setItem("spotify_expires_at", expiresAt.toString());

      setIsAuthenticated(true);
      onAuthSuccess(accessToken);

      // Limpiar hash
      window.location.hash = "";
    }
  };

  const handleSpotifyAuth = () => {
    if (typeof window === 'undefined') return;
    const clientId = "3c997e3fe60c47e9998598b59eab2e9d";
    const redirectUri = window.location.origin;
    const scopes = [
      "streaming",
      "user-read-email",
      "user-read-private",
      "user-read-playback-state",
      "user-modify-playback-state",
      "playlist-read-private",
      "playlist-read-collaborative",
      "user-library-read",
    ].join(" ");

    const authUrl = `https://accounts.spotify.com/authorize?${new URLSearchParams({
      response_type: "token",
      client_id: clientId,
      scope: scopes,
      redirect_uri: redirectUri,
      show_dialog: "true",
    })}`;

    window.location.href = authUrl;
  };

  const handleLogout = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem("spotify_access_token");
    window.localStorage.removeItem("spotify_expires_at");
    setIsAuthenticated(false);
    setAuthError(null);
  };

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
          <h3 className="text-xl font-bold text-cyan-400">Conectar Spotify</h3>
        </div>

        {authError && (
          <div className="bg-red-900/50 border border-red-500/50 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <p className="text-red-300 text-sm">{authError}</p>
            </div>
          </div>
        )}

        <p className="text-gray-300">Método simple: Te redirigirá a Spotify y volverá automáticamente.</p>

        <Button onClick={handleSpotifyAuth} className="w-full bg-green-600 hover:bg-green-700 text-white">
          <ExternalLink className="h-4 w-4 mr-2" />
          Conectar con Spotify (Simple)
        </Button>

        <div className="text-xs text-gray-400 space-y-1">
          <p>• No requiere configuración especial</p>
          <p>• Funciona con cualquier URL</p>
          <p>• Método más confiable</p>
        </div>
      </div>
    </Card>
  )
}
