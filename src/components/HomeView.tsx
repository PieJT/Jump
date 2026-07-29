import { useEffect, useState } from "react";
import { usePlayer } from "../hooks/PlayerContext";
import { searchTracks } from "../lib/youtubeMusic";
import { auroraGradient } from "../lib/gradient";
import { RECOMMENDED_PLAYLISTS, RECOMMENDED_ARTISTS } from "../lib/recommendations";
import { RowItem } from "./RowItem";
import { EmptyState } from "./EmptyState";
import { HeartIcon, PlayIcon } from "./Icons";

interface HomeViewProps {
  onNeedWorker?: () => void;
  onOpenPlaylist?: (id: string) => void;
}

export function HomeView({ onNeedWorker, onOpenPlaylist }: HomeViewProps) {
  const {
    workerUrl,
    recentlyPlayed,
    currentTrack,
    isPlaying,
    playRecent,
    playFromResults,
    likedTracks,
    playlists,
  } = usePlayer();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Representative artwork per tile, keyed by its seed query/name — pulled
  // from the first search result for that seed. Falls back to the aurora
  // gradient wherever a thumbnail couldn't be fetched.
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!workerUrl) return;
    let cancelled = false;

    const seeds = [
      ...RECOMMENDED_PLAYLISTS.map((p) => p.query),
      ...RECOMMENDED_ARTISTS,
    ];

    Promise.allSettled(
      seeds.map(async (seed) => {
        const tracks = await searchTracks(workerUrl, seed);
        return { seed, thumb: tracks[0]?.thumb };
      })
    ).then((results) => {
      if (cancelled) return;
      const next: Record<string, string> = {};
      for (const r of results) {
        if (r.status === "fulfilled" && r.value.thumb) next[r.value.seed] = r.value.thumb;
      }
      setThumbs(next);
    });

    return () => {
      cancelled = true;
    };
  }, [workerUrl]);

  const handlePlayQuery = async (query: string, key: string) => {
    if (!workerUrl) {
      onNeedWorker?.();
      return;
    }
    setLoadError(null);
    setLoadingKey(key);
    try {
      const tracks = await searchTracks(workerUrl, query);
      if (tracks.length) playFromResults(tracks, 0);
      else setLoadError("No tracks found for that pick — try another.");
    } catch {
      setLoadError("Could not reach your search Worker.");
    } finally {
      setLoadingKey(null);
    }
  };

  const recentPlaylists = playlists.slice(0, 3);
  const showLibraryRow = likedTracks.length > 0 || recentPlaylists.length > 0;

  return (
    <section className="view active">
      <div className="page-title">Good listening</div>
      <div className="page-sub">Fresh picks to get you moving — tap anything to start.</div>

      {showLibraryRow && onOpenPlaylist && (
        <>
          <div className="section-label">Jump back in</div>
          <div className="quick-grid">
            {likedTracks.length > 0 && (
              <div className="quick-card" onClick={() => onOpenPlaylist("liked")}>
                <div className="quick-art liked-art">
                  <HeartIcon filled width={20} height={20} />
                </div>
                <span>Liked Songs</span>
              </div>
            )}
            {recentPlaylists.map((p) => (
              <div key={p.id} className="quick-card" onClick={() => onOpenPlaylist(p.id)}>
                <div className="quick-art">
                  {p.tracks[0]?.thumb ? (
                    <img src={p.tracks[0].thumb} alt="" loading="lazy" />
                  ) : (
                    <PlayIcon width={16} height={16} />
                  )}
                </div>
                <span>{p.name}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="section-label">Recommended playlists</div>
      <div className="rec-grid">
        {RECOMMENDED_PLAYLISTS.map((p) => (
          <div
            key={p.query}
            className="rec-card"
            style={{
              background: thumbs[p.query]
                ? `url(${thumbs[p.query]}) center/cover`
                : auroraGradient(p.query),
            }}
            onClick={() => handlePlayQuery(p.query, p.query)}
          >
            <div className="rec-card-title">{p.title}</div>
            <div className={`rec-play-badge${loadingKey === p.query ? " loading" : ""}`}>
              {loadingKey === p.query ? <span className="rec-spinner" /> : <PlayIcon />}
            </div>
          </div>
        ))}
      </div>

      <div className="section-label">Artists to explore</div>
      <div className="artist-row">
        {RECOMMENDED_ARTISTS.map((name) => (
          <div key={name} className="artist-tile" onClick={() => handlePlayQuery(name, name)}>
            <div
              className="artist-avatar"
              style={{
                background: thumbs[name] ? `url(${thumbs[name]}) center/cover` : auroraGradient(name),
              }}
            >
              {loadingKey === name ? (
                <span className="rec-spinner" />
              ) : !thumbs[name] ? (
                name.charAt(0)
              ) : null}
            </div>
            <div className="artist-name">{name}</div>
          </div>
        ))}
      </div>

      {loadError && <div className="home-inline-error">{loadError}</div>}

      <div className="section-label">Recently played</div>
      <div className="row-list">
        {recentlyPlayed.length === 0 ? (
          <EmptyState title="Nothing yet" subtitle="Tracks you play will show up here." />
        ) : (
          recentlyPlayed.map((track) => (
            <RowItem
              key={track.id}
              track={track}
              active={currentTrack?.id === track.id}
              playing={isPlaying}
              onClick={() => playRecent(track.id)}
            />
          ))
        )}
      </div>
    </section>
  );
}