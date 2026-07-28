import { useState } from "react";
import { usePlayer } from "../hooks/PlayerContext";

interface WorkerUrlModalProps {
  open: boolean;
  onClose: () => void;
}

export function WorkerUrlModal({ open, onClose }: WorkerUrlModalProps) {
  const { workerUrl, setWorkerUrl } = usePlayer();
  const [draft, setDraft] = useState(workerUrl);

  const handleSave = () => {
    if (draft.trim()) setWorkerUrl(draft);
    onClose();
  };

  return (
    <div className={`modal-overlay${open ? " open" : ""}`}>
      <div className="modal">
        <h2>Connect your search Worker</h2>
        <p>
          Aura searches through a small Cloudflare Worker you deploy yourself — no Google account, no API key, no
          card on file. Playback still goes through YouTube's official player.
        </p>
        <ol>
          <li>Deploy the search Worker (see the <code>apps/search-worker</code> folder)</li>
          <li>Copy the <code>*.workers.dev</code> URL Cloudflare gives you</li>
          <li>Paste it below</li>
        </ol>
        <input
          placeholder="https://aura-search.yourname.workers.dev"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <div className="modal-actions" style={{ justifyContent: "space-between" }}>
          <button className="btn btn-ghost" onClick={onClose}>
            Later
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            Save & continue
          </button>
        </div>
      </div>
    </div>
  );
}
