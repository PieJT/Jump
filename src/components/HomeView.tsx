import { usePlayer } from "../hooks/PlayerContext";
import { RowItem } from "./RowItem";
import { EmptyState } from "./EmptyState";

export function HomeView() {
  const { recentlyPlayed, currentTrack, isPlaying, playRecent } = usePlayer();

  return (
    <section className="view active">
      <div className="page-title">Good listening</div>
      <div className="page-sub">Search to start playing — your session picks up here.</div>
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
