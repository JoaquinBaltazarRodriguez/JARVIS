"use client"

import React from "react";
import { Unlock, Brain, Mail, Settings, MessageCircle, MapPin, Music } from "lucide-react";
import { FunctionalWorkspace } from "./FunctionalWorkspace";
import { Button } from "./ui/button";

interface Props {
  onNormal: () => void;
  onIntelligent: () => void;
  onFunctional: () => void;
  musicBackgroundMode?: boolean;
  currentSongTitle?: string;
  onShowSettings?: () => void;
  onShowConversations?: () => void;
  onShowLocations?: () => void;
  onMusicControl?: (action: string) => void;
}

/*
  Shell estático para el modo funcional.
  Se memoriza con React.memo para evitar renders cuando cambian flags globales
  (isSpeaking, isListening, etc.). Solo se vuelve a montar si cambia la
  referencia de las callbacks, lo cual no sucede porque vienen de useCallback
  estable o funciones definidas.
*/
const FunctionalModeShell: React.FC<Props> = ({ 
  onNormal, 
  onIntelligent, 
  onFunctional,
  musicBackgroundMode,
  currentSongTitle,
  onShowSettings,
  onShowConversations,
  onShowLocations,
  onMusicControl
}) => {
  console.log("FunctionalModeShell render");
  return (
    <div className="min-h-screen bg-black/95 relative overflow-hidden">
      {/* Barra de música en segundo plano mejorada si está activa */}
      {musicBackgroundMode && (
        <div className="fixed bottom-0 left-0 right-0 bg-black/80 border-t border-cyan-700/30 p-2 flex items-center justify-between z-50">
          {/* Indicador de modo y canción */}
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-start justify-center">
              <div className="text-cyan-300 text-sm truncate max-w-[200px] flex items-center">
                <span className="text-cyan-500 mr-2">♫</span>
                {currentSongTitle || "Reproduciendo música"}
              </div>
            </div>
          </div>

          {/* Controles de reproducción centrales */}
          <div className="flex items-center gap-2">
            {/* Botón anterior */}
            <Button size="icon" variant="ghost" className="hover:bg-cyan-800/50" aria-label="Anterior"
              onClick={() => onMusicControl?.('previous')}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 19l-7-7 7-7" /></svg>
            </Button>
            
            {/* Botón reproducir/pausar */}
            <Button size="icon" variant="ghost" className="hover:bg-cyan-800/50" aria-label="Reproducir/Pausar"
              onClick={() => onMusicControl?.('toggle')}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16"/>
                <rect x="14" y="4" width="4" height="16"/>
              </svg>
            </Button>
            
            {/* Botón siguiente */}
            <Button size="icon" variant="ghost" className="hover:bg-cyan-800/50" aria-label="Siguiente"
              onClick={() => onMusicControl?.('next')}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 5l7 7-7 7" /></svg>
            </Button>
          </div>
          
          {/* Botones de modos y acciones */}
          <div className="flex items-center gap-2">
            {/* Botones de cambio de modo */}
            <div className="flex items-center gap-1 mr-2">
              <button
                className="bg-cyan-700 hover:bg-cyan-800 text-white rounded-full p-2 shadow-md border border-cyan-400 w-7 h-7 flex items-center justify-center"
                onClick={onNormal}
                title="Modo Normal"
              >
                <Unlock className="w-3 h-3" />
              </button>
              <button
                className="bg-purple-700 hover:bg-purple-800 text-white rounded-full p-2 shadow-md border border-purple-400 w-7 h-7 flex items-center justify-center"
                onClick={onIntelligent}
                title="Modo Inteligente"
              >
                <Brain className="w-3 h-3" />
              </button>
              <button
                className="bg-orange-700 hover:bg-orange-800 text-white rounded-full p-2 shadow-md border border-orange-400 w-7 h-7 flex items-center justify-center"
                onClick={onFunctional}
                title="Modo Funcional"
              >
                <Mail className="w-3 h-3" />
              </button>
            </div>
            
            {/* Botones de acción */}
            <Button size="sm" variant="outline" className="bg-cyan-950/50 hover:bg-cyan-800" onClick={() => onMusicControl?.('foreground')}>
              <svg width="16" height="16" className="mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                <polyline points="10 17 15 12 10 7"/>
                <line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
              Primer plano
            </Button>
            <Button size="sm" variant="outline" className="bg-red-950/50 hover:bg-red-900/50" onClick={() => onMusicControl?.('quitar')}>
              <svg width="16" height="16" className="mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              Cerrar
            </Button>
          </div>
        </div>
      )}
      
      {/* Header fijo - Simplificado con solo el icono de settings */}
      <div className="flex justify-between items-center p-6 border-b border-cyan-500/20 relative z-10">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-cyan-400 tracking-wider">NEXUS</h1>
          <span className="text-cyan-200 text-base font-semibold">Modo funcional</span>
        </div>
        
        {/* Solo icono de configuración en el header */}
        <div className="flex items-center gap-2">
          <button 
            className="p-2 rounded-full hover:bg-cyan-800/20 text-cyan-400"
            onClick={onShowSettings}
            title="Configuración"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Workspace a pantalla completa */}
      <div className="absolute inset-0 top-[72px] flex flex-col z-20 overflow-hidden">
        <FunctionalWorkspace />
      </div>

      {/* Botones flotantes de cambio de modo */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-30">
        <button
          className="bg-cyan-700 hover:bg-cyan-800 text-white rounded-full p-3 shadow-lg border-2 border-cyan-400"
          onClick={onNormal}
          title="Modo Normal"
        >
          <Unlock className="w-6 h-6" />
        </button>
        <button
          className="bg-purple-700 hover:bg-purple-800 text-white rounded-full p-3 shadow-lg border-2 border-purple-400"
          onClick={onIntelligent}
          title="Modo Inteligente"
        >
          <Brain className="w-6 h-6" />
        </button>
        <button
          className="bg-orange-700 hover:bg-orange-800 text-white rounded-full p-3 shadow-lg border-2 border-orange-400"
          onClick={onFunctional}
          title="Modo Funcional"
        >
          <Mail className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default React.memo(FunctionalModeShell, () => true);
