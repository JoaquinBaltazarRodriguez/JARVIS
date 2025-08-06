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
  Timestamp 
} from 'firebase/firestore'
import { db } from './firebase'

export interface Project {
  id: string
  title: string
  isCompleted: boolean
  responsibleUserId: string
  responsibleUserName: string
  dueDate: string | null
  sectionId: string | null
  sectionName: string | null
  priority: 'bajo' | 'medio' | 'alto'
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
      const projectRef = doc(collection(db, `users/${userId}/projects`))
      const now = new Date()
      
      const newProject: Project = {
        id: projectRef.id,
        ...projectData,
        userId,
        createdAt: now,
        updatedAt: now
      }
      
      await setDoc(projectRef, {
        ...newProject,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now)
      })
      
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
      const projectRef = doc(db, `users/${userId}/projects/${projectId}`)
      const updateData = {
        ...updates,
        updatedAt: Timestamp.fromDate(new Date())
      }
      
      await updateDoc(projectRef, updateData)
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
      const projectRef = doc(db, `users/${userId}/projects/${projectId}`)
      await deleteDoc(projectRef)
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
