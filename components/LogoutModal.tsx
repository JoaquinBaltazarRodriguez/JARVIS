"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut } from 'lucide-react';

interface LogoutModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function LogoutModal({ isOpen, onConfirm, onCancel }: LogoutModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay con efecto de blur */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center"
            onClick={onCancel} // Cerrar al hacer clic fuera
          >
            {/* Modal con efecto de aparición */}
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="bg-gray-900/90 border border-cyan-500/50 rounded-lg p-6 max-w-md w-full shadow-lg"
              onClick={(e) => e.stopPropagation()} // Evitar que clicks en el modal cierren
            >
              {/* Decoración de fondo */}
              <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
                <div className="absolute top-0 left-0 h-full w-0.5 bg-gradient-to-b from-transparent via-cyan-400 to-transparent"></div>
                <div className="absolute top-0 right-0 h-full w-0.5 bg-gradient-to-b from-transparent via-cyan-400 to-transparent"></div>
                
                {/* Estrellas decorativas */}
                {[...Array(20)].map((_, i) => (
                  <div 
                    key={i}
                    className="absolute w-1 h-1 bg-cyan-400 rounded-full"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      opacity: 0.4 + Math.random() * 0.6,
                      animation: `twinkle ${1 + Math.random() * 3}s infinite ease-in-out`
                    }}
                  />
                ))}
              </div>
              
              {/* Icono y título */}
              <div className="flex flex-col items-center mb-6 relative">
                <div className="p-3 rounded-full bg-red-600/20 border border-red-500/40 mb-4">
                  <LogOut className="w-8 h-8 text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-white text-center">
                  Cerrar Sesión
                </h2>
              </div>
              
              {/* Mensaje */}
              <p className="text-gray-300 text-center mb-6">
                ¿Está seguro que desea cerrar su sesión en NEXUS? Tendrá que volver a iniciar el sistema e ingresar sus credenciales.
              </p>
              
              {/* Botones de acción */}
              <div className="flex justify-center gap-4">
                <button
                  onClick={onCancel}
                  className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md transition-colors duration-200 border border-gray-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={onConfirm}
                  className="px-5 py-2 bg-red-700 hover:bg-red-600 text-white rounded-md transition-colors duration-200 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> 
                  Cerrar Sesión
                </button>
              </div>
            </motion.div>
          </motion.div>
          
          {/* Estilos para la animación de parpadeo */}
          <style jsx global>{`
            @keyframes twinkle {
              0%, 100% { opacity: 0.2; }
              50% { opacity: 0.8; }
            }
          `}</style>
        </>
      )}
    </AnimatePresence>
  );
}
