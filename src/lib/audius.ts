import type { AudiusTrack } from "../types";

// api.audius.co is Audius's own router — it forwards to a healthy discovery
// node under the hood, so we don't need to resolve/rotate hosts ourselves.
const API_BASE = "https://api.audius.co/v1";
// Audius asks unregistered/no-API-key clients to identify themselves via
// app_name for analytics + rate limiting purposes.
const APP_NAME = "Jump Music Player";

interface AudiusApiArtwork {
  "150x150"?: string;
  "480x480"?: string;
  "1000x1000"?: string;
}

interface AudiusApiTrack {
  id: string;
  title: string;
  duration?: number;
  artwork?: AudiusApiArtwork;
  user?: { name?: string; handle?: string };
}

interface AudiusSearchResponse {
  data?: AudiusApiTrack[];
}

function withAppName(path: string, extraParams?: Record<string, string>): string {
  const url = new URL(`${API_BASE}${path}`);
  url.searchParams.set("app_name", APP_NAME);
  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) url.searchParams.set(key, value);
  }
  return url.toString();
}

function toAudiusTrack(t: AudiusApiTrack): AudiusTrack {
  return {
    id: t.id,
    title: t.title || "Untitled",
    artist: t.user?.name || t.user?.handle || "Unknown artist",
    thumb: t.artwork?.["480x480"] || t.artwork?.["150x150"] || t.artwork?.["1000x1000"] || "",
    durationSeconds: t.duration ?? 0,
  };
}

export async function searchAudiusTracks(query: string, signal?: AbortSignal): Promise<AudiusTrack[]> {
  const url = withAppName("/tracks/search", { query });
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Audius search failed (${res.status})`);
  const data: AudiusSearchResponse = await res.json();
  return (data.data ?? []).map(toAudiusTrack);
}

/**
 * Fetches a track's actual audio bytes. Audius's own `/download` endpoint
 * only works for tracks the uploader explicitly marked downloadable, so we
 * try that first and fall back to `/stream` (which works for any playable
 * track and is what the audius.co web player itself uses).
 */
export async function fetchAudiusTrackBlob(
  trackId: string,
  signal?: AbortSignal
): Promise<{ blob: Blob; mimeType: string }> {
  const candidates = [withAppName(`/tracks/${trackId}/download`), withAppName(`/tracks/${trackId}/stream`)];

  let lastError: unknown = null;
  for (const url of candidates) {
    try {
      const res = await fetch(url, { signal });
      if (!res.ok) {
        lastError = new Error(`Audius download failed (${res.status})`);
        continue;
      }
      const blob = await res.blob();
      // A non-audio content-type here usually means we hit an error/HTML
      // response despite the 200 (e.g. a gateway page) — treat as a miss.
      const mimeType = blob.type || "audio/mpeg";
      if (!mimeType.startsWith("audio/") && !mimeType.includes("octet-stream")) {
        lastError = new Error("Unexpected response, not audio");
        continue;
      }
      return { blob, mimeType };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Track download failed");
}

/** Direct streaming URL, for quick in-browser preview playback (no download/storage involved). */
export function getAudiusStreamUrl(trackId: string): string {
  return withAppName(`/tracks/${trackId}/stream`);
}