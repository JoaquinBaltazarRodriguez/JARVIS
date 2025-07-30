import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Starfield from '@/components/Starfield';

interface SplashScreenProps {
  onStart: () => void;
}

export function SplashScreen({ onStart }: SplashScreenProps) {
  // Estado para controlar la animación al hacer clic
  const [isClicked, setIsClicked] = useState(false);
  
  // Efecto para las estrellas en movimiento
  const [stars, setStars] = useState<Array<{ x: number; y: number; opacity: number; size: number }>>([]);
  
  useEffect(() => {
    // Generar estrellas aleatorias
    const newStars = Array.from({ length: 100 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      opacity: Math.random() * 0.7 + 0.3,
      size: Math.random() * 2 + 1
    }));
    
    setStars(newStars);
  }, []);

  const handleLogoClick = () => {
    setIsClicked(true);
    
    // Permitir que termine la animación antes de continuar
    setTimeout(() => {
      onStart();
    }, 1200);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black flex flex-col items-center justify-center">
      {/* Fondo estático de estrellas para unificar la experiencia visual */}
      <Starfield startupMode={false} />
      
      {/* Círculo principal con logo */}
      <motion.div 
        className="relative z-10 cursor-pointer"
        initial={{ scale: 1 }}
        animate={{ 
          scale: isClicked ? [1, 1.2, 0.8] : [1, 1.05, 1],
          opacity: isClicked ? [1, 0.8, 0] : 1
        }}
        transition={{ 
          duration: isClicked ? 1.2 : 2, 
          repeat: isClicked ? 0 : Infinity,
          ease: "easeInOut" 
        }}
        onClick={handleLogoClick}
      >
        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-black border-4 border-cyan-500/30 flex items-center justify-center">
          <motion.div
            className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-transparent border-2 border-cyan-400 flex items-center justify-center"
            animate={{ 
              boxShadow: isClicked 
                ? ['0 0 10px rgba(6, 182, 212, 0.5)', '0 0 30px rgba(6, 182, 212, 0.8)', '0 0 5px rgba(6, 182, 212, 0.3)'] 
                : ['0 0 5px rgba(6, 182, 212, 0.3)', '0 0 15px rgba(6, 182, 212, 0.5)', '0 0 5px rgba(6, 182, 212, 0.3)'] 
            }}
            transition={{ duration: isClicked ? 1 : 3, repeat: isClicked ? 0 : Infinity }}
          >
            <motion.div 
              className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-transparent border border-cyan-500 flex items-center justify-center"
              animate={{ 
                rotate: isClicked ? [0, 180] : [0, 360],
              }}
              transition={{ duration: isClicked ? 1 : 20, repeat: isClicked ? 0 : Infinity, ease: "linear" }}
            >
              <motion.div 
                className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center"
                initial={{ opacity: 1 }}
                animate={{ 
                  opacity: isClicked ? [1, 0] : 1,
                  scale: isClicked ? [1, 1.5] : 1
                }}
                transition={{ duration: isClicked ? 0.8 : 1 }}
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-cyan-400">
                  <path 
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 16c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z" 
                    fill="currentColor"
                    opacity="0.7"
                  />
                  <path 
                    d="M12 8v4l3 3" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                  />
                </svg>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
      
      {/* Texto indicador */}
      <motion.div
        className="absolute bottom-20 text-center text-cyan-400"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.8 }}
      >
        <p className="text-xs uppercase tracking-widest mb-2">Toca para activar</p>
        <div className="flex justify-center">
          <motion.div
            className="h-8 w-px bg-cyan-400/30"
            animate={{ 
              height: ["24px", "16px", "24px"],
              opacity: [0.3, 0.7, 0.3]
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>
      </motion.div>
      
      {/* Texto de NEXUS */}
      <motion.div 
        className="absolute top-10 left-0 w-full flex justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
      >
        <h1 className="text-cyan-400 text-2xl md:text-3xl font-bold tracking-widest">
          NEXUS
        </h1>
      </motion.div>
      
      {/* Se ha eliminado el texto de activación por voz */}
    </div>
  );
}
