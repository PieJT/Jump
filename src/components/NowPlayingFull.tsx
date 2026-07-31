import { useEffect, useRef, useState } from "react";
import { usePlayer } from "../hooks/PlayerContext";
import { formatTime } from "../lib/time";
import { fetchLyrics } from "../lib/lyrics";
import { PauseIcon, PlayIcon, PrevIcon, NextIcon, ShuffleIcon, RepeatIcon } from "./Icons";

interface NowPlayingFullProps {
  open: boolean;
  onClose: () => void;
}

const CLOSE_DISTANCE = 110;

type LyricsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; lyrics: string }
  | { status: "empty" }
  | { status: "error"; message: string };

export function NowPlayingFull({ open, onClose }: NowPlayingFullProps) {
  const {
    currentTrack,
    isPlaying,
    progress,
    togglePlay,
    next,
    prev,
    seekToFraction,
    workerUrl,
    shuffleEnabled,
    toggleShuffle,
    repeatMode,
    toggleRepeatMode,
  } = usePlayer();
  const startYRef = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [lyricsState, setLyricsState] = useState<LyricsState>({ status: "idle" });

  // Fetch lyrics whenever the panel is open and the track changes (not eagerly
  // on every track change, since most listeners won't open it every song).
  useEffect(() => {
    if (!lyricsOpen || !currentTrack) return;
    if (!workerUrl) {
      setLyricsState({ status: "error", message: "Connect a Worker URL first (see the worker icon in the sidebar)." });
      return;
    }

    let cancelled = false;
    setLyricsState({ status: "loading" });

    fetchLyrics(workerUrl, currentTrack.title, currentTrack.artist)
      .then((result) => {
        if (cancelled) return;
        setLyricsState(result.lyrics ? { status: "ready", lyrics: result.lyrics } : { status: "empty" });
      })
      .catch((err) => {
        if (cancelled) return;
        setLyricsState({ status: "error", message: err instanceof Error ? err.message : "Failed to load lyrics" });
      });

    return () => {
      cancelled = true;
    };
  }, [lyricsOpen, currentTrack, workerUrl]);

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
            <button
              className={`icon-btn shuffle-btn${shuffleEnabled ? " active" : ""}`}
              onClick={toggleShuffle}
              aria-label="Shuffle"
            >
              <ShuffleIcon active={shuffleEnabled} />
            </button>
            <button className="icon-btn" onClick={prev} aria-label="Previous">
              <PrevIcon />
            </button>
            <button className="icon-btn play-btn" onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"}>
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
            <button className="icon-btn" onClick={next} aria-label="Next">
              <NextIcon />
            </button>
            <button
              className={`icon-btn repeat-btn${repeatMode !== "none" ? " active" : ""}`}
              onClick={toggleRepeatMode}
              aria-label="Repeat"
            >
              <RepeatIcon mode={repeatMode} />
            </button>
          </div>

          <button
            type="button"
            className="npf-lyrics-toggle"
            onClick={() => setLyricsOpen((v) => !v)}
          >
            {lyricsOpen ? "Hide lyrics" : "Show lyrics"}
          </button>
        </div>

        {lyricsOpen && (
          <div className="npf-lyrics-panel">
            {lyricsState.status === "loading" && <p className="npf-lyrics-status">Loading lyrics…</p>}
            {lyricsState.status === "empty" && <p className="npf-lyrics-status">No lyrics found for this track.</p>}
            {lyricsState.status === "error" && <p className="npf-lyrics-status">{lyricsState.message}</p>}
            {lyricsState.status === "ready" && <pre className="npf-lyrics-text">{lyricsState.lyrics}</pre>}
          </div>
        )}
      </div>
    </div>
  );
}