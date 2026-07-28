import type { SearchResponse, Track } from "../types";

/**
 * Calls the (separately deployed) search Worker's /search endpoint.
 * That Worker proxies an unofficial YouTube Music search endpoint and
 * returns plain track metadata (id/title/artist/thumb) — actual audio
 * playback happens client-side via YouTube's official IFrame Player API.
 */
export async function searchTracks(
  workerUrl: string,
  query: string,
  signal?: AbortSignal
): Promise<Track[]> {
  if (!workerUrl) throw new Error("NO_WORKER_URL");

  const url = `${workerUrl.replace(/\/+$/, "")}/search?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { signal });
  const data: SearchResponse = await res.json();

  if (data.error) throw new Error(data.error);
  return data.items ?? [];
}
