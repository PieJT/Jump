import { useState } from "react";
import { usePlayer } from "../hooks/PlayerContext";
import { HeartIcon, PlayIcon, PlusIcon, TrashIcon } from "./Icons";
import { EmptyState } from "./EmptyState";
import { OfflineLibrary } from "./OfflineLibrary";

interface LibraryViewProps {
  onOpenPlaylist: (id: string) => void;
}

export function LibraryView({ onOpenPlaylist }: LibraryViewProps) {
  const { likedTracks, playlists, createPlaylist, deletePlaylist, playLiked } = usePlayer();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const playlist = createPlaylist(trimmed);
    setName("");
    setCreating(false);
    onOpenPlaylist(playlist.id);
  };

  return (
    <section className="view active">
      <div className="page-title">Your Library</div>
      <div className="page-sub">Liked songs and playlists you've made.</div>

      <div className="section-label">Playlists</div>
      <div className="playlist-grid">
        <div
          className="playlist-card liked-card"
          onClick={() => onOpenPlaylist("liked")}
        >
          <div className="playlist-card-art liked-art">
            <HeartIcon filled width={26} height={26} />
          </div>
          <div className="playlist-card-name">Liked Songs</div>
          <div className="playlist-card-count">{likedTracks.length} tracks</div>
          {likedTracks.length > 0 && (
            <button
              type="button"
              className="playlist-card-play"
              aria-label="Play liked songs"
              onClick={(e) => {
                e.stopPropagation();
                playLiked();
              }}
            >
              <PlayIcon />
            </button>
          )}
        </div>

        {playlists.map((p) => (
          <div key={p.id} className="playlist-card" onClick={() => onOpenPlaylist(p.id)}>
            <div className="playlist-card-art">
              {p.tracks[0]?.thumb ? (
                <img src={p.tracks[0].thumb} alt="" loading="lazy" />
              ) : (
                <span className="playlist-card-fallback">{p.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="playlist-card-name">{p.name}</div>
            <div className="playlist-card-count">{p.tracks.length} tracks</div>
            <button
              type="button"
              className="playlist-card-delete"
              aria-label="Delete playlist"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete "${p.name}"?`)) deletePlaylist(p.id);
              }}
            >
              <TrashIcon width={15} height={15} />
            </button>
          </div>
        ))}

        {creating ? (
          <div className="playlist-card new-playlist-card">
            <input
              autoFocus
              placeholder="Playlist name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <div className="modal-actions" style={{ marginTop: 10 }}>
              <button className="btn btn-ghost" onClick={() => setCreating(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleCreate}>
                Create
              </button>
            </div>
          </div>
        ) : (
          <div className="playlist-card new-playlist-card" onClick={() => setCreating(true)}>
            <div className="playlist-card-art new-playlist-art">
              <PlusIcon width={22} height={22} />
            </div>
            <div className="playlist-card-name">New playlist</div>
          </div>
        )}
      </div>

      {playlists.length === 0 && likedTracks.length === 0 && (
        <EmptyState
          title="Your library is empty"
          subtitle="Like a song or create a playlist and it'll show up here."
        />
      )}

      <OfflineLibrary />
    </section>
  );
}