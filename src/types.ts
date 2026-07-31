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

export type ViewName = "home" | "search" | "queue" | "library" | "playlist";  