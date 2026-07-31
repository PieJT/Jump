import { useEffect } from "react";
import { usePlayer } from "./PlayerContext";

/**
 * Global playback keyboard shortcuts:
 *  - Space / K   → toggle play/pause
 *  - Right arrow / L → next track
 *  - Left arrow / J  → previous track
 *  - Up/Down arrow   → seek forward/back 5s
 *
 * Ignored while the user is typing into an input, textarea, select, or any
 * contentEditable element (e.g. the search box) so shortcuts don't hijack typing.
 */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

export function useKeyboardShortcuts() {
  const { togglePlay, next, prev, seekToFraction, progress } = usePlayer();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case " ":
        case "k":
        case "K":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowRight":
        case "l":
        case "L":
          e.preventDefault();
          next();
          break;
        case "ArrowLeft":
        case "j":
        case "J":
          e.preventDefault();
          prev();
          break;
        case "ArrowUp": {
          e.preventDefault();
          if (!progress.duration) break;
          const fwd = Math.min(1, (progress.current + 5) / progress.duration);
          seekToFraction(fwd);
          break;
        }
        case "ArrowDown": {
          e.preventDefault();
          if (!progress.duration) break;
          const back = Math.max(0, (progress.current - 5) / progress.duration);
          seekToFraction(back);
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [togglePlay, next, prev, seekToFraction, progress]);
}