import React, { useState, useEffect, useCallback } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { 
  Plus, 
  ChevronDown, 
  ChevronRight, 
  Trash2, 
  Edit, 
  ListTodo, 
  Grid3X3, 
  Tag,
  FileText,
  Calendar,
  Star,
  Clock,
  Paperclip
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Input } from "./ui/input";
import { toast } from "./ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Textarea } from "./ui/textarea";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";

// Tipos de datos
export interface WorkspaceProject {
  id: string;
  name: string;
  sections: WorkspaceSection[];
}
export interface WorkspaceSection {
  id: string;
  name: string;
  subsections: WorkspaceSubsection[];
}
export interface WorkspaceSubsection {
  id: string;
  name: string;
  notes: WorkspaceNote[];
}
export interface WorkspaceNote {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  priority?: "low" | "medium" | "high";
  tags?: string[];
  dueDate?: string;
  attachments?: WorkspaceAttachment[];
}
export interface WorkspaceAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
}

const STORAGE_KEY = "nexus_workspace";

function generateId() {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

export const FunctionalWorkspace: React.FC = () => {
  const [projects, setProjects] = useState<WorkspaceProject[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  
  // Estados para la navegación y expansión
  const [expanded, setExpanded] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [expandedSubsections, setExpandedSubsections] = useState<string[]>([]);
  
  // Estados para la visualización
  const [viewMode, setViewMode] = useState<"list" | "board">("list");
  
  // Estados para diálogos
  const [showNewProject, setShowNewProject] = useState(false);
  const [showNewSection, setShowNewSection] = useState(false);
  const [showNewSubsection, setShowNewSubsection] = useState(false);
  const [showNewNote, setShowNewNote] = useState(false);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  
  // Estados para nuevos elementos
  const [projectName, setProjectName] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [subsectionName, setSubsectionName] = useState("");
  const [currentProjectId, setCurrentProjectId] = useState<string>("");
  const [currentSectionId, setCurrentSectionId] = useState<string>("");
  const [currentSubsectionId, setCurrentSubsectionId] = useState<string>("");
  
  // Estados para notas
  const [currentNote, setCurrentNote] = useState<WorkspaceNote | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [notePriority, setNotePriority] = useState<"low" | "medium" | "high" | undefined>(undefined);
  const [noteTags, setNoteTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [noteDueDate, setNoteDueDate] = useState<string>("");
  
  // Guardar en localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);
  
  // Funciones para proyectos
  const handleAddProject = () => {
    if (!projectName.trim()) {
      toast({ description: "El nombre del proyecto no puede estar vacío." });
      return;
    }
    setProjects((prev) => [
      ...prev,
      {
        id: generateId(),
        name: projectName.trim(),
        sections: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
    ]);
    setProjectName("");
    setShowNewProject(false);
    toast({ description: "Proyecto creado." });
  };
  
  const toggleExpand = (id: string) => {
    setExpanded((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  
  const toggleExpandSection = (id: string) => {
    setExpandedSections((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  
  const toggleExpandSubsection = (id: string) => {
    setExpandedSubsections((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  
  // Funciones para secciones
  const handleAddSection = useCallback(() => {
    if (!sectionName.trim()) {
      toast({ description: "El nombre de la sección no puede estar vacío." });
      return;
    }
    
    if (!currentProjectId) return;
    
    setProjects((prev) => prev.map(project => {
      if (project.id !== currentProjectId) return project;
      
      return {
        ...project,
        sections: [
          ...project.sections,
          {
            id: generateId(),
            name: sectionName.trim(),
            subsections: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        updatedAt: new Date().toISOString()
      };
    }));
    
    setSectionName("");
    setShowNewSection(false);
    toast({ description: "Sección creada." });
  }, [currentProjectId, sectionName]);
  
  // Funciones para subsecciones
  const handleAddSubsection = useCallback(() => {
    if (!subsectionName.trim()) {
      toast({ description: "El nombre de la subsección no puede estar vacío." });
      return;
    }
    
    if (!currentProjectId || !currentSectionId) return;
    
    setProjects((prev) => prev.map(project => {
      if (project.id !== currentProjectId) return project;
      
      return {
        ...project,
        updatedAt: new Date().toISOString(),
        sections: project.sections.map(section => {
          if (section.id !== currentSectionId) return section;
          
          return {
            ...section,
            updatedAt: new Date().toISOString(),
            subsections: [
              ...section.subsections,
              {
                id: generateId(),
                name: subsectionName.trim(),
                notes: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }
            ]
          };
        })
      };
    }));
    
    setSubsectionName("");
    setShowNewSubsection(false);
    toast({ description: "Subsección creada." });
  }, [currentProjectId, currentSectionId, subsectionName]);
  
  // Funciones para notas
  const handleAddNote = useCallback(() => {
    if (!noteTitle.trim()) {
      toast({ description: "El título de la nota no puede estar vacío." });
      return;
    }
    
    if (!currentProjectId || !currentSectionId || !currentSubsectionId) return;
    
    const newNote: WorkspaceNote = {
      id: currentNote?.id || generateId(),
      title: noteTitle.trim(),
      content: noteContent,
      createdAt: currentNote?.createdAt || Date.now(),
      updatedAt: Date.now(),
      priority: notePriority,
      tags: noteTags.length ? noteTags : undefined,
      dueDate: noteDueDate || undefined
    };
    
    setProjects((prev) => prev.map(project => {
      if (project.id !== currentProjectId) return project;
      
      return {
        ...project,
        sections: project.sections.map(section => {
          if (section.id !== currentSectionId) return section;
          
          return {
            ...section,
            subsections: section.subsections.map(subsection => {
              if (subsection.id !== currentSubsectionId) return subsection;
              
              // Si ya existe la nota, actualizarla; si no, añadirla
              if (currentNote) {
                return {
                  ...subsection,
                  notes: subsection.notes.map(note => 
                    note.id === currentNote.id ? newNote : note
                  )
                };
              } else {
                return {
                  ...subsection,
                  notes: [...subsection.notes, newNote]
                };
              }
            })
          };
        })
      };
    }));
    
    resetNoteForm();
    setShowNoteEditor(false);
    toast({ description: currentNote ? "Nota actualizada." : "Nota creada." });
  }, [
    currentNote, 
    currentProjectId, 
    currentSectionId, 
    currentSubsectionId, 
    noteTitle, 
    noteContent, 
    notePriority, 
    noteTags, 
    noteDueDate
  ]);
  
  const resetNoteForm = () => {
    setCurrentNote(null);
    setNoteTitle("");
    setNoteContent("");
    setNotePriority(undefined);
    setNoteTags([]);
    setNewTag("");
    setNoteDueDate("");
  };
  
  const openNoteEditor = (note?: WorkspaceNote) => {
    if (note) {
      setCurrentNote(note);
      setNoteTitle(note.title);
      setNoteContent(note.content);
      setNotePriority(note.priority);
      setNoteTags(note.tags || []);
      setNoteDueDate(note.dueDate || "");
    } else {
      resetNoteForm();
    }
    setShowNoteEditor(true);
  };
  
  const addTagToNote = () => {
    if (!newTag.trim()) return;
    if (!noteTags.includes(newTag.trim())) {
      setNoteTags([...noteTags, newTag.trim()]);
    }
    setNewTag("");
  };
  
  const removeTagFromNote = (tag: string) => {
    setNoteTags(noteTags.filter(t => t !== tag));
  };
  
  // Funciones para eliminar elementos
  const deleteSection = (projectId: string, sectionId: string) => {
    if (confirm("¿Eliminar esta sección y todo su contenido?")) {
      setProjects(prev => prev.map(project => {
        if (project.id !== projectId) return project;
        return {
          ...project,
          sections: project.sections.filter(s => s.id !== sectionId)
        };
      }));
      toast({ description: "Sección eliminada." });
    }
  };
  
  const deleteSubsection = (projectId: string, sectionId: string, subsectionId: string) => {
    if (confirm("¿Eliminar esta subsección y todas sus notas?")) {
      setProjects(prev => prev.map(project => {
        if (project.id !== projectId) return project;
        return {
          ...project,
          sections: project.sections.map(section => {
            if (section.id !== sectionId) return section;
            return {
              ...section,
              subsections: section.subsections.filter(s => s.id !== subsectionId)
            };
          })
        };
      }));
      toast({ description: "Subsección eliminada." });
    }
  };
  
  const deleteNote = (projectId: string, sectionId: string, subsectionId: string, noteId: string) => {
    if (confirm("¿Eliminar esta nota?")) {
      setProjects(prev => prev.map(project => {
        if (project.id !== projectId) return project;
        return {
          ...project,
          sections: project.sections.map(section => {
            if (section.id !== sectionId) return section;
            return {
              ...section,
              subsections: section.subsections.map(subsection => {
                if (subsection.id !== subsectionId) return subsection;
                return {
                  ...subsection,
                  notes: subsection.notes.filter(n => n.id !== noteId)
                };
              })
            };
          })
        };
      }));
      toast({ description: "Nota eliminada." });
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto mt-8">
      <Card className="p-6 bg-black/70 border-cyan-700/40">
        <div className="flex items-center mb-4 justify-between">
          <h2 className="text-2xl font-bold text-cyan-300">ESPACIO DE TRABAJO</h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setShowNewProject(true)} title="Nuevo proyecto">
              <Plus className="h-5 w-5 text-cyan-400" />
            </Button>
          </div>
        </div>
        
        {/* Vista principal de proyectos con pestañas */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "board")} className="w-full">
          <TabsList className="bg-cyan-950/50 mb-4">
            <TabsTrigger value="list" className="data-[state=active]:bg-cyan-800/30">
              <ListTodo size={14} className="mr-1" /> Lista
            </TabsTrigger>
            <TabsTrigger value="board" className="data-[state=active]:bg-cyan-800/30">
              <Grid3X3 size={14} className="mr-1" /> Tablero
            </TabsTrigger>
          </TabsList>
          
          {/* Contenido de la pestaña Lista */}
          <TabsContent value="list" className="mt-0">
            <div>
            {projects.length === 0 && (
              <div className="text-cyan-500/70 italic">No hay proyectos. ¡Crea uno con el botón (+)!</div>
            )}
            
            {projects.map((project) => (
              <div key={project.id} className="mb-4">
                <div className="flex items-center justify-between w-full hover:bg-cyan-950/30 rounded px-2 py-1.5">
                  <button 
                    className="flex items-center text-left flex-1"
                    onClick={() => toggleExpand(project.id)}
                  >
                    {expanded.includes(project.id) ? (
                      <ChevronDown className="h-4 w-4 mr-2 text-cyan-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 mr-2 text-cyan-400" />
                    )}
                    <span className="text-cyan-100 font-medium text-lg">{project.name}</span>
                  </button>
                  
                  {/* Controles de proyecto */}
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7" 
                      title="Añadir sección"
                      onClick={() => {
                        setCurrentProjectId(project.id);
                        setShowNewSection(true);
                      }}
                    >
                      <Plus className="h-4 w-4 text-cyan-400" />
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7" 
                      title="Eliminar proyecto"
                      onClick={() => {
                        if (confirm(`¿Eliminar proyecto "${project.name}"?`)) {
                          setProjects((prev) => prev.filter((p) => p.id !== project.id));
                          toast({ description: "Proyecto eliminado." });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-cyan-400 hover:text-red-400" />
                    </Button>
                  </div>
                </div>
                
                {/* Secciones */}
                {expanded.includes(project.id) && (
                  <div className="ml-6 mt-1">
                    {project.sections.length === 0 && (
                      <div className="text-cyan-500/50 italic text-sm mt-1">No hay secciones. Crea una con el botón + del proyecto.</div>
                    )}
                    
                    {project.sections.map(section => (
                      <div key={section.id} className="mb-2 mt-1">
                        <div className="flex items-center justify-between w-full hover:bg-cyan-950/20 rounded px-2 py-1">
                          <button 
                            className="flex items-center text-left flex-1"
                            onClick={() => toggleExpandSection(section.id)}
                          >
                            {expandedSections.includes(section.id) ? (
                              <ChevronDown className="h-3.5 w-3.5 mr-2 text-cyan-500" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 mr-2 text-cyan-500" />
                            )}
                            <span className="text-cyan-200 font-medium">{section.name}</span>
                          </button>
                          
                          {/* Controles de sección */}
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6" 
                              title="Añadir subsección"
                              onClick={() => {
                                setCurrentProjectId(project.id);
                                setCurrentSectionId(section.id);
                                setShowNewSubsection(true);
                              }}
                            >
                              <Plus className="h-3.5 w-3.5 text-cyan-500" />
                            </Button>
                            
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6" 
                              title="Eliminar sección"
                              onClick={() => deleteSection(project.id, section.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-cyan-500 hover:text-red-400" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Subsecciones */}
                        {expandedSections.includes(section.id) && (
                          <div className="ml-5">
                            {section.subsections.length === 0 && (
                              <div className="text-cyan-500/40 italic text-xs mt-1 ml-1">No hay subsecciones. Crea una con el botón +.</div>
                            )}
                            
                            {section.subsections.map(subsection => (
                              <div key={subsection.id} className="mt-1">
                                <div className="flex items-center justify-between w-full hover:bg-cyan-950/10 rounded px-2 py-0.5">
                                  <button 
                                    className="flex items-center text-left flex-1"
                                    onClick={() => toggleExpandSubsection(subsection.id)}
                                  >
                                    {expandedSubsections.includes(subsection.id) ? (
                                      <ChevronDown className="h-3 w-3 mr-1.5 text-cyan-400/80" />
                                    ) : (
                                      <ChevronRight className="h-3 w-3 mr-1.5 text-cyan-400/80" />
                                    )}
                                    <span className="text-cyan-300/80 text-sm">{subsection.name}</span>
                                    {subsection.notes.length > 0 && (
                                      <span className="ml-2 text-xs bg-cyan-900/30 px-1.5 py-0.5 rounded-full text-cyan-300/70">
                                        {subsection.notes.length}
                                      </span>
                                    )}
                                  </button>
                                  
                                  {/* Controles de subsección */}
                                  <div className="flex items-center gap-1">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-5 w-5" 
                                      title="Añadir nota"
                                      onClick={() => {
                                        setCurrentProjectId(project.id);
                                        setCurrentSectionId(section.id);
                                        setCurrentSubsectionId(subsection.id);
                                        openNoteEditor();
                                      }}
                                    >
                                      <Plus className="h-3 w-3 text-cyan-400/80" />
                                    </Button>
                                    
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-5 w-5" 
                                      title="Eliminar subsección"
                                      onClick={() => deleteSubsection(project.id, section.id, subsection.id)}
                                    >
                                      <Trash2 className="h-3 w-3 text-cyan-400/80 hover:text-red-400" />
                                    </Button>
                                  </div>
                                </div>
                                
                                {/* Notas */}
                                {expandedSubsections.includes(subsection.id) && subsection.notes.length > 0 && (
                                  <div className="ml-4 mt-1">
                                    {subsection.notes.map(note => (
                                      <div 
                                        key={note.id} 
                                        className={cn(
                                          "p-2 rounded-md mb-1 cursor-pointer border border-transparent",
                                          "hover:bg-cyan-950/20 hover:border-cyan-800/30 transition-all",
                                          {
                                            "border-l-2 border-l-yellow-500": note.priority === "high",
                                            "border-l-2 border-l-cyan-500": note.priority === "medium",
                                            "border-l-2 border-l-gray-500": note.priority === "low"
                                          }
                                        )}
                                        onClick={() => {
                                          setCurrentProjectId(project.id);
                                          setCurrentSectionId(section.id);
                                          setCurrentSubsectionId(subsection.id);
                                          openNoteEditor(note);
                                        }}
                                      >
                                        <div className="flex items-start justify-between">
                                          <div>
                                            <h4 className="text-sm font-medium text-cyan-200">{note.title}</h4>
                                            <p className="text-xs text-cyan-400/60 mt-0.5 line-clamp-2">
                                              {note.content.substring(0, 150)}{note.content.length > 150 ? "..." : ""}
                                            </p>
                                          </div>
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-5 w-5 mt-0 opacity-0 group-hover:opacity-100" 
                                            title="Eliminar nota"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              deleteNote(project.id, section.id, subsection.id, note.id);
                                            }}
                                          >
                                            <Trash2 className="h-3 w-3 text-cyan-400/80 hover:text-red-400" />
                                          </Button>
                                        </div>
                                        
                                        {/* Metadatos de la nota */}
                                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                                          {note.dueDate && (
                                            <div className="flex items-center text-xs text-cyan-300/70">
                                              <Calendar className="h-3 w-3 mr-1" />
                                              {new Date(note.dueDate).toLocaleDateString()}
                                            </div>
                                          )}
                                          
                                          {note.priority && (
                                            <div className="flex items-center text-xs">
                                              <Star className={cn(
                                                "h-3 w-3 mr-1",
                                                {
                                                  "text-yellow-500": note.priority === "high",
                                                  "text-cyan-500": note.priority === "medium",
                                                  "text-gray-500": note.priority === "low"
                                                }
                                              )} />
                                              <span className={cn(
                                                {
                                                  "text-yellow-500": note.priority === "high",
                                                  "text-cyan-500": note.priority === "medium",
                                                  "text-gray-500": note.priority === "low"
                                                }
                                              )}>
                                                {note.priority === "high" ? "Alta" : note.priority === "medium" ? "Media" : "Baja"}
                                              </span>
                                            </div>
                                          )}
                                          
                                          {note.tags && note.tags.length > 0 && (
                                            <div className="flex items-center gap-1 flex-wrap">
                                              {note.tags.map(tag => (
                                                <span 
                                                  key={tag} 
                                                  className="bg-cyan-900/30 text-cyan-200 text-xs px-1.5 py-0.5 rounded-full"
                                                >
                                                  #{tag}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="board" className="mt-0">
          <div className="text-cyan-500 italic">
            Vista de tablero (próximamente)
          </div>
        </TabsContent>
        </Tabs>
      </Card>

      <Dialog open={showNewProject} onOpenChange={setShowNewProject}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Proyecto</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Nombre del proyecto"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddProject();
            }}
          />
          <Button onClick={handleAddProject} className="mt-2 w-full">
            Crear
          </Button>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo para crear secciones */}
      <Dialog open={showNewSection} onOpenChange={setShowNewSection}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Sección</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Nombre de la sección"
            value={sectionName}
            onChange={(e) => setSectionName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddSection();
            }}
          />
          <Button onClick={handleAddSection} className="mt-2 w-full">
            Crear
          </Button>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo para crear subsecciones */}
      <Dialog open={showNewSubsection} onOpenChange={setShowNewSubsection}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Subsección</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Nombre de la subsección"
            value={subsectionName}
            onChange={(e) => setSubsectionName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddSubsection();
            }}
          />
          <Button onClick={handleAddSubsection} className="mt-2 w-full">
            Crear
          </Button>
        </DialogContent>
      </Dialog>
      
      {/* Editor de notas */}
      <Dialog open={showNoteEditor} onOpenChange={(open) => {
        if (!open) resetNoteForm();
        setShowNoteEditor(open);
      }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{currentNote ? "Editar" : "Nueva"} Nota</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
            <Input
              placeholder="Título de la nota"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              className="text-base"
            />
            
            <Textarea 
              placeholder="Contenido de la nota..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={6}
              className="resize-none"
            />
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-cyan-200">Prioridad</label>
                <select 
                  className="w-full bg-cyan-950/30 border-cyan-800/30 rounded text-cyan-100 px-2 py-1 text-sm"
                  value={notePriority || ""}
                  onChange={(e) => setNotePriority(e.target.value as any || undefined)}
                >
                  <option value="">Sin prioridad</option>
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                </select>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs text-cyan-200">Fecha de vencimiento</label>
                <Input
                  type="date"
                  value={noteDueDate}
                  onChange={(e) => setNoteDueDate(e.target.value)}
                  className="h-7 text-sm"
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs text-cyan-200">Etiquetas</label>
              <div className="flex flex-wrap gap-1 mb-1">
                {noteTags.map(tag => (
                  <span 
                    key={tag} 
                    className="bg-cyan-900/50 text-cyan-100 text-xs px-2 py-1 rounded-full flex items-center gap-1"
                  >
                    #{tag}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 rounded-full hover:bg-cyan-800"
                      onClick={() => removeTagFromNote(tag)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Nueva etiqueta"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addTagToNote();
                  }}
                />
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={addTagToNote}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              onClick={handleAddNote}
              className="w-full"
              disabled={!noteTitle.trim()}
            >
              {currentNote ? "Actualizar" : "Crear"} Nota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FunctionalWorkspace;
