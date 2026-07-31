import { usePlayer } from "../hooks/PlayerContext";

/** Shown once, on load, if Firestore has a playback position saved from another session/device. */
export function ResumeBanner() {
  const { resumePrompt, resumePlayback, dismissResumePrompt } = usePlayer();

  if (!resumePrompt) return null;

  return (
    <div className="resume-banner">
      <img className="resume-banner-art" src={resumePrompt.track.thumb} alt="" />
      <div className="resume-banner-text">
        <div className="resume-banner-title">Resume where you left off</div>
        <div className="resume-banner-track">{resumePrompt.track.title}</div>
      </div>
      <div className="resume-banner-actions">
        <button type="button" className="resume-banner-btn ghost" onClick={dismissResumePrompt}>
          Dismiss
        </button>
        <button type="button" className="resume-banner-btn primary" onClick={resumePlayback}>
          Resume
        </button>
      </div>
    </div>
  );
}