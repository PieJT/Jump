import { usePlayer } from "../hooks/PlayerContext";
import { formatTime } from "../lib/time";
import { PauseIcon, PlayIcon, PrevIcon, NextIcon } from "./Icons";

interface NowPlayingFullProps {
  open: boolean;
  onClose: () => void;
}

export function NowPlayingFull({ open, onClose }: NowPlayingFullProps) {
  const { currentTrack, isPlaying, progress, togglePlay, next, prev, seekToFraction } = usePlayer();

  if (!currentTrack) return null;

  const pct = progress.duration ? (progress.current / progress.duration) * 100 : 0;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = (e.clientX - rect.left) / rect.width;
    seekToFraction(Math.min(1, Math.max(0, fraction)));
  };

  return (
    <div className={`now-playing-full${open ? " open" : ""}`}>
      <div className="npf-bg" style={{ backgroundImage: `url(${currentTrack.thumb})` }} />
      <div className="npf-scrim" />
      <div className="npf-panel">
        <div className="npf-close" onClick={onClose} />
        <div className="npf-art-wrap">
          <img className="npf-art" src={currentTrack.thumb} alt="" />
        </div>
        <div className="npf-title">{currentTrack.title}</div>
        <div className="npf-artist">{currentTrack.artist}</div>
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
          <button className="icon-btn" onClick={prev}>
            <PrevIcon />
          </button>
          <button className="icon-btn play-btn" onClick={togglePlay}>
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button className="icon-btn" onClick={next}>
            <NextIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
