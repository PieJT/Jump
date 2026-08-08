import { useCallback, useEffect, useRef, useState } from "react";

interface Progress {
  current: number;
  duration: number;
}

export interface NativeAudioPlayer {
  currentId: string | null;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  progress: Progress;
  /**
   * Plays `src` under `id`. If `id` is already the loaded track, this just
   * toggles play/pause instead of reloading it. Pass `isObjectUrl: true`
   * when `src` was created with `URL.createObjectURL` so it gets revoked
   * automatically once it's no longer needed.
   */
  play: (id: string, src: string, isObjectUrl?: boolean) => void;
  pause: () => void;
  togglePlay: () => void;
  stop: () => void;
  seekToFraction: (fraction: number) => void;
}

/**
 * A single shared native <audio> element, wrapped in React state. This is
 * intentionally separate from useYouTubePlayer/PlayerContext — those stream
 * through the YouTube IFrame API, while this plays local blobs (offline
 * library) or direct MP3 URLs (Audius previews), so the two players never
 * need to know about each other.
 */
export function useNativeAudioPlayer(): NativeAudioPlayer {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress>({ current: 0, duration: 0 });

  const revokeCurrentObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const onTimeUpdate = () => setProgress({ current: audio.currentTime || 0, duration: audio.duration || 0 });
    const onLoadedMetadata = () => setProgress((p) => ({ ...p, duration: audio.duration || 0 }));
    const onPlay = () => {
      setIsPlaying(true);
      setIsLoading(false);
    };
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);
    const onEnded = () => setIsPlaying(false);
    const onError = () => {
      setIsLoading(false);
      setIsPlaying(false);
      setError("Playback failed");
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.pause();
      audio.removeAttribute("src");
      revokeCurrentObjectUrl();
      audioRef.current = null;
    };
  }, []);

  const play = useCallback((id: string, src: string, isObjectUrl = false) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (id === currentId) {
      // Same track already loaded — treat this as a toggle.
      if (audio.paused) {
        audio.play().catch(() => setError("Playback failed"));
      } else {
        audio.pause();
      }
      return;
    }

    revokeCurrentObjectUrl();
    if (isObjectUrl) objectUrlRef.current = src;

    setError(null);
    setIsLoading(true);
    setProgress({ current: 0, duration: 0 });
    setCurrentId(id);
    audio.src = src;
    audio.play().catch(() => setError("Playback failed"));
  }, [currentId]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentId) return;
    if (audio.paused) audio.play().catch(() => setError("Playback failed"));
    else audio.pause();
  }, [currentId]);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    revokeCurrentObjectUrl();
    setCurrentId(null);
    setIsPlaying(false);
    setIsLoading(false);
    setProgress({ current: 0, duration: 0 });
  }, []);

  const seekToFraction = useCallback((fraction: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    audio.currentTime = fraction * audio.duration;
  }, []);

  return { currentId, isPlaying, isLoading, error, progress, play, pause, togglePlay, stop, seekToFraction };
}