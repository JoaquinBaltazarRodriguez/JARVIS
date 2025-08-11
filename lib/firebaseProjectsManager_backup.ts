import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  Timestamp,
  getDoc 
} from 'firebase/firestore'
import { db } from './firebase'
import { FirebaseProfileManager } from './firebaseProfileManager'

export interface Project {
  id: string
  title: string
  description: string
  isCompleted: boolean
  responsibleUserId: string
  responsibleUserName: string
  dueDate: string | null
  sectionId: string | null
  sectionName: string | null
  priority: 'bajo' | 'medio' | 'alto' | null
  notes: string
  collaborators: string[] // Array de IDs de usuarios
  createdAt: Date
  updatedAt: Date
  userId: string // ID del usuario que creó el proyecto
}

export class FirebaseProjectsManager {
  // Crear un nuevo proyecto
  static async createProject(
    userId: string, 
    projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'userId'>
  ): Promise<Project | null> {
    try {
      console.log('🔍 DEBUG - createProject received priority:', projectData.priority, typeof projectData.priority);
      
      // 🎯 DETERMINAR UBICACIÓN SEGÚN SECCIÓN
      let projectRef;
      if (projectData.sectionId) {
        // Proyecto CON sección → users/{userId}/sections/{sectionId}/projects/{projectId}
        console.log('📁 Creando proyecto EN sección:', projectData.sectionId);
        projectRef = doc(collection(db, `users/${userId}/sections/${projectData.sectionId}/projects`));
      } else {
        // Proyecto SIN sección → users/{userId}/projects/{projectId}
        console.log('📁 Creando proyecto SIN sección');
        projectRef = doc(collection(db, `users/${userId}/projects`));
      }
      
      const now = new Date()
      
      const newProject: Project = {
        id: projectRef.id,
        ...projectData,
        userId,
        createdAt: now,
        updatedAt: now
      }
      
      const dataToSave = {
        ...newProject,
        priority: newProject.priority === null ? null : newProject.priority,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now)
      };
      
      console.log('🔍 DEBUG - Data being saved to Firebase:', {
        title: dataToSave.title,
        priority: dataToSave.priority,
        priorityType: typeof dataToSave.priority,
        location: projectRef.path
      });
      
      await setDoc(projectRef, dataToSave)
    
      // Si el proyecto tiene una sección asignada, actualizar el array de projectIds en la sección
      if (newProject.sectionId) {
        console.log('🔗 Agregando proyecto ID a la sección:', newProject.sectionId);
        const sectionUpdateSuccess = await FirebaseProfileManager.addProjectToSection(
          userId, 
          newProject.sectionId, 
          newProject.id
        );
        
        if (!sectionUpdateSuccess) {
          console.warn('⚠️ No se pudo actualizar la sección, pero el proyecto fue creado');
        }
      }
      
      console.log('✅ Proyecto creado exitosamente:', newProject.title)
      return newProject
    } catch (error) {
      console.error('❌ Error al crear proyecto:', error)
      return null
    }
  }

  // Obtener proyectos SIN sección (solo de la colección principal)
  static async getUserProjects(userId: string): Promise<Project[]> {
    try {
      const projectsRef = collection(db, `users/${userId}/projects`)
      const q = query(projectsRef, orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)
      
      const projects: Project[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        projects.push({
          id: doc.id,
          title: data.title,
          isCompleted: data.isCompleted,
          responsibleUserId: data.responsibleUserId,
          responsibleUserName: data.responsibleUserName,
          dueDate: data.dueDate,
          sectionId: data.sectionId,
          sectionName: data.sectionName,
          priority: data.priority,
          notes: data.notes,
          collaborators: data.collaborators || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          userId: data.userId
        })
      })
      
      console.log(`📋 Obtenidos ${projects.length} proyectos SIN sección`)
      return projects
    } catch (error) {
      console.error('❌ Error al obtener proyectos:', error)
      return []
    }
  }

  // Actualizar un proyecto
  static async updateProject(
    userId: string, 
    projectId: string, 
    updates: Partial<Omit<Project, 'id' | 'createdAt' | 'userId'>>
  ): Promise<boolean> {
    try {
      // 🔍 Buscar el proyecto en ambas ubicaciones
      let projectRef;
      let projectDoc;
      let currentData;
      let currentSectionId = null;
      
      // Primero buscar en proyectos sin sección
      projectRef = doc(db, `users/${userId}/projects/${projectId}`);
      projectDoc = await getDoc(projectRef);
      
      if (projectDoc.exists()) {
        currentData = projectDoc.data();
        currentSectionId = currentData?.sectionId || null;
        console.log('📁 Proyecto encontrado SIN sección');
      } else {
        // Si no está en proyectos principales, buscar en secciones
        // Necesitamos obtener todas las secciones para buscar el proyecto
        const sections = await FirebaseProfileManager.getUserSections(userId);
        let found = false;
        
        for (const section of sections) {
          const sectionProjectRef = doc(db, `users/${userId}/sections/${section.id}/projects/${projectId}`);
          const sectionProjectDoc = await getDoc(sectionProjectRef);
          
          if (sectionProjectDoc.exists()) {
            projectRef = sectionProjectRef;
            projectDoc = sectionProjectDoc;
            currentData = sectionProjectDoc.data();
            currentSectionId = section.id;
            found = true;
            console.log('📁 Proyecto encontrado EN sección:', section.id);
            break;
          }
        }
        
        if (!found) {
          console.error('❌ Proyecto no encontrado en ninguna ubicación');
          return false;
        }
      }
      
      const updateData = {
        ...updates,
        updatedAt: Timestamp.fromDate(new Date())
      }
      
      // Manejar cambios de sección (mover proyecto físicamente)
      const newSectionId = updates.sectionId !== undefined ? updates.sectionId : currentSectionId;
      
      if (currentSectionId !== newSectionId) {
        console.log('🔄 Cambio de sección detectado:', { from: currentSectionId, to: newSectionId });
        
        // Crear el proyecto en la nueva ubicación
        let newProjectRef;
        if (newSectionId) {
          // Mover A sección
          newProjectRef = doc(db, `users/${userId}/sections/${newSectionId}/projects/${projectId}`);
        } else {
          // Mover A proyectos principales (sin sección)
          newProjectRef = doc(db, `users/${userId}/projects/${projectId}`);
        }
        
        // Crear en nueva ubicación con datos actualizados
        const completeData = {
          ...currentData,
          ...updateData,
          sectionId: newSectionId,
          sectionName: updates.sectionName || (newSectionId ? currentData?.sectionName : null)
        };
        
        await setDoc(newProjectRef, completeData);
        
        // Eliminar de ubicación anterior
        await deleteDoc(projectRef);
        
        // Actualizar referencias en secciones
        if (currentSectionId) {
          await FirebaseProfileManager.removeProjectFromSection(userId, currentSectionId, projectId);
        }
        if (newSectionId) {
          await FirebaseProfileManager.addProjectToSection(userId, newSectionId, projectId);
        }
        
        console.log('✅ Proyecto movido exitosamente');
      } else {
        // Solo actualizar en la ubicación actual
        await updateDoc(projectRef, updateData);
        console.log('✅ Proyecto actualizado exitosamente');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error al actualizar proyecto:', error);
      return false;
    }
  }



  // Obtener proyectos por sección (desde la subcoleción de la sección)
  static async getProjectsBySection(userId: string, sectionId: string): Promise<Project[]> {
    try {
      // 🎯 Obtener proyectos desde users/{userId}/sections/{sectionId}/projects
      console.log('📁 Obteniendo proyectos de la sección:', sectionId);
      const projectsRef = collection(db, `users/${userId}/sections/${sectionId}/projects`)
      const q = query(projectsRef, orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)
      
      const projects: Project[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        projects.push({
          id: doc.id,
          title: data.title,
          isCompleted: data.isCompleted,
          responsibleUserId: data.responsibleUserId,
          responsibleUserName: data.responsibleUserName,
          dueDate: data.dueDate,
          sectionId: data.sectionId,
          sectionName: data.sectionName,
          priority: data.priority,
          notes: data.notes,
          collaborators: data.collaborators || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          userId: data.userId
        })
      })
      
      console.log(`📋 Obtenidos ${projects.length} proyectos de la sección ${sectionId}`)
      return projects
    } catch (error) {
      console.error('❌ Error al obtener proyectos por sección:', error)
      return []
    }
  }

  // Marcar proyecto como completado/no completado
  static async toggleProjectCompletion(
    userId: string, 
    projectId: string, 
    isCompleted: boolean
  ): Promise<boolean> {
    try {
      // 🔍 Buscar el proyecto en ambas ubicaciones
      let projectRef;
      let projectDoc;
      
      // Primero buscar en proyectos sin sección
      projectRef = doc(db, `users/${userId}/projects/${projectId}`);
      projectDoc = await getDoc(projectRef);
      
      if (projectDoc.exists()) {
        console.log('📁 Proyecto encontrado SIN sección para toggle completion');
      } else {
        // Si no está en proyectos principales, buscar en secciones
        const sections = await FirebaseProfileManager.getUserSections(userId);
        let found = false;
        
        for (const section of sections) {
          const sectionProjectRef = doc(db, `users/${userId}/sections/${section.id}/projects/${projectId}`);
          const sectionProjectDoc = await getDoc(sectionProjectRef);
          
          if (sectionProjectDoc.exists()) {
            projectRef = sectionProjectRef;
            projectDoc = sectionProjectDoc;
            found = true;
            console.log('📁 Proyecto encontrado EN sección para toggle completion:', section.id);
            break;
          }
        }
        
        if (!found) {
          console.error('❌ Proyecto no encontrado para cambiar estado');
          return false;
        }
      }
      
      await updateDoc(projectRef, {
        isCompleted,
        updatedAt: Timestamp.fromDate(new Date())
      });
      
      console.log(`✅ Proyecto ${isCompleted ? 'completado' : 'marcado como pendiente'}`);
      return true;
    } catch (error) {
      console.error('❌ Error al cambiar estado del proyecto:', error);
      return false;
    }
  }

  // DEPRECATED: Usar moveProjectToTrash en su lugar
  // Eliminar un proyecto (MANTENER PARA COMPATIBILIDAD)
  static async deleteProject(userId: string, projectId: string): Promise<boolean> {
    console.warn('⚠️ deleteProject está deprecado, usar moveProjectToTrash');
    return this.moveProjectToTrash(userId, projectId);
  }

  // Obtener TODOS los proyectos del usuario (principales + de todas las secciones)
  static async getAllUserProjects(userId: string): Promise<Project[]> {
    try {
      const allProjects: Project[] = [];
      
      // 1. Obtener proyectos sin sección (colección principal)
      console.log('📁 Obteniendo proyectos SIN sección...');
      const mainProjectsRef = collection(db, `users/${userId}/projects`);
      const mainProjectsQuery = query(mainProjectsRef, orderBy('createdAt', 'desc'));
      const mainProjectsSnapshot = await getDocs(mainProjectsQuery);
      
      mainProjectsSnapshot.forEach((doc) => {
        const data = doc.data();
        allProjects.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as Project);
      });
      
      // 2. Obtener proyectos de TODAS las secciones
      console.log('📁 Obteniendo proyectos DE secciones...');
      const sections = await FirebaseProfileManager.getUserSections(userId);
      
      for (const section of sections) {
        const sectionProjectsRef = collection(db, `users/${userId}/sections/${section.id}/projects`);
        const sectionProjectsQuery = query(sectionProjectsRef, orderBy('createdAt', 'desc'));
        const sectionProjectsSnapshot = await getDocs(sectionProjectsQuery);
        
        sectionProjectsSnapshot.forEach((doc) => {
          const data = doc.data();
          allProjects.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          } as Project);
        });
      }
      
      // 3. Ordenar todos los proyectos por fecha de creación (más recientes primero)
      allProjects.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      console.log(`✅ Total de proyectos obtenidos: ${allProjects.length}`);
      return allProjects;
    } catch (error) {
      console.error('❌ Error al obtener todos los proyectos:', error);
      return [];
    }
  }

  // ===== GESTIÓN DE PAPELERA =====
  
  // Mover proyecto a la papelera (desde cualquier ubicación)
  static async moveProjectToTrash(userId: string, projectId: string): Promise<boolean> {
    try {
      console.log('🗑️ Moviendo proyecto a papelera:', projectId);
      
      // 1. Buscar el proyecto en todas las ubicaciones posibles
      let sourceProjectRef;
      let projectData;
      let foundLocation = '';
      
      // Buscar en proyectos principales
      sourceProjectRef = doc(db, `users/${userId}/projects/${projectId}`);
      let projectDoc = await getDoc(sourceProjectRef);
      
      if (projectDoc.exists()) {
        projectData = projectDoc.data();
        foundLocation = 'main';
        console.log('📁 Proyecto encontrado en colección principal');
      } else {
        // Buscar en secciones
        const sections = await FirebaseProfileManager.getUserSections(userId);
        
        for (const section of sections) {
          const sectionProjectRef = doc(db, `users/${userId}/sections/${section.id}/projects/${projectId}`);
          const sectionProjectDoc = await getDoc(sectionProjectRef);
          
          if (sectionProjectDoc.exists()) {
            sourceProjectRef = sectionProjectRef;
            projectData = sectionProjectDoc.data();
            foundLocation = `section_${section.id}`;
            console.log('📁 Proyecto encontrado en sección:', section.id);
            break;
          }
        }
      }
      
      if (!projectData) {
        console.error('❌ Proyecto no encontrado para mover a papelera');
        return false;
      }
      
      // 2. Crear el proyecto en la papelera
      const trashRef = doc(db, `users/${userId}/trash/${projectId}`);
      const trashData = {
        ...projectData,
        trashedAt: Timestamp.fromDate(new Date()),
        originalLocation: foundLocation // Guardar ubicación original para posible restauración
      };
      
      await setDoc(trashRef, trashData);
      console.log('✅ Proyecto guardado en papelera');
      
      // 3. Eliminar el proyecto de su ubicación original
      await deleteDoc(sourceProjectRef);
      console.log('✅ Proyecto eliminado de ubicación original');
      
      // 4. Si estaba en una sección, remover de la lista de projectIds
      if (foundLocation.startsWith('section_')) {
        const sectionId = foundLocation.replace('section_', '');
        await FirebaseProfileManager.removeProjectFromSection(userId, sectionId, projectId);
        console.log('✅ Proyecto removido de la sección');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error al mover proyecto a papelera:', error);
      return false;
    }
  }
  
  // Obtener proyectos de la papelera
  static async getTrashProjects(userId: string): Promise<Project[]> {
    try {
      const trashRef = collection(db, `users/${userId}/trash`);
      const q = query(trashRef, orderBy('trashedAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const trashedProjects: Project[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        trashedProjects.push({
          id: doc.id,
          title: data.title,
          description: data.description || '',
          isCompleted: data.isCompleted,
          responsibleUserId: data.responsibleUserId,
          responsibleUserName: data.responsibleUserName,
          dueDate: data.dueDate,
          sectionId: data.sectionId,
          sectionName: data.sectionName,
          priority: data.priority,
          notes: data.notes,
          collaborators: data.collaborators || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          userId: data.userId
        });
      });
      
      console.log(`✅ Proyectos en papelera obtenidos: ${trashedProjects.length}`);
      return trashedProjects;
    } catch (error) {
      console.error('❌ Error al obtener proyectos de papelera:', error);
      return [];
    }
  }
  
  // Restaurar proyecto desde la papelera
  static async restoreProjectFromTrash(userId: string, projectId: string): Promise<boolean> {
    try {
      console.log('♻️ Restaurando proyecto desde papelera:', projectId);
      
      // 1. Obtener el proyecto de la papelera
      const trashRef = doc(db, `users/${userId}/trash/${projectId}`);
      const trashDoc = await getDoc(trashRef);
      
      if (!trashDoc.exists()) {
        console.error('❌ Proyecto no encontrado en papelera');
        return false;
      }
      
      const projectData = trashDoc.data();
      const originalLocation = projectData.originalLocation;
      
      // 2. Determinar dónde restaurar el proyecto
      let restoreRef;
      if (originalLocation === 'main' || !projectData.sectionId) {
        // Restaurar a colección principal
        restoreRef = doc(db, `users/${userId}/projects/${projectId}`);
        console.log('📁 Restaurando a colección principal');
      } else {
        // Restaurar a la sección original
        restoreRef = doc(db, `users/${userId}/sections/${projectData.sectionId}/projects/${projectId}`);
        console.log('📁 Restaurando a sección:', projectData.sectionId);
      }
      
      // 3. Crear el proyecto en su ubicación restaurada
      const restoreData = {
        ...projectData,
        updatedAt: Timestamp.fromDate(new Date())
      };
      delete (restoreData as any).trashedAt;
      delete (restoreData as any).originalLocation;
      
      await setDoc(restoreRef, restoreData);
      console.log('✅ Proyecto restaurado en ubicación original');
      
      // 4. Si tenía sección, agregarlo de vuelta a la lista de projectIds
      if (projectData.sectionId && originalLocation.startsWith('section_')) {
        await FirebaseProfileManager.addProjectToSection(userId, projectData.sectionId, projectId);
        console.log('✅ Proyecto agregado de vuelta a la sección');
      }
      
      // 5. Eliminar de la papelera
      await deleteDoc(trashRef);
      console.log('✅ Proyecto eliminado de papelera');
      
      return true;
    } catch (error) {
      console.error('❌ Error al restaurar proyecto:', error);
      return false;
    }
  }
  
  // Eliminar proyecto definitivamente (borrado permanente)
  static async deleteProjectPermanently(userId: string, projectId: string): Promise<boolean> {
    try {
      console.log('🗑️ Eliminando proyecto DEFINITIVAMENTE:', projectId);
      
      const trashRef = doc(db, `users/${userId}/trash/${projectId}`);
      const trashDoc = await getDoc(trashRef);
      
      if (!trashDoc.exists()) {
        console.error('❌ Proyecto no encontrado en papelera para eliminación definitiva');
        return false;
      }
      
      await deleteDoc(trashRef);
      console.log('✅ Proyecto eliminado DEFINITIVAMENTE de Firebase');
      
      return true;
    } catch (error) {
      console.error('❌ Error al eliminar proyecto definitivamente:', error);
      return false;
    }
  }
  
  // Vaciar papelera completamente
  static async emptyTrash(userId: string): Promise<boolean> {
    try {
      console.log('🗑️ Vaciando papelera completamente...');
      
      const trashRef = collection(db, `users/${userId}/trash`);
      const snapshot = await getDocs(trashRef);
      
      const deletePromises: Promise<void>[] = [];
      snapshot.forEach((doc) => {
        deletePromises.push(deleteDoc(doc.ref));
      });
      
      await Promise.all(deletePromises);
      console.log(`✅ Papelera vaciada: ${deletePromises.length} proyectos eliminados definitivamente`);
      
      return true;
    } catch (error) {
      console.error('❌ Error al vaciar papelera:', error);
      return false;
    }
  }
}
