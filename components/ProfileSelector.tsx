import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProfilesManager } from "@/lib/profilesManager"; // Mantenemos para compatibilidad
import { FirebaseProfileManager } from "@/lib/firebaseProfileManager"; // Nuevo gestor con Firebase
import { motion, AnimatePresence } from "framer-motion";
import { Slider } from "@/components/ui/slider";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  gender: "masculine" | "feminine";
  password: string;
  color: string;
  photoUrl?: string; // URL de la foto de perfil (base64 o URL)
  isHidden?: boolean; // Indica si el perfil está oculto/eliminado
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
  // Referencias para elementos DOM
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const imageEditorRef = useRef<HTMLDivElement>(null);

  // Estados para manejo de modales
  const [showCreateProfile, setShowCreateProfile] = useState(false);
  const [showHideConfirmation, setShowHideConfirmation] = useState(false);
  const [showRecoverProfile, setShowRecoverProfile] = useState(false);
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [loginPassword, setLoginPassword] = useState("");
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [profileToHide, setProfileToHide] = useState<UserProfile | null>(null);
  const [localProfiles, setLocalProfiles] = useState<UserProfile[]>(profiles);
  
  // Estados para creación de perfil
  const [newProfile, setNewProfile] = useState<Partial<UserProfile>>({
    color: COLORS[Math.floor(Math.random() * COLORS.length)]
  });

  // Estados para validación
  const [passwordError, setPasswordError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [stars, setStars] = useState<{top: string, left: string, size: number, delay: string, duration: string}[]>([]);
  
  // Estados para manejo de imagen
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [imageScale, setImageScale] = useState<number>(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Para recuperación de perfiles
  const [recoverEmail, setRecoverEmail] = useState("");
  const [recoverPassword, setRecoverPassword] = useState("");
  const [recoverError, setRecoverError] = useState("");
  
  // Cargar perfiles desde Firebase cuando se monta el componente
  useEffect(() => {
    const loadProfiles = async () => {
      try {
        // Obtener perfiles visibles desde Firebase
        const allProfiles = await FirebaseProfileManager.getProfiles();
        const visibleProfiles = allProfiles.filter(p => !p.isHidden);
        setLocalProfiles(visibleProfiles);
      } catch (error) {
        console.error("Error al cargar perfiles:", error);
      }
    };
    
    loadProfiles();
  }, []);
  
  // Actualiza los perfiles locales cuando cambian los props (para compatibilidad)
  useEffect(() => {
    if (profiles && profiles.length > 0) {
      setLocalProfiles(profiles);
    }
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

  // Validar formato de correo electrónico
  const validateEmail = async (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError("Por favor, introduce un correo electrónico válido");
      return false;
    }
    
    try {
      // Verificar si el correo ya está en uso usando Firebase
      const allProfiles = await FirebaseProfileManager.getProfiles();
      if (allProfiles.some((profile: UserProfile) => profile.email.toLowerCase() === email.toLowerCase())) {
        setEmailError("Este correo electrónico ya está registrado");
        return false;
      }
      
      setEmailError("");
      return true;
    } catch (error) {
      console.error("Error al validar email:", error);
      setEmailError("Error al verificar el correo electrónico. Inténtalo de nuevo.");
      return false;
    }
  };

  // Validar contraseña
  const validatePassword = (password: string) => {
    // Longitud mínima para Firebase (6 caracteres)
    if (password.length < 6) {
      setPasswordError("La contraseña debe tener al menos 6 caracteres");
      return false;
    }
    
    setPasswordError("");
    return true;
  };

  // Manejar la selección de archivos de imagen
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) return;
    
    // Validar tipo de archivo (solo imágenes)
    if (!file.type.match('image.*')) {
      setNotificationMessage("Por favor, selecciona una imagen (JPG, PNG, GIF)");
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
      return;
    }
    
    // Validar tamaño del archivo (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setNotificationMessage("La imagen no debe superar los 2MB");
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
      return;
    }
    
    setSelectedFile(file);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPhotoPreview(event.target.result as string);
        setImageScale(1); // Reset scale
        setImagePosition({ x: 0, y: 0 }); // Reset position
        setShowPhotoEditor(true);
      }
    };
    reader.readAsDataURL(file);
  };

  // Manejar el inicio del arrastre de la imagen
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imageEditorRef.current) return;
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - imagePosition.x,
      y: e.clientY - imagePosition.y
    });
  };

  // Manejar el movimiento durante el arrastre
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !imageEditorRef.current) return;
    
    // Calcular nuevas coordenadas con límites
    const containerRect = imageEditorRef.current.getBoundingClientRect();
    const containerSize = containerRect.width; // Asumiendo que es cuadrado
    const maxOffset = (containerSize * imageScale - containerSize) / 2;
    
    let newX = e.clientX - dragStart.x;
    let newY = e.clientY - dragStart.y;
    
    // Limitar el movimiento al tamaño de la imagen
    newX = Math.max(Math.min(newX, maxOffset), -maxOffset);
    newY = Math.max(Math.min(newY, maxOffset), -maxOffset);
    
    setImagePosition({ x: newX, y: newY });
  };

  // Finalizar el arrastre
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Guardar la imagen editada
  const saveEditedPhoto = () => {
    if (!imageRef.current || !imageEditorRef.current || !selectedFile) {
      console.error("Faltan referencias necesarias para editar la imagen");
      return;
    }
    
    const containerWidth = 200; // Tamaño del contenedor circular
    const containerHeight = 200;
    
    // Crear un canvas para recortar la imagen
    const canvas = document.createElement('canvas');
    canvas.width = containerWidth;
    canvas.height = containerHeight;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.error("No se pudo obtener el contexto del canvas");
      return;
    }
    
    // Crear forma circular para el recorte
    ctx.beginPath();
    ctx.arc(containerWidth / 2, containerHeight / 2, containerWidth / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    
    // Calcular posición y tamaño para el dibujo
    const scaledWidth = imageRef.current.width * imageScale;
    const scaledHeight = imageRef.current.height * imageScale;
    const x = containerWidth / 2 - scaledWidth / 2 + imagePosition.x;
    const y = containerHeight / 2 - scaledHeight / 2 + imagePosition.y;
    
    // Dibujar la imagen en el canvas con transformaciones
    ctx.drawImage(imageRef.current, x, y, scaledWidth, scaledHeight);
    
    // Convertir a base64
    try {
      const photoData = canvas.toDataURL(selectedFile.type);
      setNewProfile(prev => ({ ...prev, photoUrl: photoData }));
      setPhotoPreview(photoData);
      setShowPhotoEditor(false);
      
      // Limpiar datos
      setImageScale(1);
      setImagePosition({ x: 0, y: 0 });
      setIsDragging(false);
      
      // La imagen se subirá a Firebase Storage cuando se cree el perfil
      
      // Mostrar mensaje
      setNotificationMessage("Foto de perfil actualizada");
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 2000);
    } catch (error) {
      console.error("Error al procesar la imagen:", error);
    }
  };

  const handleCreateProfile = async () => {
    if (!newProfile.name || !newProfile.email || !newProfile.gender || !newProfile.password) {
      setPasswordError("Todos los campos son obligatorios");
      return;
    }
    
    // Validar contraseña
    if (!validatePassword(newProfile.password)) {
      return;
    }
    
    // Validar email - ahora asíncrono
    const emailValid = await validateEmail(newProfile.email);
    if (!emailValid) {
      return;
    }
    
    try {
      // Mostrar mensaje de cargando
      setPasswordError("Creando perfil, por favor espera...");
      
      // Preparamos los datos para Firebase (sin ID, se genera automáticamente)
      const profileData = {
        name: newProfile.name,
        email: newProfile.email,
        gender: newProfile.gender as "masculine" | "feminine",
        password: newProfile.password,
        color: newProfile.color || COLORS[Math.floor(Math.random() * COLORS.length)],
        photoUrl: newProfile.photoUrl
      };
      
      console.log("Enviando datos a Firebase:", {
        name: profileData.name,
        email: profileData.email,
        gender: profileData.gender
        // No mostramos la contraseña por seguridad
      });
      
      // Crear perfil en Firebase
      const profile = await FirebaseProfileManager.createProfile(profileData);
      
      // Crear perfil y mostrar notificación
      onProfileCreated(profile);
      setNotificationMessage("Perfil creado correctamente");
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
      
      // Cerrar modal y resetear formulario
      setShowCreateProfile(false);
      setNewProfile({
        color: COLORS[Math.floor(Math.random() * COLORS.length)]
      });
      setPhotoPreview("");
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      setPasswordError(""); // Limpiar mensaje de error
    } catch (error: any) {
      console.error("Error en handleCreateProfile:", error);
      
      // Mostrar mensaje específico según el tipo de error
      if (error.message) {
        setPasswordError(error.message); // Usar mensaje de error personalizado de Firebase
      } else {
        setPasswordError("Error al crear el perfil. Inténtalo de nuevo.");
      }
    }
  };

  // Manejar el clic en la cruz para ocultar un perfil
  const handleHideProfileClick = (profile: UserProfile) => {
    setProfileToHide(profile);
    setShowHideConfirmation(true);
  };
  
  // Confirmar y ocultar el perfil
  const confirmHideProfile = async () => {
    if (!profileToHide) return;
    
    try {
      // Marcar como oculto en Firebase
      await FirebaseProfileManager.hideProfile(profileToHide.id);
      
      // Actualizar lista en la interfaz
      const updatedProfiles = await FirebaseProfileManager.getProfiles();
      const visibleProfiles = updatedProfiles.filter(p => !p.isHidden);
      setLocalProfiles(visibleProfiles);
      
      // Cerrar modal y mostrar notificación
      setShowHideConfirmation(false);
      setProfileToHide(null);
      
      setNotificationMessage("Perfil ocultado correctamente");
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
      
      // Anunciar para lectores de pantalla
      const announcement = document.getElementById("screen-reader-announcement");
      if (announcement) {
        announcement.textContent = "Perfil ocultado correctamente. Ya no aparecerá en la lista de perfiles, pero puedes recuperarlo más tarde.";
      }
    } catch (error) {
      console.error("Error al ocultar perfil:", error);
      setNotificationMessage("Error al ocultar el perfil");
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    }
  };
  
  // Recuperar perfil oculto
  const handleRecoverProfile = async () => {
    if (!recoverEmail || !recoverPassword) {
      setRecoverError("Debes proporcionar email y contraseña");
      return;
    }
    
    try {
      // Intentar recuperar el perfil con Firebase
      const recoveredProfile = await FirebaseProfileManager.recoverProfile(recoverEmail, recoverPassword);
      
      if (recoveredProfile) {
        // Éxito: mostrar notificación y actualizar lista
        setNotificationMessage("Perfil recuperado correctamente");
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 3000);
        
        // Actualizar la lista de perfiles
        const updatedProfiles = await FirebaseProfileManager.getProfiles();
        const visibleProfiles = updatedProfiles.filter(p => !p.isHidden);
        setLocalProfiles(visibleProfiles);
        
        // Cerrar el modal
        setShowRecoverProfile(false);
        setRecoverEmail("");
        setRecoverPassword("");
        setRecoverError("");
        
        // Anunciar para lectores de pantalla
        const announcement = document.getElementById("screen-reader-announcement");
        if (announcement) {
          announcement.textContent = "Perfil recuperado correctamente. Ahora está visible en la lista de perfiles.";
        }
      } else {
        // Error: mostrar mensaje de error
        setRecoverError("No se encontró ninguna cuenta con esas credenciales");
      }
    } catch (error) {
      console.error("Error al recuperar perfil:", error);
      setRecoverError("Error al recuperar el perfil. Inténtalo de nuevo.");
    }
  };

  // Función para manejar cuando se hace clic en un perfil
  const handleProfileClick = (profile: UserProfile) => {
    setSelectedProfile(profile);
    setLoginPassword("");
    setPasswordError("");
    setShowLoginModal(true);
  };

  // Función para manejar el envío del formulario de login
  const handleLoginSubmit = async () => {
    if (!selectedProfile) return;
    
    try {
      // Iniciar sesión con Firebase
      const authenticatedProfile = await FirebaseProfileManager.login(selectedProfile.email, loginPassword);
      
      if (authenticatedProfile) {
        // Éxito: establecer perfil activo
        ProfilesManager.setActiveProfile(authenticatedProfile.id); // Mantener compatibilidad con el sistema actual
        setShowLoginModal(false);
        
        // Mostrar notificación de éxito brevemente
        setNotificationMessage("Inicio de sesión con éxito");
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 1500);
        
        // Pequeño delay para que se vea la notificación antes de iniciar
        setTimeout(() => {
          onProfileCreated(authenticatedProfile); // Usamos onProfileCreated en lugar de onProfileSelected
                                               // ya que esto evita el flujo de verificación de contraseña
        }, 800);
      } else {
        // Error: mostrar mensaje
        setPasswordError("Contraseña incorrecta");
      }
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      setPasswordError("Error al iniciar sesión. Inténtalo de nuevo.");
    }
  };

  const handleForgotPassword = () => {
    // Por ahora, simplemente cerramos el modal de login y abrimos el de recuperación
    setShowLoginModal(false);
    setRecoverEmail("");
    setRecoverPassword("");
    setRecoverError("");
    setShowRecoverProfile(true);
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
    <div className={`flex flex-col items-center justify-center w-full h-screen fixed inset-0 overflow-hidden ${showLoginModal ? 'bg-black/20 backdrop-blur-sm' : ''}`}>
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
                onClick={() => handleProfileClick(profile)}
                className="w-full h-full flex flex-col items-center space-y-3"
              >
                {/* Avatar circular con color personalizado */}
                <div 
                  className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-light border-2 transition-all duration-300 group-hover:shadow-lg overflow-hidden"
                  style={{ 
                    borderColor: profile.color,
                    boxShadow: `0 0 10px ${profile.color}30`
                  }}
                >
                  {profile.photoUrl ? (
                    <img 
                      src={profile.photoUrl} 
                      alt={`Foto de ${profile.name}`} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="uppercase">{profile.name.charAt(0)}</span>
                  )}
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
          
          <div className="space-y-6 mt-4">
            {/* Selector de foto de perfil */}
            <div className="flex flex-col items-center justify-center space-y-4">
              <div 
                className="w-32 h-32 rounded-full flex items-center justify-center border-2 border-dashed border-gray-600 hover:border-cyan-500 transition-all duration-300 cursor-pointer overflow-hidden group relative"
                onClick={() => fileInputRef.current?.click()}
              >
                {newProfile.photoUrl ? (
                  <>
                    <img 
                      src={newProfile.photoUrl} 
                      alt="Foto de perfil" 
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-xs">Cambiar foto</span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    <span className="text-gray-500 text-xs mt-1">Subir foto</span>
                  </div>
                )}
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                accept="image/*" 
                className="hidden" 
                aria-label="Seleccionar foto de perfil"
              />
              <p className="text-gray-500 text-xs text-center px-4">
                JPG, PNG o GIF (máx. 2MB)
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-300 font-medium">Nombre</Label>
                <Input 
                  id="name" 
                  value={newProfile.name || ''}
                  onChange={e => setNewProfile({...newProfile, name: e.target.value})}
                  className="bg-gray-800 border-gray-700 text-white focus:border-cyan-500 transition-colors"
                  placeholder="Ingresa tu nombre"
                  autoComplete="off"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300 font-medium">Correo electrónico</Label>
                <Input 
                  id="email" 
                  type="email"
                  value={newProfile.email || ''}
                  onChange={e => setNewProfile({...newProfile, email: e.target.value})}
                  className="bg-gray-800 border-gray-700 text-white focus:border-cyan-500 transition-colors"
                  placeholder="ejemplo@correo.com"
                  autoComplete="off"
                />
                {emailError && (
                  <p className="text-red-500 text-xs">{emailError}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label className="text-gray-300 font-medium">Género</Label>
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
                <Label htmlFor="password" className="text-gray-300 font-medium">Contraseña</Label>
                <Input 
                  id="password" 
                  type="password"
                  value={newProfile.password || ''}
                  onChange={e => setNewProfile({...newProfile, password: e.target.value})}
                  className="bg-gray-800 border-gray-700 text-white focus:border-cyan-500 transition-colors"
                  placeholder="Mínimo 4 caracteres"
                />
                {passwordError && (
                  <p className="text-red-500 text-xs">{passwordError}</p>
                )}
              </div>
            </div>
            
            <div className="pt-4 flex justify-end space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => setShowCreateProfile(false)}
                className="border border-gray-800/50 hover:bg-gray-900/20 transition-colors"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateProfile}
                className="bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg shadow-cyan-900/20 transition-all"
              >
                Guardar perfil
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Modal para editar foto */}
      <Dialog open={showPhotoEditor} onOpenChange={setShowPhotoEditor}>
        <DialogContent className="max-w-md bg-gray-900 border border-cyan-900/50 text-white shadow-xl shadow-cyan-500/10 z-50">
          <DialogHeader>
            <DialogTitle className="text-cyan-400 text-xl">Editar foto de perfil</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            {/* Editor de foto con recorte circular */}
            <div className="flex flex-col items-center justify-center">
              <div 
                ref={imageEditorRef}
                className="w-64 h-64 rounded-full border-2 border-cyan-600 overflow-hidden relative cursor-grab"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {photoPreview && (
                  <img 
                    ref={imageRef}
                    src={photoPreview} 
                    alt="Preview"
                    style={{
                      width: `${imageScale * 100}%`, 
                      height: `${imageScale * 100}%`,
                      objectFit: "cover",
                      transform: `translate(${imagePosition.x}px, ${imagePosition.y}px)`,
                      transition: isDragging ? "none" : "transform 0.1s ease-out"
                    }}
                    draggable="false"
                  />
                )}
                <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/10 pointer-events-none" />
              </div>
              
              {/* Instrucciones */}
              <p className="text-gray-400 text-sm mt-4 text-center">
                Arrastra para ajustar. Usa el control deslizante para hacer zoom.
              </p>
            </div>
            
            {/* Control de zoom */}
            <div className="px-4 space-y-2">
              <div className="flex items-center justify-between text-gray-400 text-sm">
                <span>Zoom</span>
                <span>{Math.round((imageScale - 1) * 100)}%</span>
              </div>
              <Slider
                value={[imageScale]}
                min={1}
                max={3}
                step={0.01}
                onValueChange={(values) => setImageScale(values[0])}
                className="cursor-pointer"
              />
            </div>
            
            <div className="pt-4 flex justify-end space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => setShowPhotoEditor(false)}
                className="border border-gray-800/50 hover:bg-gray-900/20"
              >
                Cancelar
              </Button>
              <Button 
                onClick={saveEditedPhoto}
                className="bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg shadow-cyan-900/20"
              >
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Modal para confirmar ocultar perfil */}
      <Dialog open={showHideConfirmation} onOpenChange={setShowHideConfirmation}>
        <DialogContent className="max-w-md bg-gray-900 border border-red-900/50 text-white shadow-xl shadow-red-500/10 z-50">
          <DialogHeader>
            <DialogTitle className="text-red-400 text-xl">Eliminar perfil</DialogTitle>
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
      
      {/* Modal de login de perfil */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="max-w-md bg-black/80 border border-cyan-900/50 text-white shadow-2xl shadow-cyan-500/20 z-50 backdrop-blur-lg">
          {selectedProfile && (
            <div className="flex flex-col items-center space-y-6 py-3">
              {/* Avatar con foto o inicial */}
              <div 
                className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden border-2 animate-pulse-slow shadow-lg"
                style={{
                  borderColor: selectedProfile.color,
                  boxShadow: `0 0 15px ${selectedProfile.color}50`
                }}
              >
                {selectedProfile.photoUrl ? (
                  <img 
                    src={selectedProfile.photoUrl} 
                    alt={`Foto de ${selectedProfile.name}`} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <span className="text-4xl font-light">
                    {selectedProfile.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              
              {/* Nombre y campo de contraseña */}
              <div className="w-full space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-light mb-1 text-cyan-400">Hola, {selectedProfile.name}</h2>
                  <p className="text-sm text-gray-400">Ingresa tu contraseña para continuar</p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Input 
                      type="password" 
                      placeholder="Contraseña"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="bg-gray-800/50 border-gray-700 text-white py-6 text-center backdrop-blur-sm focus:border-cyan-500 transition-all"
                      onKeyDown={(e) => e.key === "Enter" && handleLoginSubmit()}
                      autoFocus
                    />
                    
                    {passwordError && (
                      <motion.p 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-500 text-sm mt-2 text-center"
                      >
                        {passwordError}
                      </motion.p>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center pt-2">
                    <button 
                      onClick={handleForgotPassword}
                      className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                    
                    <Button 
                      onClick={handleLoginSubmit}
                      className="bg-cyan-700 hover:bg-cyan-600 text-white px-8 py-5"
                    >
                      Continuar
                    </Button>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setShowLoginModal(false)}
                className="text-xs text-gray-400 hover:text-gray-300 transition-colors mt-4 flex items-center space-x-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                <span>Volver a la selección</span>
              </button>
            </div>
          )}
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
