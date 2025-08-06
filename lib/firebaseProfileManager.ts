// lib/firebaseProfileManager.ts
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    signOut,
    updateProfile
  } from 'firebase/auth';
  import { 
    doc, 
    setDoc, 
    getDoc, 
    collection, 
    getDocs, 
    updateDoc,
    query,
    where,
    arrayUnion,
    deleteDoc
  } from 'firebase/firestore';
  import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
  import { auth, db, storage } from './firebase';
  import { UserProfile } from '@/components/ProfileSelector';
  
  // Re-export UserProfile for external use
  export type { UserProfile };
  
  // Definición de tipos para playlists
  export interface Song {
    title: string;
    videoId: string;
  }
  
  export interface Playlist {
    id: string;
    name: string;
    songs: Song[];
  }

  // Definición de tipos para secciones personalizadas
  export interface CustomSection {
    id: string;
    name: string;
    createdAt: Date;
  }
  
  export class FirebaseProfileManager {
    // Crear un nuevo perfil
    static async createProfile(profileData: Omit<UserProfile, 'id'>): Promise<UserProfile> {
      try {
        console.log("Iniciando creación de perfil con:", {
          nombre: profileData.name,
          email: profileData.email,
          genero: profileData.gender,
          // No logueamos la contraseña por seguridad
        });

        // Verificar conexión con Firebase
        console.log("Verificando conexión con Firebase...");
        console.log("Auth inicializado:", !!auth);
        console.log("Firestore inicializado:", !!db);
        console.log("Storage inicializado:", !!storage);
        
        // 1. Crear el usuario en Firebase Auth
        console.log("Creando usuario en Firebase Auth...");
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          profileData.email,
          profileData.password
        ).catch(err => {
          console.error("Error específico en createUserWithEmailAndPassword:", err.code, err.message);
          throw err;
        });
        
        console.log("Usuario creado exitosamente en Auth, UID:", userCredential.user.uid);
        
        // 2. Preparar datos para Firestore
        const newProfile: Omit<UserProfile, 'password'> & { isHidden: boolean } = {
          id: userCredential.user.uid,
          name: profileData.name,
          email: profileData.email,
          gender: profileData.gender,
          color: profileData.color,
          photoUrl: profileData.photoUrl || null,
          isHidden: false
        };
        
        // 3. Guardar el perfil en Firestore
        console.log("Guardando perfil en Firestore...");
        await setDoc(doc(db, "users", userCredential.user.uid), newProfile)
          .catch(err => {
            console.error("Error específico al guardar en Firestore:", err.code, err.message);
            throw err;
          });
        
        console.log("Perfil guardado exitosamente en Firestore");
        
        // 4. Devolver el perfil completo
        return {
          ...newProfile,
          password: profileData.password
        } as UserProfile;
      } catch (error: any) {
        console.error("Error al crear perfil:", error);
        console.error("Código de error (si existe):", error.code);
        console.error("Mensaje de error:", error.message);
        
        if (error.code === 'auth/email-already-in-use') {
          throw new Error("Este correo electrónico ya está registrado");
        } else if (error.code === 'auth/invalid-email') {
          throw new Error("El formato del correo electrónico no es válido");
        } else if (error.code === 'auth/weak-password') {
          throw new Error("La contraseña es demasiado débil. Debe tener al menos 6 caracteres");
        } else if (error.code === 'auth/network-request-failed') {
          throw new Error("Error de conexión. Comprueba tu conexión a internet");
        } else {
          throw error;
        }
      }
    }
    
    // Iniciar sesión
    static async login(email: string, password: string): Promise<UserProfile | null> {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userId = userCredential.user.uid;
        
        // Obtener datos adicionales de Firestore
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          const userData = userDoc.data() as Omit<UserProfile, 'password'>;
          return {
            ...userData,
            password: password // Solo para compatibilidad con el código existente
          } as UserProfile;
        }
        return null;
      } catch (error) {
        console.error("Error al iniciar sesión:", error);
        return null;
      }
    }
    
    // Obtener todos los perfiles
    static async getProfiles(): Promise<UserProfile[]> {
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const profiles: UserProfile[] = [];
        
        querySnapshot.forEach((doc) => {
          const profileData = doc.data();
          profiles.push({
            ...profileData,
            id: doc.id,
            // Nota: la contraseña no se guarda en Firestore por seguridad
            password: '********' // Placeholder para compatibilidad
          } as UserProfile);
        });
        
        return profiles;
      } catch (error) {
        console.error("Error al obtener perfiles:", error);
        return [];
      }
    }
    
    // Actualizar perfil
    static async updateProfile(profile: UserProfile): Promise<boolean> {
      try {
        // Solo actualizar los campos que no son sensibles
        const profileUpdate = {
          name: profile.name,
          email: profile.email,
          gender: profile.gender,
          color: profile.color,
          photoUrl: profile.photoUrl
        };
        
        await updateDoc(doc(db, "users", profile.id), profileUpdate);
        return true;
      } catch (error) {
        console.error("Error al actualizar perfil:", error);
        return false;
      }
    }
    
    // Subir foto de perfil
    static async uploadProfilePhoto(userId: string, file: File): Promise<string> {
      try {
        const storageRef = ref(storage, `profilePhotos/${userId}`);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        
        // Actualizar el perfil con la URL de la foto
        await updateDoc(doc(db, "users", userId), {
          photoUrl: downloadURL
        });
        
        return downloadURL;
      } catch (error) {
        console.error("Error al subir foto de perfil:", error);
        throw error;
      }
    }
    
    // Ocultar perfil (en lugar de eliminarlo)
    static async hideProfile(userId: string): Promise<boolean> {
      try {
        await updateDoc(doc(db, "users", userId), {
          isHidden: true
        });
        return true;
      } catch (error) {
        console.error("Error al ocultar perfil:", error);
        return false;
      }
    }
    
    // Recuperar perfil oculto
    static async recoverProfile(email: string, password: string): Promise<UserProfile | null> {
      try {
        // Intentar iniciar sesión
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userId = userCredential.user.uid;
        
        // Marcar como no oculto
        await updateDoc(doc(db, "users", userId), {
          isHidden: false
        });
        
        // Devolver el perfil actualizado
        return await this.login(email, password);
      } catch (error) {
        console.error("Error al recuperar perfil:", error);
        return null;
      }
    }

    // Obtener playlists de un usuario
    static async getUserPlaylists(userId: string): Promise<Playlist[]> {
      try {
        console.log(`Obteniendo playlists para usuario ${userId}...`);
        const playlistsSnapshot = await getDocs(collection(db, `users/${userId}/playlists`));
        const playlists: Playlist[] = [];
        
        playlistsSnapshot.forEach(doc => {
          const playlistData = doc.data() as Playlist;
          playlists.push({
            ...playlistData,
            id: doc.id
          });
        });
        
        console.log(`Se encontraron ${playlists.length} playlists:`, playlists);
        return playlists;
      } catch (error) {
        console.error("Error al obtener playlists:", error);
        return [];
      }
    }
    
    // Crear una nueva playlist para un usuario
    static async createPlaylist(userId: string, name: string): Promise<Playlist | null> {
      try {
        console.log(`Creando playlist "${name}" para usuario ${userId}...`);
        
        // Crear referencia para el nuevo documento (Firebase genera ID automáticamente)
        const playlistRef = doc(collection(db, `users/${userId}/playlists`));
        console.log(`ID generado para la nueva playlist: ${playlistRef.id}`);
        
        // Crear objeto playlist sin ID (se añade después)
        const newPlaylist: Omit<Playlist, 'id'> = {
          name,
          songs: []
        };
        
        // Guardar en Firestore
        console.log(`Guardando playlist en Firestore...`);
        await setDoc(playlistRef, newPlaylist);
        console.log(`Playlist guardada con éxito`);
        
        // Construir objeto completo con ID para devolver
        const completePlaylist: Playlist = {
          ...newPlaylist,
          id: playlistRef.id
        };
        
        console.log(`Objeto playlist completo:`, completePlaylist);
        return completePlaylist;
      } catch (error) {
        console.error("Error al crear playlist:", error);
        return null;
      }
    }
    
    // Añadir canción a una playlist
    static async addSongToPlaylist(userId: string, playlistId: string, song: Song): Promise<boolean> {
      try {
        const playlistRef = doc(db, `users/${userId}/playlists/${playlistId}`);
        
        await updateDoc(playlistRef, {
          songs: arrayUnion(song)
        });
        
        return true;
      } catch (error) {
        console.error("Error al añadir canción a playlist:", error);
        return false;
      }
    }
    
    // Eliminar una playlist
    static async deletePlaylist(userId: string, playlistId: string): Promise<boolean> {
      try {
        await deleteDoc(doc(db, `users/${userId}/playlists/${playlistId}`));
        return true;
      } catch (error) {
        console.error("Error al eliminar playlist:", error);
        return false;
      }
    }
    
    // Actualizar playlist completa
    static async updatePlaylist(userId: string, playlist: Playlist): Promise<boolean> {
      try {
        const playlistRef = doc(db, `users/${userId}/playlists/${playlist.id}`);
        await updateDoc(playlistRef, { name: playlist.name, songs: playlist.songs });
        return true;
      } catch (error) {
        console.error("Error al actualizar playlist:", error);
        return false;
      }
    }

    // Cerrar sesión
    static async logout(): Promise<boolean> {
      try {
        await signOut(auth);
        return true;
      } catch (error) {
        console.error("Error al cerrar sesión:", error);
        return false;
      }
    }

    // ===== FUNCIONES PARA MANEJAR SECCIONES PERSONALIZADAS =====
    
    // Crear una nueva sección
    static async createSection(userId: string, name: string): Promise<CustomSection | null> {
      try {
        const sectionRef = doc(collection(db, `users/${userId}/sections`));
        const newSection = {
          name: name.trim(),
          createdAt: new Date()
        };
        await setDoc(sectionRef, newSection);
        
        const completeSection: CustomSection = {
          id: sectionRef.id,
          name: newSection.name,
          createdAt: newSection.createdAt
        };
        
        console.log(`Sección "${name}" creada exitosamente para usuario ${userId}`);
        return completeSection;
      } catch (error) {
        console.error("Error al crear sección:", error);
        return null;
      }
    }
    
    // Obtener todas las secciones de un usuario
    static async getUserSections(userId: string): Promise<CustomSection[]> {
      try {
        console.log(`Obteniendo secciones para usuario ${userId}...`);
        const sectionsSnapshot = await getDocs(collection(db, `users/${userId}/sections`));
        const sections: CustomSection[] = [];
        
        sectionsSnapshot.forEach(doc => {
          const sectionData = doc.data();
          sections.push({
            id: doc.id,
            name: sectionData.name,
            createdAt: sectionData.createdAt.toDate ? sectionData.createdAt.toDate() : sectionData.createdAt
          });
        });
        
        console.log(`Se encontraron ${sections.length} secciones para el usuario`);
        return sections;
      } catch (error) {
        console.error("Error al obtener secciones:", error);
        return [];
      }
    }
    
    // Eliminar una sección
    static async deleteSection(userId: string, sectionId: string): Promise<boolean> {
      try {
        await deleteDoc(doc(db, `users/${userId}/sections`, sectionId));
        console.log(`Sección ${sectionId} eliminada exitosamente`);
        return true;
      } catch (error) {
        console.error("Error al eliminar sección:", error);
        return false;
      }
    }
    
    // Actualizar una sección
    static async updateSection(userId: string, section: CustomSection): Promise<boolean> {
      try {
        await updateDoc(doc(db, `users/${userId}/sections`, section.id), {
          name: section.name.trim(),
          createdAt: section.createdAt
        });
        console.log(`Sección ${section.id} actualizada exitosamente`);
        return true;
      } catch (error) {
        console.error("Error al actualizar sección:", error);
        return false;
      }
    }
  }