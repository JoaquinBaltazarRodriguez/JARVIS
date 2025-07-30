import type { UserProfile } from "@/components/ProfileSelector";

const PROFILES_STORAGE_KEY = 'nexus_user_profiles';
const ACTIVE_PROFILE_KEY = 'nexus_active_profile';
const HIDDEN_PROFILES_KEY = 'nexus_hidden_profiles';

/**
 * Servicio para gestionar perfiles de usuario en localStorage
 */
export class ProfilesManager {
  /**
   * Obtener todos los perfiles guardados
   */
  static getProfiles(): UserProfile[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const profilesData = localStorage.getItem(PROFILES_STORAGE_KEY);
      if (!profilesData) return [];
      
      return JSON.parse(profilesData);
    } catch (error) {
      console.error('Error al cargar perfiles:', error);
      return [];
    }
  }
  
  /**
   * Guardar un nuevo perfil
   */
  static saveProfile(profile: UserProfile): void {
    if (typeof window === 'undefined') return;
    
    try {
      const profiles = this.getProfiles();
      
      // Verificar si ya existe un perfil con el mismo correo
      const existingIndex = profiles.findIndex(p => p.email === profile.email);
      
      if (existingIndex >= 0) {
        // Actualizar perfil existente
        profiles[existingIndex] = profile;
      } else {
        // Agregar nuevo perfil
        profiles.push(profile);
      }
      
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
    } catch (error) {
      console.error('Error al guardar perfil:', error);
    }
  }
  
  /**
   * Verificar si un perfil tiene la contraseña correcta
   */
  static validatePassword(profileId: string, password: string): boolean {
    const profiles = this.getProfiles();
    const profile = profiles.find(p => p.id === profileId);
    
    if (!profile) return false;
    
    return profile.password === password;
  }
  
  /**
   * Guardar el perfil activo en la sesión
   */
  static setActiveProfile(profileId: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
  }
  
  /**
   * Obtener el perfil activo
   */
  static getActiveProfile(): UserProfile | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const activeProfileId = localStorage.getItem(ACTIVE_PROFILE_KEY);
      if (!activeProfileId) return null;
      
      const profiles = this.getProfiles();
      return profiles.find(p => p.id === activeProfileId) || null;
    } catch (error) {
      console.error('Error al obtener perfil activo:', error);
      return null;
    }
  }
  
  /**
   * Limpiar perfil activo (cerrar sesión)
   */
  static clearActiveProfile(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ACTIVE_PROFILE_KEY);
  }
  
  /**
   * Actualizar un perfil existente
   */
  static updateProfile(profile: UserProfile): void {
    if (typeof window === 'undefined') return;
    
    try {
      const profiles = this.getProfiles();
      const index = profiles.findIndex(p => p.id === profile.id);
      
      if (index >= 0) {
        // Actualizar perfil existente
        profiles[index] = profile;
        localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
        
        // Si es el perfil activo, actualizamos también el estado global
        const activeProfile = this.getActiveProfile();
        if (activeProfile && activeProfile.id === profile.id) {
          // Mantenemos el mismo ID como activo, el objeto ya está actualizado
          this.setActiveProfile(profile.id);
        }
      } else {
        console.error('Error: intentando actualizar un perfil inexistente');
      }
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
    }
  }
  
  /**
   * Eliminar un perfil permanentemente
   */
  static deleteProfile(profileId: string): void {
    if (typeof window === 'undefined') return;
    
    try {
      const profiles = this.getProfiles();
      const filteredProfiles = profiles.filter(p => p.id !== profileId);
      
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(filteredProfiles));
      
      // También lo eliminamos de los perfiles ocultos si existiera
      this.removeFromHiddenProfiles(profileId);
      
      // Si el perfil eliminado era el activo, limpiamos la sesión
      const activeProfile = this.getActiveProfile();
      if (activeProfile && activeProfile.id === profileId) {
        this.clearActiveProfile();
      }
    } catch (error) {
      console.error('Error al eliminar perfil:', error);
    }
  }

  /**
   * Obtener perfiles ocultos
   */
  static getHiddenProfiles(): UserProfile[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const hiddenProfilesData = localStorage.getItem(HIDDEN_PROFILES_KEY);
      if (!hiddenProfilesData) return [];
      
      return JSON.parse(hiddenProfilesData);
    } catch (error) {
      console.error('Error al cargar perfiles ocultos:', error);
      return [];
    }
  }

  /**
   * Ocultar un perfil (no lo elimina, solo lo oculta de la interfaz)
   */
  static hideProfile(profileId: string): void {
    if (typeof window === 'undefined') return;
    
    try {
      // Obtener el perfil que se va a ocultar
      const profiles = this.getProfiles();
      const profileToHide = profiles.find(p => p.id === profileId);
      
      if (!profileToHide) {
        console.error('Error: intentando ocultar un perfil inexistente');
        return;
      }
      
      // Guardar en perfiles ocultos
      const hiddenProfiles = this.getHiddenProfiles();
      hiddenProfiles.push(profileToHide);
      localStorage.setItem(HIDDEN_PROFILES_KEY, JSON.stringify(hiddenProfiles));
      
      // Eliminar de la lista visible de perfiles
      const filteredProfiles = profiles.filter(p => p.id !== profileId);
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(filteredProfiles));
      
      // Si el perfil oculto era el activo, limpiamos la sesión
      const activeProfile = this.getActiveProfile();
      if (activeProfile && activeProfile.id === profileId) {
        this.clearActiveProfile();
      }
    } catch (error) {
      console.error('Error al ocultar perfil:', error);
    }
  }

  /**
   * Recuperar un perfil oculto por correo y contraseña
   * @returns El perfil recuperado o null si no se encontró o la contraseña es incorrecta
   */
  static unhideProfile(email: string, password: string): UserProfile | null {
    if (typeof window === 'undefined') return null;
    
    try {
      // Buscar perfil en perfiles ocultos
      const hiddenProfiles = this.getHiddenProfiles();
      const profileIndex = hiddenProfiles.findIndex(
        p => p.email.toLowerCase() === email.toLowerCase() && p.password === password
      );
      
      if (profileIndex === -1) {
        return null; // No encontrado o contraseña incorrecta
      }
      
      // Recuperar el perfil
      const profileToRecover = hiddenProfiles[profileIndex];
      
      // Eliminar de los perfiles ocultos
      hiddenProfiles.splice(profileIndex, 1);
      localStorage.setItem(HIDDEN_PROFILES_KEY, JSON.stringify(hiddenProfiles));
      
      // Añadir a los perfiles visibles
      const profiles = this.getProfiles();
      profiles.push(profileToRecover);
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
      
      return profileToRecover;
    } catch (error) {
      console.error('Error al recuperar perfil oculto:', error);
      return null;
    }
  }
  
  /**
   * Eliminar un perfil de los perfiles ocultos
   */
  private static removeFromHiddenProfiles(profileId: string): void {
    try {
      const hiddenProfiles = this.getHiddenProfiles();
      const filteredProfiles = hiddenProfiles.filter(p => p.id !== profileId);
      localStorage.setItem(HIDDEN_PROFILES_KEY, JSON.stringify(filteredProfiles));
    } catch (error) {
      console.error('Error al eliminar perfil de ocultos:', error);
    }
  }
}
