import { useEffect, useRef, useState } from "react";
import type { AudiusTrack } from "../types";
import { searchAudiusTracks, fetchAudiusTrackBlob, getAudiusStreamUrl } from "../lib/audius";
import { putOfflineTrack, isTrackDownloaded } from "../lib/offlineStore";
import { formatTime } from "../lib/time";
import { useNativeAudioPlayer } from "../hooks/useNativeAudioPlayer";
import { EmptyState } from "./EmptyState";
import { DiscoverIcon, DownloadIcon, CheckIcon, PlayIcon, PauseIcon } from "./Icons";

const DEBOUNCE_MS = 450;

type DownloadState = "idle" | "downloading" | "done" | "error";

export function AudiusView() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AudiusTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadStates, setDownloadStates] = useState<Record<string, DownloadState>>({});
  const debounceRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const preview = useNativeAudioPlayer();

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults([]);
      setError(null);
      return;
    }

    debounceRef.current = window.setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);
      searchAudiusTracks(query, controller.signal)
        .then(async (items) => {
          setResults(items);
          // Mark any results that are already in the offline library so the
          // download button shows the right state immediately.
          const entries = await Promise.all(
            items.map(async (t) => [t.id, (await isTrackDownloaded(t.id)) ? "done" : "idle"] as const)
          );
          setDownloadStates((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setError(err instanceof Error ? err.message : "Search failed");
        })
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleDownload = async (track: AudiusTrack) => {
    const state = downloadStates[track.id];
    if (state === "downloading" || state === "done") return;

    setDownloadStates((prev) => ({ ...prev, [track.id]: "downloading" }));
    try {
      const { blob, mimeType } = await fetchAudiusTrackBlob(track.id);
      await putOfflineTrack({
        id: track.id,
        title: track.title,
        artist: track.artist,
        thumb: track.thumb,
        durationSeconds: track.durationSeconds,
        sizeBytes: blob.size,
        mimeType,
        downloadedAt: Date.now(),
        blob,
      });
      setDownloadStates((prev) => ({ ...prev, [track.id]: "done" }));
    } catch (err) {
      console.error("[Audius] download failed:", err);
      setDownloadStates((prev) => ({ ...prev, [track.id]: "error" }));
    }
  };

  return (
    <section className="view active">
      <div className="page-title">Discover on Audius</div>
      <div className="page-sub">Search the open Audius catalog and save tracks for offline listening.</div>

      <div className="search-bar">
        <DiscoverIcon />
        <input
          placeholder="Search Audius artists, tracks…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className={`search-loading${loading ? " on" : ""}`} />
      </div>

      {!query.trim() ? (
        <EmptyState
          title="Search the Audius catalog"
          subtitle="Independent artists, no account needed — download any result to listen offline."
        />
      ) : error ? (
        <EmptyState title="Search failed" subtitle={error} />
      ) : !loading && results.length === 0 ? (
        <EmptyState title="No results" subtitle="Try a different search." />
      ) : (
        <>
          <div className="section-label">Results</div>
          <div className="row-list">
            {results.map((track) => {
              const dlState = downloadStates[track.id] ?? "idle";
              const isPreviewing = preview.currentId === track.id;
              return (
                <div className="row-item audius-row" key={track.id}>
                  <img src={track.thumb} alt="" loading="lazy" />
                  <div className="row-text">
                    <div className="row-title">{track.title}</div>
                    <div className="row-sub">{track.artist}</div>
                  </div>
                  <div className="row-sub audius-duration">{formatTime(track.durationSeconds)}</div>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="row-action-btn"
                      aria-label={isPreviewing && preview.isPlaying ? "Pause preview" : "Preview"}
                      title="Preview (streamed, not saved)"
                      onClick={() => preview.play(track.id, getAudiusStreamUrl(track.id))}
                    >
                      {isPreviewing && preview.isPlaying ? <PauseIcon width={15} height={15} /> : <PlayIcon width={15} height={15} />}
                    </button>
                    <button
                      type="button"
                      className={`row-action-btn download-btn download-${dlState}`}
                      aria-label={dlState === "done" ? "Downloaded" : "Download for offline"}
                      title={
                        dlState === "done"
                          ? "Saved offline"
                          : dlState === "error"
                            ? "Download failed — tap to retry"
                            : "Download for offline"
                      }
                      disabled={dlState === "downloading"}
                      onClick={() => handleDownload(track)}
                    >
                      {dlState === "downloading" ? (
                        <span className="download-spinner" />
                      ) : dlState === "done" ? (
                        <CheckIcon width={15} height={15} />
                      ) : (
                        <DownloadIcon width={15} height={15} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}