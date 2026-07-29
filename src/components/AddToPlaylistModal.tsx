import { useState } from "react";
import type { Track } from "../types";
import { usePlayer } from "../hooks/PlayerContext";
import { CheckIcon, PlusIcon } from "./Icons";

interface AddToPlaylistModalProps {
  track: Track;
  onClose: () => void;
}

export function AddToPlaylistModal({ track, onClose }: AddToPlaylistModalProps) {
  const { playlists, addTrackToPlaylist, removeTrackFromPlaylist, createPlaylist } = usePlayer();
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    const playlist = createPlaylist(name);
    addTrackToPlaylist(playlist.id, track);
    setNewName("");
    setCreating(false);
  };

  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div className="modal add-to-playlist-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Add to playlist</h2>
        <p>
          {track.title} — {track.artist}
        </p>

        <div className="playlist-pick-list">
          {playlists.length === 0 && !creating && (
            <div className="home-inline-error">You don't have any playlists yet.</div>
          )}
          {playlists.map((p) => {
            const has = p.tracks.some((t) => t.id === track.id);
            return (
              <div
                key={p.id}
                className={`playlist-pick-row${has ? " picked" : ""}`}
                onClick={() => (has ? removeTrackFromPlaylist(p.id, track.id) : addTrackToPlaylist(p.id, track))}
              >
                <span>{p.name}</span>
                <span className="playlist-pick-check">{has && <CheckIcon />}</span>
              </div>
            );
          })}
        </div>

        {creating ? (
          <div className="new-playlist-row">
            <input
              autoFocus
              placeholder="Playlist name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setCreating(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleCreate}>
                Create
              </button>
            </div>
          </div>
        ) : (
          <div className="new-playlist-trigger" onClick={() => setCreating(true)}>
            <PlusIcon width={16} height={16} />
            <span>New playlist</span>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}   