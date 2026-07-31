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
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import type { Playlist, Track } from "../types";
import { useYouTubePlayer } from "./useYouTubePlayer";
import { useAuth } from "./AuthContext";
import { db } from "../lib/firebase";
import { extractDominantColor } from "../lib/color";
import { searchTracks } from "../lib/youtubeMusic";

const WORKER_URL_STORAGE_KEY = "aura:workerUrl";
const PLAYLISTS_STORAGE_KEY = "aura:playlists";
const LIKED_STORAGE_KEY = "aura:liked";
const AUTO_QUEUE_STORAGE_KEY = "aura:autoQueue";
const RECENTS_LIMIT = 12;
// Auto-fill kicks in once the listener is this many tracks (or fewer) from
// the end of the queue, so the next batch has time to load before it's needed.
const AUTO_FILL_THRESHOLD = 2;
const AUTO_FILL_BATCH_SIZE = 5;

interface Progress {
  current: number;
  duration: number;
}

interface StoredPlayback {
  track: Track;
  positionSeconds: number;
  updatedAt: number;
}

interface SharedPlaylistPreview {
  shareId: string;
  name: string;
  tracks: Track[];
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
  /** Reorders a track within a saved playlist (not the "Liked Songs" pseudo-playlist). */
  reorderPlaylistTracks: (playlistId: string, fromIndex: number, toIndex: number) => void;

  // ---- Smart queue / auto-fill ----
  /** When on, similar tracks are appended automatically as the queue runs low. */
  autoQueueEnabled: boolean;
  setAutoQueueEnabled: (enabled: boolean) => void;
  isAutoFilling: boolean;

  // ---- Cross-device resume ----
  /** Set when Firestore has playback saved from another session; null once resumed/dismissed. */
  resumePrompt: StoredPlayback | null;
  resumePlayback: () => void;
  dismissResumePrompt: () => void;

  // ---- Shareable playlists ----
  /** Publishes the playlist and resolves with a shareable URL. */
  sharePlaylist: (playlistId: string) => Promise<string>;
  /** Set when the current URL contains a `?playlist=<id>` link someone shared. */
  sharedImportPrompt: SharedPlaylistPreview | null;
  confirmImportSharedPlaylist: () => Promise<void>;
  dismissImportPrompt: () => void;
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
  const [autoQueueEnabled, setAutoQueueEnabledState] = useState<boolean>(
    () => readJSON(AUTO_QUEUE_STORAGE_KEY, true)
  );
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  // Populated from Firestore when a signed-in account has playback saved from
  // another device/session; cleared once the user resumes it or dismisses it.
  const [resumePrompt, setResumePrompt] = useState<StoredPlayback | null>(null);

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
          const data = snap.data() as {
            likedTracks?: Track[];
            playlists?: Playlist[];
            lastPlayback?: StoredPlayback;
          };
          skipNextWriteRef.current = true;
          setLikedTracks(data.likedTracks ?? []);
          setPlaylists(data.playlists ?? []);
          // Only offer to resume if nothing is already queued up locally (i.e.
          // this is a fresh sign-in/reload) — don't interrupt an active session.
          if (data.lastPlayback?.track && currentIndexRef.current === -1) {
            setResumePrompt(data.lastPlayback);
          }
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

  // ---------- Smart queue / auto-fill ----------
  // Once the listener gets within AUTO_FILL_THRESHOLD tracks of the end of the
  // queue, fetch more tracks by the current artist and append them so playback
  // never just stops. Guards against overlapping fetches with a ref (not state,
  // so it can't race with the effect that reads it).
  const autoFillInFlightRef = useRef(false);

  useEffect(() => {
    if (!autoQueueEnabled || !workerUrlState) return;
    if (currentIndex < 0 || autoFillInFlightRef.current) return;

    const remaining = queue.length - 1 - currentIndex;
    if (remaining > AUTO_FILL_THRESHOLD) return;

    const seedTrack = queue[currentIndex];
    if (!seedTrack) return;

    autoFillInFlightRef.current = true;
    setIsAutoFilling(true);

    searchTracks(workerUrlState, seedTrack.artist)
      .then((results) => {
        setQueue((prev) => {
          // Bail if the queue moved on to something else entirely while this
          // request was in flight (e.g. the user played a different track/list).
          if (prev[currentIndex]?.id !== seedTrack.id) return prev;
          const existingIds = new Set(prev.map((t) => t.id));
          const toAdd = results.filter((t) => !existingIds.has(t.id)).slice(0, AUTO_FILL_BATCH_SIZE);
          if (toAdd.length === 0) return prev;
          const next = [...prev, ...toAdd];
          queueRef.current = next;
          return next;
        });
      })
      .catch((err) => {
        console.error("[AutoQueue] failed to fetch similar tracks:", err);
      })
      .finally(() => {
        autoFillInFlightRef.current = false;
        setIsAutoFilling(false);
      });
  }, [queue, currentIndex, autoQueueEnabled, workerUrlState]);

  const setAutoQueueEnabled = useCallback((enabled: boolean) => {
    setAutoQueueEnabledState(enabled);
    localStorage.setItem(AUTO_QUEUE_STORAGE_KEY, JSON.stringify(enabled));
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

  // ---------- Cross-device resume ----------
  const resumePlayback = useCallback(() => {
    if (!resumePrompt) return;
    const { track, positionSeconds } = resumePrompt;
    setQueue([track]);
    queueRef.current = [track];
    playIndex(0);
    // loadVideo()/YT's onReady is async, so the seek has to happen after the
    // player has actually accepted the new video — a short delay is simplest
    // since useYouTubePlayer doesn't currently expose an "on loaded" callback.
    window.setTimeout(() => controls.seekTo(positionSeconds), 1200);
    setResumePrompt(null);
    // controls is stable, playIndex is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumePrompt, playIndex]);

  const dismissResumePrompt = useCallback(() => setResumePrompt(null), []);

  // Periodically (roughly every 10s of active playback) persist the current
  // track + position so it can be picked up as a "resume" prompt on another
  // device/session. Throttled with a ref rather than a timer so it piggybacks
  // on the existing progress-tick updates instead of running its own interval.
  const lastPlaybackWriteRef = useRef(0);
  useEffect(() => {
    const track = currentIndex >= 0 ? queue[currentIndex] : null;
    if (!uid || !track || !isPlaying) return;
    const now = Date.now();
    if (now - lastPlaybackWriteRef.current < 10_000) return;
    lastPlaybackWriteRef.current = now;

    const payload: StoredPlayback = { track, positionSeconds: Math.floor(progress.current), updatedAt: now };
    setDoc(doc(db, "users", uid), { lastPlayback: payload }, { merge: true }).catch((err) =>
      console.error("[Firestore] failed to write playback position:", err)
    );
  }, [uid, queue, currentIndex, isPlaying, progress]);

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

  const reorderPlaylistTracks = useCallback((playlistId: string, fromIndex: number, toIndex: number) => {
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id !== playlistId) return p;
        if (
          fromIndex === toIndex ||
          fromIndex < 0 ||
          toIndex < 0 ||
          fromIndex >= p.tracks.length ||
          toIndex >= p.tracks.length
        ) {
          return p;
        }
        const tracks = [...p.tracks];
        const [moved] = tracks.splice(fromIndex, 1);
        tracks.splice(toIndex, 0, moved);
        return { ...p, tracks };
      })
    );
  }, []);

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

  // ---------- Shareable playlists ----------
  // Publishes a *copy* of the playlist's tracks to a public `sharedPlaylists/{id}`
  // Firestore doc (separate from the user's own private `users/{uid}` doc), and
  // returns a link containing that doc's id. NOTE: this requires Firestore
  // security rules that allow public read (and authenticated create) on the
  // `sharedPlaylists` collection — that's a rules change outside this repo.
  const sharePlaylist = useCallback(
    async (playlistId: string): Promise<string> => {
      const playlist = playlistsRef.current.find((p) => p.id === playlistId);
      if (!playlist) throw new Error("Playlist not found");

      const shareId = makeId();
      await setDoc(doc(db, "sharedPlaylists", shareId), {
        name: playlist.name,
        tracks: playlist.tracks,
        sharedBy: uid ?? null,
        createdAt: Date.now(),
      });

      const url = new URL(window.location.href);
      url.search = `?playlist=${shareId}`;
      url.hash = "";
      return url.toString();
    },
    [uid]
  );

  const [sharedImportPrompt, setSharedImportPrompt] = useState<SharedPlaylistPreview | null>(null);

  // On load, if the URL carries a `?playlist=<shareId>` param (from a link someone
  // shared), fetch the preview so the UI can offer to import it.
  useEffect(() => {
    const shareId = new URLSearchParams(window.location.search).get("playlist");
    if (!shareId) return;

    getDoc(doc(db, "sharedPlaylists", shareId))
      .then((snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as { name?: string; tracks?: Track[] };
        setSharedImportPrompt({ shareId, name: data.name ?? "Shared Playlist", tracks: data.tracks ?? [] });
      })
      .catch((err) => console.error("[Firestore] failed to load shared playlist:", err));
  }, []);

  const clearShareUrlParam = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("playlist");
    window.history.replaceState({}, "", url.toString());
  };

  const confirmImportSharedPlaylist = useCallback(async () => {
    if (!sharedImportPrompt) return;
    const playlist = createPlaylist(sharedImportPrompt.name);
    sharedImportPrompt.tracks.forEach((track) => addTrackToPlaylist(playlist.id, track));
    setSharedImportPrompt(null);
    clearShareUrlParam();
  }, [sharedImportPrompt, createPlaylist, addTrackToPlaylist]);

  const dismissImportPrompt = useCallback(() => {
    setSharedImportPrompt(null);
    clearShareUrlParam();
  }, []);

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
      reorderPlaylistTracks,
      autoQueueEnabled,
      setAutoQueueEnabled,
      isAutoFilling,
      resumePrompt,
      resumePlayback,
      dismissResumePrompt,
      sharePlaylist,
      sharedImportPrompt,
      confirmImportSharedPlaylist,
      dismissImportPrompt,
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
      reorderPlaylistTracks,
      autoQueueEnabled,
      setAutoQueueEnabled,
      isAutoFilling,
      resumePrompt,
      resumePlayback,
      dismissResumePrompt,
      sharePlaylist,
      sharedImportPrompt,
      confirmImportSharedPlaylist,
      dismissImportPrompt,
    ]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within a PlayerProvider");
  return ctx;
} 