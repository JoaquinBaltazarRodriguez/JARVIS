import React, { useRef, useImperativeHandle, forwardRef } from "react";
import YouTube from "react-youtube";

export type YouTubePlayerRef = {
  play: () => void;
  pause: () => void;
  next: () => void;
  previous: () => void;
  loadVideoById: (videoId: string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  getPlayerState?: () => number;
};

type Props = {
  videoId: string;
  title?: string;
  onEnd?: () => void;
};

const YouTubePlayer = forwardRef<YouTubePlayerRef, Props>(({ videoId, title, onEnd }, ref) => {
  const playerRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    play: () => playerRef.current?.internalPlayer?.playVideo(),
    pause: () => playerRef.current?.internalPlayer?.pauseVideo(),
    loadVideoById: (id: string) => playerRef.current?.internalPlayer?.loadVideoById(id),
    next: () => {}, // Puedes implementar listas si quieres
    previous: () => {},
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
        onEnd={onEnd}
      />
    </div>
  );
});

YouTubePlayer.displayName = "YouTubePlayer";
export default YouTubePlayer;