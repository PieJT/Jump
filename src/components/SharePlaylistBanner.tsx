import { useEffect, useState } from "react";
import { usePlayer } from "../hooks/PlayerContext";

interface SharePlaylistModalProps {
  playlistId: string;
  playlistName: string;
  onClose: () => void;
}

export function SharePlaylistModal({ playlistId, playlistName, onClose }: SharePlaylistModalProps) {
  const { sharePlaylist } = usePlayer();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    sharePlaylist(playlistId)
      .then((link) => {
        if (cancelled) return;
        setUrl(link);
        setStatus("ready");
      })
      .catch((err) => {
        console.error("[SharePlaylistModal] failed to publish playlist:", err);
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [playlistId, sharePlaylist]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail (permissions, insecure context) — the link is
      // still shown and selectable, so this isn't a hard failure.
    }
  };

  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div className="modal share-playlist-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Share "{playlistName}"</h2>

        {status === "loading" && <p>Publishing a shareable copy…</p>}

        {status === "error" && (
          <p className="home-inline-error">
            Couldn't publish this playlist. Sharing needs a Firestore collection that this account can write
            to — check your Firestore rules.
          </p>
        )}

        {status === "ready" && (
          <>
            <p>Anyone with this link can view and import a copy of this playlist.</p>
            <div className="share-link-row">
              <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
              <button className="btn btn-primary" onClick={handleCopy}>
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </>
        )}

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}