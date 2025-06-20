"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { TokenManager } from "@/lib/tokenManager"
import { AlertTriangle, DollarSign, Zap, Calendar } from "lucide-react"

export function TokenDisplay() {
  const [stats, setStats] = useState(TokenManager.getStats())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const interval = setInterval(() => {
      setStats(TokenManager.getStats())
    }, 5000) // Actualizar cada 5 segundos

    return () => clearInterval(interval)
  }, [])

  if (!mounted) return null

  const getStatusColor = () => {
    if (stats.costPercentage >= 90) return "text-red-400"
    if (stats.costPercentage >= 80) return "text-yellow-400"
    if (stats.costPercentage >= 50) return "text-orange-400"
    return "text-green-400"
  }

  const getProgressColor = () => {
    if (stats.costPercentage >= 90) return "bg-red-500"
    if (stats.costPercentage >= 80) return "bg-yellow-500"
    if (stats.costPercentage >= 50) return "bg-orange-500"
    return "bg-green-500"
  }

  return (
    <Card className="bg-gray-900/80 border-cyan-500/30 p-3 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <DollarSign className="h-4 w-4 text-cyan-400" />
          <span className="text-cyan-300 text-sm font-bold">OpenAI Tokens</span>
        </div>
        {stats.costPercentage >= 80 && <AlertTriangle className="h-4 w-4 text-yellow-400 animate-pulse" />}
      </div>

      <div className="grid grid-cols-4 gap-2 text-xs">
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Zap className="h-3 w-3 text-blue-400 mr-1" />
          </div>
          <div className="text-gray-300">Tokens</div>
          <div className="text-blue-400 font-bold">{stats.totalTokens.toLocaleString()}</div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <DollarSign className="h-3 w-3 text-green-400 mr-1" />
          </div>
          <div className="text-gray-300">Costo</div>
          <div className={`font-bold ${getStatusColor()}`}>${stats.totalCost.toFixed(4)}</div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <span className="text-purple-400">%</span>
          </div>
          <div className="text-gray-300">Usado</div>
          <div className={`font-bold ${getStatusColor()}`}>{stats.costPercentage.toFixed(1)}%</div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Calendar className="h-3 w-3 text-cyan-400 mr-1" />
          </div>
          <div className="text-gray-300">Reset</div>
          <div className="text-cyan-400 font-bold">{stats.daysUntilReset}d</div>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="mt-2">
        <div className="w-full bg-gray-700 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${getProgressColor()}`}
            style={{ width: `${Math.min(stats.costPercentage, 100)}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>$0.00</span>
          <span>${stats.remainingBudget.toFixed(2)} restante</span>
          <span>$5.00</span>
        </div>
      </div>
    </Card>
  )
}
