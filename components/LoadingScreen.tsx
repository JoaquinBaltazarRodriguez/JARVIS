"use client"

import { useEffect, useState } from "react"

interface LoadingScreenProps {
  isVisible: boolean
  onComplete: () => void
}

export function LoadingScreen({ isVisible, onComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0)
  const [isAnimatingOut, setIsAnimatingOut] = useState(false)

  useEffect(() => {
    if (!isVisible) return

    let progressInterval: NodeJS.Timeout
    let currentProgress = 0

    // Simular progreso de carga realista
    const updateProgress = () => {
      const increment = Math.random() * 12 + 3 // Entre 3-15% por vez
      currentProgress += increment

      if (currentProgress >= 100) {
        currentProgress = 100
        setProgress(100)

        // Esperar un momento en 100% antes de desaparecer
        setTimeout(() => {
          setIsAnimatingOut(true)
          // Después de la animación de salida, notificar completado
          setTimeout(() => {
            onComplete()
          }, 800)
        }, 800)

        clearInterval(progressInterval)
      } else {
        setProgress(currentProgress)
      }
    }

    // Iniciar progreso después de un pequeño delay
    setTimeout(() => {
      progressInterval = setInterval(updateProgress, 200)
    }, 300)

    return () => {
      if (progressInterval) clearInterval(progressInterval)
    }
  }, [isVisible, onComplete])

  if (!isVisible) return null

  return (
    <div
      className={`fixed inset-0 z-[100] bg-transparent flex items-center justify-center transition-opacity duration-800 ${
        isAnimatingOut ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Fondo de partículas */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400 rounded-full animate-pulse opacity-30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Contenido principal */}
      <div className="relative flex flex-col items-center">
        {/* Cubo 3D giratorio */}
        <div className="relative mb-12">
          {/* Efectos de resplandor */}
          <div className="absolute inset-0 animate-pulse">
            <div className="w-32 h-32 border border-cyan-400/30 rounded-lg animate-ping"></div>
          </div>
          <div className="absolute inset-2 animate-pulse delay-75">
            <div className="w-28 h-28 border border-cyan-400/20 rounded-lg animate-ping"></div>
          </div>

          {/* Cubo principal */}
          <div className="cube-container">
            <div className="cube">
              <div className="face front"></div>
              <div className="face back"></div>
              <div className="face right"></div>
              <div className="face left"></div>
              <div className="face top"></div>
              <div className="face bottom"></div>
            </div>
          </div>
        </div>

        {/* Texto de inicialización */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-cyan-400 tracking-[0.3em] mb-2 text-center">
            <span className="loading-text">INICIALIZANDO</span>
            <span className="loading-dots">
              <span className="dot">.</span>
              <span className="dot">.</span>
              <span className="dot">.</span>
            </span>
          </h2>
          <p className="text-cyan-300/70 text-sm text-center font-mono">NEXUS SYSTEM STARTUP</p>
        </div>

        {/* Barra de progreso */}
        <div className="w-80 max-w-sm">
          <div className="flex justify-between text-xs text-cyan-400 mb-2 font-mono">
            <span>PROGRESS</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-800/50 rounded-full h-2 border border-cyan-500/30 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-cyan-300 rounded-full transition-all duration-300 ease-out relative"
              style={{ width: `${progress}%` }}
            >
              {/* Efecto de brillo en la barra */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
            </div>
          </div>

          {/* Indicadores de sistema */}
          <div className="mt-4 space-y-1 text-xs font-mono text-cyan-400/60">
            <div className={`transition-opacity duration-300 ${progress > 20 ? "opacity-100" : "opacity-30"}`}>
              ✓ Inicializando módulos de voz...
            </div>
            <div className={`transition-opacity duration-300 ${progress > 40 ? "opacity-100" : "opacity-30"}`}>
              ✓ Cargando base de datos...
            </div>
            <div className={`transition-opacity duration-300 ${progress > 60 ? "opacity-100" : "opacity-30"}`}>
              ✓ Conectando servicios IA...
            </div>
            <div className={`transition-opacity duration-300 ${progress > 80 ? "opacity-100" : "opacity-30"}`}>
              ✓ Activando protocolos NEXUS...
            </div>
            <div className={`transition-opacity duration-300 ${progress >= 100 ? "opacity-100" : "opacity-30"}`}>
              ✓ Sistema completamente operativo
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .cube-container {
          perspective: 1000px;
          width: 120px;
          height: 120px;
        }

        .cube {
          position: relative;
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
          animation: rotateCube 4s infinite linear;
        }

        .face {
          position: absolute;
          width: 120px;
          height: 120px;
          border: 2px solid #00ffff;
          background: rgba(0, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          box-shadow: 
            0 0 20px rgba(0, 255, 255, 0.5),
            inset 0 0 20px rgba(0, 255, 255, 0.1);
        }

        .face::before {
          content: '';
          position: absolute;
          inset: 10px;
          border: 1px solid rgba(0, 255, 255, 0.3);
          background: linear-gradient(45deg, transparent, rgba(0, 255, 255, 0.1), transparent);
        }

        .front  { transform: rotateY(0deg) translateZ(60px); }
        .back   { transform: rotateY(180deg) translateZ(60px); }
        .right  { transform: rotateY(90deg) translateZ(60px); }
        .left   { transform: rotateY(-90deg) translateZ(60px); }
        .top    { transform: rotateX(90deg) translateZ(60px); }
        .bottom { transform: rotateX(-90deg) translateZ(60px); }

        @keyframes rotateCube {
          0% { transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg); }
          33% { transform: rotateX(90deg) rotateY(180deg) rotateZ(0deg); }
          66% { transform: rotateX(180deg) rotateY(180deg) rotateZ(90deg); }
          100% { transform: rotateX(360deg) rotateY(360deg) rotateZ(360deg); }
        }

        .loading-text {
          display: inline-block;
        }

        .loading-dots .dot {
          animation: loadingDots 1.5s infinite;
        }

        .loading-dots .dot:nth-child(1) { animation-delay: 0s; }
        .loading-dots .dot:nth-child(2) { animation-delay: 0.3s; }
        .loading-dots .dot:nth-child(3) { animation-delay: 0.6s; }

        @keyframes loadingDots {
          0%, 60%, 100% { opacity: 0.3; }
          30% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
