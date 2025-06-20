"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Upload, File, ImageIcon, Code, FileText, X } from "lucide-react"

interface FileUploaderProps {
  onFileAnalyzed: (analysis: any, fileInfo: any) => void
  isProcessing: boolean
}

export function FileUploader({ onFileAnalyzed, isProcessing }: FileUploaderProps) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [prompt, setPrompt] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleAnalyze = async () => {
    if (!selectedFile) return

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("prompt", prompt)

      const response = await fetch("/api/mcp-file-analysis", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        onFileAnalyzed(data.analysis, data.fileInfo)
        setSelectedFile(null)
        setPrompt("")
      } else {
        console.error("Error analyzing file:", data.error)
      }
    } catch (error) {
      console.error("Error uploading file:", error)
    }
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) return <ImageIcon className="h-6 w-6 text-cyan-400" />
    if (file.type.startsWith("text/") || file.name.endsWith(".txt"))
      return <FileText className="h-6 w-6 text-green-400" />
    if (file.name.match(/\.(js|ts|jsx|tsx|py|java|cpp|c|html|css)$/))
      return <Code className="h-6 w-6 text-purple-400" />
    return <File className="h-6 w-6 text-gray-400" />
  }

  return (
    <Card className="bg-gray-900/80 border-purple-500/30 p-6 mb-4">
      <div className="text-center mb-4">
        <h3 className="text-purple-400 font-bold text-lg mb-2">📁 Análisis de Archivos JARVIS</h3>
        <p className="text-purple-300 text-sm">Sube imágenes, documentos o código para análisis inteligente</p>
      </div>

      {!selectedFile ? (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            dragActive
              ? "border-purple-400 bg-purple-500/10"
              : "border-purple-500/30 hover:border-purple-400 hover:bg-purple-500/5"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-12 w-12 text-purple-400 mx-auto mb-4" />
          <p className="text-purple-300 mb-2">Arrastra archivos aquí o haz clic para seleccionar</p>
          <p className="text-purple-200 text-sm">Soporta: imágenes, texto, código, PDFs</p>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,.txt,.md,.js,.ts,.jsx,.tsx,.py,.java,.cpp,.c,.html,.css,.pdf"
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-purple-500/20">
            <div className="flex items-center space-x-3">
              {getFileIcon(selectedFile)}
              <div>
                <p className="text-purple-300 font-medium">{selectedFile.name}</p>
                <p className="text-purple-200 text-sm">{Math.round(selectedFile.size / 1024)} KB</p>
              </div>
            </div>
            <Button
              onClick={() => setSelectedFile(null)}
              variant="ghost"
              size="icon"
              className="text-purple-400 hover:text-purple-300"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div>
            <label className="block text-purple-300 text-sm font-medium mb-2">
              ¿Qué quieres que analice? (opcional)
            </label>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ej: Explica este código, analiza esta imagen, resume este documento..."
              className="w-full bg-gray-800/50 border border-purple-500/30 rounded-lg px-4 py-2 text-purple-100 placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/50"
            />
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={isProcessing}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isProcessing ? "Analizando..." : "🧠 Analizar con JARVIS"}
          </Button>
        </div>
      )}
    </Card>
  )
}
