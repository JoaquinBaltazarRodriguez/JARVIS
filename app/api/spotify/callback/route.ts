import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const error = searchParams.get("error")
    const state = searchParams.get("state")

    console.log("🎵 SPOTIFY CALLBACK - CODE:", !!code)
    console.log("🎵 SPOTIFY CALLBACK - ERROR:", error)
    console.log("🎵 SPOTIFY CALLBACK - STATE:", state)

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || "https://9fd3-2803-9800-9543-8174-e913-f93-a56e-4e60.ngrok-free.app"

    if (error) {
      console.error("❌ SPOTIFY CALLBACK ERROR:", error)

      const errorPage = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>🎵 JARVIS - Error de Spotify</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; background: #1a1a1a; color: #22c55e; text-align: center; }
            .error { background: #dc2626; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            button { background: #22c55e; color: black; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 10px; }
          </style>
        </head>
        <body>
          <h1>🎵 JARVIS - Error de Spotify</h1>
          <div class="error">
            <h3>Error: ${error}</h3>
            <p>No se pudo conectar con Spotify</p>
          </div>
          <button onclick="window.close()">Cerrar</button>
          <button onclick="window.opener && window.opener.location.reload(); window.close();">Volver a JARVIS</button>
        </body>
        </html>
      `

      return new NextResponse(errorPage, {
        headers: { "Content-Type": "text/html" },
      })
    }

    if (!code) {
      console.error("❌ NO CODE RECEIVED")
      const noCodePage = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>🎵 JARVIS - Sin código</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; background: #1a1a1a; color: #22c55e; text-align: center; }
            .error { background: #dc2626; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            button { background: #22c55e; color: black; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 10px; }
          </style>
        </head>
        <body>
          <h1>🎵 JARVIS - Sin código de autorización</h1>
          <div class="error">
            <p>No se recibió código de autorización de Spotify</p>
          </div>
          <button onclick="window.close()">Cerrar</button>
          <button onclick="window.opener && window.opener.location.reload(); window.close();">Volver a JARVIS</button>
        </body>
        </html>
      `
      return new NextResponse(noCodePage, {
        headers: { "Content-Type": "text/html" },
      })
    }

    // 🔥 INTERCAMBIAR CÓDIGO POR TOKEN
    const clientId = process.env.SPOTIFY_CLIENT_ID
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI || `${baseUrl}/api/spotify/callback`

    console.log("🎵 USING REDIRECT URI FOR TOKEN:", redirectUri)

    if (!clientId || !clientSecret) {
      console.error("❌ MISSING SPOTIFY CREDENTIALS")
      const credentialsPage = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>🎵 JARVIS - Credenciales faltantes</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; background: #1a1a1a; color: #22c55e; text-align: center; }
            .error { background: #dc2626; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            button { background: #22c55e; color: black; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 10px; }
          </style>
        </head>
        <body>
          <h1>🎵 JARVIS - Credenciales faltantes</h1>
          <div class="error">
            <p>Faltan credenciales de Spotify en el servidor</p>
          </div>
          <button onclick="window.close()">Cerrar</button>
          <button onclick="window.opener && window.opener.location.reload(); window.close();">Volver a JARVIS</button>
        </body>
        </html>
      `
      return new NextResponse(credentialsPage, {
        headers: { "Content-Type": "text/html" },
      })
    }

    console.log("🎵 EXCHANGING CODE FOR TOKEN...")

    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    })

    console.log("🎵 TOKEN RESPONSE STATUS:", tokenResponse.status)

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error("❌ TOKEN EXCHANGE ERROR:", errorData)

      const tokenErrorPage = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>🎵 JARVIS - Error de token</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; background: #1a1a1a; color: #22c55e; text-align: center; }
            .error { background: #dc2626; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            button { background: #22c55e; color: black; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 10px; }
          </style>
        </head>
        <body>
          <h1>🎵 JARVIS - Error intercambiando token</h1>
          <div class="error">
            <p>Error al intercambiar código por token de acceso</p>
            <p>Detalles: ${errorData}</p>
          </div>
          <button onclick="window.close()">Cerrar</button>
          <button onclick="window.opener && window.opener.location.reload(); window.close();">Volver a JARVIS</button>
        </body>
        </html>
      `
      return new NextResponse(tokenErrorPage, {
        headers: { "Content-Type": "text/html" },
      })
    }

    const tokenData = await tokenResponse.json()
    console.log("✅ SPOTIFY TOKENS RECEIVED")

    // 🔥 CREAR PÁGINA DE ÉXITO CON MEJOR MANEJO
    const successPage = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>🎵 Spotify Conectado</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            padding: 20px; 
            background: #1a1a1a; 
            color: #22c55e; 
            text-align: center; 
          }
          .success { 
            background: #059669; 
            color: white; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0; 
            animation: pulse 2s infinite;
          }
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.7; }
            100% { opacity: 1; }
          }
          .countdown {
            font-size: 24px;
            font-weight: bold;
            color: #22c55e;
          }
        </style>
      </head>
      <body>
        <div class="success">
          <h1>🎵 ¡Spotify Conectado Exitosamente!</h1>
          <p>JARVIS ahora puede reproducir tu música</p>
          <div class="countdown" id="countdown">3</div>
          <p>Cerrando automáticamente...</p>
        </div>
        <script>
          console.log('🎵 SPOTIFY SUCCESS PAGE LOADED');
          
          // Función para guardar tokens
          function saveTokens() {
            try {
              if (window.opener) {
                console.log('🎵 SAVING TOKENS TO PARENT WINDOW');
                
                // Guardar tokens en localStorage del padre
                window.opener.localStorage.setItem('spotify_access_token', '${tokenData.access_token}');
                
                if ('${tokenData.refresh_token}' && '${tokenData.refresh_token}' !== 'undefined') {
                  window.opener.localStorage.setItem('spotify_refresh_token', '${tokenData.refresh_token}');
                }
                
                const expiresAt = ${Date.now() + (tokenData.expires_in || 3600) * 1000};
                window.opener.localStorage.setItem('spotify_expires_at', expiresAt.toString());
                
                // Notificar al padre que la autenticación fue exitosa
                window.opener.postMessage({ 
                  type: 'SPOTIFY_AUTH_SUCCESS',
                  tokens: {
                    access_token: '${tokenData.access_token}',
                    refresh_token: '${tokenData.refresh_token || ""}',
                    expires_at: expiresAt
                  }
                }, '*');
                
                console.log('✅ TOKENS SAVED AND MESSAGE SENT');
                return true;
              } else {
                console.error('❌ NO PARENT WINDOW FOUND');
                return false;
              }
            } catch (error) {
              console.error('❌ ERROR SAVING TOKENS:', error);
              return false;
            }
          }
          
          // Countdown y cierre automático
          let countdown = 3;
          const countdownElement = document.getElementById('countdown');
          
          const countdownInterval = setInterval(() => {
            countdown--;
            countdownElement.textContent = countdown;
            
            if (countdown <= 0) {
              clearInterval(countdownInterval);
              
              // Intentar guardar tokens
              const tokensSaved = saveTokens();
              
              if (tokensSaved) {
                console.log('🎵 CLOSING WINDOW AFTER SUCCESS');
                window.close();
              } else {
                console.log('🎵 REDIRECTING TO PARENT');
                if (window.opener) {
                  window.opener.focus();
                }
                window.close();
              }
            }
          }, 1000);
          
          // Guardar tokens inmediatamente también
          setTimeout(saveTokens, 500);
        </script>
      </body>
      </html>
    `

    return new NextResponse(successPage, {
      headers: { "Content-Type": "text/html" },
    })
  } catch (error) {
    console.error("❌ SPOTIFY CALLBACK COMPLETE ERROR:", error)

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || "https://9fd3-2803-9800-9543-8174-e913-f93-a56e-4e60.ngrok-free.app"

    const generalErrorPage = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>🎵 JARVIS - Error general</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; background: #1a1a1a; color: #22c55e; text-align: center; }
          .error { background: #dc2626; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          button { background: #22c55e; color: black; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 10px; }
        </style>
      </head>
      <body>
        <h1>🎵 JARVIS - Error general</h1>
        <div class="error">
          <p>Error inesperado en el callback de Spotify</p>
          <p>Error: ${error}</p>
        </div>
        <button onclick="window.close()">Cerrar</button>
        <button onclick="window.opener && window.opener.location.reload(); window.close();">Volver a JARVIS</button>
      </body>
      </html>
    `

    return new NextResponse(generalErrorPage, {
      headers: { "Content-Type": "text/html" },
    })
  }
}
