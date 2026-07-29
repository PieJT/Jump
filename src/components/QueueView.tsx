import { useCallback, useRef, useState } from "react";
import { usePlayer } from "../hooks/PlayerContext";
import { EmptyState } from "./EmptyState";
import { HeartIcon } from "./Icons";

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

const ChevronUp = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.4}>
    <path d="m6 15 6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronDown = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.4}>
    <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function QueueView() {
  const { queue, currentIndex, isPlaying, playFromQueue, reorderQueue, isLiked, toggleLiked } = usePlayer();
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [drag, setDrag] = useState<DragState | null>(null);

  const computeDropRank = useCallback(
    (pointerY: number, dragIndex: number) => {
      let rank = 0;
      let matched = false;
      for (let i = 0; i < queue.length; i++) {
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
    [queue.length]
  );

  const handleGripPointerDown = (index: number) => (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
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
    if (rank !== drag.index) reorderQueue(drag.index, rank);
    setDrag(null);
  };

  const moveUp = (i: number) => i > 0 && reorderQueue(i, i - 1);
  const moveDown = (i: number) => i < queue.length - 1 && reorderQueue(i, i + 1);

  return (
    <section className="view active">
      <div className="page-title">Queue</div>
      <div className="page-sub">Up next, in order. Drag the grip or use the arrows to reorder.</div>
      <div className="row-list queue-list">
        {queue.length === 0 ? (
          <EmptyState title="Queue is empty" subtitle="Play something from Search to build a queue." />
        ) : (
          queue.map((track, i) => {
            const liked = isLiked(track.id);
            const isDragging = drag?.index === i;
            const dragDelta = isDragging ? drag.y - drag.startY : 0;
            return (
              <div
                key={`${track.id}-${i}`}
                ref={(el) => {
                  rowRefs.current[i] = el;
                }}
                className={`queue-row${i === currentIndex ? " playing" : ""}${isDragging ? " dragging" : ""}`}
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

                <div className="queue-row-main" onClick={() => playFromQueue(i)}>
                  <img src={track.thumb} alt="" loading="lazy" />
                  <div className="row-text">
                    <div className="row-title">{track.title}</div>
                    <div className="row-sub">{track.artist}</div>
                  </div>
                  {i === currentIndex && isPlaying && (
                    <div className="playing-bars">
                      <span />
                      <span />
                      <span />
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className={`row-action-btn${liked ? " liked" : ""}`}
                  aria-label={liked ? "Unlike" : "Like"}
                  onClick={() => toggleLiked(track)}
                >
                  <HeartIcon filled={liked} />
                </button>

                <div className="queue-move-btns">
                  <button
                    type="button"
                    className="queue-move-btn"
                    aria-label="Move up"
                    disabled={i === 0}
                    onClick={() => moveUp(i)}
                  >
                    <ChevronUp />
                  </button>
                  <button
                    type="button"
                    className="queue-move-btn"
                    aria-label="Move down"
                    disabled={i === queue.length - 1}
                    onClick={() => moveDown(i)}
                  >
                    <ChevronDown />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}