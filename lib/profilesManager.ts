import type { UserProfile } from "@/components/ProfileSelector";

const PROFILES_STORAGE_KEY = 'nexus_user_profiles';
const ACTIVE_PROFILE_KEY = 'nexus_active_profile';

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
   * Eliminar un perfil
   */
  static deleteProfile(profileId: string): void {
    if (typeof window === 'undefined') return;
    
    try {
      const profiles = this.getProfiles();
      const filteredProfiles = profiles.filter(p => p.id !== profileId);
      
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(filteredProfiles));
      
      // Si el perfil eliminado era el activo, limpiamos la sesión
      const activeProfile = this.getActiveProfile();
      if (activeProfile && activeProfile.id === profileId) {
        this.clearActiveProfile();
      }
    } catch (error) {
      console.error('Error al eliminar perfil:', error);
    }
  }
}
