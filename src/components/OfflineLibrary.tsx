import { useEffect, useState } from "react";
import type { OfflineTrackMeta } from "../types";
import {
  listOfflineTracks,
  getOfflineTrack,
  deleteOfflineTrack,
  getOfflineStorageUsedBytes,
  getStorageEstimate,
} from "../lib/offlineStore";
import { formatTime, formatBytes } from "../lib/time";
import { useNativeAudioPlayer } from "../hooks/useNativeAudioPlayer";
import { EmptyState } from "./EmptyState";
import { OfflineIcon, PlayIcon, PauseIcon, TrashIcon } from "./Icons";

export function OfflineLibrary() {
  const [tracks, setTracks] = useState<OfflineTrackMeta[] | null>(null);
  const [usedBytes, setUsedBytes] = useState(0);
  const [quotaBytes, setQuotaBytes] = useState<number | null>(null);

  const player = useNativeAudioPlayer();

  const refresh = async () => {
    const list = await listOfflineTracks();
    setTracks(list);

    const estimate = await getStorageEstimate();
    if (estimate) {
      // The Storage API reports the whole origin's usage (app shell, caches,
      // etc.), not just this library, so use it for the quota but total up
      // our own track sizes for the "used" figure shown to the user.
      setQuotaBytes(estimate.quota);
      setUsedBytes(list.reduce((sum, t) => sum + t.sizeBytes, 0));
    } else {
      setQuotaBytes(null);
      setUsedBytes(await getOfflineStorageUsedBytes());
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePlay = async (track: OfflineTrackMeta) => {
    if (player.currentId === track.id) {
      player.togglePlay();
      return;
    }
    const stored = await getOfflineTrack(track.id);
    if (!stored) return;
    const url = URL.createObjectURL(stored.blob);
    player.play(track.id, url, true);
  };

  const handleDelete = async (track: OfflineTrackMeta) => {
    if (player.currentId === track.id) player.stop();
    await deleteOfflineTrack(track.id);
    await refresh();
  };

  const nowPlaying = tracks?.find((t) => t.id === player.currentId) ?? null;
  const storagePct = quotaBytes ? Math.min(100, (usedBytes / quotaBytes) * 100) : null;

  return (
    <>
      <div className="section-label offline-section-label">
        Offline Library
        <span className="badge badge-offline">
          <OfflineIcon width={12} height={12} />
          Offline
        </span>
      </div>

      {tracks && tracks.length > 0 && (
        <div className="storage-indicator">
          <div className="storage-bar">
            <div className="storage-bar-fill" style={{ width: `${storagePct ?? 0}%` }} />
          </div>
          <span className="storage-label">
            {formatBytes(usedBytes)} {quotaBytes ? `of ${formatBytes(quotaBytes)} used` : "used on this device"}
            {" · "}
            {tracks.length} {tracks.length === 1 ? "track" : "tracks"}
          </span>
        </div>
      )}

      {nowPlaying && (
        <div className="offline-player-bar">
          <button
            type="button"
            className="icon-btn play-btn"
            aria-label={player.isPlaying ? "Pause" : "Play"}
            onClick={() => player.togglePlay()}
          >
            {player.isPlaying ? <PauseIcon width={16} height={16} /> : <PlayIcon width={16} height={16} />}
          </button>
          <div className="row-text">
            <div className="row-title">{nowPlaying.title}</div>
            <div className="row-sub">{nowPlaying.artist} · Playing offline</div>
          </div>
          <div
            className="offline-player-scrub"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              player.seekToFraction((e.clientX - rect.left) / rect.width);
            }}
          >
            <div
              className="offline-player-scrub-fill"
              style={{
                width: `${player.progress.duration ? (player.progress.current / player.progress.duration) * 100 : 0}%`,
              }}
            />
          </div>
          <span className="row-sub">{formatTime(player.progress.current)}</span>
        </div>
      )}

      {tracks === null ? null : tracks.length === 0 ? (
        <EmptyState
          title="No offline tracks yet"
          subtitle="Download tracks from the Audius search view to listen without a connection."
        />
      ) : (
        <div className="row-list">
          {tracks.map((track) => {
            const isCurrent = player.currentId === track.id;
            return (
              <div
                className={`row-item${isCurrent ? " playing" : ""}`}
                key={track.id}
                onClick={() => handlePlay(track)}
              >
                <img src={track.thumb} alt="" loading="lazy" />
                <div className="row-text">
                  <div className="row-title">{track.title}</div>
                  <div className="row-sub">
                    {track.artist} · {formatTime(track.durationSeconds)} · {formatBytes(track.sizeBytes)}
                  </div>
                </div>
                {isCurrent && player.isPlaying && (
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
                    aria-label="Delete download"
                    title="Delete download"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(track);
                    }}
                  >
                    <TrashIcon width={15} height={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}