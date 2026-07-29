import { usePlayer } from "../hooks/PlayerContext";
import { RowItem } from "./RowItem";
import { EmptyState } from "./EmptyState";
import { BackIcon, HeartIcon, PlayIcon } from "./Icons";

interface PlaylistViewProps {
  playlistId: string;
  onBack: () => void;
}

export function PlaylistView({ playlistId, onBack }: PlaylistViewProps) {
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