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

export type ViewName = "home" | "search" | "queue";
