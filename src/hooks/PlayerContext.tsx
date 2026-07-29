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
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import type { Playlist, Track } from "../types";
import { useYouTubePlayer } from "./useYouTubePlayer";
import { useAuth } from "./AuthContext";
import { db } from "../lib/firebase";
import { extractDominantColor } from "../lib/color";

const WORKER_URL_STORAGE_KEY = "aura:workerUrl";
const PLAYLISTS_STORAGE_KEY = "aura:playlists";
const LIKED_STORAGE_KEY = "aura:liked";
const RECENTS_LIMIT = 12;

interface Progress {
  current: number;
  duration: number;
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
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
  /** Moves the track at fromIndex to toIndex (toIndex given in the resulting array's terms). Keeps the currently-playing track pointed at correctly. */
  reorderQueue: (fromIndex: number, toIndex: number) => void;

  // ---- Library: liked songs ----
  likedTracks: Track[];
  isLiked: (trackId: string) => boolean;
  toggleLiked: (track: Track) => void;
  playLiked: () => void;

  // ---- Playlists ----
  playlists: Playlist[];
  createPlaylist: (name: string) => Playlist;
  deletePlaylist: (playlistId: string) => void;
  renamePlaylist: (playlistId: string, name: string) => void;
  addTrackToPlaylist: (playlistId: string, track: Track) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  playPlaylist: (playlistId: string, startIndex?: number) => void;
  getPlaylist: (playlistId: string) => Playlist | undefined;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const [workerUrlState, setWorkerUrlState] = useState<string>(
    () => localStorage.getItem(WORKER_URL_STORAGE_KEY) ?? ""
  );
  const [queue, setQueue] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState<Progress>({ current: 0, duration: 0 });
  const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>([]);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  // Seeded from localStorage first so the UI has something to show instantly;
  // Firestore then takes over as the source of truth once it loads (see below).
  const [likedTracks, setLikedTracks] = useState<Track[]>(() => readJSON(LIKED_STORAGE_KEY, [] as Track[]));
  const [playlists, setPlaylists] = useState<Playlist[]>(() => readJSON(PLAYLISTS_STORAGE_KEY, [] as Playlist[]));

  // Keeps a local cache so the app still works offline / before Firestore responds.
  useEffect(() => {
    localStorage.setItem(LIKED_STORAGE_KEY, JSON.stringify(likedTracks));
  }, [likedTracks]);

  useEffect(() => {
    localStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(playlists));
  }, [playlists]);

  // ---------- Firestore sync: tie liked songs + playlists to the signed-in account ----------
  // `hasLoadedRemoteRef` blocks the write-effect below from firing with stale/local
  // data before we've heard back from Firestore at least once.
  // `skipNextWriteRef` prevents the write-effect from immediately re-uploading data
  // that we just received *from* Firestore (which would otherwise loop harmlessly
  // but pointlessly).
  const hasLoadedRemoteRef = useRef(false);
  const skipNextWriteRef = useRef(false);

  useEffect(() => {
    hasLoadedRemoteRef.current = false;
    if (!uid) return;

    const userDoc = doc(db, "users", uid);
    const unsubscribe = onSnapshot(
      userDoc,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as { likedTracks?: Track[]; playlists?: Playlist[] };
          skipNextWriteRef.current = true;
          setLikedTracks(data.likedTracks ?? []);
          setPlaylists(data.playlists ?? []);
        } else {
          // First time this account has signed in — seed their Firestore doc with
          // whatever's already sitting in this browser's local storage.
          setDoc(userDoc, {
            likedTracks: readJSON(LIKED_STORAGE_KEY, [] as Track[]),
            playlists: readJSON(PLAYLISTS_STORAGE_KEY, [] as Playlist[]),
          }).catch((err) => console.error("[Firestore] failed to seed user doc:", err));
        }
        hasLoadedRemoteRef.current = true;
      },
      (err) => console.error("[Firestore] onSnapshot error (check rules/uid):", err)
    );

    return () => unsubscribe();
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    if (!hasLoadedRemoteRef.current) return;
    if (skipNextWriteRef.current) {
      skipNextWriteRef.current = false;
      return;
    }
    // Debounced so rapid changes (e.g. adding several tracks in a row) don't
    // trigger a Firestore write per keystroke/click.
    const timer = window.setTimeout(() => {
      setDoc(doc(db, "users", uid), { likedTracks, playlists }, { merge: true }).catch((err) =>
        console.error("[Firestore] failed to write playlists/liked:", err)
      );
    }, 600);
    return () => window.clearTimeout(timer);
  }, [uid, likedTracks, playlists]);

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
  const playlistsRef = useRef(playlists);
  playlistsRef.current = playlists;

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

  const reorderQueue = useCallback((fromIndex: number, toIndex: number) => {
    setQueue((prev) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= prev.length ||
        toIndex >= prev.length
      ) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setCurrentIndex((prevIndex) => {
      if (fromIndex === toIndex || prevIndex < 0) return prevIndex;
      if (fromIndex === prevIndex) return toIndex;
      if (fromIndex < prevIndex && toIndex >= prevIndex) return prevIndex - 1;
      if (fromIndex > prevIndex && toIndex <= prevIndex) return prevIndex + 1;
      return prevIndex;
    });
  }, []);

  // ---------- Library: liked songs ----------
  const isLiked = useCallback((trackId: string) => likedTracks.some((t) => t.id === trackId), [likedTracks]);

  const toggleLiked = useCallback((track: Track) => {
    setLikedTracks((prev) =>
      prev.some((t) => t.id === track.id) ? prev.filter((t) => t.id !== track.id) : [track, ...prev]
    );
  }, []);

  const playLiked = useCallback(() => {
    if (likedTracks.length === 0) return;
    const newQueue = [...likedTracks];
    setQueue(newQueue);
    queueRef.current = newQueue;
    playIndex(0);
  }, [likedTracks, playIndex]);

  // ---------- Playlists ----------
  const createPlaylist = useCallback((name: string) => {
    const playlist: Playlist = { id: makeId(), name: name.trim() || "New Playlist", tracks: [], createdAt: Date.now() };
    setPlaylists((prev) => [playlist, ...prev]);
    return playlist;
  }, []);

  const deletePlaylist = useCallback((playlistId: string) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
  }, []);

  const renamePlaylist = useCallback((playlistId: string, name: string) => {
    setPlaylists((prev) => prev.map((p) => (p.id === playlistId ? { ...p, name: name.trim() || p.name } : p)));
  }, []);

  const addTrackToPlaylist = useCallback((playlistId: string, track: Track) => {
    setPlaylists((prev) =>
      prev.map((p) =>
        p.id === playlistId && !p.tracks.some((t) => t.id === track.id)
          ? { ...p, tracks: [...p.tracks, track] }
          : p
      )
    );
  }, []);

  const removeTrackFromPlaylist = useCallback((playlistId: string, trackId: string) => {
    setPlaylists((prev) =>
      prev.map((p) => (p.id === playlistId ? { ...p, tracks: p.tracks.filter((t) => t.id !== trackId) } : p))
    );
  }, []);

  const getPlaylist = useCallback(
    (playlistId: string) => playlistsRef.current.find((p) => p.id === playlistId),
    []
  );

  const playPlaylist = useCallback(
    (playlistId: string, startIndex = 0) => {
      const playlist = playlistsRef.current.find((p) => p.id === playlistId);
      if (!playlist || playlist.tracks.length === 0) return;
      const newQueue = playlist.tracks.slice(startIndex);
      setQueue(newQueue);
      queueRef.current = newQueue;
      playIndex(0);
    },
    [playIndex]
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
      reorderQueue,
      likedTracks,
      isLiked,
      toggleLiked,
      playLiked,
      playlists,
      createPlaylist,
      deletePlaylist,
      renamePlaylist,
      addTrackToPlaylist,
      removeTrackFromPlaylist,
      playPlaylist,
      getPlaylist,
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
      reorderQueue,
      likedTracks,
      isLiked,
      toggleLiked,
      playLiked,
      playlists,
      createPlaylist,
      deletePlaylist,
      renamePlaylist,
      addTrackToPlaylist,
      removeTrackFromPlaylist,
      playPlaylist,
      getPlaylist,
    ]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within a PlayerProvider");
  return ctx;
}