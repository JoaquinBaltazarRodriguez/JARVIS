import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "NEXUS - Tu Asistente Personal",
  description: "NEXUS: Asistente inteligente con control por voz y domótica",
  manifest: "/manifest.json",
  themeColor: "#00d4ff",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.className} bg-black text-white overflow-hidden`}>{children}</body>
    </html>
  )
}
