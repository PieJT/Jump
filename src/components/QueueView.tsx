import { usePlayer } from "../hooks/PlayerContext";
import { RowItem } from "./RowItem";
import { EmptyState } from "./EmptyState";

export function QueueView() {
  const { queue, currentIndex, isPlaying, playFromQueue } = usePlayer();

  return (
    <section className="view active">
      <div className="page-title">Queue</div>
      <div className="page-sub">Up next, in order.</div>
      <div className="row-list">
        {queue.length === 0 ? (
          <EmptyState title="Queue is empty" subtitle="Play something from Search to build a queue." />
        ) : (
          queue.map((track, i) => (
            <RowItem
              key={`${track.id}-${i}`}
              track={track}
              active={i === currentIndex}
              playing={isPlaying}
              onClick={() => playFromQueue(i)}
            />
          ))
        )}
      </div>
    </section>
  );
}
