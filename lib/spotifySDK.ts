"use client"

interface SpotifyTrack {
  id: string
  name: string
  artists: string[]
  duration: number
  uri: string
}

interface SpotifyPlaylist {
  id: string
  name: string
  tracks: SpotifyTrack[]
  uri: string
}

interface SpotifyPlayer {
  device_id: string
  ready: boolean
  player: any
}

export class SpotifySDK {
  private static player: SpotifyPlayer | null = null
  private static accessToken: string | null = null
  private static isInitialized = false

  // 🎵 INICIALIZAR SPOTIFY SDK
  static async initialize(): Promise<boolean> {
    if (this.isInitialized) return true

    try {
      // Cargar Spotify Web Playback SDK
      await this.loadSpotifyScript()

      // Obtener token de acceso
      const token = await this.getAccessToken()
      if (!token) {
        console.log("🎵 No Spotify token available")
        return false
      }

      this.accessToken = token

      // Inicializar player
      await this.initializePlayer()

      this.isInitialized = true
      console.log("🎵 SPOTIFY SDK INITIALIZED")
      return true
    } catch (error) {
      console.error("❌ Spotify SDK initialization failed:", error)
      return false
    }
  }

  private static loadSpotifyScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).Spotify) {
        resolve()
        return
      }

      const script = document.createElement("script")
      script.src = "https://sdk.scdn.co/spotify-player.js"
      script.async = true

      script.onload = () => {
        // Esperar a que Spotify esté disponible
        const checkSpotify = () => {
          if ((window as any).Spotify) {
            resolve()
          } else {
            setTimeout(checkSpotify, 100)
          }
        }
        checkSpotify()
      }

      script.onerror = reject
      document.head.appendChild(script)
    })
  }

  private static async getAccessToken(): Promise<string | null> {
    try {
      // Primero intentar obtener de localStorage
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("spotify_access_token")
        if (token) {
          console.log("🎵 Token found in localStorage")
          return token
        }
      }

      // Si no hay token en localStorage, intentar el endpoint
      const response = await fetch("/api/spotify/token")
      const data = await response.json()

      if (data.access_token) {
        return data.access_token
      }

      return null
    } catch (error) {
      console.error("❌ Error getting Spotify token:", error)
      return null
    }
  }

  private static async initializePlayer(): Promise<void> {
    return new Promise((resolve, reject) => {
      const SpotifyApi = (window as any).Spotify

      if (!SpotifyApi) {
        reject(new Error("Spotify SDK not loaded"))
        return
      }

      const player = new SpotifyApi.Player({
        name: "JARVIS Music Player",
        getOAuthToken: (cb: (token: string) => void) => {
          cb(this.accessToken!)
        },
        volume: 0.8,
      })

      // Eventos del player
      player.addListener("ready", ({ device_id }: { device_id: string }) => {
        console.log("🎵 SPOTIFY PLAYER READY:", device_id)
        this.player = {
          device_id,
          ready: true,
          player,
        }
        resolve()
      })

      player.addListener("not_ready", ({ device_id }: { device_id: string }) => {
        console.log("🎵 SPOTIFY PLAYER NOT READY:", device_id)
      })

      player.addListener("initialization_error", ({ message }: { message: string }) => {
        console.error("❌ Spotify initialization error:", message)
        reject(new Error(message))
      })

      player.addListener("authentication_error", ({ message }: { message: string }) => {
        console.error("❌ Spotify authentication error:", message)
        reject(new Error(message))
      })

      player.addListener("account_error", ({ message }: { message: string }) => {
        console.error("❌ Spotify account error:", message)
        reject(new Error(message))
      })

      player.addListener("playback_error", ({ message }: { message: string }) => {
        console.error("❌ Spotify playback error:", message)
      })

      // Conectar player
      player.connect()
    })
  }

  // 🔗 AUTENTICACIÓN MEJORADA
  static async authenticate(): Promise<string | null> {
    try {
      console.log("🎵 STARTING SPOTIFY AUTHENTICATION...")

      const response = await fetch("/api/spotify/auth")

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.authUrl) {
        console.log("🎵 OPENING SPOTIFY AUTH URL:", data.authUrl)
        window.open(data.authUrl, "_blank")
        return data.authUrl
      } else {
        throw new Error("No auth URL received")
      }
    } catch (error) {
      console.error("❌ Spotify auth error:", error)
      alert(`Error de autenticación de Spotify: ${error}`)
      return null
    }
  }

  // ✅ VERIFICAR SI ESTÁ AUTENTICADO
  static async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken()
    return !!token
  }

  // 🎵 REPRODUCIR PLAYLIST
  static async playPlaylist(playlistUri: string): Promise<boolean> {
    if (!this.player || !this.accessToken) {
      console.log("🎵 Spotify not initialized, opening in browser")
      return false
    }

    try {
      const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${this.player.device_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          context_uri: playlistUri,
        }),
      })

      if (response.ok) {
        console.log("🎵 PLAYLIST PLAYING:", playlistUri)
        return true
      } else {
        console.error("❌ Failed to play playlist:", response.status)
        return false
      }
    } catch (error) {
      console.error("❌ Error playing playlist:", error)
      return false
    }
  }

  // 🎵 CONTROLES DE REPRODUCCIÓN
  static async play(): Promise<void> {
    if (this.player?.player) {
      await this.player.player.resume()
    }
  }

  static async pause(): Promise<void> {
    if (this.player?.player) {
      await this.player.player.pause()
    }
  }

  static async nextTrack(): Promise<void> {
    if (this.player?.player) {
      await this.player.player.nextTrack()
    }
  }

  static async previousTrack(): Promise<void> {
    if (this.player?.player) {
      await this.player.player.previousTrack()
    }
  }

  static async setVolume(volume: number): Promise<void> {
    if (this.player?.player) {
      await this.player.player.setVolume(volume / 100)
    }
  }

  // 🎵 OBTENER ESTADO ACTUAL
  static async getCurrentState(): Promise<any> {
    if (this.player?.player) {
      return await this.player.player.getCurrentState()
    }
    return null
  }
}
