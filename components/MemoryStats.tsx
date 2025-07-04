"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { NexusMemory } from "@/lib/jarvisMemory"
import { Brain, Trash2, BarChart3 } from "lucide-react"

export function MemoryStats() {
  const [stats, setStats] = useState(NexusMemory.getStats())
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(NexusMemory.getStats())
    }, 10000) // Actualizar cada 10 segundos

    return () => clearInterval(interval)
  }, [])

  const handleClearMemory = () => {
    if (confirm("¿Está seguro de que desea limpiar toda la memoria de NEXUS?")) {
      NexusMemory.clearMemory()
      setStats(NexusMemory.getStats())
    }
  }

  return (
    <Card className="bg-gray-900/80 border-purple-500/30 p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Brain className="h-4 w-4 text-purple-400" />
          <span className="text-purple-300 text-sm font-bold">Memoria NEXUS</span>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="text-purple-400 h-6 px-2"
          >
            <BarChart3 className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClearMemory} className="text-red-400 h-6 px-2">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="text-center">
          <div className="text-purple-400 font-bold text-lg">{stats.totalMemories}</div>
          <div className="text-gray-300">Memorias</div>
        </div>
        <div className="text-center">
          <div className="text-purple-400 font-bold text-lg">{Object.keys(stats.interactionPatterns).length}</div>
          <div className="text-gray-300">Patrones</div>
        </div>
      </div>

      {showDetails && (
        <div className="mt-3 pt-3 border-t border-purple-500/20">
          <div className="text-xs space-y-2">
            <div>
              <p className="text-purple-300 font-bold mb-1">Tipos de memoria:</p>
              {Object.entries(stats.memoryTypes).map(([type, count]) => (
                <div key={type} className="flex justify-between text-gray-300">
                  <span>{type}:</span>
                  <span>{count}</span>
                </div>
              ))}
            </div>

            {stats.commonQuestions.length > 0 && (
              <div>
                <p className="text-purple-300 font-bold mb-1">Preguntas frecuentes:</p>
                {stats.commonQuestions.slice(0, 3).map((question, idx) => (
                  <p key={idx} className="text-gray-400 text-xs truncate">
                    • {question}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
