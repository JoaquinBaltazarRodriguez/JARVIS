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

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://jarvis-kappa-amber.vercel.app"

    if (error) {
      console.error("❌ SPOTIFY CALLBACK ERROR:", error)
      return NextResponse.redirect(`${baseUrl}?spotify_error=${error}`)
    }

    if (!code) {
      console.error("❌ NO CODE RECEIVED")
      return NextResponse.redirect(`${baseUrl}?spotify_error=no_code`)
    }

    // 🔥 INTERCAMBIAR CÓDIGO POR TOKEN
    const clientId = process.env.SPOTIFY_CLIENT_ID
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI || `${baseUrl}/api/spotify/callback`

    console.log("🎵 USING REDIRECT URI FOR TOKEN:", redirectUri)

    if (!clientId || !clientSecret) {
      console.error("❌ MISSING SPOTIFY CREDENTIALS")
      return NextResponse.redirect(`${baseUrl}?spotify_error=missing_credentials`)
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
      return NextResponse.redirect(`${baseUrl}?spotify_error=token_exchange&details=${encodeURIComponent(errorData)}`)
    }

    const tokenData = await tokenResponse.json()
    console.log("✅ SPOTIFY TOKENS RECEIVED")

    // 🔥 REDIRIGIR CON TOKENS EN LA URL
    const successUrl = new URL(baseUrl)
    successUrl.searchParams.append("spotify_success", "true")
    successUrl.searchParams.append("access_token", tokenData.access_token)
    if (tokenData.refresh_token) {
      successUrl.searchParams.append("refresh_token", tokenData.refresh_token)
    }
    successUrl.searchParams.append("expires_in", tokenData.expires_in.toString())

    console.log("🎵 REDIRECTING TO:", successUrl.toString())

    return NextResponse.redirect(successUrl.toString())
  } catch (error) {
    console.error("❌ SPOTIFY CALLBACK COMPLETE ERROR:", error)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://jarvis-kappa-amber.vercel.app"
    return NextResponse.redirect(`${baseUrl}?spotify_error=callback_failed`)
  }
}
