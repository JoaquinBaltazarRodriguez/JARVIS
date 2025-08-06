import React, { useRef, useImperativeHandle, forwardRef, useState } from "react";
import YouTube from "react-youtube";

export type YouTubePlayerRef = {
  play: () => void;
  pause: () => void;
  next: () => void;
  previous: () => void;
  loadVideoById: (videoId: string) => void;
  loadPlaylist: (videoIds: string[], startIndex?: number) => void;
  getCurrentVideoId: () => string | null;
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  getPlayerState?: () => number;
};

type Props = {
  videoId: string;
  title?: string;
  onEnd?: () => void;
  playlist?: string[];
  currentPlaylistIndex?: number;
  onNextSong?: (videoId: string, index: number) => void;
  onPrevSong?: (videoId: string, index: number) => void;
};

const YouTubePlayer = forwardRef<YouTubePlayerRef, Props>(({ videoId, title, onEnd, playlist = [], currentPlaylistIndex = 0, onNextSong, onPrevSong }, ref) => {
  const playerRef = useRef<any>(null);
  const [internalPlaylist, setInternalPlaylist] = useState<string[]>(playlist);
  const [internalIndex, setInternalIndex] = useState<number>(currentPlaylistIndex);

  // Actualizar el estado interno cuando cambian las props
  React.useEffect(() => {
    if (playlist.length > 0) {
      setInternalPlaylist(playlist);
      setInternalIndex(currentPlaylistIndex);
    }
  }, [playlist, currentPlaylistIndex]);

  // 🚨 LIMPIEZA DE MEMORIA: Limpiar reproductor al desmontar componente
  React.useEffect(() => {
    return () => {
      try {
        if (playerRef.current?.internalPlayer) {
          console.log('🧹 Limpiando reproductor YouTube al desmontar');
          playerRef.current.internalPlayer.stopVideo();
          playerRef.current.internalPlayer.clearVideo();
          playerRef.current.internalPlayer.destroy();
        }
      } catch (error) {
        console.log('⚠️ Error limpiando reproductor:', error);
      }
    };
  }, []);

  // Funciones para navegación de playlist
  const handleNext = () => {
    if (internalPlaylist.length === 0) return;
    
    // OPTIMIZACIÓN DE MEMORIA: Limpiar video anterior antes de cargar nuevo
    try {
      playerRef.current?.internalPlayer?.stopVideo();
      playerRef.current?.internalPlayer?.clearVideo();
    } catch (error) {
      console.log(' Error limpiando video anterior:', error);
    }
    
    const nextIndex = (internalIndex + 1) % internalPlaylist.length;
    const nextVideoId = internalPlaylist[nextIndex];
    
    if (nextVideoId) {
      setInternalIndex(nextIndex);
      // Pequeño delay para asegurar limpieza antes de cargar nuevo video
      setTimeout(() => {
        playerRef.current?.internalPlayer?.loadVideoById(nextVideoId);
      }, 100);
      if (onNextSong) onNextSong(nextVideoId, nextIndex);
    }
  };

  const handlePrevious = () => {
    if (internalPlaylist.length === 0) return;
    
    // 🚨 OPTIMIZACIÓN DE MEMORIA: Limpiar video anterior antes de cargar nuevo
    try {
      playerRef.current?.internalPlayer?.stopVideo();
      playerRef.current?.internalPlayer?.clearVideo();
    } catch (error) {
      console.log('⚠️ Error limpiando video anterior:', error);
    }
    
    const prevIndex = (internalIndex - 1 + internalPlaylist.length) % internalPlaylist.length;
    const prevVideoId = internalPlaylist[prevIndex];
    
    if (prevVideoId) {
      setInternalIndex(prevIndex);
      // Pequeño delay para asegurar limpieza antes de cargar nuevo video
      setTimeout(() => {
        playerRef.current?.internalPlayer?.loadVideoById(prevVideoId);
      }, 100);
      if (onPrevSong) onPrevSong(prevVideoId, prevIndex);
    }
  };

  // Handler para cuando termina un video
  const handleVideoEnd = () => {
    if (onEnd) onEnd();
    handleNext(); // Automáticamente reproduce el siguiente video cuando termina
  };

  useImperativeHandle(ref, () => ({
    play: () => playerRef.current?.internalPlayer?.playVideo(),
    pause: () => playerRef.current?.internalPlayer?.pauseVideo(),
    loadVideoById: (id: string) => playerRef.current?.internalPlayer?.loadVideoById(id),
    loadPlaylist: (videoIds: string[], startIndex = 0) => {
      setInternalPlaylist(videoIds);
      setInternalIndex(startIndex);
      if (videoIds.length > 0) {
        playerRef.current?.internalPlayer?.loadVideoById(videoIds[startIndex]);
      }
    },
    getCurrentVideoId: () => internalPlaylist[internalIndex] || null,
    next: handleNext,
    previous: handlePrevious,
    playVideo: () => playerRef.current?.internalPlayer?.playVideo(),
    pauseVideo: () => playerRef.current?.internalPlayer?.pauseVideo(),
    stopVideo: () => playerRef.current?.internalPlayer?.stopVideo(),
    getPlayerState: () => playerRef.current?.internalPlayer?.getPlayerState(),
  }));

  return (
    <div className="bg-[#111927] rounded-lg p-4 flex flex-col shadow-md max-w-xl w-full">
      <div className="mb-2 text-cyan-400 font-bold flex items-center">
        <span>🎵</span>
        <span className="ml-2">{title || "Reproduciendo música"}</span>
      </div>
      
      {/* 🎧 REPRODUCTOR AUDIO-ONLY: Video oculto para solo reproducir audio */}
      <div className="relative">
        {/* Video completamente oculto pero funcional */}
        <div className="absolute -left-[9999px] -top-[9999px] w-0 h-0 overflow-hidden">
          <YouTube
            videoId={videoId}
            ref={playerRef}
            opts={{
              width: "1",
              height: "1",
              playerVars: {
                autoplay: 1,
                controls: 0, // Sin controles visuales
                // 🚨 OPTIMIZACIÓN EXTREMA: Solo audio, sin video
                quality: 'tiny', // Calidad mínima posible
                vq: 'tiny',
                hd: 0,
                // Deshabilitar TODO lo visual
                disablekb: 1,
                fs: 0,
                rel: 0,
                showinfo: 0,
                iv_load_policy: 3,
                modestbranding: 1,
                playsinline: 1,
                // Configuración para solo audio
                cc_load_policy: 0, // Sin subtítulos
                hl: 'es',
                origin: window.location.origin,
                // 🚨 CONFIGURACIÓN EXTREMA PARA MÍNIMA MEMORIA
                enablejsapi: 1,
                widget_referrer: window.location.origin,
                // Forzar la calidad más baja posible
                suggestedQuality: 'tiny',
                // Deshabilitar precarga de video
                preload: 'none',
                // Configuración de red mínima
                html5: 1
              },
            }}
            onEnd={handleVideoEnd}
          />
        </div>
        
        {/* Interfaz visual minimalista para controles */}
        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <div className="text-cyan-400 text-sm mb-2">🎧 Reproduciendo solo audio</div>
          <div className="text-gray-300 text-xs">Video oculto para optimizar memoria</div>
        </div>
      </div>
    </div>
  );
});

YouTubePlayer.displayName = "YouTubePlayer";
export default YouTubePlayer;