import { usePlayer } from "../hooks/PlayerContext";

/** Shown when the app loads with a `?playlist=<id>` link someone shared. */
export function ImportSharedPlaylistModal() {
  const { sharedImportPrompt, confirmImportSharedPlaylist, dismissImportPrompt } = usePlayer();

  if (!sharedImportPrompt) return null;

  return (
    <div className="modal-overlay open" onClick={dismissImportPrompt}>
      <div className="modal share-playlist-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Import shared playlist?</h2>
        <p>
          "{sharedImportPrompt.name}" — {sharedImportPrompt.tracks.length} tracks. Importing adds a copy of it
          to your own library.
        </p>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={dismissImportPrompt}>
            Not now
          </button>
          <button className="btn btn-primary" onClick={confirmImportSharedPlaylist}>
            Import
          </button>
        </div>
      </div>
    </div>
  );
}