import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  gender: "masculine" | "feminine";
  password: string;
  color: string;
}

const COLORS = [
  "#2563eb", // blue
  "#d97706", // amber
  "#059669", // emerald
  "#7c3aed", // violet
  "#db2777", // pink
  "#0891b2", // cyan
];

interface ProfileSelectorProps {
  profiles: UserProfile[];
  onProfileSelected: (profile: UserProfile) => void;
  onProfileCreated: (profile: UserProfile) => void;
}

export function ProfileSelector({ profiles, onProfileSelected, onProfileCreated }: ProfileSelectorProps) {
  const [showCreateProfile, setShowCreateProfile] = useState(false);
  const [newProfile, setNewProfile] = useState<Partial<UserProfile>>({
    color: COLORS[Math.floor(Math.random() * COLORS.length)]
  });
  const [passwordError, setPasswordError] = useState("");
  const [stars, setStars] = useState<{top: string, left: string, size: number, delay: string, duration: string}[]>([]);
  const [shootingStars, setShootingStars] = useState<{top: string, left: string, delay: string, duration: string}[]>([]);

  // Generar estrellas y planetas al montar el componente
  useEffect(() => {
    // Generar estrellas aleatorias (más cantidad)
    const newStars = Array.from({ length: 150 }).map(() => ({
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: Math.random() * 3 + 1,
      delay: `${Math.random() * 5}s`,
      duration: `${Math.random() * 5 + 3}s`
    }));
    setStars(newStars);

    // Generar estrellas fugaces
    const newShootingStars = Array.from({ length: 5 }).map(() => ({
      top: `${Math.random() * 30}%`,
      left: `${-20 - Math.random() * 10}%`,
      delay: `${Math.random() * 15 + 5}s`,
      duration: `${Math.random() * 4 + 4}s`
    }));
    setShootingStars(newShootingStars);
  }, []);
   const validatePassword = (password: string) => {
    // Longitud mínima para seguridad básica
    if (password.length < 4) {
      setPasswordError("La contraseña debe tener al menos 4 caracteres");
      return false;
    }
    
    setPasswordError("");
    return true;
  };

  const handleCreateProfile = () => {
    if (!newProfile.name || !newProfile.email || !newProfile.gender || !newProfile.password) {
      setPasswordError("Todos los campos son obligatorios");
      return;
    }
    
    if (!validatePassword(newProfile.password)) {
      return;
    }
    
    const profile: UserProfile = {
      id: Date.now().toString(),
      name: newProfile.name,
      email: newProfile.email,
      gender: newProfile.gender as "masculine" | "feminine",
      password: newProfile.password,
      color: newProfile.color || COLORS[Math.floor(Math.random() * COLORS.length)]
    };
    
    onProfileCreated(profile);
    setShowCreateProfile(false);
    setNewProfile({
      color: COLORS[Math.floor(Math.random() * COLORS.length)]
    });
  };

  const handleAddProfile = () => {
    // Limitar a un máximo de 3 perfiles
    if (profiles.length >= 3) {
      setPasswordError("Límite de 3 perfiles alcanzado. Elimina uno para crear otro.");
      setTimeout(() => setPasswordError(""), 3000);
      return;
    }
    setShowCreateProfile(true);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-screen fixed inset-0 overflow-hidden">
      {/* Fondo espacial - fixed para ocupar toda la pantalla */}
      <div className="fixed inset-0 bg-gradient-to-b from-black to-gray-950 overflow-hidden">
        {/* Estrellas fijas con animación */}
        {stars.map((star, index) => (
          <div
            key={index}
            className="absolute rounded-full bg-white animate-twinkle"
            style={{
              top: star.top,
              left: star.left,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: Math.random() * 0.5 + 0.5,
              animationDelay: star.delay,
              animationDuration: star.duration
            }}
          />
        ))}

        {/* Nebulosas / nubes espaciales */}
        <div className="absolute top-1/4 left-1/4 w-1/3 h-1/3 rounded-full bg-purple-900/10 blur-3xl" />
        <div className="absolute top-2/3 left-2/3 w-1/4 h-1/4 rounded-full bg-blue-900/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/6 w-1/5 h-1/5 rounded-full bg-cyan-900/10 blur-3xl" />



        {/* Estrellas fugaces */}
        {shootingStars.map((star, index) => (
          <div
            key={`shooting-${index}`}
            className="absolute w-20 h-px bg-white animate-shooting-star"
            style={{
              top: star.top,
              left: star.left,
              animationDelay: star.delay,
              animationDuration: star.duration
            }}
          />
        ))}
      </div>
      
      {/* Contenido principal */}
      <div className="relative z-10 w-full max-w-4xl px-4 py-8 flex flex-col items-center">
        {/* Título sin fondo negro, solo con efecto de brillo */}
        <h1 className="text-3xl md:text-4xl font-bold mb-12 text-center" style={{ 
          background: 'linear-gradient(to right, #22d3ee, #3b82f6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 0 10px rgba(34, 211, 238, 0.5)'
        }}>
          Seleccione un perfil
        </h1>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 w-full max-w-3xl">
          {profiles.map((profile) => (
            <div 
              key={profile.id} 
              className="flex flex-col items-center cursor-pointer transition-all duration-300 hover:scale-110 group"
              onClick={() => onProfileSelected(profile)}
            >
              <div 
                className="w-28 h-28 rounded-full mb-5 flex items-center justify-center text-3xl font-bold text-white border-4 border-white/20 overflow-hidden relative shadow-lg shadow-cyan-900/20 transition-transform duration-300 group-hover:shadow-cyan-500/30 group-hover:border-white/30"
                style={{ backgroundColor: profile.color || "#2563eb" }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/20"></div>
                <span className="relative z-10">{profile.name.charAt(0).toUpperCase()}</span>
              </div>
              <span className="text-gray-200 text-base md:text-lg text-center group-hover:text-cyan-400 transition-colors duration-300">
                {profile.name}
              </span>
            </div>
          ))}
            
          {/* Agregar nuevo perfil */}
          <div
            className={`flex flex-col items-center transition-all duration-300 hover:scale-110 group ${profiles.length >= 3 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            onClick={handleAddProfile}
            tabIndex={profiles.length >= 3 ? -1 : 0}
            role="button"
            aria-label={profiles.length >= 3 ? "Límite de perfiles alcanzado" : "Crear perfil"}
            aria-disabled={profiles.length >= 3}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && profiles.length < 3) {
                handleAddProfile();
              }
            }}
          >
            <div className="w-28 h-28 rounded-full mb-5 flex items-center justify-center bg-gradient-to-br from-gray-800/80 to-gray-900/80 border-4 border-dashed border-gray-700/50 hover:border-cyan-500/50 transition-all duration-300 shadow-lg shadow-cyan-900/10 hover:shadow-cyan-500/20">
              <span className="text-gray-400 text-4xl group-hover:text-cyan-400 transition-colors duration-300">+</span>
            </div>
            <span className="text-gray-400 text-base md:text-lg text-center group-hover:text-cyan-400 transition-colors duration-300">
              Agregar perfil
            </span>
          </div>
        </div>
      </div>
      
      {/* Modal para crear perfil */}
      <Dialog open={showCreateProfile} onOpenChange={setShowCreateProfile}>
        <DialogContent className="max-w-md bg-gray-900 border border-cyan-900/50 text-white shadow-xl shadow-cyan-500/10 z-50">
          <DialogHeader>
            <DialogTitle className="text-cyan-400 text-xl">Crear nuevo perfil</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-300">Nombre</Label>
              <Input 
                id="name" 
                value={newProfile.name || ''}
                onChange={e => setNewProfile({...newProfile, name: e.target.value})}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300">Correo electrónico</Label>
              <Input 
                id="email" 
                type="email"
                value={newProfile.email || ''}
                onChange={e => setNewProfile({...newProfile, email: e.target.value})}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-gray-300">Género</Label>
              <RadioGroup
                value={newProfile.gender}
                onValueChange={(value) => setNewProfile({...newProfile, gender: value as "masculine" | "feminine"})}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="masculine" id="masculine" className="text-cyan-500" />
                  <Label htmlFor="masculine" className="text-gray-300">Masculino</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="feminine" id="feminine" className="text-cyan-500" />
                  <Label htmlFor="feminine" className="text-gray-300">Femenino</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">Contraseña (mínimo 4 caracteres)</Label>
              <Input 
                id="password" 
                type="password"
                value={newProfile.password || ''}
                onChange={e => setNewProfile({...newProfile, password: e.target.value})}
                className="bg-gray-800 border-gray-700 text-white"
              />
              {passwordError && (
                <p className="text-red-500 text-sm">{passwordError}</p>
              )}
            </div>
            
            <div className="pt-4 flex justify-end space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => setShowCreateProfile(false)}
                className="border border-cyan-800/50 hover:bg-cyan-900/20"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateProfile}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                Guardar perfil
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
