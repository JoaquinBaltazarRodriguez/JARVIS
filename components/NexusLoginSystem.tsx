import React, { useState, useEffect } from 'react';
import { ProfileSelector, type UserProfile } from './ProfileSelector';
import { PasswordScreen } from './PasswordScreen';
import { SplashScreen } from './SplashScreen';
import { LoadingScreen } from './LoadingScreen';
import { ProfilesManager } from '@/lib/profilesManager';
import { motion, AnimatePresence } from 'framer-motion';

interface NexusLoginSystemProps {
  onLoginComplete: (profile: UserProfile) => void;
}

export function NexusLoginSystem({ onLoginComplete }: NexusLoginSystemProps) {
  // Estados
  const [currentScreen, setCurrentScreen] = useState<'splash' | 'profiles' | 'password' | 'loading'>('splash');
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authenticatedProfile, setAuthenticatedProfile] = useState<UserProfile | null>(null);
  
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
    // Verificar si este perfil ya está autenticado (cuando viene del modal de login)
    const activeProfileId = localStorage.getItem('nexus_active_profile');
    
    if (activeProfileId === profile.id) {
      // Si el perfil ya está autenticado, saltar directamente a la pantalla de carga
      console.log('🔐 Perfil ya autenticado desde modal, saltando verificación de contraseña');
      setAuthenticatedProfile(profile);
      setCurrentScreen('loading');
    } else {
      // Flujo normal: mostrar pantalla de contraseña
      setSelectedProfile(profile);
      setCurrentScreen('password');
    }
  };
  
  const handleProfileCreated = (profile: UserProfile) => {
    // Guardar nuevo perfil si es necesario
    ProfilesManager.saveProfile(profile);
    
    // Actualizar lista de perfiles
    const updatedProfiles = ProfilesManager.getProfiles();
    setProfiles(updatedProfiles);
    
    // Comprobar si el perfil ya está autenticado (esto ocurre cuando se autentica desde el modal en ProfileSelector)
    const activeProfileId = localStorage.getItem('nexus_active_profile');
    const isAuthenticated = activeProfileId === profile.id;
    
    if (isAuthenticated) {
      // El perfil ya está autenticado, ir directamente a la pantalla de carga
      console.log('✅ Perfil ya autenticado, saltando pantalla de contraseña');
      setAuthenticatedProfile(profile);
      setCurrentScreen('loading');
    } else {
      // Seleccionar el nuevo perfil y pasar a pantalla de contraseña
      setSelectedProfile(profile);
      setCurrentScreen('password');
    }
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
      
      // Guardar el perfil autenticado y mostrar pantalla de carga
      setAuthenticatedProfile(selectedProfile);
      setCurrentScreen('loading');
      
      // Limpiar cualquier error previo
      setError(null);
    } else {
      setError('Contraseña incorrecta');
      
      // Limpiar error después de un tiempo
      setTimeout(() => {
        setError(null);
      }, 3000);
    }
  };

  // Manejador para la finalización de la pantalla de carga
  const handleLoadingComplete = () => {
    if (authenticatedProfile) {
      console.log("✅ Autenticación completada, llamando a onLoginComplete...");
      // Añadir un pequeño retraso para asegurar que todos los estados se actualicen correctamente
      setTimeout(() => {
        onLoginComplete(authenticatedProfile);
      }, 500);
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

        {currentScreen === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full h-full"
          >
            <LoadingScreen isVisible={true} onComplete={handleLoadingComplete} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
