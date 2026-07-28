import type { Track } from "../types";

interface RowItemProps {
  track: Track;
  active?: boolean;
  playing?: boolean;
  onClick: () => void;
}

export function RowItem({ track, active, playing, onClick }: RowItemProps) {
  return (
    <div className={`row-item${active ? " playing" : ""}`} onClick={onClick}>
      <img src={track.thumb} alt="" />
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
    </div>
  );
}
