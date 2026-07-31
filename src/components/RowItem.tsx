import { useState } from "react";
import type { Track } from "../types";
import { usePlayer } from "../hooks/PlayerContext";
import { HeartIcon, PlusIcon, TrashIcon, PlayNextIcon, AddToQueueIcon } from "./Icons";
import { AddToPlaylistModal } from "./AddToPlaylistModal";

interface RowItemProps {
  track: Track;
  active?: boolean;
  playing?: boolean;
  onClick: () => void;
  /** Show a remove button instead of (in addition to) add-to-playlist — used inside a specific playlist's view. */
  onRemove?: () => void;
}

export function RowItem({ track, active, playing, onClick, onRemove }: RowItemProps) {
  const { isLiked, toggleLiked, playNext, addToQueue } = usePlayer();
  const [menuOpen, setMenuOpen] = useState(false);
  const liked = isLiked(track.id);

  return (
    <div className={`row-item${active ? " playing" : ""}`} onClick={onClick}>
      <img src={track.thumb} alt="" loading="lazy" />
      <div className="row-text">
        <div className="row-title">{track.title}</div>
        <div className="row-sub">{track.artist}</div>
      </div>

      {active && playing && (
        <div className="playing-bars">
          <span />
          <span />
          <span />
        </div>
      )}

      <div className="row-actions">
        <button
          type="button"
          className="row-action-btn"
          aria-label="Play next"
          title="Play next"
          onClick={(e) => {
            e.stopPropagation();
            playNext(track);
          }}
        >
          <PlayNextIcon />
        </button>
        <button
          type="button"
          className="row-action-btn"
          aria-label="Add to queue"
          title="Add to queue"
          onClick={(e) => {
            e.stopPropagation();
            addToQueue(track);
          }}
        >
          <AddToQueueIcon />
        </button>
        <button
          type="button"
          className={`row-action-btn${liked ? " liked" : ""}`}
          aria-label={liked ? "Unlike" : "Like"}
          title={liked ? "Unlike" : "Like"}
          onClick={(e) => {
            e.stopPropagation();
            toggleLiked(track);
          }}
        >
          <HeartIcon filled={liked} />
        </button>
        <button
          type="button"
          className="row-action-btn"
          aria-label="Add to playlist"
          title="Add to playlist"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(true);
          }}
        >
          <PlusIcon />
        </button>
        {onRemove && (
          <button
            type="button"
            className="row-action-btn"
            aria-label="Remove from playlist"
            title="Remove from playlist"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <TrashIcon />
          </button>
        )}
      </div>

      {menuOpen && <AddToPlaylistModal track={track} onClose={() => setMenuOpen(false)} />}
    </div>
  );
}