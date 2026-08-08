import { usePlayer } from "../hooks/PlayerContext";

/**
 * Mount this once near the root of the app (e.g. as a sibling of MiniPlayer
 * in App.tsx) — it's self-contained and reads everything from PlayerContext.
 * Renders nothing when there's nothing to undo.
 */
export function UndoToast() {
  const { undoState, dismissUndo } = usePlayer();

  if (!undoState) return null;

  const handleUndo = () => {
    undoState.undo();
    dismissUndo();
  };

  return (
    <div className="undo-toast" role="status">
      <span className="undo-toast-message">{undoState.message}</span>
      <div className="undo-toast-actions">
        <button className="undo-toast-btn" onClick={handleUndo}>
          Undo
        </button>
        <button className="undo-toast-dismiss" onClick={dismissUndo} aria-label="Dismiss">
          ×
        </button>
      </div>
    </div>
  );
}