import React from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface TutorialModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
  profileName?: string;
}

const TutorialModal: React.FC<TutorialModalProps> = ({ 
  isOpen, 
  onAccept, 
  onDecline,
  profileName = ""
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div 
        className="bg-gradient-to-b from-gray-900 to-gray-950 rounded-xl border border-cyan-500/50 shadow-lg shadow-cyan-500/20 
        max-w-md w-full p-6 animate-fadeIn relative"
      >
        <div className="absolute -top-3 -right-3 w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 
          flex items-center justify-center shadow-lg">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="text-white"
          >
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
          </svg>
        </div>
        
        <div className="mt-3 mb-6">
          <h2 className="text-2xl font-bold text-cyan-300 mb-2">
            ¡Bienvenido{profileName ? ` ${profileName}` : ''}!
          </h2>
          <p className="text-cyan-100 leading-relaxed">
            Parece que es la primera vez que utilizas NEXUS. ¿Te gustaría ver un tutorial guiado 
            para conocer todas las funcionalidades disponibles?
          </p>
          <p className="text-cyan-200 mt-3 italic text-sm">
            Orión, nuestra asistente de guía, te presentará todo lo que NEXUS puede hacer por ti.
          </p>
        </div>

        <div className="flex justify-end space-x-3 mt-4">
          <Button 
            variant="outline"
            className="border-cyan-600 text-cyan-400 hover:bg-cyan-950" 
            onClick={onDecline}
          >
            No, gracias
          </Button>
          <Button 
            className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90" 
            onClick={onAccept}
          >
            Ver tutorial
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TutorialModal;
