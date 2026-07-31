export interface LyricsResult {
  lyrics: string | null;
  synced: boolean;
}

interface LyricsResponse extends LyricsResult {
  error?: string;
}

/**
 * Calls the (separately deployed) Worker's /lyrics endpoint. That endpoint is
 * itself a thin proxy to whatever lyrics provider the Worker owner configured
 * (see worker/index.ts) — this just normalizes the fetch/error handling the
 * same way lib/youtubeMusic.ts does for search.
 */
export async function fetchLyrics(
  workerUrl: string,
  title: string,
  artist: string,
  signal?: AbortSignal
): Promise<LyricsResult> {
  if (!workerUrl) throw new Error("NO_WORKER_URL");

  const url = `${workerUrl.replace(/\/+$/, "")}/lyrics?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(
    artist
  )}`;
  const res = await fetch(url, { signal });

  if (!res.ok) {
    throw new Error(`Lyrics request failed (${res.status})`);
  }

  const data: LyricsResponse = await res.json();
  if (data.error) throw new Error(data.error);

  return { lyrics: data.lyrics ?? null, synced: Boolean(data.synced) };
}