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
      const projectRef = doc(collection(db, `users/${userId}/projects`))
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
        priority: newProject.priority === null ? null : newProject.priority, // Explicitly preserve null
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now)
      };
      
      console.log('🔍 DEBUG - Data being saved to Firebase:', {
        title: dataToSave.title,
        priority: dataToSave.priority,
        priorityType: typeof dataToSave.priority
      });
      
      await setDoc(projectRef, dataToSave)
    
    // Si el proyecto tiene una sección asignada, actualizar la sección
    if (newProject.sectionId) {
      console.log('🔗 Agregando proyecto a la sección:', newProject.sectionId);
      const sectionUpdateSuccess = await FirebaseProfileManager.addProjectToSection(
        userId, 
        newProject.sectionId, 
        newProject.id // Solo pasar el ID (estructura normalizada)
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

  // Obtener todos los proyectos de un usuario
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
      // Primero obtenemos el proyecto actual para comparar secciones
      const projectRef = doc(db, `users/${userId}/projects/${projectId}`)
      const currentProjectDoc = await getDoc(projectRef)
      
      let currentSectionId = null
      if (currentProjectDoc && currentProjectDoc.exists()) {
        const currentData = currentProjectDoc.data()
        currentSectionId = currentData?.sectionId || null
      }
      
      const updateData = {
        ...updates,
        updatedAt: Timestamp.fromDate(new Date())
      }
      
      await updateDoc(projectRef, updateData)
      
      // Manejar cambios de sección
      const newSectionId = updates.sectionId !== undefined ? updates.sectionId : currentSectionId
      
      if (currentSectionId !== newSectionId) {
        console.log('🔄 Cambio de sección detectado:', { from: currentSectionId, to: newSectionId })
        
        // Remover de la sección anterior si existía
        if (currentSectionId) {
          await FirebaseProfileManager.removeProjectFromSection(userId, currentSectionId, projectId)
        }
        
        // Agregar a la nueva sección si existe
        if (newSectionId) {
          await FirebaseProfileManager.addProjectToSection(userId, newSectionId, projectId)
        }
      }
      
      console.log('✅ Proyecto actualizado exitosamente')
      return true
    } catch (error) {
      console.error('❌ Error al actualizar proyecto:', error)
      return false
    }
  }

  // Eliminar un proyecto
  static async deleteProject(userId: string, projectId: string): Promise<boolean> {
    try {
      // Primero obtenemos el proyecto para saber si tiene sección asignada
      const projectRef = doc(db, `users/${userId}/projects/${projectId}`)
      const projectDoc = await getDoc(projectRef)
      
      let sectionId = null
      if (projectDoc.exists()) {
        const projectData = projectDoc.data()
        sectionId = projectData?.sectionId || null
      }
      
      // Eliminar el proyecto
      await deleteDoc(projectRef)
      
      // Si tenía una sección asignada, removerlo de la sección
      if (sectionId) {
        console.log('🗑️ Removiendo proyecto de la sección:', sectionId)
        await FirebaseProfileManager.removeProjectFromSection(userId, sectionId, projectId)
      }
      
      console.log('✅ Proyecto eliminado exitosamente')
      return true
    } catch (error) {
      console.error('❌ Error al eliminar proyecto:', error)
      return false
    }
  }

  // Obtener proyectos por sección
  static async getProjectsBySection(userId: string, sectionId: string): Promise<Project[]> {
    try {
      const projectsRef = collection(db, `users/${userId}/projects`)
      const q = query(
        projectsRef, 
        where('sectionId', '==', sectionId),
        orderBy('createdAt', 'desc')
      )
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
      const projectRef = doc(db, `users/${userId}/projects/${projectId}`)
      await updateDoc(projectRef, {
        isCompleted,
        updatedAt: Timestamp.fromDate(new Date())
      })
      console.log(`✅ Proyecto ${isCompleted ? 'completado' : 'marcado como pendiente'}`)
      return true
    } catch (error) {
      console.error('❌ Error al cambiar estado del proyecto:', error)
      return false
    }
  }
}
