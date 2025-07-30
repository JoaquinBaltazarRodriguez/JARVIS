import React from "react";

export interface StarfieldProps {
  isSpeaking?: boolean; // Opcional
  startupMode?: boolean;
  disableAnimations?: boolean;
}

// Generando estrellas estáticas fuera del componente para que NUNCA cambien entre renderizados
const staticStars = Array.from({ length: 150 }).map(() => {
  const size = Math.random() * 3 + 1;
  return {
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    width: `${size}px`,
    height: `${size}px`,
    opacity: Math.random() * 0.5 + 0.5,
  };
});

export const Starfield: React.FC<StarfieldProps> = ({ startupMode }) => {
  // Siempre mostramos el fondo de estrellas, incluso en modo de inicio
  // para evitar parpadeos o pantalla negra durante transiciones
  return (
    <div className="fixed inset-0 bg-gradient-to-b from-black to-gray-950 overflow-hidden">
      {/* Estrellas estáticas (exactamente igual a ProfileSelector) */}
      {staticStars.map((star, index) => (
        <div
          key={index}
          className="absolute rounded-full bg-white"
          style={{
            top: star.top,
            left: star.left,
            width: star.width,
            height: star.height,
            opacity: star.opacity,
          }}
        />
      ))}
      
      {/* Nebulosas / nubes espaciales - exactamente como en ProfileSelector */}
      <div className="absolute top-1/4 left-1/4 w-1/3 h-1/3 rounded-full bg-purple-900/10 blur-3xl" />
      <div className="absolute top-2/3 left-2/3 w-1/4 h-1/4 rounded-full bg-blue-900/10 blur-3xl" />
      <div className="absolute top-1/2 left-1/6 w-1/5 h-1/5 rounded-full bg-cyan-900/10 blur-3xl" />
    </div>
  );
};

export default Starfield;