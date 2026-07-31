import { usePlayer } from "../hooks/PlayerContext";
import { RowItem } from "./RowItem";
import { EmptyState } from "./EmptyState";
import { BackIcon, HeartIcon, PlayIcon } from "./Icons";

interface PlaylistViewProps {
  playlistId: string;
  onBack: () => void;
}

export function import { useCallback, useRef, useState } from "react";
import { usePlayer } from "../hooks/PlayerContext";
import { RowItem } from "./RowItem";
import { EmptyState } from "./EmptyState";
import { BackIcon, HeartIcon, PlayIcon } from "./Icons";
import { SharePlaylistModal } from "./SharePlaylistModal";

interface PlaylistViewProps {
  playlistId: string;
  onBack: () => void;
}

interface DragState {
  index: number;
  startY: number;
  y: number;
}

const GripIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <circle cx="9" cy="6" r="1.6" />
    <circle cx="9" cy="12" r="1.6" />
    <circle cx="9" cy="18" r="1.6" />
    <circle cx="15" cy="6" r="1.6" />
    <circle cx="15" cy="12" r="1.6" />
    <circle cx="15" cy="18" r="1.6" />
  </svg>
);

const ShareIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="M8.6 10.5 15.4 6.5M8.6 13.5 15.4 17.5" strokeLinecap="round" />
  </svg>
);

export function PlaylistView({ playlistId, onBack }: PlaylistViewProps) {
  const {
    likedTracks,
    playLiked,
    toggleLiked,
    getPlaylist,
    playPlaylist,
    removeTrackFromPlaylist,
    reorderPlaylistTracks,
    currentTrack,
    isPlaying,
    playFromResults,
  } = usePlayer();

  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const isLikedView = playlistId === "liked";
  const playlist = isLikedView ? undefined : getPlaylist(playlistId);
  const tracks = isLikedView ? likedTracks : playlist?.tracks ?? [];
  const title = isLikedView ? "Liked Songs" : playlist?.name ?? "Playlist";
  // Reordering only makes sense for a saved playlist's own track order — "Liked
  // Songs" doesn't have a persisted custom order, so it stays a plain list.
  const canReorder = !isLikedView;

  const computeDropRank = useCallback(
    (pointerY: number, dragIndex: number) => {
      let rank = 0;
      let matched = false;
      for (let i = 0; i < tracks.length; i++) {
        if (i === dragIndex) continue;
        const el = rowRefs.current[i];
        if (!el) {
          rank += matched ? 0 : 1;
          continue;
        }
        const rect = el.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        if (!matched && pointerY < mid) {
          matched = true;
        } else if (!matched) {
          rank += 1;
        }
      }
      return rank;
    },
    [tracks.length]
  );

  const handleGripPointerDown = (index: number) => (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ index, startY: e.clientY, y: e.clientY });
  };

  const handleGripPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag) return;
    setDrag((d) => (d ? { ...d, y: e.clientY } : d));
  };

  const endDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag) return;
    const rank = computeDropRank(e.clientY, drag.index);
    if (rank !== drag.index) reorderPlaylistTracks(playlistId, drag.index, rank);
    setDrag(null);
  };

  if (!isLikedView && !playlist) {
    return (
      <section className="view active">
        <div className="playlist-header">
          <button className="icon-btn back-btn" onClick={onBack} aria-label="Back">
            <BackIcon />
          </button>
        </div>
        <EmptyState title="Playlist not found" subtitle="It may have been deleted." />
      </section>
    );
  }

  return (
    <section className="view active">
      <div className="playlist-header">
        <button className="icon-btn back-btn" onClick={onBack} aria-label="Back">
          <BackIcon />
        </button>
      </div>

      <div className="playlist-hero">
        <div className={`playlist-hero-art${isLikedView ? " liked-art" : ""}`}>
          {isLikedView ? (
            <HeartIcon filled width={40} height={40} />
          ) : tracks[0]?.thumb ? (
            <img src={tracks[0].thumb} alt="" />
          ) : (
            <span className="playlist-card-fallback">{title.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div>
          <div className="page-title" style={{ margin: 0 }}>{title}</div>
          <div className="page-sub" style={{ marginBottom: 14 }}>{tracks.length} tracks</div>
          {tracks.length > 0 && (
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn btn-primary playlist-play-btn"
                onClick={() => (isLikedView ? playLiked() : playPlaylist(playlistId))}
              >
                <PlayIcon width={15} height={15} /> Play
              </button>
              {canReorder && (
                <button className="btn btn-ghost playlist-play-btn" onClick={() => setShareModalOpen(true)}>
                  <ShareIcon /> Share
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {shareModalOpen && (
        <SharePlaylistModal playlistId={playlistId} playlistName={title} onClose={() => setShareModalOpen(false)} />
      )}

      <div className={`row-list${canReorder ? " queue-list" : ""}`}>
        {tracks.length === 0 ? (
          <EmptyState
            title={isLikedView ? "No liked songs yet" : "No tracks yet"}
            subtitle={
              isLikedView
                ? "Tap the heart on any track to save it here."
                : "Use the + button on a track to add it to this playlist."
            }
          />
        ) : !canReorder ? (
          tracks.map((track, i) => (
            <RowItem
              key={track.id}
              track={track}
              active={currentTrack?.id === track.id}
              playing={isPlaying}
              onClick={() => playFromResults(tracks, i)}
              onRemove={() => toggleLiked(track)}
            />
          ))
        ) : (
          tracks.map((track, i) => {
            const isDragging = drag?.index === i;
            const dragDelta = isDragging ? drag.y - drag.startY : 0;
            return (
              <div
                key={`${track.id}-${i}`}
                ref={(el) => {
                  rowRefs.current[i] = el;
                }}
                className={`queue-row${currentTrack?.id === track.id ? " playing" : ""}${
                  isDragging ? " dragging" : ""
                }`}
                style={isDragging ? { transform: `translateY(${dragDelta}px)` } : undefined}
              >
                <button
                  type="button"
                  className="queue-grip"
                  aria-label="Drag to reorder"
                  onPointerDown={handleGripPointerDown(i)}
                  onPointerMove={handleGripPointerMove}
                  onPointerUp={endDrag}
                  onPointerCancel={() => setDrag(null)}
                >
                  <GripIcon />
                </button>

                <div className="queue-row-main" onClick={() => playFromResults(tracks, i)}>
                  <img src={track.thumb} alt="" loading="lazy" />
                  <div className="row-text">
                    <div className="row-title">{track.title}</div>
                    <div className="row-sub">{track.artist}</div>
                  </div>
                  {currentTrack?.id === track.id && isPlaying && (
                    <div className="playing-bars">
                      <span />
                      <span />
                      <span />
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="row-action-btn"
                  aria-label="Remove from playlist"
                  onClick={() => removeTrackFromPlaylist(playlistId, track.id)}
                >
                  ✕
                </button>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}PlaylistView({ playlistId, onBack }: PlaylistViewProps) {
  const {
    likedTracks,
    playLiked,
    toggleLiked,
    getPlaylist,
    playPlaylist,
    removeTrackFromPlaylist,
    currentTrack,
    isPlaying,
    playFromResults,
  } = usePlayer();

  const isLikedView = playlistId === "liked";
  const playlist = isLikedView ? undefined : getPlaylist(playlistId);
  const tracks = isLikedView ? likedTracks : playlist?.tracks ?? [];
  const title = isLikedView ? "Liked Songs" : playlist?.name ?? "Playlist";

  if (!isLikedView && !playlist) {
    return (
      <section className="view active">
        <div className="playlist-header">
          <button className="icon-btn back-btn" onClick={onBack} aria-label="Back">
            <BackIcon />
          </button>
        </div>
        <EmptyState title="Playlist not found" subtitle="It may have been deleted." />
      </section>
    );
  }

  return (
    <section className="view active">
      <div className="playlist-header">
        <button className="icon-btn back-btn" onClick={onBack} aria-label="Back">
          <BackIcon />
        </button>
      </div>

      <div className="playlist-hero">
        <div className={`playlist-hero-art${isLikedView ? " liked-art" : ""}`}>
          {isLikedView ? (
            <HeartIcon filled width={40} height={40} />
          ) : tracks[0]?.thumb ? (
            <img src={tracks[0].thumb} alt="" />
          ) : (
            <span className="playlist-card-fallback">{title.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div>
          <div className="page-title" style={{ margin: 0 }}>{title}</div>
          <div className="page-sub" style={{ marginBottom: 14 }}>{tracks.length} tracks</div>
          {tracks.length > 0 && (
            <button
              className="btn btn-primary playlist-play-btn"
              onClick={() => (isLikedView ? playLiked() : playPlaylist(playlistId))}
            >
              <PlayIcon width={15} height={15} /> Play
            </button>
          )}
        </div>
      </div>

      <div className="row-list">
        {tracks.length === 0 ? (
          <EmptyState
            title={isLikedView ? "No liked songs yet" : "No tracks yet"}
            subtitle={
              isLikedView
                ? "Tap the heart on any track to save it here."
                : "Use the + button on a track to add it to this playlist."
            }
          />
        ) : (
          tracks.map((track, i) => (
            <RowItem
              key={track.id}
              track={track}
              active={currentTrack?.id === track.id}
              playing={isPlaying}
              onClick={() => playFromResults(tracks, i)}
              onRemove={
                isLikedView ? () => toggleLiked(track) : () => removeTrackFromPlaylist(playlistId, track.id)
              }
            />
          ))
        )}
      </div>
    </section>
  );
}