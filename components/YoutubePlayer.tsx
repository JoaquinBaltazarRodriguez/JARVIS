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

  // Funciones para navegación de playlist
  const handleNext = () => {
    if (internalPlaylist.length === 0) return;
    
    const nextIndex = (internalIndex + 1) % internalPlaylist.length;
    const nextVideoId = internalPlaylist[nextIndex];
    
    if (nextVideoId) {
      setInternalIndex(nextIndex);
      playerRef.current?.internalPlayer?.loadVideoById(nextVideoId);
      if (onNextSong) onNextSong(nextVideoId, nextIndex);
    }
  };

  const handlePrevious = () => {
    if (internalPlaylist.length === 0) return;
    
    const prevIndex = (internalIndex - 1 + internalPlaylist.length) % internalPlaylist.length;
    const prevVideoId = internalPlaylist[prevIndex];
    
    if (prevVideoId) {
      setInternalIndex(prevIndex);
      playerRef.current?.internalPlayer?.loadVideoById(prevVideoId);
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
      <YouTube
        videoId={videoId}
        ref={playerRef}
        opts={{
          width: "100%",
          height: "250",
          playerVars: {
            autoplay: 1,
            controls: 1,
          },
        }}
        onEnd={handleVideoEnd}
      />
    </div>
  );
});

YouTubePlayer.displayName = "YouTubePlayer";
export default YouTubePlayer;