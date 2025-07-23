import React, { useState, useEffect } from "react";
import "./FuturisticCubeLoader.css";

interface FuturisticCubeLoaderProps {
  messages?: string[];
  delayMsPerMsg?: number;
  onFinish?: () => void;
}

const FuturisticCubeLoader: React.FC<FuturisticCubeLoaderProps> = ({
  messages = [
    "Inicializando NEXUS",
    "Cargando recursos...",
    "Cargando interfaz...",
    "Listo para comenzar..."
  ],
  delayMsPerMsg = 1200,
  onFinish,
}) => {
  const [msgIndex, setMsgIndex] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const progress = ((msgIndex + 1) / messages.length) * 100;

  // Mensajes técnicos para fondo Matrix
  const technicalLines = [
    "Cargando paquetes principales...",
    "Inicializando módulos de voz...",
    "Autenticando usuario...",
    "Sincronizando base de datos...",
    "Cargando interfaz gráfica...",
    "Optimizando recursos del sistema...",
    "Conectando a servicios externos...",
    "Verificando integridad de archivos...",
    "Configurando entorno de usuario...",
    "Activando protocolos de seguridad...",
    "Cargando comandos inteligentes...",
    "Preparando motor de síntesis de voz...",
    "Analizando preferencias...",
    "Iniciando monitoreo de sensores...",
    "Conectando a Spotify...",
    "Sincronizando calendario...",
    "Cargando módulos de IA...",
    "Listo para comenzar..."
  ];
  const rows = 18;
  const [matrixRows, setMatrixRows] = useState<string[]>(
    Array.from({ length: rows }, (_, i) =>
      technicalLines[i % technicalLines.length]
    )
  );
  const [matrixOffset, setMatrixOffset] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setMatrixOffset((prev) => (prev + 1) % technicalLines.length);
      setMatrixRows(
        Array.from({ length: rows }, (_, i) =>
          technicalLines[(i + matrixOffset) % technicalLines.length]
        )
      );
    }, 100);
    return () => clearInterval(interval);
  }, [matrixOffset]);

  // Mensaje y fade out
  useEffect(() => {
    if (messages[msgIndex] === "Cargando interfaz...") {
      setTimeout(() => setFadeOut(true), 700); // Espera breve antes de fade
      setTimeout(() => {
        if (onFinish) onFinish();
      }, 1700); // Fade out dura 1s
    } else if (msgIndex < messages.length - 1) {
      const timer = setTimeout(() => setMsgIndex((i) => i + 1), delayMsPerMsg);
      return () => clearTimeout(timer);
    }
  }, [msgIndex, messages, delayMsPerMsg, onFinish]);

  return (
    <div className={`cube-loader-overlay matrix-bg${fadeOut ? ' fade-out' : ''}`}>
      <div className="matrix-bg-anim">
        {matrixRows.map((row, i) => (
          <div key={i} className="matrix-row">{row}</div>
        ))}
      </div>
      <div className="cube-loader-content">
        <div className="cube-loader-title">{messages[msgIndex]}</div>
        <div className="polygon3d-scene">
          <div className="polygon3d-icosahedron">
            {[...Array(20)].map((_, i) => (
              <div key={i} className={`poly-face face${i+1}`}></div>
            ))}
          </div>
        </div>
        <div className="cube-loader-bar">
          <div className="cube-loader-bar-inner" style={{ width: `${progress}%`, transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1)' }}></div>
        </div>
      </div>
    </div>
  );
};

export default FuturisticCubeLoader;

