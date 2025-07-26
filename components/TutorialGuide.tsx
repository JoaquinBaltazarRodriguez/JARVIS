import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface TutorialStep {
  title: string;
  description: string;
  targetSelector?: string; // Selector CSS para el elemento a destacar
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'; // Posición del tooltip
}

interface TutorialGuideProps {
  isActive: boolean;
  onComplete: () => void;
  profileName: string;
  isFeminine: boolean;
}

const TutorialGuide: React.FC<TutorialGuideProps> = ({
  isActive,
  onComplete,
  profileName,
  isFeminine,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const orionVoiceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  // Definimos todos los pasos del tutorial
  const tutorialSteps: TutorialStep[] = [
    {
      title: "Bienvenido a NEXUS",
      description: `Hola ${profileName}, mi nombre es Orión y seré tu guía para enseñarte todo lo que debes saber sobre NEXUS, el asistente virtual desarrollado por Veridian.`,
      position: 'center'
    },
    {
      title: "Interfaz Principal",
      description: "NEXUS cuenta con una interfaz completamente personalizable, diseñada para brindarte la mejor experiencia de asistencia virtual. Podrás interactuar a través de comandos de voz o texto.",
      position: 'center'
    },
    {
      title: "Modos de NEXUS",
      description: "NEXUS ofrece tres modos de funcionamiento principales que se adaptan a tus necesidades específicas. Vamos a conocerlos.",
      position: 'center'
    },
    {
      title: "Modo Normal",
      description: "El Modo Normal es el predeterminado. En este modo, NEXUS escucha tus comandos de voz y responde a solicitudes básicas como reproducir música, hacer llamadas, obtener información del clima, y otras funciones cotidianas.",
      targetSelector: "button[title='Modo Normal'], button[aria-label='Modo Normal']",
      position: 'bottom'
    },
    {
      title: "PORTAL-NEXUS",
      description: "El modo PORTAL-NEXUS te conecta con todos los productos de Veridian Hex Technologies. Aquí podrás consultar fichas técnicas, especificaciones, materiales y funcionalidades de cada producto. Si ya posees algún producto, podrás controlarlo mediante comandos de voz a través de NEXUS.",
      targetSelector: "button[title='Modo Inteligente'], button[aria-label='Modo Inteligente']",
      position: 'bottom'
    },
    {
      title: "Modo Funcional",
      description: "El Modo Funcional te ofrece un completo gestor de flujos de trabajo. Podrás organizar tareas por bloques, tomar apuntes, acceder a un calendario, configurar alarmas y muchas otras funciones que te ayudarán a optimizar tu productividad diaria.",
      targetSelector: "button[title='Modo Funcional'], button[aria-label='Modo Funcional']",
      position: 'bottom'
    },
    {
      title: "Control por Voz",
      description: "NEXUS está diseñado para responder a tus comandos de voz. Simplemente habla con naturalidad y NEXUS procesará tus peticiones. El indicador de estado te mostrará cuándo está escuchando, procesando o hablando.",
      position: 'center'
    },
    {
      title: "Música y Playlists",
      description: "Puedes pedirle a NEXUS que reproduzca música, cree playlists personalizadas y controle la reproducción. Todo mediante comandos de voz sencillos.",
      targetSelector: "div[class*='header'] button, button[class*='header'], .header-button, button:has(svg), nav button, div[class*='navbar'] button, button:has(path), button[class*='icon'], button[class*='control'], button:has(svg[stroke='currentColor']), .icon-button, button:has(path[stroke-linejoin='round']), div[class*='top'] button, div[class*='header'] > div > button",
      position: 'bottom'
    },
    {
      title: "Ubicaciones y Navegación",
      description: "NEXUS puede ayudarte a guardar ubicaciones favoritas y abrir navegación hacia ellas con simples comandos de voz.",
      targetSelector: "div[class*='header'] button, button[class*='header'], .header-button, button:has(svg), nav button, div[class*='navbar'] button, button:has(path), button[class*='icon'], button[class*='control'], button:has(svg[stroke='currentColor']), .icon-button, button:has(path[stroke-linejoin='round']), div[class*='top'] button, div[class*='header'] > div > button",
      position: 'bottom'
    },
    {
      title: "Conversaciones",
      description: "Todas tus interacciones con NEXUS quedan registradas en conversaciones que puedes revisar en cualquier momento.",
      targetSelector: "button:has(svg.message-square), button[title*='Conversaci'], button[aria-label*='Conversaci'], button[title*='Historial'], button[aria-label*='Historial']",
      position: 'bottom'
    },

    {
      title: "Tutorial",
      description: "Podrás acceder a este tutorial en cualquier momento desde el botón de ayuda en la barra de navegación.",
      targetSelector: "button:has(svg.book-open), button[title='Tutorial Guiado'], button[aria-label='Tutorial Guiado']",
      position: 'bottom'
    },
    
    {
      title: "Configuración",
      description: "Personaliza NEXUS según tus preferencias a través del menú de configuración. Podras modificar la interfaz de NEXUS, para un modo de rendimiento sin animaciones, mutear y desmutear al asistente de voz, gestionar tu perfil y acceder a los comandos de voz para ver todas las funcionalidades disponibles.",
      targetSelector: "button:has(svg.settings), button[title='Configuraciones'], button[aria-label='Configuraciones']",
      position: 'bottom'
    },
    
    {
      title: "¡Estás listo!",
      description: `${isFeminine ? "¡Bienvenida" : "¡Bienvenido"} a NEXUS, ${profileName}! Estás listo para comenzar a usar todas las increíbles funciones de tu asistente. Si necesitas ayuda adicional, siempre puedes acceder nuevamente a este tutorial.`,
      position: 'center'
    }
  ];

  // Función para hablar como Orion
  const speakAsOrion = (text: string) => {
    if (orionVoiceRef.current) {
      window.speechSynthesis.cancel(); // Cancelar cualquier voz previa
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configuración de voz para Nova (femenina)
    let selectedVoice = null;
    const voices = window.speechSynthesis.getVoices();
    
    // Intentar encontrar una voz femenina en español
    selectedVoice = voices.find(voice => 
      voice.name.includes('Spanish') && 
      voice.name.includes('Female')
    );
    
    // Si no hay voz española femenina, buscar cualquier voz femenina
    if (!selectedVoice) {
      selectedVoice = voices.find(voice => 
        voice.name.includes('Female')
      );
    }
    
    // Si aún no hay voz, usar la primera disponible
    if (!selectedVoice && voices.length > 0) {
      selectedVoice = voices[0];
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    // Configuración para una voz extremadamente grave e imponente
    utterance.rate = 1;  // Velocidad más lenta para un sonido más profundo e imponente
    utterance.pitch = 1.9; // Tono extremadamente bajo para una voz profundamente grave
    utterance.volume = 1.0; // Volumen máximo
    
    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    
    orionVoiceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Función para avanzar al siguiente paso
  const goToNextStep = () => {
    if (currentStepIndex < tutorialSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      completeGuide();
    }
  };

  // Función para retroceder al paso anterior
  const goToPreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  // Función para completar la guía
  const completeGuide = () => {
    if (orionVoiceRef.current) {
      window.speechSynthesis.cancel();
    }
    onComplete();
  };

  // Highlighter para el elemento objetivo
  const Highlighter = () => {
    const currentStep = tutorialSteps[currentStepIndex];
    const [position, setPosition] = useState<any>(null);

    // Si no hay selector o no estamos activos, no mostrar nada
    useEffect(() => {
      if (!currentStep?.targetSelector || !isActive) return;

      // Intentar diferentes selectores específicos primero
      const trySelectorsForMusic = () => {
        // Lista ampliada de selectores específicos para botones de música
        const musicSelectors = [
          "button.music-button", 
          "button:has(svg.music)", 
          ".music-control",
          "button[aria-label*='music']",
          "button[title*='Música']",
          "button:has(path[d*='M8 16'])",
          "button:nth-child(1):has(svg)"
        ];

        // Probar cada selector hasta encontrar uno que funcione
        for (const selector of musicSelectors) {
          const element = document.querySelector(selector);
          if (element) return element;
        }

        // Selector amplio como último recurso
        return document.querySelector("header button:first-child") || 
               document.querySelector(".header-controls button:first-child");
      };

      const trySelectorsForMap = () => {
        // Lista ampliada de selectores específicos para botones de navegación
        const mapSelectors = [
          "button.map-button", 
          "button:has(svg.map)",
          "button:has(svg.map-pin)",
          ".navigation-control",
          "button[aria-label*='naveg']",
          "button[title*='Ubicación']",
          "button:has(path[d*='M15 10'])",
          "button:nth-child(2):has(svg)"
        ];

        // Probar cada selector hasta encontrar uno que funcione
        for (const selector of mapSelectors) {
          const element = document.querySelector(selector);
          if (element) return element;
        }

        // Selector amplio como último recurso
        return document.querySelector("header button:nth-child(2)") || 
               document.querySelector(".header-controls button:nth-child(2)");
      };

      // Buscar el elemento en el DOM usando diferentes estrategias
      let targetElement = null;
      
      if (currentStep.title === "Música y Playlists") {
        targetElement = trySelectorsForMusic();
      } else if (currentStep.title === "Ubicaciones y Navegación") {
        targetElement = trySelectorsForMap();
      } else {
        // Para otros elementos, usar el selector normal
        targetElement = document.querySelector(currentStep.targetSelector);
      }
      
      if (!targetElement) return;

      // Obtener la posición del elemento
      const rect = targetElement.getBoundingClientRect();
      setPosition({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      });
    }, [currentStep, isActive]);

    // Si no hay posición, no mostrar nada
    if (!position) return null;
    if (!currentStep?.targetSelector) return null;
    
    return (
      <>
        {/* Destacado del elemento */}
        <div 
          className="absolute pointer-events-none z-50 border-2 border-cyan-400 rounded-lg shadow-lg shadow-cyan-500/50"
          style={{
            top: position.top - 4,
            left: position.left - 4,
            width: position.width + 8,
            height: position.height + 8,
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }}
        />
        {/* Recorte para el elemento seleccionado (elimina el overlay solo para este elemento) */}
        <div
          className="absolute pointer-events-none z-45"
          style={{
            top: position.top,
            left: position.left,
            width: position.width,
            height: position.height,
            backgroundColor: 'transparent',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)',
            borderRadius: '4px'
          }}
        />
      </>
    );
  };

  // Efecto para reiniciar al primer paso cuando se activa el tutorial
  useEffect(() => {
    if (isActive) {
      setCurrentStepIndex(0);
    }
  }, [isActive]);

  // Efecto para hablar cuando cambia el paso actual
  useEffect(() => {
    if (isActive && tutorialSteps[currentStepIndex]) {
      speakAsOrion(tutorialSteps[currentStepIndex].description);
    }
    
    return () => {
      // Limpiar la síntesis de voz al desmontar
      if (orionVoiceRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentStepIndex, isActive]);

  // Cargar voces al iniciar
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      // Algunas veces las voces no están disponibles inmediatamente
      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          // Las voces ahora están disponibles
        };
      }
    }
    
    // Cleanup
    return () => {
      if (orionVoiceRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!isActive) return null;

  const currentStep = tutorialSteps[currentStepIndex];
  
  return (
    <div className="fixed inset-0 z-40 pointer-events-auto">
      {/* Overlay semi-transparente */}
      <div className="absolute inset-0 bg-black/70 pointer-events-auto"></div>
      
      {/* Highlighter para elementos objetivo */}
      <Highlighter />
      
      {/* Contenido del tutorial */}
      <div 
        className={`fixed z-50 bg-gray-900/95 border border-cyan-500/50 rounded-xl p-6 shadow-xl shadow-cyan-500/20
          w-full transition-all duration-300`}
        style={{
          left: '50%',
          top: '25%',
          transform: 'translate(-50%, 0)',
          maxWidth: '850px',
          width: '95%',
          height: 'auto',
          minHeight: '220px', 
          maxHeight: '90vh',
          overflowY: 'visible',
          margin: '0 auto',
          paddingBottom: '40px',
          paddingTop: '40px',
          boxSizing: 'border-box',
          zIndex: 9999
        }}
      >
        {/* Indicador de progreso */}
        <div className="absolute -top-3 left-0 w-full flex justify-center">
          <div className="bg-gray-800 rounded-full px-3 py-1 border border-cyan-500/30">
            <div className="flex gap-1">
              {tutorialSteps.map((_, index) => (
                <div 
                  key={index} 
                  className={`w-2 h-2 rounded-full ${index === currentStepIndex ? 'bg-cyan-400' : 'bg-gray-600'}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Botón de cierre */}
        <button 
          onClick={completeGuide}
          className="absolute -top-4 -right-4 bg-red-500 text-white rounded-full p-2 shadow-md"
        >
          <X size={16} />
        </button>

        {/* Contenido del paso actual */}
        <div className="mb-5">
          <h3 className="text-xl font-bold text-cyan-300 mb-2 flex items-center gap-2">
            {isPlaying && (
              <span className="inline-block w-3 h-3 bg-cyan-400 rounded-full animate-pulse"/>
            )}
            {currentStep.title}
          </h3>
          <p className="text-cyan-100 leading-relaxed">{currentStep.description}</p>
        </div>

        {/* Botones de navegación */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={goToPreviousStep}
            disabled={currentStepIndex === 0}
            className={`border-cyan-600 text-cyan-400 ${currentStepIndex === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-cyan-950'}`}
          >
            <ChevronLeft className="mr-1 w-4 h-4" /> Anterior
          </Button>
          
          <Button
            className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90"
            onClick={goToNextStep}
          >
            {currentStepIndex === tutorialSteps.length - 1 ? 'Finalizar' : 'Siguiente'} <ChevronRight className="ml-1 w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TutorialGuide;
