// /app/api/spotify/callback/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  console.log("🎵 SPOTIFY CALLBACK RECEIVED");
  console.log("🎵 CODE:", code ? "✅ EXISTS" : "❌ MISSING");
  console.log("🎵 STATE:", state);
  console.log("🎵 ERROR:", error);

  if (error) {
    console.error("❌ SPOTIFY AUTH ERROR:", error);
    return NextResponse.redirect(
      new URL(`/?error=spotify_auth_denied&details=${error}`, request.url)
    );
  }

  if (!code) {
    console.error("❌ NO CODE RECEIVED");
    return NextResponse.redirect(
      new URL("/?error=no_auth_code", request.url)
    );
  }

  if (!state || !state.startsWith("jarvis-auth-")) {
    console.error("❌ INVALID STATE:", state);
    return NextResponse.redirect(
      new URL("/?error=invalid_state", request.url)
    );
  }

  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI || "https://jarvis-kappa-amber.vercel.app/api/spotify/callback";

    if (!clientId || !clientSecret) {
      throw new Error("Missing Spotify credentials");
    }

    console.log("🎵 EXCHANGING CODE FOR TOKENS...");

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
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error("❌ TOKEN EXCHANGE ERROR:", tokenData.error_description);
      throw new Error(tokenData.error_description);
    }

    console.log("✅ TOKENS RECEIVED SUCCESSFULLY");
    console.log("🎵 ACCESS TOKEN:", tokenData.access_token ? "✅ EXISTS" : "❌ MISSING");
    console.log("🎵 REFRESH TOKEN:", tokenData.refresh_token ? "✅ EXISTS" : "❌ MISSING");

    // Crear respuesta con cookies seguras
    const response = NextResponse.redirect(
      new URL("/?spotify_connected=true&status=success", request.url)
    );

    // Configurar cookies con tokens
    response.cookies.set("spotify_access_token", tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 3600, // 1 hora
      path: "/",
    });

    response.cookies.set("spotify_refresh_token", tokenData.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 365 * 24 * 60 * 60, // 1 año
      path: "/",
    });

    // También guardar tiempo de expiración
    response.cookies.set("spotify_token_expires", (Date.now() + tokenData.expires_in * 1000).toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 365 * 24 * 60 * 60, // 1 año
      path: "/",
    });

    console.log("✅ COOKIES SET SUCCESSFULLY");
    return response;

  } catch (error) {
    console.error("❌ CALLBACK ERROR:", error);
    return NextResponse.redirect(
      new URL(`/?error=spotify_auth_failed&details=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`, request.url)
    );
  }
}