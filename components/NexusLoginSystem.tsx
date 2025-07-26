import React, { useState, useEffect } from 'react';
import { ProfileSelector, type UserProfile } from './ProfileSelector';
import { PasswordScreen } from './PasswordScreen';
import { SplashScreen } from './SplashScreen';
import { ProfilesManager } from '@/lib/profilesManager';
import { motion, AnimatePresence } from 'framer-motion';

interface NexusLoginSystemProps {
  onLoginComplete: (profile: UserProfile) => void;
}

export function NexusLoginSystem({ onLoginComplete }: NexusLoginSystemProps) {
  // Estados
  const [currentScreen, setCurrentScreen] = useState<'splash' | 'profiles' | 'password'>('splash');
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Cargar perfiles al iniciar
  useEffect(() => {
    const storedProfiles = ProfilesManager.getProfiles();
    setProfiles(storedProfiles);
    
    // Ya no preseleccionamos un perfil activo para mantener la coherencia del flujo
    // para que siempre pase por la pantalla de selección de perfiles
  }, []);
  
  // Manejadores de eventos
  const handleSplashStart = () => {
    // Siempre ir a la pantalla de selección de perfiles, independiente de cómo se active
    // Esto unifica el flujo tanto para activación por voz como por botón
    setCurrentScreen('profiles');
  };
  
  const handleProfileSelected = (profile: UserProfile) => {
    setSelectedProfile(profile);
    setCurrentScreen('password');
  };
  
  const handleProfileCreated = (profile: UserProfile) => {
    // Guardar nuevo perfil
    ProfilesManager.saveProfile(profile);
    
    // Actualizar lista de perfiles
    const updatedProfiles = ProfilesManager.getProfiles();
    setProfiles(updatedProfiles);
    
    // Seleccionar el nuevo perfil y pasar a pantalla de contraseña
    setSelectedProfile(profile);
    setCurrentScreen('password');
  };
  
  const handlePasswordVerified = (password: string) => {
    if (!selectedProfile) {
      setError('No hay perfil seleccionado');
      return;
    }
    
    // Verificar contraseña
    const isValid = ProfilesManager.validatePassword(selectedProfile.id, password);
    
    if (isValid) {
      // Establecer perfil activo
      ProfilesManager.setActiveProfile(selectedProfile.id);
      
      // Notificar al componente padre
      onLoginComplete(selectedProfile);
    } else {
      setError('Contraseña incorrecta');
      
      // Limpiar error después de un tiempo
      setTimeout(() => {
        setError(null);
      }, 3000);
    }
  };
  
  const handleBackToProfiles = () => {
    setCurrentScreen('profiles');
    setSelectedProfile(null);
    setError(null);
  };

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <AnimatePresence mode="wait">
        {currentScreen === 'splash' && (
          <motion.div
            key="splash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full h-full"
          >
            <SplashScreen onStart={handleSplashStart} />
          </motion.div>
        )}
        
        {currentScreen === 'profiles' && (
          <motion.div
            key="profiles"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="w-full h-full"
          >
            <ProfileSelector
              profiles={profiles}
              onProfileSelected={handleProfileSelected}
              onProfileCreated={handleProfileCreated}
            />
          </motion.div>
        )}
        
        {currentScreen === 'password' && selectedProfile && (
          <motion.div
            key="password"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            <PasswordScreen
              profile={selectedProfile}
              error={error}
              onPasswordVerified={handlePasswordVerified}
              onBack={handleBackToProfiles}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
