import { useEffect, useRef, useState } from "react";
import { usePlayer } from "../hooks/PlayerContext";
import { searchTracks } from "../lib/youtubeMusic";
import type { Track } from "../types";
import { RowItem } from "./RowItem";
import { EmptyState } from "./EmptyState";
import { SearchIcon } from "./Icons";

const DEBOUNCE_MS = 450;

interface SearchViewProps {
  onNeedWorker: () => void;
}

export function SearchView({ onNeedWorker }: SearchViewProps) {
  const { workerUrl, currentTrack, isPlaying, playFromResults } = usePlayer();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults([]);
      setError(null);
      return;
    }

    if (!workerUrl) {
      setError("NO_WORKER");
      onNeedWorker();
      return;
    }

    debounceRef.current = window.setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);
      searchTracks(workerUrl, query, controller.signal)
        .then((items) => setResults(items))
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setError(err instanceof Error ? err.message : "Search failed");
        })
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, workerUrl]);

  return (
    <section className="view active">
      <div className="page-title">Search</div>
      <div className="page-sub">Songs, artists, anything on YouTube Music.</div>

      <div className="search-bar">
        <SearchIcon />
        <input
          placeholder='Try "late night lofi" or an artist name…'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className={`search-loading${loading ? " on" : ""}`} />
      </div>

      {!query.trim() ? null : error === "NO_WORKER" ? (
        <EmptyState title="No search Worker yet" subtitle="Deploy the Cloudflare Worker and paste its URL to search for music." />
      ) : error ? (
        <EmptyState title="Search failed" subtitle={error} />
      ) : !loading && results.length === 0 ? (
        <EmptyState title="No results" subtitle="Try a different search." />
      ) : (
        <>
          <div className="section-label">Results</div>
          <div className="row-list">
            {results.map((track, i) => (
              <RowItem
                key={track.id}
                track={track}
                active={currentTrack?.id === track.id}
                playing={isPlaying}
                onClick={() => playFromResults(results, i)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
