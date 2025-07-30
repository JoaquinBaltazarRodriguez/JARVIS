import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProfilesManager } from "@/lib/profilesManager";
import { motion, AnimatePresence } from "framer-motion";

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
  const [showHideConfirmation, setShowHideConfirmation] = useState(false);
  const [showRecoverProfile, setShowRecoverProfile] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [profileToHide, setProfileToHide] = useState<UserProfile | null>(null);
  const [localProfiles, setLocalProfiles] = useState<UserProfile[]>(profiles);
  
  const [newProfile, setNewProfile] = useState<Partial<UserProfile>>({
    color: COLORS[Math.floor(Math.random() * COLORS.length)]
  });
  const [passwordError, setPasswordError] = useState("");
  const [stars, setStars] = useState<{top: string, left: string, size: number, delay: string, duration: string}[]>([]);
  
  // Para recuperación de perfiles
  const [recoverEmail, setRecoverEmail] = useState("");
  const [recoverPassword, setRecoverPassword] = useState("");
  const [recoverError, setRecoverError] = useState("");
  
  // Actualiza los perfiles locales cuando cambian los props
  useEffect(() => {
    setLocalProfiles(profiles);
  }, [profiles]);

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

    // Ya no generamos estrellas fugaces
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

  // Manejar el clic en la cruz para ocultar un perfil
  const handleHideProfileClick = (profile: UserProfile) => {
    setProfileToHide(profile);
    setShowHideConfirmation(true);
  };
  
  // Confirmar y ocultar el perfil
  const confirmHideProfile = () => {
    if (profileToHide) {
      // Ocultar perfil usando ProfilesManager
      ProfilesManager.hideProfile(profileToHide.id);
      
      // Actualizar la lista local de perfiles
      const updatedProfiles = localProfiles.filter(p => p.id !== profileToHide.id);
      setLocalProfiles(updatedProfiles);
      
      // Mostrar notificación
      setNotificationMessage(`El perfil ${profileToHide.name} Se eliminó correctamente`);
      setShowNotification(true);
      
      // Ocultar después de 3 segundos
      setTimeout(() => {
        setShowNotification(false);
      }, 3000);
      
      // Cerrar modal de confirmación
      setShowHideConfirmation(false);
    }
  };
  
  // Recuperar perfil oculto
  const handleRecoverProfile = () => {
    setRecoverError("");
    
    if (!recoverEmail || !recoverPassword) {
      setRecoverError("Por favor ingresa email y contraseña");
      return;
    }
    
    const recoveredProfile = ProfilesManager.unhideProfile(recoverEmail, recoverPassword);
    
    if (recoveredProfile) {
      // Agregar el perfil recuperado a la lista local
      setLocalProfiles([...localProfiles, recoveredProfile]);
      
      // Mostrar notificación
      setNotificationMessage(`¡Inicio de sesion con éxito ${recoveredProfile.name}!`);
      setShowNotification(true);
      
      // Limpiar campos
      setRecoverEmail("");
      setRecoverPassword("");
      
      // Cerrar modal
      setShowRecoverProfile(false);
      
      // Ocultar notificación después de 3 segundos
      setTimeout(() => {
        setShowNotification(false);
      }, 3000);
    } else {
      setRecoverError("No se encontró el perfil o la contraseña es incorrecta");
    }
  };

  const handleAddProfile = () => {
    // Limitar a un máximo de 3 perfiles
    if (localProfiles.length >= 3) {
      setPasswordError("Límite de 3 perfiles alcanzado. Oculta uno para crear otro.");
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
      </div>
      
      {/* Título de la aplicación */}
      <h1 className="text-cyan-400 text-4xl md:text-5xl font-bold mb-10 relative z-10 tracking-wider"
          style={{
            textShadow: "0 0 15px rgba(34, 211, 238, 0.5), 0 0 30px rgba(34, 211, 238, 0.3)"
          }}>
        NEXUS
      </h1>
      
      {/* Contenedor de perfiles */}
      <div className="relative z-10 w-full max-w-4xl px-6">
        <h2 className="text-gray-300 text-2xl font-medium mb-10 text-center">
          Selecciona tu perfil
        </h2>
        
        <div className="flex flex-wrap justify-center gap-10">
          {localProfiles.map((profile) => (
            <div
              key={profile.id}
              className="group relative bg-gray-900/50 p-5 rounded-lg border border-gray-800 hover:border-cyan-800 transition-all duration-300 cursor-pointer w-56 flex flex-col items-center space-y-3 backdrop-blur-sm"
              style={{ boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)" }}
            >
              {/* Botón X para eliminar perfil */}
              <button 
                onClick={(e) => {
                  e.stopPropagation(); // Evitar que se seleccione el perfil
                  handleHideProfileClick(profile);
                }}
                className="absolute -right-2 -top-2 w-7 h-7 bg-red-500/90 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20"
              >
                ×
              </button>
              
              {/* Contenido del perfil clickeable */}
              <div 
                onClick={() => onProfileSelected(profile)}
                className="w-full h-full flex flex-col items-center space-y-3"
              >
                {/* Avatar circular con color personalizado */}
                <div 
                  className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-light border-2 transition-all duration-300 group-hover:shadow-lg"
                  style={{ 
                    borderColor: profile.color,
                    boxShadow: `0 0 10px ${profile.color}30`
                  }}
                >
                  <span className="uppercase">{profile.name.charAt(0)}</span>
                </div>
                
                <h3 className="text-lg font-medium text-white">
                  {profile.name}
                </h3>
                
                <p className="text-sm text-gray-400 truncate w-full text-center">
                  {profile.email}
                </p>
              </div>
            </div>
          ))}
          
          {/* Contenedor para botones de acción */}
          <div className="flex justify-center gap-10 w-full">
            {/* Botón para agregar nuevo perfil */}
            <div
              onClick={handleAddProfile}
              className="group cursor-pointer flex flex-col items-center justify-center space-y-3 transition-all duration-300"
              aria-label={localProfiles.length >= 3 ? "Límite de perfiles alcanzado" : "Crear perfil"}
              aria-disabled={localProfiles.length >= 3}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && localProfiles.length < 3) {
                  handleAddProfile();
                }
              }}
            >
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-br from-gray-800/80 to-gray-900/80 border-2 border-gray-700/50 hover:border-cyan-500/50 transition-all duration-300 shadow-lg shadow-cyan-900/10 hover:shadow-cyan-500/20 group-hover:scale-110"
              >
                <span className="text-gray-400 text-3xl group-hover:text-cyan-400 transition-colors duration-300">+</span>
              </div>
              <span className="text-gray-400 text-base md:text-lg text-center group-hover:text-cyan-400 transition-colors duration-300">
                Agregar perfil
              </span>
            </div>
            
            {/* Botón para iniciar sesión (recuperar perfil) */}
            <div
              onClick={() => setShowRecoverProfile(true)}
              className="group cursor-pointer flex flex-col items-center justify-center space-y-3 transition-all duration-300"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setShowRecoverProfile(true);
                }
              }}
            >
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-br from-gray-800/80 to-gray-900/80 border-2 border-gray-700/50 hover:border-cyan-500/50 transition-all duration-300 shadow-lg shadow-cyan-900/10 hover:shadow-cyan-500/20 group-hover:scale-110"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400 group-hover:text-cyan-400 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </div>
              <span className="text-gray-400 text-base md:text-lg text-center group-hover:text-cyan-400 transition-colors duration-300">
                Iniciar sesión
              </span>
            </div>
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
      
      {/* Modal de confirmación para ocultar perfil */}
      <Dialog open={showHideConfirmation} onOpenChange={setShowHideConfirmation}>
        <DialogContent className="max-w-md bg-gray-900 border border-red-900/50 text-white shadow-xl shadow-red-500/10 z-50">
          <DialogHeader>
            <DialogTitle className="text-red-400 text-xl"> Eliminar perfil </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <p className="text-gray-300">
              ¿Estás seguro que deseas quitar el perfil <span className="text-white font-semibold">{profileToHide?.name}</span>?
            </p>
            <p className="text-gray-300 text-sm">
              Se quitará el perfil de NEXUS
            </p>
            
            <div className="pt-4 flex justify-end space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => setShowHideConfirmation(false)}
                className="border border-gray-800/50 hover:bg-gray-900/20"
              >
                Cancelar
              </Button>
              <Button 
                onClick={confirmHideProfile}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Eliminar perfil
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Modal para recuperar perfil oculto */}
      <Dialog open={showRecoverProfile} onOpenChange={setShowRecoverProfile}>
        <DialogContent className="max-w-md bg-gray-900 border border-cyan-900/50 text-white shadow-xl shadow-cyan-500/10 z-50">
          <DialogHeader>
            <DialogTitle className="text-cyan-400 text-xl">Iniciar sesión</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <p className="text-gray-300 mb-4">
              Introduce el correo y contraseña para iniciar sesión.
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="recover-email" className="text-gray-300">Correo electrónico</Label>
              <Input 
                id="recover-email" 
                type="email"
                value={recoverEmail}
                onChange={e => setRecoverEmail(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="recover-password" className="text-gray-300">Contraseña</Label>
              <Input 
                id="recover-password" 
                type="password"
                value={recoverPassword}
                onChange={e => setRecoverPassword(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            
            {recoverError && (
              <p className="text-red-500 text-sm">{recoverError}</p>
            )}
            
            <div className="pt-4 flex justify-end space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => setShowRecoverProfile(false)}
                className="border border-cyan-800/50 hover:bg-cyan-900/20"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleRecoverProfile}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                Recuperar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Notificación emergente */}
      <AnimatePresence>
        {showNotification && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-gray-900/90 border border-cyan-500/50 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2"
          >
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>{notificationMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
