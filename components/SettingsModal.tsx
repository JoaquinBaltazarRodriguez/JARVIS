import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

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

export function SettingsModal({ open, onClose }: {
  open: boolean;
  onClose: () => void;
}) {
  const [modal, setModal] = useState<null | "comandos">(null);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl p-0 overflow-hidden animate-fade-in">
        <DialogHeader className="p-6 pb-2 border-b border-gray-800 bg-gradient-to-r from-gray-900 to-gray-800">
          <DialogTitle className="flex items-center gap-2 text-cyan-400">
            <Settings className="w-6 h-6" />
            Configuración
          </DialogTitle>
        </DialogHeader>
        <div className="flex">
          <div className="w-48 bg-gray-900/80 border-r border-gray-800 flex flex-col py-4">
            <Button variant="ghost" className="justify-start px-6 py-3 text-left text-base font-medium text-cyan-300 hover:bg-cyan-800/10 transition-all" onClick={() => setModal("comandos")}>Comandos</Button>
          </div>
          <div className="flex-1 min-h-[350px] bg-gray-950/90">
            {modal === "comandos" && (
              <div className="p-6 animate-slide-up">
                <h2 className="text-lg font-bold text-cyan-300 mb-4">Comandos disponibles</h2>
                <ScrollArea className="h-72 pr-2">
                  {COMMANDS.map(section => (
                    <div key={section.title} className="mb-5">
                      <h3 className="text-cyan-400 font-semibold mb-2 uppercase tracking-wide text-sm">{section.title}</h3>
                      <ul className="space-y-2">
                        {section.commands.map(cmd => (
                          <li key={cmd.cmd} className="flex justify-between items-center bg-gray-800/70 rounded-lg px-4 py-2 hover:bg-cyan-900/10 transition-all">
                            <span className="font-mono text-cyan-200 text-sm">{cmd.cmd}</span>
                            <span className="text-gray-400 text-xs ml-4">{cmd.desc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}
            
            {!modal && (
              <div className="p-8 flex flex-col items-center justify-center animate-slide-up">
                <p className="text-cyan-300 text-lg mb-4">Selecciona una opción a la izquierda.</p>
                <Settings className="w-12 h-12 text-cyan-400 animate-spin-slow" />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Animaciones (puedes agregar en globals.css o tailwind.config.js):
// .animate-fade-in { animation: fadeIn 0.3s ease; }
// .animate-slide-up { animation: slideUp 0.4s cubic-bezier(.4,2,.6,1); }
// .animate-spin-slow { animation: spin 2.5s linear infinite; }
