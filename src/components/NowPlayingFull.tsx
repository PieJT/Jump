import { useRef, useState } from "react";
import { usePlayer } from "../hooks/PlayerContext";
import { formatTime } from "../lib/time";
import { PauseIcon, PlayIcon, PrevIcon, NextIcon } from "./Icons";

interface NowPlayingFullProps {
  open: boolean;
  onClose: () => void;
}

const CLOSE_DISTANCE = 110;

export function NowPlayingFull({ open, onClose }: NowPlayingFullProps) {
  const { currentTrack, isPlaying, progress, togglePlay, next, prev, seekToFraction } = usePlayer();
  const startYRef = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);

  if (!currentTrack) return null;

  const pct = progress.duration ? (progress.current / progress.duration) * 100 : 0;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = (e.clientX - rect.left) / rect.width;
    seekToFraction(Math.min(1, Math.max(0, fraction)));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    startYRef.current = e.clientY;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (startYRef.current === null) return;
    const delta = e.clientY - startYRef.current;
    if (delta > 0) setDragY(delta);
  };

  const endDrag = () => {
    if (dragY > CLOSE_DISTANCE) {
      onClose();
    }
    startYRef.current = null;
    setDragging(false);
    setDragY(0);
  };

  return (
    <div className={`now-playing-full${open ? " open" : ""}`}>
      <div className="npf-bg" style={{ backgroundImage: `url(${currentTrack.thumb})` }} />
      <div className="npf-scrim" />
      <div
        className={`npf-panel${dragging ? " dragging" : ""}`}
        style={dragY ? { transform: `translateY(${dragY}px)` } : undefined}
      >
        <div
          className="npf-drag-zone"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="npf-close" onClick={onClose} />
        </div>

        <div className="npf-body">
          <div className="npf-art-wrap">
            <img className="npf-art" src={currentTrack.thumb} alt="" />
          </div>
          <div className="npf-title">{currentTrack.title}</div>
          <div className="npf-artist">{currentTrack.artist}</div>
        </div>

        <div className="npf-controls-block">
          <div className="npf-progress-row">
            <div className="npf-bar" onClick={handleSeek}>
              <div className="npf-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="npf-times">
              <span>{formatTime(progress.current)}</span>
              <span>{formatTime(progress.duration)}</span>
            </div>
          </div>
          <div className="npf-controls">
            <button className="icon-btn" onClick={prev} aria-label="Previous">
              <PrevIcon />
            </button>
            <button className="icon-btn play-btn" onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"}>
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
            <button className="icon-btn" onClick={next} aria-label="Next">
              <NextIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}