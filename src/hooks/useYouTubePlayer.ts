import { useEffect, useRef } from "react";

const IFRAME_API_SRC = "https://www.youtube.com/iframe_api";
const TARGET_ELEMENT_ID = "yt-target";
const PROGRESS_INTERVAL_MS = 500;

interface UseYouTubePlayerOptions {
  onEnded: () => void;
  onPlayingChange: (isPlaying: boolean) => void;
  onProgress: (currentSeconds: number, durationSeconds: number) => void;
}

export interface YouTubePlayerControls {
  loadVideo: (videoId: string) => void;
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
  getDuration: () => number;
}

function loadIframeApiScript(): void {
  if (document.querySelector(`script[src="${IFRAME_API_SRC}"]`)) return;
  const script = document.createElement("script");
  script.src = IFRAME_API_SRC;
  document.head.appendChild(script);
}

export function useYouTubePlayer(options: UseYouTubePlayerOptions): YouTubePlayerControls {
  const playerRef = useRef<YT.Player | null>(null);
  const readyRef = useRef(false);
  const progressTimerRef = useRef<number | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  // If loadVideo() is called before the player fires onReady, we stash the
  // requested id here and load it as soon as it becomes ready, instead of
  // silently dropping the request.
  const pendingVideoIdRef = useRef<string | null>(null);

  useEffect(() => {
    loadIframeApiScript();

    const initPlayer = () => {
      playerRef.current = new window.YT!.Player(TARGET_ELEMENT_ID, {
        height: "1",
        width: "1",
        playerVars: { playsinline: 1, controls: 0, disablekb: 1, modestbranding: 1 },
        events: {
          onReady: () => {
            readyRef.current = true;
            if (pendingVideoIdRef.current) {
              const id = pendingVideoIdRef.current;
              pendingVideoIdRef.current = null;
              playerRef.current?.loadVideoById(id);
              playerRef.current?.playVideo();
            }
          },
          onError: (event) => {
            // YT error codes: 2=invalid video id, 5=HTML5 player error,
            // 100=video not found/private, 101/150=embedding disabled by uploader
            console.error("[YouTube Player] onError, code:", event.data);
          },
          onStateChange: (event) => {
            const YTState = window.YT!.PlayerState;
            if (event.data === YTState.PLAYING) {
              optionsRef.current.onPlayingChange(true);
              startProgressTimer();
            } else if (event.data === YTState.PAUSED) {
              optionsRef.current.onPlayingChange(false);
              stopProgressTimer();
            } else if (event.data === YTState.ENDED) {
              optionsRef.current.onEnded();
            }
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        initPlayer();
      };
    }

    return () => {
      stopProgressTimer();
      playerRef.current?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startProgressTimer() {
    stopProgressTimer();
    progressTimerRef.current = window.setInterval(() => {
      const player = playerRef.current;
      if (!readyRef.current || !player) return;
      const dur = player.getDuration() || 0;
      const cur = player.getCurrentTime() || 0;
      optionsRef.current.onProgress(cur, dur);
    }, PROGRESS_INTERVAL_MS);
  }

  function stopProgressTimer() {
    if (progressTimerRef.current !== null) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }

  return {
    loadVideo: (videoId: string) => {
      console.log("[YouTube Player] loadVideo called with id:", videoId);
      if (!readyRef.current || !playerRef.current) {
        // Player (or the underlying iframe API) isn't ready yet — remember
        // this request and fire it from onReady instead of dropping it.
        pendingVideoIdRef.current = videoId;
        return;
      }
      playerRef.current.loadVideoById(videoId);
      playerRef.current.playVideo();
    },
    play: () => {
      if (readyRef.current) playerRef.current?.playVideo();
    },
    pause: () => {
      if (readyRef.current) playerRef.current?.pauseVideo();
    },
    seekTo: (seconds: number) => {
      if (readyRef.current) playerRef.current?.seekTo(seconds, true);
    },
    getDuration: () => (readyRef.current ? playerRef.current?.getDuration() ?? 0 : 0),
  };
}