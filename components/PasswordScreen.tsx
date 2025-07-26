import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic, ArrowRight } from "lucide-react";
import type { UserProfile } from "./ProfileSelector";

interface PasswordScreenProps {
  profile: UserProfile;
  onPasswordSuccess: () => void;
  onBack: () => void;
}

export function PasswordScreen({ profile, onPasswordSuccess, onBack }: PasswordScreenProps) {
  const [password, setPassword] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState("");
  const [recognizing, setRecognizing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Configurar reconocimiento de voz
  useEffect(() => {
    if (typeof window !== 'undefined' && 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'es-ES';
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onstart = () => {
        setRecognizing(true);
      };

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript.toLowerCase().trim()
          .replace(/[^a-z]/g, '') // Eliminar cualquier carácter que no sea una letra minúscula
          .replace(/\s+/g, ''); // Eliminar espacios
        
        setPassword(transcript);
        validatePassword(transcript);
        setIsListening(false);
        setRecognizing(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        setRecognizing(false);
      };

      recognitionRef.current.onend = () => {
        setRecognizing(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        // Detener el reconocimiento de voz cuando el componente se desmonta
        recognitionRef.current.stop();
        recognitionRef.current.onend = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
      }
    };
  }, []);

  useEffect(() => {
    // Autofocus en el campo de contraseña
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const startListening = () => {
    if (recognitionRef.current && !recognizing) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setError("");
      } catch (error) {
        console.error("Error starting speech recognition:", error);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const validatePassword = (inputPassword: string) => {
    if (inputPassword === profile.password) {
      setError("");
      onPasswordSuccess();
    } else if (inputPassword) {
      setError("Contraseña incorrecta. Inténtalo de nuevo.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    validatePassword(password);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full max-w-md mx-auto">
      <div 
        className="w-24 h-24 rounded-md flex items-center justify-center mb-6"
        style={{ backgroundColor: profile.color }}
      >
        <span className="text-white text-4xl font-bold">
          {profile.name.charAt(0).toUpperCase()}
        </span>
      </div>
      
      <h2 className="text-xl text-cyan-400 mb-8">
        Hola, {profile.name}
      </h2>
      
      <form onSubmit={handleSubmit} className="w-full space-y-4">
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              type="password"
              placeholder="Ingresa tu contraseña"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value.toLowerCase().replace(/[^a-z]/g, '')); 
                setError("");
              }}
              className="bg-gray-800 border-gray-700 text-white pl-4 pr-10 py-6 text-lg"
            />
            <Button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full ${
                isListening ? "bg-red-600" : "bg-cyan-700"
              } hover:${isListening ? "bg-red-700" : "bg-cyan-800"}`}
              variant="ghost"
            >
              <Mic className={`h-5 w-5 ${isListening ? "animate-pulse" : ""}`} />
            </Button>
          </div>
          
          <Button 
            type="submit" 
            className="bg-cyan-600 hover:bg-cyan-700 px-4 py-6"
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
        
        {error && (
          <p className="text-red-500 text-center">{error}</p>
        )}
        
        {isListening && (
          <p className="text-cyan-400 text-center animate-pulse">
            Escuchando... Di tu contraseña
          </p>
        )}
        
        <div className="pt-4 flex justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            className="text-gray-400 hover:text-white hover:bg-transparent"
          >
            Volver
          </Button>
          
          <p className="text-gray-500 text-sm mt-2">
            Di o escribe tu contraseña para continuar
          </p>
        </div>
      </form>
    </div>
  );
}
