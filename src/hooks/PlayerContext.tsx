import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Track } from "../types";
import { useYouTubePlayer } from "./useYouTubePlayer";
import { extractDominantColor } from "../lib/color";

const WORKER_URL_STORAGE_KEY = "aura:workerUrl";
const RECENTS_LIMIT = 12;

interface Progress {
  current: number;
  duration: number;
}

interface PlayerContextValue {
  workerUrl: string;
  setWorkerUrl: (url: string) => void;

  queue: Track[];
  currentIndex: number;
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: Progress;
  recentlyPlayed: Track[];
  playbackError: string | null;

  playFromResults: (tracks: Track[], startIndex: number) => void;
  playFromQueue: (index: number) => void;
  playRecent: (trackId: string) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seekToFraction: (fraction: number) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [workerUrlState, setWorkerUrlState] = useState<string>(
    () => localStorage.getItem(WORKER_URL_STORAGE_KEY) ?? ""
  );
  const [queue, setQueue] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState<Progress>({ current: 0, duration: 0 });
  const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>([]);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  useEffect(() => {
    if (!playbackError) return;
    const timer = window.setTimeout(() => setPlaybackError(null), 4000);
    return () => window.clearTimeout(timer);
  }, [playbackError]);

  // Keep a ref mirror of queue/currentIndex so the "ended" callback
  // (captured once inside useYouTubePlayer) always sees fresh values.
  const queueRef = useRef(queue);
  queueRef.current = queue;
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  const addToRecent = useCallback((track: Track) => {
    setRecentlyPlayed((prev) => [track, ...prev.filter((t) => t.id !== track.id)].slice(0, RECENTS_LIMIT));
  }, []);

  const playIndex = useCallback(
    (index: number) => {
      const track = queueRef.current[index];
      if (!track) return;
      setCurrentIndex(index);
      controls.loadVideo(track.id);
      addToRecent(track);
      void extractDominantColor(track.thumb).then((rgb) => {
        if (!rgb) return;
        const root = document.documentElement;
        root.style.setProperty("--glow-1", `${rgb.r},${rgb.g},${rgb.b}`);
      });
    },
    // controls is stable (see below), addToRecent is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addToRecent]
  );

  const controls = useYouTubePlayer({
    onEnded: () => {
      const nextIndex = currentIndexRef.current + 1;
      if (nextIndex < queueRef.current.length) playIndex(nextIndex);
    },
    onError: (code) => {
      const track = queueRef.current[currentIndexRef.current];
      const reason =
        code === 101 || code === 150
          ? "unavailable for playback outside YouTube"
          : code === 100
          ? "not found or private"
          : "unavailable";
      setPlaybackError(track ? `"${track.title}" is ${reason} — skipping` : "Track unavailable — skipping");

      const nextIndex = currentIndexRef.current + 1;
      if (nextIndex < queueRef.current.length) {
        playIndex(nextIndex);
      } else {
        setIsPlaying(false);
      }
    },
    onPlayingChange: (playing) => {
      setIsPlaying(playing);
      if (playing) setPlaybackError(null);
    },
    onProgress: (current, duration) => setProgress({ current, duration }),
  });

  const setWorkerUrl = useCallback((url: string) => {
    const cleaned = url.trim().replace(/\/+$/, "");
    setWorkerUrlState(cleaned);
    localStorage.setItem(WORKER_URL_STORAGE_KEY, cleaned);
  }, []);

  const playFromResults = useCallback(
    (tracks: Track[], startIndex: number) => {
      // Search "plays this track and queues everything after it",
      // matching the original app's behavior.
      const newQueue = tracks.slice(startIndex);
      setQueue(newQueue);
      queueRef.current = newQueue;
      playIndex(0);
    },
    [playIndex]
  );

  const playFromQueue = useCallback((index: number) => playIndex(index), [playIndex]);

  const playRecent = useCallback(
    (trackId: string) => {
      const track = recentlyPlayed.find((t) => t.id === trackId);
      if (!track) return;
      setQueue([track]);
      queueRef.current = [track];
      playIndex(0);
    },
    [recentlyPlayed, playIndex]
  );

  const togglePlay = useCallback(() => {
    if (currentIndexRef.current === -1) return;
    if (isPlaying) controls.pause();
    else controls.play();
  }, [isPlaying, controls]);

  const next = useCallback(() => {
    const nextIndex = currentIndexRef.current + 1;
    if (nextIndex < queueRef.current.length) playIndex(nextIndex);
  }, [playIndex]);

  const prev = useCallback(() => {
    const prevIndex = currentIndexRef.current - 1;
    if (prevIndex >= 0) playIndex(prevIndex);
  }, [playIndex]);

  const seekToFraction = useCallback(
    (fraction: number) => {
      const duration = controls.getDuration();
      controls.seekTo(duration * fraction);
    },
    [controls]
  );

  const value = useMemo<PlayerContextValue>(
    () => ({
      workerUrl: workerUrlState,
      setWorkerUrl,
      queue,
      currentIndex,
      currentTrack: currentIndex >= 0 ? queue[currentIndex] ?? null : null,
      isPlaying,
      progress,
      recentlyPlayed,
      playbackError,
      playFromResults,
      playFromQueue,
      playRecent,
      togglePlay,
      next,
      prev,
      seekToFraction,
    }),
    [
      workerUrlState,
      setWorkerUrl,
      queue,
      currentIndex,
      isPlaying,
      progress,
      recentlyPlayed,
      playbackError,
      playFromResults,
      playFromQueue,
      playRecent,
      togglePlay,
      next,
      prev,
      seekToFraction,
    ]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within a PlayerProvider");
  return ctx;
}