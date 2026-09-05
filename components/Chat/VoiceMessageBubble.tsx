"use client";

import { useEffect, useRef, useState } from "react";
import { PlayIcon, PauseIcon } from "@heroicons/react/24/solid";

function formatClockTime(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds || 0));
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

type VoiceMessageBubbleProps = {
  src: string;
  duration?: number;
  className?: string;
};

export default function VoiceMessageBubble({ src, duration, className = "" }: VoiceMessageBubbleProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration ?? 0);

  useEffect(() => {
    setTotalDuration(duration ?? 0);
  }, [duration]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
  };

  const progressPercent = totalDuration > 0 ? Math.min(100, (currentTime / totalDuration) * 100) : 0;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={togglePlay}
        aria-label={isPlaying ? "Pause voice message" : "Play voice message"}
        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-green-1 text-white hover:opacity-90"
      >
        {isPlaying ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4 ltr:ml-0.5" />}
      </button>
      <div className="h-1 flex-1 min-w-[60px] rounded-full bg-black/10">
        <div className="h-1 rounded-full bg-green-1" style={{ width: `${progressPercent}%` }} />
      </div>
      <span className="shrink-0 text-[11px] text-[#667781]">
        {formatClockTime(isPlaying || currentTime > 0 ? currentTime : totalDuration)}
      </span>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          if (!duration && Number.isFinite(e.currentTarget.duration)) {
            setTotalDuration(e.currentTarget.duration);
          }
        }}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        className="hidden"
      />
    </div>
  );
}
