import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Settings, User, Volume2, VolumeX, Palette, Eye, EyeOff, Camera, Edit, Mail, Lock, Trash2, AccessibilityIcon } from "lucide-react";
import { ProfilesManager } from "@/lib/profilesManager";
import type { UserProfile } from "@/components/ProfileSelector";
import { setNexusVoiceMuted, isNexusVoiceMuted } from "@/hooks/useSimpleAudio";

const COMMANDS = [
  {
    title: "MODO NORMAL",
    commands: [
      { cmd: "Nexus reproduce una cancion", desc: "Reproduce una canción de YouTube." },
      { cmd: "Nexus reproduce una playlist", desc: "Reproduce una playlist registrada." },
      { cmd: "Nexus quiero ir a una direccion", desc: "Navega a una dirección guardada." },
      { cmd: "Nexus quiero llamar a alguien", desc: "Llama a un contacto guardado." },
      { cmd: "Nexus activa el modo inteligente", desc: "Cambia al modo inteligente." },
      { cmd: "Nexus activa el modo funcional", desc: "Cambia al modo funcional." },
      { cmd: "Nexus activa el modo normal", desc: "Vuelve al modo normal." },
      { cmd: "Nexus activa el lector de pantalla", desc: "Activa el lector para usuarios con discapacidad visual." },
      { cmd: "Nexus apaga el lector de pantalla", desc: "Desactiva el lector para volver a modo visual normal." },
    ],
  },
  {
    title: "MODO INTELIGENTE",
    commands: [
      { cmd: "Nexus [preguntar lo que sea]", desc: "Haz cualquier pregunta o petición." },
      { cmd: "Nexus generame una imagen", desc: "Genera una imagen por IA." },
    ],
  },
  {
    title: "MÚSICA",
    commands: [
      { cmd: "Reproduce en segundo plano", desc: "Activa el modo de reproducción de música en segundo plano (minimiza el reproductor y mantiene la música sonando)." },
      { cmd: "Reproduce en primer plano", desc: "Vuelve a mostrar el reproductor de música en pantalla." },
      { cmd: "Pausa la música / Play / Siguiente / Anterior / Quitar música", desc: "Controla la música por voz en cualquier modo." },
    ],
  },
];

export const SettingsModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [activeCategory, setActiveCategory] = useState<string>('commands');
  const [activeProfile, setActiveProfile] = useState<UserProfile | null>(null);
  // Estados para configuración con localStorage
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);
  
  // Cargar configuraciones guardadas
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Cargar estado de voz
    const voiceMuted = localStorage.getItem('nexus_voice_muted') === 'true';
    setVoiceEnabled(!voiceMuted);
    
    // Cargar estado de animaciones
    const animations = localStorage.getItem('nexus_animations_enabled');
    if (animations !== null) {
      setAnimationsEnabled(animations === 'true');
    }
    
    // Cargar estado de lector de pantalla
    const screenReader = localStorage.getItem('nexus_screen_reader_enabled');
    if (screenReader !== null) {
      setScreenReaderEnabled(screenReader === 'true');
    }
  }, []);

  // Estados para gestión de perfil
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newGender, setNewGender] = useState<"masculine" | "feminine" | "">("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");

  // Cargar datos del perfil activo
  useEffect(() => {
    const profile = ProfilesManager.getActiveProfile();
    if (profile) {
      setActiveProfile(profile);
      setNewName(profile.name);
      setNewEmail(profile.email || "");
      setNewGender(profile.gender || "");
    }
  }, []);

  // Funciones para actualizar perfil
  const handleUpdateName = () => {
    if (!activeProfile || !newName.trim()) return;

    const updatedProfile = { ...activeProfile, name: newName.trim() };
    ProfilesManager.updateProfile(updatedProfile);
    setActiveProfile(updatedProfile);
    alert("Nombre actualizado correctamente");
  };

  const handleUpdateEmail = () => {
    if (!activeProfile || !newEmail.trim()) return;

    const updatedProfile = { ...activeProfile, email: newEmail.trim() };
    ProfilesManager.updateProfile(updatedProfile);
    setActiveProfile(updatedProfile);
    alert("Correo electrónico actualizado correctamente");
  };

  const handleUpdateGender = () => {
    if (!activeProfile || !newGender) return;
    
    // Asegurarse de que el género sea del tipo correcto
    const validGender = newGender as "masculine" | "feminine";
    const updatedProfile = { ...activeProfile, gender: validGender };
    ProfilesManager.updateProfile(updatedProfile);
    setActiveProfile(updatedProfile);
    alert("Género actualizado correctamente");
  };

  const handleUpdatePassword = () => {
    if (!activeProfile || !currentPassword || !newPassword || !confirmPassword) {
      alert("Por favor, complete todos los campos");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("Las contraseñas no coinciden");
      return;
    }

    if (currentPassword !== activeProfile.password) {
      alert("La contraseña actual es incorrecta");
      return;
    }

    const updatedProfile = { ...activeProfile, password: newPassword };
    ProfilesManager.updateProfile(updatedProfile);
    setActiveProfile(updatedProfile);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    alert("Contraseña actualizada correctamente");
  };

  const handleDeleteProfile = () => {
    if (!activeProfile || deletePassword !== activeProfile.password) {
      alert("Contraseña incorrecta");
      return;
    }

    ProfilesManager.deleteProfile(activeProfile.id);
    setShowDeleteConfirm(false);
    onClose();
    // Redirigir al sistema de login
    window.location.reload();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl h-[80vh] flex overflow-hidden bg-black/90 border border-slate-800">
          <div className="w-1/5 bg-black/40 border-r border-slate-800 py-4">
            <div
              onClick={() => setActiveCategory('commands')}
              className={`px-4 py-2 cursor-pointer flex items-center gap-2 ${activeCategory === 'commands' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
            >
              <Settings size={18} />
              <span>Comandos</span>
            </div>

            <div
              onClick={() => setActiveCategory('nexus')}
              className={`px-4 py-2 cursor-pointer flex items-center gap-2 ${activeCategory === 'nexus' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
            >
              <Volume2 size={18} />
              <span>NEXUS</span>
            </div>

            <div
              onClick={() => setActiveCategory('profile')}
              className={`px-4 py-2 cursor-pointer flex items-center gap-2 ${activeCategory === 'profile' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
            >
              <User size={18} />
              <span>Perfil</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <DialogHeader className="border-b border-slate-800 px-6 py-4">
              <DialogTitle className="text-xl font-bold text-white">
                {activeCategory === 'commands' && "Comandos Disponibles"}
                {activeCategory === 'nexus' && "Configuración de NEXUS"}
                {activeCategory === 'profile' && "Gestión de Perfil"}
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-hidden">
              {activeCategory === 'commands' && (
                <ScrollArea className="h-full p-6">
                  <div className="space-y-6">
                    {COMMANDS.map((category) => (
                      <div key={category.title} className="space-y-3">
                        <h4 className="text-md font-medium text-emerald-500">{category.title}</h4>
                        <div className="grid grid-cols-1 gap-2">
                          {category.commands.map((command) => (
                            <div
                              key={command.cmd}
                              className="p-3 rounded-md bg-slate-900/50 border border-slate-800 hover:border-slate-700"
                            >
                              <p className="font-mono text-sm text-emerald-400 mb-1">{command.cmd}</p>
                              <p className="text-sm text-slate-400">{command.desc}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {activeCategory === 'nexus' && (
                <ScrollArea className="h-full p-6">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <h4 className="text-md font-medium text-emerald-500">Voz y Audio</h4>
                      <div className="p-3 rounded-md bg-slate-900/50 border border-slate-800 hover:border-slate-700 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white mb-1">Voz de NEXUS</p>
                          <p className="text-sm text-slate-400">Activar o desactivar la voz de NEXUS</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {voiceEnabled ? (
                            <Volume2 size={18} className="text-emerald-400" />
                          ) : (
                            <VolumeX size={18} className="text-red-400" />
                          )}
                          <Switch
                            checked={voiceEnabled}
                            onCheckedChange={(checked) => {
                              setVoiceEnabled(checked);
                              setNexusVoiceMuted(!checked);
                              localStorage.setItem('nexus_voice_muted', (!checked).toString());
                            }}
                            className="data-[state=checked]:bg-emerald-500"
                          />
                          <span className={`text-xs ${voiceEnabled ? 'text-emerald-400' : 'text-red-400'}`}>
                            {voiceEnabled ? 'Activada' : 'Desactivada'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-md font-medium text-emerald-500">Interfaz</h4>
                      <div className="p-3 rounded-md bg-slate-900/50 border border-slate-800 hover:border-slate-700 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white mb-1">Animaciones</p>
                          <p className="text-sm text-slate-400">Activar o desactivar animaciones del tema</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {animationsEnabled ? (
                            <Palette size={18} className="text-emerald-400" />
                          ) : (
                            <Palette size={18} className="text-red-400" />
                          )}
                          <Switch
                            checked={animationsEnabled}
                            onCheckedChange={(checked) => {
                              setAnimationsEnabled(checked);
                              localStorage.setItem('nexus_animations_enabled', checked.toString());
                              // Aplicar cambio inmediato al elemento raíz para controlar las animaciones
                              if (typeof document !== 'undefined') {
                                if (checked) {
                                  document.documentElement.classList.remove('nexus-no-animations');
                                } else {
                                  document.documentElement.classList.add('nexus-no-animations');
                                }
                              }
                            }}
                            className="data-[state=checked]:bg-emerald-500"
                          />
                          <span className={`text-xs ${animationsEnabled ? 'text-emerald-400' : 'text-red-400'}`}>
                            {animationsEnabled ? 'Activadas' : 'Desactivadas'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-md font-medium text-emerald-500">Accesibilidad</h4>
                      <div className="p-3 rounded-md bg-slate-900/50 border border-slate-800 hover:border-slate-700 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white mb-1">Lector de pantalla</p>
                          <p className="text-sm text-slate-400">Activar o desactivar el lector de pantalla</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {screenReaderEnabled ? (
                            <AccessibilityIcon size={18} className="text-emerald-400" />
                          ) : (
                            <AccessibilityIcon size={18} className="text-red-400" />
                          )}
                          <Switch
                            checked={screenReaderEnabled}
                            onCheckedChange={(checked) => {
                              setScreenReaderEnabled(checked);
                              localStorage.setItem('nexus_screen_reader_enabled', checked.toString());
                              // Aplicar cambio inmediato para el lector de pantalla
                              if (typeof document !== 'undefined') {
                                if (checked) {
                                  document.documentElement.setAttribute('data-nexus-screen-reader', 'true');
                                  // Anunciar que el lector está activado usando la función global de anuncio
                                  // Esta función ya respeta la configuración de silencio
                                  const message = 'Lector de pantalla activado. Ahora se resaltarán visualmente los elementos interactivos y se anunciarán las acciones importantes.';
                                  
                                  // Usamos setTimeout para asegurarnos de que el anuncio ocurra después de que el estado haya cambiado
                                  setTimeout(() => {
                                    // Crear un elemento de anuncio
                                    const announcementElement = document.createElement('div');
                                    announcementElement.setAttribute('aria-live', 'assertive');
                                    announcementElement.setAttribute('role', 'alert');
                                    announcementElement.classList.add('sr-only');
                                    announcementElement.textContent = message;
                                    
                                    // Agregarlo al DOM temporalmente
                                    document.body.appendChild(announcementElement);
                                    
                                    // Si la voz está habilitada, usar síntesis de voz también
                                    if (!isNexusVoiceMuted()) {
                                      const announcement = new SpeechSynthesisUtterance(message);
                                      announcement.lang = 'es-ES';
                                      window.speechSynthesis.speak(announcement);
                                    }
                                    
                                    // Eliminar después de un tiempo
                                    setTimeout(() => {
                                      document.body.removeChild(announcementElement);
                                    }, 5000);
                                  }, 100);
                                } else {
                                  document.documentElement.setAttribute('data-nexus-screen-reader', 'false');
                                  // Anunciar que el lector está desactivado
                                  const message = 'Lector de pantalla desactivado';
                                  
                                  // Crear un elemento de anuncio
                                  const announcementElement = document.createElement('div');
                                  announcementElement.setAttribute('aria-live', 'assertive');
                                  announcementElement.setAttribute('role', 'alert');
                                  announcementElement.classList.add('sr-only');
                                  announcementElement.textContent = message;
                                  
                                  // Agregarlo al DOM temporalmente
                                  document.body.appendChild(announcementElement);
                                  
                                  // Eliminarlo después de un tiempo
                                  setTimeout(() => {
                                    document.body.removeChild(announcementElement);
                                  }, 3000);
                                }
                              }
                            }}
                            className="data-[state=checked]:bg-emerald-500"
                          />
                          <span className={`text-xs ${screenReaderEnabled ? 'text-emerald-400' : 'text-red-400'}`}>
                            {screenReaderEnabled ? 'Activado' : 'Desactivado'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              )}

              {activeCategory === 'profile' && activeProfile && (
                <ScrollArea className="h-full p-6">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <h4 className="text-md font-medium text-emerald-500">Información Personal</h4>

                      <div className="p-4 rounded-md bg-slate-900/50 border border-slate-800">
                        <div className="mb-4">
                          <Label htmlFor="profileName" className="text-white mb-2 block">Nombre</Label>
                          <div className="flex gap-2">
                            <Input
                              id="profileName"
                              value={newName}
                              onChange={(e) => setNewName(e.target.value)}
                              className="bg-black/50 border-slate-700 text-white"
                            />
                            <Button onClick={handleUpdateName} className="bg-emerald-600 hover:bg-emerald-700">
                              <Edit size={16} className="mr-2" />
                              Actualizar
                            </Button>
                          </div>
                        </div>

                        <div className="mb-4">
                          <Label htmlFor="profileGender" className="text-white mb-2 block">Género</Label>
                          <div className="flex gap-2">
                            <Select 
                              value={newGender} 
                              onValueChange={(value: "masculine" | "feminine") => setNewGender(value)}
                            >
                              <SelectTrigger className="w-full bg-black/50 border-slate-700 text-white">
                                <SelectValue placeholder="Seleccionar género" />
                              </SelectTrigger>
                              <SelectContent className="bg-black/90 border-slate-700 text-white">
                                <SelectGroup>
                                  <SelectItem value="masculine">Masculino</SelectItem>
                                  <SelectItem value="feminine">Femenino</SelectItem>
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                            <Button onClick={handleUpdateGender} className="bg-emerald-600 hover:bg-emerald-700">
                              <Edit size={16} className="mr-2" />
                              Actualizar
                            </Button>
                          </div>
                        </div>

                        <div className="mb-4">
                          <Label htmlFor="profileEmail" className="text-white mb-2 block">Correo electrónico</Label>
                          <div className="flex gap-2">
                            <Input
                              id="profileEmail"
                              type="email"
                              value={newEmail}
                              onChange={(e) => setNewEmail(e.target.value)}
                              className="bg-black/50 border-slate-700 text-white"
                            />
                            <Button onClick={handleUpdateEmail} className="bg-emerald-600 hover:bg-emerald-700">
                              <Edit size={16} className="mr-2" />
                              Actualizar
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-md font-medium text-emerald-500">Seguridad</h4>

                      <div className="p-4 rounded-md bg-slate-900/50 border border-slate-800">
                        <h5 className="text-white font-medium mb-3">Cambiar contraseña</h5>

                        <div className="space-y-3">
                          <div>
                            <Label htmlFor="currentPassword" className="text-slate-300 mb-1 block">Contraseña actual</Label>
                            <Input
                              id="currentPassword"
                              type="password"
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              className="bg-black/50 border-slate-700 text-white"
                            />
                          </div>

                          <div>
                            <Label htmlFor="newPassword" className="text-slate-300 mb-1 block">Nueva contraseña</Label>
                            <Input
                              id="newPassword"
                              type="password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="bg-black/50 border-slate-700 text-white"
                            />
                          </div>

                          <div>
                            <Label htmlFor="confirmPassword" className="text-slate-300 mb-1 block">Confirmar nueva contraseña</Label>
                            <Input
                              id="confirmPassword"
                              type="password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className="bg-black/50 border-slate-700 text-white"
                            />
                          </div>

                          <Button onClick={handleUpdatePassword} className="w-full bg-emerald-600 hover:bg-emerald-700 mt-2">
                            <Lock size={16} className="mr-2" />
                            Cambiar contraseña
                          </Button>
                        </div>

                        <div className="mt-6 pt-6 border-t border-slate-700">
                          <h5 className="text-red-500 font-medium mb-3">Eliminar perfil</h5>
                          <p className="text-slate-400 text-sm mb-3">Esta acción es permanente y no se puede deshacer.</p>
                          <Button
                            onClick={() => setShowDeleteConfirm(true)}
                            variant="destructive"
                            className="w-full"
                          >
                            <Trash2 size={16} className="mr-2" />
                            Eliminar mi perfil
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              )}
            </div>

            <div className="border-t border-slate-800 px-6 py-4 flex justify-end">
              <Button variant="outline" onClick={onClose}>
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-black/90 border border-red-900 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-500">¿Estás seguro de eliminar tu perfil?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              Esta acción no se puede deshacer. Tu perfil y todos tus datos serán eliminados permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="mt-4">
            <Label htmlFor="deletePassword" className="text-slate-300 mb-2 block">Ingresa tu contraseña para confirmar</Label>
            <Input
              id="deletePassword"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="bg-black/50 border-slate-700 text-white"
            />
          </div>

          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="bg-transparent text-white border-slate-700 hover:bg-slate-800 hover:text-white">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProfile}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Eliminar perfil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Animaciones (puedes agregar en globals.css o tailwind.config.js):
// .animate-fade-in { animation: fadeIn 0.3s ease; }
// .animate-slide-up { animation: slideUp 0.4s cubic-bezier(.4,2,.6,1); }
// .animate-spin-slow { animation: spin 2.5s linear infinite; }
