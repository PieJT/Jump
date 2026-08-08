import { usePlayer } from "../hooks/PlayerContext";
import { PauseIcon, PlayIcon, PrevIcon, NextIcon } from "./Icons";

/**
 * Shows other devices signed into this account that have been active recently.
 * Each row can be remote-controlled (play/pause/skip run *on that device*,
 * not here) via a Firestore command doc the target device listens for.
 *
 * Render this wherever makes sense in your UI — e.g. inside AccountModal,
 * or as its own sidebar entry. It's self-contained and reads everything it
 * needs from PlayerContext.
 */
export function DeviceHandoffPanel() {
  const { devices, sendRemoteCommand } = usePlayer();

  if (devices.length === 0) {
    return (
      <div className="device-panel-empty">
        <span>No other devices active recently.</span>
      </div>
    );
  }

  return (
    <div className="device-panel">
      {devices.map((device) => (
        <div key={device.id} className="device-row">
          <div className="device-row-info">
            <div className="device-row-label">
              {device.isPlaying && <span className="device-row-dot" />}
              {device.label}
            </div>
            <div className="device-row-track">
              {device.trackTitle ? `${device.trackTitle} — ${device.trackArtist}` : "Nothing playing"}
            </div>
          </div>
          <div className="device-row-controls">
            <button
              className="icon-btn"
              onClick={() => sendRemoteCommand(device.id, "prev")}
              aria-label={`Previous on ${device.label}`}
            >
              <PrevIcon />
            </button>
            <button
              className="icon-btn"
              onClick={() => sendRemoteCommand(device.id, device.isPlaying ? "pause" : "play")}
              aria-label={device.isPlaying ? `Pause on ${device.label}` : `Play on ${device.label}`}
            >
              {device.isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
            <button
              className="icon-btn"
              onClick={() => sendRemoteCommand(device.id, "next")}
              aria-label={`Next on ${device.label}`}
            >
              <NextIcon />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}