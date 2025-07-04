"use client"

import { useState } from "react"
import { Download, ImageIcon, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface ImageDisplayProps {
  imageUrl: string
  prompt: string
  onClose?: () => void
  fallback?: boolean
  message?: string
}

export function ImageDisplay({ imageUrl, prompt, onClose, fallback, message }: ImageDisplayProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  const handleDownload = async () => {
    try {
      setIsDownloading(true)
      console.log("📥 DOWNLOADING IMAGE:", imageUrl)

      // Fetch de la imagen
      const response = await fetch(imageUrl)
      const blob = await response.blob()

      // Crear URL temporal
      const url = window.URL.createObjectURL(blob)

      // Crear elemento de descarga
      const link = document.createElement("a")
      link.href = url
      link.download = `nexus-image-${Date.now()}.png`
      document.body.appendChild(link)
      link.click()

      // Limpiar
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      setIsDownloading(false)
      console.log("✅ IMAGE DOWNLOADED")
    } catch (error) {
      console.error("Error downloading image:", error)
      setIsDownloading(false)
    }
  }

  return (
    <Card className="relative flex flex-col gap-4 border-none bg-transparent shadow-none">
      {onClose && (
        <Button
          onClick={onClose}
          variant="ghost"
          className="absolute right-2 top-2 h-8 w-8 p-0 data-[state=open]:bg-muted"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      {!imageLoaded && !fallback && (
        <div className="flex h-60 w-full items-center justify-center rounded-md bg-secondary">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        </div>
      )}
      {fallback ? (
        <div className="flex h-60 w-full items-center justify-center rounded-md bg-secondary">
          <ImageIcon className="h-10 w-10 text-muted-foreground" />
        </div>
      ) : (
        <img
          src={imageUrl}
          alt={prompt}
          className="aspect-square w-full rounded-md object-cover"
          onLoad={() => setImageLoaded(true)}
          style={{ display: imageLoaded ? "block" : "none" }}
        />
      )}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{message || prompt?.substring(0, 40)}</p>
        <Button onClick={handleDownload} disabled={isDownloading} className="ml-auto">
          {isDownloading ? (
            <>
              Downloading...
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            </>
          ) : (
            <>
              Download
              <Download className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </Card>
  )
}
