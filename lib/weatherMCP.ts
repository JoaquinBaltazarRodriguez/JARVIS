"use client"

interface WeatherCondition {
  description: string
  alerts: string[]
}

interface WeatherData {
  location: string
  temperature: number
  description: string
  humidity: number
  windSpeed: number
  pressure: number
  visibility: number
  uvIndex: number
  forecast: {
    day: string
    high: number
    low: number
    description: string
    precipitation: number
  }[]
  alerts?: string[]
}

interface LocationData {
  city: string
  country: string
  region: string
  timezone: string
  coordinates: {
    lat: number
    lon: number
  }
}

export class WeatherMCP {
  private static currentLocation: LocationData | null = null
  private static weatherCache: { [key: string]: { data: WeatherData; timestamp: number } } = {}
  private static readonly CACHE_DURATION = 10 * 60 * 1000 // 10 minutos

  // 🌍 DETECTAR UBICACIÓN AUTOMÁTICAMENTE
  static async detectLocation(): Promise<LocationData> {
    if (this.currentLocation) {
      return this.currentLocation
    }

    try {
      // 1. Intentar geolocalización del navegador
      const coords = await this.getCurrentPosition()
      if (coords) {
        // Simular reverse geocoding con datos realistas
        const location: LocationData = {
          city: "Madrid",
          country: "España",
          region: "Comunidad de Madrid",
          timezone: "Europe/Madrid",
          coordinates: coords,
        }

        this.currentLocation = location
        console.log("🌍 LOCATION DETECTED:", location)
        return location
      }
    } catch (error) {
      console.log("📍 Geolocation not available, using default")
    }

    // 2. Fallback a ubicación por IP (simulada)
    try {
      const ipLocation = await this.getLocationByIP()
      this.currentLocation = ipLocation
      return ipLocation
    } catch (error) {
      console.log("🌐 IP location failed, using default")
    }

    // 3. Ubicación por defecto
    const defaultLocation: LocationData = {
      city: "Madrid",
      country: "España",
      region: "Comunidad de Madrid",
      timezone: "Europe/Madrid",
      coordinates: { lat: 40.4168, lon: -3.7038 },
    }

    this.currentLocation = defaultLocation
    return defaultLocation
  }

  private static getCurrentPosition(): Promise<{ lat: number; lon: number } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null)
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          })
        },
        () => resolve(null),
        { timeout: 5000, enableHighAccuracy: false },
      )
    })
  }

  private static async getLocationByIP(): Promise<LocationData> {
    // Simular detección por IP con datos realistas
    const locations: LocationData[] = [
      {
        city: "Madrid",
        country: "España",
        region: "Comunidad de Madrid",
        timezone: "Europe/Madrid",
        coordinates: { lat: 40.4168, lon: -3.7038 },
      },
      {
        city: "Barcelona",
        country: "España",
        region: "Cataluña",
        timezone: "Europe/Madrid",
        coordinates: { lat: 41.3851, lon: 2.1734 },
      },
      {
        city: "Valencia",
        country: "España",
        region: "Comunidad Valenciana",
        timezone: "Europe/Madrid",
        coordinates: { lat: 39.4699, lon: -0.3763 },
      },
    ]

    // Seleccionar ubicación aleatoria para simular detección por IP
    return locations[Math.floor(Math.random() * locations.length)]
  }

  // 🌤️ GENERAR DATOS METEOROLÓGICOS REALISTAS
  static async getCurrentWeather(location?: string): Promise<WeatherData> {
    const targetLocation = await this.detectLocation()
    const cacheKey = location || targetLocation.city

    // Verificar cache
    const cached = this.weatherCache[cacheKey]
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log("🌤️ RETURNING CACHED WEATHER DATA")
      return cached.data
    }

    // Generar datos meteorológicos realistas basados en la ubicación y hora
    const now = new Date()
    const hour = now.getHours()
    const month = now.getMonth()
    const isSpain = targetLocation.country === "España"

    // Temperaturas realistas según la época del año y ubicación
    let baseTemp = 20
    if (isSpain) {
      // Temperaturas típicas de España por mes
      const monthlyTemps = [10, 12, 16, 18, 22, 27, 30, 30, 26, 20, 14, 10]
      baseTemp = monthlyTemps[month]
    }

    // Variación por hora del día
    const hourVariation = Math.sin(((hour - 6) * Math.PI) / 12) * 8
    const temperature = Math.round(baseTemp + hourVariation + (Math.random() - 0.5) * 4)

    // Condiciones meteorológicas realistas
    const conditions = this.generateRealisticConditions(month, hour, targetLocation)

    const weatherData: WeatherData = {
      location: location || `${targetLocation.city}, ${targetLocation.country}`,
      temperature,
      description: conditions.description,
      humidity: Math.floor(Math.random() * 30) + 40, // 40-70%
      windSpeed: Math.floor(Math.random() * 15) + 5, // 5-20 km/h
      pressure: Math.floor(Math.random() * 40) + 1000, // 1000-1040 hPa
      visibility: Math.floor(Math.random() * 5) + 10, // 10-15 km
      uvIndex: Math.max(0, Math.floor(Math.random() * 8) + 1), // 1-8
      forecast: this.generateForecast(baseTemp, targetLocation),
      alerts: conditions.alerts,
    }

    // Guardar en cache
    this.weatherCache[cacheKey] = {
      data: weatherData,
      timestamp: Date.now(),
    }

    console.log("🌤️ GENERATED REALISTIC WEATHER DATA:", weatherData)
    return weatherData
  }

  private static generateRealisticConditions(month: number, hour: number, location: LocationData): WeatherCondition {
    const isWinter = month >= 11 || month <= 2
    const isSummer = month >= 5 && month <= 8
    const isNight = hour < 7 || hour > 20

    const conditions: WeatherCondition[] = [
      { description: "Despejado", alerts: [] },
      { description: "Parcialmente nublado", alerts: [] },
      { description: "Nublado", alerts: [] },
      { description: "Cielo claro", alerts: [] },
    ]

    if (isWinter) {
      conditions.push(
        { description: "Lluvia ligera", alerts: ["Posible lluvia en las próximas horas"] },
        { description: "Nublado con chubascos", alerts: [] },
      )
    }

    if (isSummer && hour >= 12 && hour <= 16) {
      conditions.push({ description: "Soleado y caluroso", alerts: ["Altas temperaturas - manténgase hidratado"] })
    }

    if (isNight) {
      conditions.push(
        { description: "Cielo nocturno despejado", alerts: [] },
        { description: "Noche fresca", alerts: [] },
      )
    }

    return conditions[Math.floor(Math.random() * conditions.length)]
  }

  private static generateForecast(baseTemp: number, location: LocationData): WeatherData["forecast"] {
    const days = ["Hoy", "Mañana", "Pasado mañana", "Jueves", "Viernes"]

    return days.slice(0, 3).map((day, index) => {
      const tempVariation = (Math.random() - 0.5) * 6
      const high = Math.round(baseTemp + tempVariation + 5)
      const low = Math.round(baseTemp + tempVariation - 5)

      const descriptions = ["Soleado", "Parcialmente nublado", "Nublado", "Lluvia ligera", "Despejado", "Cielo claro"]

      return {
        day,
        high,
        low,
        description: descriptions[Math.floor(Math.random() * descriptions.length)],
        precipitation: Math.floor(Math.random() * 30), // 0-30%
      }
    })
  }

  // 🌍 OBTENER CLIMA POR CIUDAD ESPECÍFICA
  static async getWeatherByCity(cityName: string): Promise<WeatherData> {
    console.log("🌍 GETTING WEATHER FOR CITY:", cityName)
    return this.getCurrentWeather(cityName)
  }

  // 📊 GENERAR RESPUESTA INTELIGENTE PARA NEXUS
  static async generateWeatherResponse(query: string): Promise<string> {
    const weather = await this.getCurrentWeather()

    // Analizar el tipo de consulta
    const isTemperature = query.includes("temperatura") || query.includes("grados")
    const isForecast = query.includes("pronóstico") || query.includes("mañana") || query.includes("próximos días")
    const isConditions = query.includes("lluvia") || query.includes("sol") || query.includes("nublado")

    let response = `Señor, según mis sensores meteorológicos, `

    if (isTemperature) {
      response += `la temperatura actual en ${weather.location} es de ${weather.temperature}°C.`
    } else if (isForecast) {
      const tomorrow = weather.forecast[1]
      response += `el pronóstico para mañana en ${weather.location} indica ${tomorrow.description.toLowerCase()} con máxima de ${tomorrow.high}°C y mínima de ${tomorrow.low}°C.`
    } else if (isConditions) {
      response += `las condiciones actuales en ${weather.location} son: ${weather.description.toLowerCase()} con ${weather.temperature}°C.`
    } else {
      // Respuesta completa
      response += `en ${weather.location} tenemos ${weather.description.toLowerCase()} con ${weather.temperature}°C. `
      response += `La humedad es del ${weather.humidity}% y el viento sopla a ${weather.windSpeed} km/h.`

      if (weather.alerts && weather.alerts.length > 0) {
        response += ` Alerta: ${weather.alerts[0]}`
      }
    }

    return response
  }

  // 🔄 LIMPIAR CACHE
  static clearCache(): void {
    this.weatherCache = {}
    this.currentLocation = null
    console.log("🧹 WEATHER CACHE CLEARED")
  }
}
