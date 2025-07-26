import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight } from "lucide-react";
import type { UserProfile } from "./ProfileSelector";
import Starfield from "@/components/Starfield";

interface PasswordScreenProps {
  profile: UserProfile;
  error: string | null;
  onPasswordVerified: (password: string) => void;
  onBack: () => void;
}

export function PasswordScreen({ profile, error: propError, onPasswordVerified, onBack }: PasswordScreenProps) {
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Inicializar el foco en el campo de contraseña al montar el componente

  useEffect(() => {
    // Autofocus en el campo de contraseña
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const error = propError || localError;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password) {
      onPasswordVerified(password);
    } else {
      setLocalError("Por favor, ingresa tu contraseña");
    }
  };

  // Generar estrellas para fondo espacial
  const [stars, setStars] = useState<{ x: number; y: number; opacity: number; size: number }[]>([]);
  const [shootingStars, setShootingStars] = useState<{ x: number; y: number; length: number; speed: number; opacity: number; delay: number }[]>([]);

  useEffect(() => {
    // Crear estrellas estáticas
    const newStars = Array.from({ length: 150 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      opacity: Math.random() * 0.7 + 0.3,
      size: Math.random() * 2 + 1
    }));
    setStars(newStars);

    // Crear estrellas fugaces
    const newShootingStars = Array.from({ length: 5 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      length: Math.random() * 10 + 5,
      speed: Math.random() * 5 + 2,
      opacity: Math.random() * 0.7 + 0.3,
      delay: Math.random() * 10
    }));
    setShootingStars(newShootingStars);
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[70vh] w-full max-w-md mx-auto">
      {/* Fondo espacial */}
      <Starfield isSpeaking={false} />
      
      {/* Contenido principal */}
      <div className="z-10 flex flex-col items-center bg-black/40 backdrop-blur-md rounded-xl p-8 w-full shadow-lg border border-cyan-900/30">
        {/* Avatar circular */}
        <div 
          className="w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-cyan-500/20 border-2 border-cyan-500/30"
          style={{ backgroundColor: profile.color }}
        >
          <span className="text-white text-4xl font-bold">
            {profile.name.charAt(0).toUpperCase()}
          </span>
        </div>
        
        <h2 className="text-xl text-cyan-400 mb-8">
          Hola, {profile.name}
        </h2>
        
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Input
                ref={inputRef}
                type="password"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setLocalError("");
                }}
                className="bg-gray-800/80 border-cyan-800/50 text-white pl-4 pr-4 py-6 text-lg rounded-l-md focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            
            <Button 
              type="submit" 
              className="bg-cyan-600 hover:bg-cyan-700 px-4 py-6 rounded-r-md"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
          
          {error && (
            <p className="text-red-400 text-center text-sm bg-red-900/20 py-2 rounded-md border border-red-700/30">
              {error}
            </p>
          )}
          
          <div className="pt-6 flex justify-between items-center">
            <Button
              type="button"
              variant="ghost"
              onClick={onBack}
              className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/30 border border-cyan-800/30 px-4"
            >
              Volver
            </Button>
          </div>
        </form>
      </div>

      {/* Efecto de estrellas fugaces */}
      {shootingStars.map((star, i) => (
        <div 
          key={`shooting-${i}`}
          className="absolute bg-gradient-to-r from-cyan-500 to-transparent opacity-70 z-0"
          style={{
            top: `${star.y}%`,
            left: `${star.x}%`,
            height: '2px',
            width: `${star.length}px`,
            opacity: star.opacity,
            transform: 'rotate(-45deg)',
            animation: `shootingStar ${star.speed}s linear ${star.delay}s infinite`
          }}
        />
      ))}

      <style jsx>{`
        @keyframes shootingStar {
          0% { transform: translateX(0) translateY(0) rotate(-45deg); opacity: 0; }
          15% { opacity: ${shootingStars[0]?.opacity || 0.5}; }
          70% { opacity: ${shootingStars[0]?.opacity || 0.5}; }
          100% { transform: translateX(400px) translateY(400px) rotate(-45deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
