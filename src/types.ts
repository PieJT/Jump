export interface Track {
  id: string;
  title: string;
  artist: string;
  thumb: string;
}

export interface SearchResponse {
  items?: Track[];
  error?: string;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  createdAt: number;
}

export type ViewName = "home" | "search" | "audius" | "queue" | "library" | "playlist";

/** A track result from Audius's search API — separate from the YouTube-backed Track type since Audius tracks aren't playable through the YouTube iframe player. */
export interface AudiusTrack {
  id: string;
  title: string;
  artist: string;
  thumb: string;
  durationSeconds: number;
}

/** Metadata stored alongside a downloaded track's audio blob in IndexedDB. */
export interface OfflineTrackMeta {
  id: string;
  title: string;
  artist: string;
  thumb: string;
  durationSeconds: number;
  sizeBytes: number;
  mimeType: string;
  downloadedAt: number;
}