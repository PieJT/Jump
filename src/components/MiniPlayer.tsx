import { useRef, useState } from "react";
import { usePlayer } from "../hooks/PlayerContext";
import { PauseIcon, PlayIcon, PrevIcon, NextIcon } from "./Icons";

interface MiniPlayerProps {
  onOpenFullPlayer: () => void;
}

const SWIPE_THRESHOLD = 46;
const MOVE_THRESHOLD = 8;

export function MiniPlayer({ onOpenFullPlayer }: MiniPlayerProps) {
  const { currentTrack, isPlaying, progress, togglePlay, next, prev, playbackError } = usePlayer();
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const swipedRef = useRef(false);
  const [dragX, setDragX] = useState(0);

  if (!currentTrack) return null;

  const pct = progress.duration ? (progress.current / progress.duration) * 100 : 0;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    startRef.current = { x: e.clientX, y: e.clientY };
    swipedRef.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!startRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    if (Math.abs(dx) > MOVE_THRESHOLD || Math.abs(dy) > MOVE_THRESHOLD) swipedRef.current = true;
    // Only follow the finger horizontally once it's clearly a horizontal swipe,
    // so a vertical swipe-up doesn't also drag the card sideways.
    if (Math.abs(dx) > Math.abs(dy)) setDragX(dx);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = startRef.current;
    startRef.current = null;
    setDragX(0);
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;

    if (Math.abs(dy) > Math.abs(dx) && dy < -SWIPE_THRESHOLD) {
      onOpenFullPlayer();
      return;
    }
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESHOLD) {
      if (dx < 0) next();
      else prev();
    }
  };

  const handleClick = () => {
    if (swipedRef.current) {
      swipedRef.current = false;
      return;
    }
    onOpenFullPlayer();
  };

  return (
    <>
      {playbackError && <div className="playback-error-toast">{playbackError}</div>}
      <div
        className="mini-player show"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          startRef.current = null;
          setDragX(0);
        }}
        onClick={handleClick}
        style={dragX ? { transform: `translateX(${dragX * 0.4}px)` } : undefined}
      >
        <div className="mini-progress">
          <div className="mini-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <img className={`mini-art${isPlaying ? " spinning" : ""}`} src={currentTrack.thumb} alt="" />
        <div className="mini-text">
          <div className="mini-title">{currentTrack.title}</div>
          <div className="mini-sub">{currentTrack.artist}</div>
        </div>
        <div className="mini-controls">
          <button
            className="icon-btn"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
          >
            <PrevIcon />
          </button>
          <button
            className="icon-btn play-btn"
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button
            className="icon-btn"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
          >
            <NextIcon />
          </button>
        </div>
      </div>
    </>
  );
}