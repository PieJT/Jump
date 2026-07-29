import { usePlayer } from "../hooks/PlayerContext";
import { PauseIcon, PlayIcon, PrevIcon, NextIcon } from "./Icons";

interface MiniPlayerProps {
  onOpenFullPlayer: () => void;
}

export function MiniPlayer({ onOpenFullPlayer }: MiniPlayerProps) {
  const { currentTrack, isPlaying, progress, togglePlay, next, prev, playbackError } = usePlayer();

  if (!currentTrack) return null;

  const pct = progress.duration ? (progress.current / progress.duration) * 100 : 0;

  return (
    <>
      {playbackError && <div className="playback-error-toast">{playbackError}</div>}
      <div className="mini-player show" onClick={onOpenFullPlayer}>
      <div className="mini-progress">
        <div className="mini-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <img className={`mini-art${isPlaying ? " spinning" : ""}`} src={currentTrack.thumb} alt="" />
      <div className="mini-text">
        <div className="mini-title">{currentTrack.title}</div>
        <div className="mini-sub">{currentTrack.artist}</div>
      </div>
      <div className="mini-controls">
        <button className="icon-btn" onClick={(e) => { e.stopPropagation(); prev(); }}>
          <PrevIcon />
        </button>
        <button className="icon-btn play-btn" onClick={(e) => { e.stopPropagation(); togglePlay(); }}>
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button className="icon-btn" onClick={(e) => { e.stopPropagation(); next(); }}>
          <NextIcon />
        </button>
      </div>
    </div>
    </>
  );
} 