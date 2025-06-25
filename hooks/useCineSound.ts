import { useEffect, useRef } from "react";

export function useCineSound(isSpeaking: boolean) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio("/cine-whoosh.mp3");
      audioRef.current.volume = 0.22;
    }
    if (isSpeaking) {
      // Reinicia y reproduce el sonido solo al empezar a hablar
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    } else {
      // Opcional: pausa si deja de hablar
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [isSpeaking]);
}
