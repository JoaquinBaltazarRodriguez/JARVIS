import React, { useState, useEffect } from 'react';
import { ProfileSelector, type UserProfile } from './ProfileSelector';
import { PasswordScreen } from './PasswordScreen';
import { SplashScreen } from './SplashScreen';
import { LoadingScreen } from './LoadingScreen';
import { ProfilesManager } from '@/lib/profilesManager'; // Mantenemos para compatibilidad
import { FirebaseProfileManager } from '@/lib/firebaseProfileManager'; // Nuevo gestor con Firebase
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
  
  // Cargar perfiles desde Firebase al iniciar
  useEffect(() => {
    const loadProfiles = async () => {
      try {
        // Obtener perfiles visibles desde Firebase
        const allProfiles = await FirebaseProfileManager.getProfiles();
        const visibleProfiles = allProfiles.filter(p => !p.isHidden);
        setProfiles(visibleProfiles);
      } catch (error) {
        console.error('Error al cargar perfiles desde Firebase:', error);
      }
    };
    
    loadProfiles();
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
    // No necesitamos guardar el perfil aquí ya que ya se ha creado en Firebase
    // a través de FirebaseProfileManager.createProfile en ProfileSelector
    
    // Actualizar la lista de perfiles en la interfaz
    FirebaseProfileManager.getProfiles().then(allProfiles => {
      const visibleProfiles = allProfiles.filter(p => !p.isHidden);
      setProfiles(visibleProfiles);
    }).catch(error => {
      console.error('Error al actualizar perfiles:', error);
    });
    
    // Para mantener compatibilidad con localStorage
    const activeProfileId = localStorage.getItem('nexus_active_profile');
    const isAuthenticated = activeProfileId === profile.id;
    
    if (isAuthenticated) {
      // El perfil ya está autenticado, ir directamente a la pantalla de carga
      console.log('✅ Perfil autenticado en Firebase, saltando pantalla de contraseña');
      setAuthenticatedProfile(profile);
      setCurrentScreen('loading');
    } else {
      // Seleccionar el nuevo perfil y pasar a pantalla de contraseña
      setSelectedProfile(profile);
      setCurrentScreen('password');
    }
  };
  
  const handlePasswordVerified = async (password: string) => {
    if (!selectedProfile) {
      setError('No hay perfil seleccionado');
      return;
    }
    
    try {
      // Verificar contraseña usando Firebase
      const authenticatedProfile = await FirebaseProfileManager.login(selectedProfile.email, password);
      
      if (authenticatedProfile) {
        // Establecer perfil activo (para compatibilidad con localStorage)
        ProfilesManager.setActiveProfile(authenticatedProfile.id);
        
        // Guardar el perfil autenticado y mostrar pantalla de carga
        setAuthenticatedProfile(authenticatedProfile);
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
    } catch (error) {
      console.error('Error al verificar contraseña:', error);
      setError('Error al verificar contraseña');
      
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
