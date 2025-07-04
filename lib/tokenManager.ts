"use client"

interface TokenUsage {
  totalTokens: number
  totalRequests: number
  totalCost: number
  dailyLimit: number
  monthlyBudget: number
  resetDate: Date
  lastUpdated: Date
}

interface TokenAlert {
  level: "info" | "warning" | "danger"
  message: string
  percentage: number
}

export class TokenManager {
  private static STORAGE_KEY = "nexus_token_usage"
  private static DAILY_LIMIT = 1000 // tokens por día
  private static MONTHLY_BUDGET = 5.0 // $5 USD
  private static COST_PER_1K_TOKENS = 0.002 // $0.002 por 1K tokens (gpt-4o-mini)

  // 📊 OBTENER USAGE ACTUAL
  static getUsage(): TokenUsage {
    if (typeof window === "undefined") {
      return this.getDefaultUsage()
    }

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (!stored) return this.getDefaultUsage()

      const usage = JSON.parse(stored)
      return {
        ...usage,
        resetDate: new Date(usage.resetDate),
        lastUpdated: new Date(usage.lastUpdated),
      }
    } catch {
      return this.getDefaultUsage()
    }
  }

  private static getDefaultUsage(): TokenUsage {
    const now = new Date()
    const resetDate = new Date(now)
    resetDate.setDate(resetDate.getDate() + 12) // 12 días como en tu imagen

    return {
      totalTokens: 0,
      totalRequests: 0,
      totalCost: 0,
      dailyLimit: this.DAILY_LIMIT,
      monthlyBudget: this.MONTHLY_BUDGET,
      resetDate,
      lastUpdated: now,
    }
  }

  // 💾 GUARDAR USAGE
  static saveUsage(usage: TokenUsage): void {
    if (typeof window === "undefined") return
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(usage))
  }

  // ➕ REGISTRAR USO DE TOKENS
  static recordUsage(tokensUsed: number): TokenUsage {
    const usage = this.getUsage()
    const cost = (tokensUsed / 1000) * this.COST_PER_1K_TOKENS

    const updatedUsage: TokenUsage = {
      ...usage,
      totalTokens: usage.totalTokens + tokensUsed,
      totalRequests: usage.totalRequests + 1,
      totalCost: usage.totalCost + cost,
      lastUpdated: new Date(),
    }

    this.saveUsage(updatedUsage)
    console.log("💰 TOKEN USAGE RECORDED:", {
      tokensUsed,
      cost: cost.toFixed(4),
      totalTokens: updatedUsage.totalTokens,
      totalCost: updatedUsage.totalCost.toFixed(4),
    })

    return updatedUsage
  }

  // ⚠️ VERIFICAR LÍMITES
  static checkLimits(): TokenAlert | null {
    const usage = this.getUsage()
    const costPercentage = (usage.totalCost / usage.monthlyBudget) * 100

    if (costPercentage >= 90) {
      return {
        level: "danger",
        message: "¡CRÍTICO! Ha usado el 90% de su presupuesto mensual",
        percentage: costPercentage,
      }
    }

    if (costPercentage >= 80) {
      return {
        level: "warning",
        message: "ADVERTENCIA: Ha usado el 80% de su presupuesto mensual",
        percentage: costPercentage,
      }
    }

    if (costPercentage >= 50) {
      return {
        level: "info",
        message: "INFO: Ha usado el 50% de su presupuesto mensual",
        percentage: costPercentage,
      }
    }

    return null
  }

  // 🚫 VERIFICAR SI PUEDE USAR TOKENS
  static canUseTokens(): { allowed: boolean; reason?: string } {
    const usage = this.getUsage()
    const costPercentage = (usage.totalCost / usage.monthlyBudget) * 100

    if (costPercentage >= 95) {
      return {
        allowed: false,
        reason: "Ha alcanzado el 95% de su presupuesto mensual. Modo inteligente deshabilitado.",
      }
    }

    return { allowed: true }
  }

  // 📈 OBTENER ESTADÍSTICAS PARA UI
  static getStats() {
    const usage = this.getUsage()
    const costPercentage = (usage.totalCost / usage.monthlyBudget) * 100
    const daysUntilReset = Math.ceil((usage.resetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

    return {
      totalTokens: usage.totalTokens,
      totalRequests: usage.totalRequests,
      totalCost: usage.totalCost,
      costPercentage: Math.min(costPercentage, 100),
      remainingBudget: Math.max(usage.monthlyBudget - usage.totalCost, 0),
      daysUntilReset,
      resetDate: usage.resetDate,
    }
  }

  // 🔄 RESETEAR USAGE (para testing)
  static resetUsage(): void {
    if (typeof window === "undefined") return
    localStorage.removeItem(this.STORAGE_KEY)
    console.log("🔄 TOKEN USAGE RESET")
  }
}
